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

    // Create a new TestResult record
    const testResult = await (prisma.testResult as any).create({
      data: {
        loadTestExecutionId: result.executionId,
        testId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        avgLatency: result.avgLatency,
        p95Latency: result.p95Latency,
        successRate: result.successRate,
        timestamp: new Date(result.timestamp),
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

    // Also update the LoadTestExecution with the latest metrics for quick access
    await (prisma.loadTestExecution as any).update({
      where: { id: result.executionId },
      data: {
        avgLatency: result.avgLatency,
        p95Latency: result.p95Latency,
        successRate: result.successRate,
        resultTimestamp: new Date(result.timestamp),
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
        status: 'completed',
        updatedAt: new Date(),
      },
    });

    return reply.code(201).send({
      id: testResult.id,
      message: 'Test result saved successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    request.log.error(error, 'Error saving test result');
    console.error('=== ERROR SAVING TEST RESULT ===');
    console.error('Error Message:', errorMessage);
    console.error('Error Stack:', errorStack);
    console.error('Result Data:', {
      executionId: result.executionId,
      avgLatency: result.avgLatency,
      p95Latency: result.p95Latency,
      successRate: result.successRate,
    });
    console.error('================================');
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

    // Return in the format expected by the dashboard
    return reply.send({
      id: execution.id,
      avgLatency: execution.avgLatency,
      p95Latency: execution.p95Latency,
      successRate: execution.successRate,
      timestamp: execution.updatedAt.toISOString(),
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
        avgLatency: exec.avgLatency,
        p95Latency: exec.p95Latency,
        successRate: exec.successRate,
        timestamp: exec.updatedAt.toISOString(),
      }));

    return reply.send(response);
  } catch (error) {
    request.log.error(error, 'Error listing test results');
    return reply.code(500).send({ error: 'Failed to list test results' });
  }
}

/**
 * DELETE /results/:id
 * Delete a specific test result
 */
async function deleteResult(
  request: FastifyRequest<{ Params: GetResultsParams }>,
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

    const { id } = request.params;

    // First check if the result exists and belongs to the user's tenant
    const result = await (prisma as any).testResult.findFirst({
      where: {
        id,
        loadTestExecution: {
          tenantId: ensured.tenantId
        }
      },
      include: {
        loadTestExecution: true
      }
    });

    if (!result) {
      return reply.code(404).send({ error: 'Test result not found' });
    }

    // Delete the test result
    await (prisma as any).testResult.delete({
      where: { id }
    });

    return reply.send({ success: true });
  } catch (error) {
    request.log.error(error, 'Error deleting test result');
    return reply.code(500).send({ error: 'Failed to delete test result' });
  }
}

export async function resultsRoutes(fastify: FastifyInstance) {
  // POST requires authentication to prevent unauthorized submissions
  fastify.post<{ Body: PostResultsBody | Buffer }>(
    '/results',
    { preHandler: verifyToken },
    postResults
  );

  // Note: GET /results and GET /results/:id endpoints removed
  // Results are now accessed through /loadtestsexecutions/:id which includes test results
  
  fastify.get('/results', { preHandler: verifyToken }, listResults);
  fastify.get<{ Params: GetResultsParams }>(
    '/results/:id',
    { preHandler: verifyToken },
    getResults
  );

  fastify.delete<{ Params: GetResultsParams }>(
    '/results/:id',
    { preHandler: verifyToken },
    deleteResult
  );
}

