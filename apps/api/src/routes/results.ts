import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/db';
import { verifyToken } from './auth';
import { ensureUserAndTenant } from '../services/tenancy';
import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

interface PostResultsBody {
  executionId: string;
  avgLatency: number;
  p95Latency: number;
  successRate: number;
  timestamp: string;
  // Detailed metrics from Vegeta
  minLatency?: number;
  maxLatency?: number;
  p50Latency?: number;
  p99Latency?: number;
  requests?: number;
  duration?: string;
  rate?: number;
  throughput?: number;
  bytesIn?: number;
  bytesOut?: number;
  statusCodes?: Record<string, number>;
  errors?: string[];
}

interface GetResultsParams {
  id: string;
}

interface SeedResultsBody {
  count?: number;
  project?: string;
  tenantId?: string;
  userId?: string;
}

/**
 * POST /results
 * Accept uploaded results from CLI and store them in LoadTestExecution
 */
async function postResults(
  request: FastifyRequest<{ Body: PostResultsBody | Buffer }>,
  reply: FastifyReply
) {
  let result: PostResultsBody;

  // Check if content is gzipped
  const contentType = request.headers['content-encoding'];

  if (contentType === 'gzip') {
    const jsonData = await gunzipAsync(request.body as Buffer);
    result = JSON.parse(jsonData.toString('utf-8'));
  } else if (Buffer.isBuffer(request.body)) {
    result = JSON.parse(request.body.toString('utf-8'));
  } else {
    result = request.body as PostResultsBody;
  }

  // Validate required fields
  if (
    !result.executionId ||
    typeof result.avgLatency !== 'number' ||
    typeof result.successRate !== 'number'
  ) {
    return reply.code(400).send({ error: 'Invalid test result data' });
  }

  // Get user info - authentication is required
  const user = (request as any).user;
  if (!user?.userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? 'unknown@example.com',
  });

  try {
    // Verify the execution exists and belongs to the tenant
    const execution = await prisma.loadTestExecution.findFirst({
      where: {
        id: result.executionId,
        tenantId: ensured.tenantId,
      },
    });

    if (!execution) {
      return reply.code(404).send({ error: 'Load test execution not found' });
    }

    // Update the execution with results and mark as completed
    const updated = await (prisma as any).loadTestExecution.update({
      where: { id: result.executionId },
      data: {
        avgLatency: result.avgLatency,
        p95Latency: result.p95Latency,
        successRate: result.successRate,
        resultTimestamp: new Date(result.timestamp),
        status: 'completed',
        updatedAt: new Date(),
        // Comprehensive metrics from Vegeta
        minLatency: result.minLatency,
        maxLatency: result.maxLatency,
        p50Latency: result.p50Latency,
        p99Latency: result.p99Latency,
        totalRequests: result.requests,
        testDuration: result.duration,
        actualRate: result.rate,
        throughput: result.throughput,
        bytesIn: result.bytesIn,
        bytesOut: result.bytesOut,
        statusCodes: result.statusCodes ? JSON.stringify(result.statusCodes) : null,
        errorDetails: result.errors ? JSON.stringify(result.errors) : null,
      },
    });

    return reply.code(201).send({
      id: updated.id,
      message: 'Test result saved successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    request.log.error(error, 'Error saving test result');
    console.error('Error saving test result:', errorMessage);
    return reply
      .code(500)
      .send({ error: 'Failed to save test result', details: errorMessage });
  }
}

/**
 * GET /results/:id
 * Return metrics for a specific execution (for backwards compatibility)
 */
async function getResults(
  request: FastifyRequest<{ Params: GetResultsParams }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const user = (request as any).user;
    if (!user?.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? 'unknown@example.com',
    });

    const execution = await (prisma as any).loadTestExecution.findFirst({
      where: { id, tenantId: ensured.tenantId },
    });

    if (!execution) {
      return reply.code(404).send({ error: 'Test result not found' });
    }

    // Return in the format expected by the dashboard with all detailed metrics
    return reply.send({
      id: execution.id,
      testId: execution.id, // For backwards compatibility
      avgLatency: execution.avgLatency ? Math.round(execution.avgLatency / 1000000) : 0,
      p95Latency: execution.p95Latency ? Math.round(execution.p95Latency / 1000000) : 0,
      successRate: execution.successRate || 0,
      timestamp: execution.resultTimestamp?.toISOString() || execution.updatedAt.toISOString(),
      // Detailed metrics from Vegeta
      minLatency: execution.minLatency ? Math.round(execution.minLatency / 1000000) : undefined,
      maxLatency: execution.maxLatency ? Math.round(execution.maxLatency / 1000000) : undefined,
      p50Latency: execution.p50Latency ? Math.round(execution.p50Latency / 1000000) : undefined,
      p99Latency: execution.p99Latency ? Math.round(execution.p99Latency / 1000000) : undefined,
      totalRequests: execution.totalRequests || undefined,
      testDuration: execution.testDuration || undefined,
      actualRate: execution.actualRate || undefined,
      throughput: execution.throughput || undefined,
      bytesIn: execution.bytesIn || undefined,
      bytesOut: execution.bytesOut || undefined,
      statusCodes: execution.statusCodes ? JSON.parse(execution.statusCodes) : undefined,
      errorDetails: execution.errorDetails ? JSON.parse(execution.errorDetails) : undefined,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching test result');
    return reply.code(500).send({ error: 'Failed to fetch test result' });
  }
}

/**
 * GET /results
 * List all executions with results (for backwards compatibility)
 */
async function listResults(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    if (!user?.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? 'unknown@example.com',
    });

    const executions = await (prisma as any).loadTestExecution.findMany({
      where: { tenantId: ensured.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const response = executions
      .filter((exec: any) => exec.avgLatency !== null)
      .map((exec: any) => ({
        id: exec.id,
        testId: exec.id, // For backwards compatibility
        avgLatency: exec.avgLatency ? Math.round(exec.avgLatency / 1000000) : 0,
        p95Latency: exec.p95Latency ? Math.round(exec.p95Latency / 1000000) : 0,
        successRate: exec.successRate || 0,
        timestamp: exec.resultTimestamp?.toISOString() || exec.updatedAt.toISOString(),
        // Detailed metrics from Vegeta
        minLatency: exec.minLatency ? Math.round(exec.minLatency / 1000000) : undefined,
        maxLatency: exec.maxLatency ? Math.round(exec.maxLatency / 1000000) : undefined,
        p50Latency: exec.p50Latency ? Math.round(exec.p50Latency / 1000000) : undefined,
        p99Latency: exec.p99Latency ? Math.round(exec.p99Latency / 1000000) : undefined,
        totalRequests: exec.totalRequests || undefined,
        testDuration: exec.testDuration || undefined,
        actualRate: exec.actualRate || undefined,
        throughput: exec.throughput || undefined,
        bytesIn: exec.bytesIn || undefined,
        bytesOut: exec.bytesOut || undefined,
        statusCodes: exec.statusCodes ? JSON.parse(exec.statusCodes) : undefined,
        errorDetails: exec.errorDetails ? JSON.parse(exec.errorDetails) : undefined,
      }));

    return reply.send(response);
  } catch (error) {
    request.log.error(error, 'Error listing test results');
    return reply.code(500).send({ error: 'Failed to list test results' });
  }
}

export async function resultsRoutes(fastify: FastifyInstance) {
  // POST requires authentication to prevent unauthorized submissions
  fastify.post<{ Body: PostResultsBody | Buffer }>(
    '/results',
    { preHandler: verifyToken },
    postResults
  );

  fastify.get('/results', { preHandler: verifyToken }, listResults);
  fastify.get<{ Params: GetResultsParams }>(
    '/results/:id',
    { preHandler: verifyToken },
    getResults
  );

  // Note: /results/seed endpoint would create LoadTestExecutions instead
  // This is removed as it's not needed with the new flow
}

