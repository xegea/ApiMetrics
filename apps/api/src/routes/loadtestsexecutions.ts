import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoadTestExecution } from '@apimetrics/shared';
import { prisma } from '../services/db';
import { verifyToken } from './auth';
import { ensureUserAndTenant } from '../services/tenancy';

interface CreateLoadTestExecutionBody {
  executionPlanId: string;
  name: string;
}

interface GetLoadTestExecutionsParams {
  executionPlanId?: string;
}

/**
 * POST /loadtestsexecutions
 * Create a new load test execution
 */
async function createLoadTestExecution(
  request: FastifyRequest<{ Body: CreateLoadTestExecutionBody }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { executionPlanId, name } = request.body;

  // Verify the execution plan exists and belongs to the tenant
  const executionPlan = await prisma.executionPlan.findFirst({
    where: {
      id: executionPlanId,
      tenantId: ensured.tenantId,
    },
  });

  if (!executionPlan) {
    return reply.status(404).send({ message: 'Execution plan not found' });
  }

  const loadTestExecution = await prisma.loadTestExecution.create({
    data: {
      tenantId: ensured.tenantId,
      userId: ensured.userId,
      executionPlanId,
      name,
      status: 'running',
    },
  });

  reply.send(loadTestExecution);
}

/**
 * GET /loadtestsexecutions
 * Get all load test executions with their test results nested
 */
async function getLoadTestExecutions(
  request: FastifyRequest<{ Querystring: GetLoadTestExecutionsParams }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { executionPlanId } = request.query;

  const where: any = { tenantId: ensured.tenantId };
  if (executionPlanId) {
    where.executionPlanId = executionPlanId;
  }

  // Fetch load test executions with their test results
  const loadTestExecutions = await prisma.loadTestExecution.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      testResults: {
        orderBy: {
          timestamp: 'desc',
        },
      },
    },
  });

  // Transform to include test results as loadtests
  const transformed = loadTestExecutions.map((execution: any) => {
    // Map TestResult records to the loadtests format
    const loadtests = execution.testResults.map((result: any) => ({
      id: result.id,
      loadTestExecutionId: result.loadTestExecutionId,
      status: 'completed',
      command: `Test ${result.testId}`,
      startedAt: result.timestamp.toISOString(),
      completedAt: result.timestamp.toISOString(),
      avgLatency: result.avgLatency,
      p95Latency: result.p95Latency,
      successRate: result.successRate,
      resultTimestamp: result.timestamp.toISOString(),
      minLatency: result.minLatency,
      maxLatency: result.maxLatency,
      p50Latency: result.p50Latency,
      p99Latency: result.p99Latency,
      totalRequests: result.totalRequests,
      testDuration: result.testDuration,
      actualRate: result.actualRate,
      throughput: result.throughput,
      bytesIn: result.bytesIn,
      bytesOut: result.bytesOut,
      statusCodes: result.statusCodes ? JSON.parse(result.statusCodes) : null,
      errorDetails: result.errorDetails ? JSON.parse(result.errorDetails) : null,
    }));

    return {
      id: execution.id,
      name: execution.name,
      loadTestPlanId: execution.executionPlanId,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
      loadtests,
    };
  });

  reply.send({
    loadtestsexecutions: transformed,
  });
}

/**
 * GET /loadtestsexecutions/:id
 * Get a specific load test execution with its test results
 */
async function getLoadTestExecution(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;

  const loadTestExecution = await (prisma as any).loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
    include: {
      executionPlan: true,
      testResults: {
        orderBy: {
          timestamp: 'desc',
        },
      },
    },
  });

  if (!loadTestExecution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Map TestResult records to the loadtests format
  const loadtests = loadTestExecution.testResults.map((result: any) => ({
    id: result.id,
    loadTestExecutionId: result.loadTestExecutionId,
    status: 'completed',
    command: `Test ${result.testId}`,
    startedAt: result.timestamp.toISOString(),
    completedAt: result.timestamp.toISOString(),
    avgLatency: result.avgLatency,
    p95Latency: result.p95Latency,
    successRate: result.successRate,
    resultTimestamp: result.timestamp.toISOString(),
    minLatency: result.minLatency,
    maxLatency: result.maxLatency,
    p50Latency: result.p50Latency,
    p99Latency: result.p99Latency,
    totalRequests: result.totalRequests,
    testDuration: result.testDuration,
    actualRate: result.actualRate,
    throughput: result.throughput,
    bytesIn: result.bytesIn,
    bytesOut: result.bytesOut,
    statusCodes: result.statusCodes ? JSON.parse(result.statusCodes) : null,
    errorDetails: result.errorDetails ? JSON.parse(result.errorDetails) : null,
  }));

  // Parse JSON fields from the execution itself
  const parsedExecution = {
    ...loadTestExecution,
    statusCodes: loadTestExecution.statusCodes ? JSON.parse(loadTestExecution.statusCodes) : null,
    errorDetails: loadTestExecution.errorDetails ? JSON.parse(loadTestExecution.errorDetails) : null,
    loadtests,
  };

  reply.send(parsedExecution);
}

/**
 * GET /loadtestsexecutions/:id/results
 * Get test results for a specific load test execution
 */
async function getLoadTestExecutionResults(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;

  // Verify the execution exists and belongs to the tenant
  const loadTestExecution = await (prisma.loadTestExecution as any).findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
  });

  if (!loadTestExecution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Return the detailed metrics from the execution itself
  const result = {
    id: loadTestExecution.id,
    avgLatency: loadTestExecution.avgLatency,
    p95Latency: loadTestExecution.p95Latency,
    successRate: loadTestExecution.successRate,
    resultTimestamp: loadTestExecution.resultTimestamp,
    minLatency: loadTestExecution.minLatency,
    maxLatency: loadTestExecution.maxLatency,
    p50Latency: loadTestExecution.p50Latency,
    p99Latency: loadTestExecution.p99Latency,
    totalRequests: loadTestExecution.totalRequests,
    testDuration: loadTestExecution.testDuration,
    actualRate: loadTestExecution.actualRate,
    throughput: loadTestExecution.throughput,
    bytesIn: loadTestExecution.bytesIn,
    bytesOut: loadTestExecution.bytesOut,
    statusCodes: loadTestExecution.statusCodes ? JSON.parse(loadTestExecution.statusCodes as string) : null,
    errorDetails: loadTestExecution.errorDetails ? JSON.parse(loadTestExecution.errorDetails as string) : null,
  };

  reply.send({
    result,
  });
}

/**
 * PUT /loadtestsexecutions/:id
 * Update a load test execution (e.g., status)
 */
async function updateLoadTestExecution(
  request: FastifyRequest<{ Params: { id: string }; Body: Partial<LoadTestExecution> }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;
  const updateData: any = request.body;

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.createdAt;

  const loadTestExecution = await (prisma as any).loadTestExecution.updateMany({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
    data: updateData,
  });

  if (loadTestExecution.count === 0) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Return the updated execution
  const updated = await (prisma as any).loadTestExecution.findUnique({
    where: { id },
  });

  reply.send(updated);
}

/**
 * DELETE /loadtestsexecutions/:id
 * Delete a load test execution
 */
async function deleteLoadTestExecution(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;

  const deleted = await (prisma as any).loadTestExecution.deleteMany({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
  });

  if (deleted.count === 0) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  reply.send({ message: 'Load test execution deleted' });
}

/**
 * GET /loadtestsexecutions/:id/download
 * Download a JSON execution plan with embedded JWT token
 * User runs: npx @xegea/apimetrics-cli execute-plan <file.json>
 */
async function downloadLoadTestExecution(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;

  const loadTestExecution = await (prisma as any).loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
    include: {
      executionPlan: {
        include: {
          testRequests: {
            orderBy: {
              orderId: 'asc',
            },
          },
        },
      },
    },
  });

  if (!loadTestExecution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Extract JWT token from request headers
  const authHeader = request.headers.authorization || '';
  const jwtToken = authHeader.replace('Bearer ', '');

  // Create a transparent, readable JSON execution plan
  const executionPlan: any = {
    metadata: {
      name: loadTestExecution.name,
      planName: loadTestExecution.executionPlan.name,
      createdAt: loadTestExecution.createdAt.toISOString(),
      description: 'Execution plan for ApiMetrics load testing',
    },
    authentication: {
      token: jwtToken,
      tokenType: 'JWT',
      note: 'This token is your personal access token. Do not share this file.',
    },
    tests: [{
      id: loadTestExecution.executionPlan.id, // Use the execution plan ID
      name: loadTestExecution.name,
      requests: loadTestExecution.executionPlan.testRequests.map((testRequest: any) => ({
        method: testRequest.httpMethod,
        target: testRequest.endpoint,
        description: `${testRequest.httpMethod} request to ${testRequest.endpoint}`,
      })),
      rps: 10,
      duration: loadTestExecution.executionPlan.executionTime || '1m',
      iterations: loadTestExecution.executionPlan.iterations || 1,
      delayBetweenRequests: loadTestExecution.executionPlan.delayBetweenRequests || '100ms',
    }],
  };

  // Set headers for download
  // Create a unique filename using timestamp and random suffix for each download
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
  const randomSuffix = Math.random().toString(36).substring(2, 8); // 6-character random string
  const sanitizedPlanName = loadTestExecution.executionPlan.name
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9\-_]/g, '') // Remove special characters
    .toLowerCase(); // Convert to lowercase
  const fileName = `execution-plan-${sanitizedPlanName}-${timestamp}-${randomSuffix}.json`;

  console.log('DEBUG: Generated filename:', fileName);
  console.log('DEBUG: Plan name:', loadTestExecution.executionPlan.name);
  console.log('DEBUG: Sanitized plan name:', sanitizedPlanName);
  console.log('DEBUG: Timestamp:', timestamp);
  console.log('DEBUG: Random suffix:', randomSuffix);

  // Add instructions with the exact filename (no wildcards)
  executionPlan.instructions = {
    step1: 'Install Node.js from https://nodejs.org if you do not have it',
    step2: `Open Terminal and run: npx @xegea/apimetrics-cli execute-plan ~/Downloads/${fileName}`,
    step3: 'Results will be automatically uploaded to your ApiMetrics dashboard',
  };

  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Content-Type', 'application/json');
  reply.header('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);

  reply.send(executionPlan);
}

export async function loadTestExecutionsRoutes(fastify: FastifyInstance) {
  console.log('Registering load test executions routes...');
  fastify.post('/loadtestsexecutions', {
    preHandler: verifyToken,
    handler: createLoadTestExecution,
  });

  fastify.get('/loadtestsexecutions', {
    preHandler: verifyToken,
    handler: getLoadTestExecutions,
  });

  fastify.get('/loadtestsexecutions/:id', {
    preHandler: verifyToken,
    handler: getLoadTestExecution,
  });

  // Removed: GET /loadtestsexecutions/:id/results
  // Results are now included in the /loadtestsexecutions/:id response via loadtests array
  // fastify.get('/loadtestsexecutions/:id/results', {
  //   preHandler: verifyToken,
  //   handler: getLoadTestExecutionResults,
  // });

  fastify.put('/loadtestsexecutions/:id', {
    preHandler: verifyToken,
    handler: updateLoadTestExecution,
  });

  fastify.delete('/loadtestsexecutions/:id', {
    preHandler: verifyToken,
    handler: deleteLoadTestExecution,
  });

  fastify.get('/loadtestsexecutions/:id/download', {
    preHandler: verifyToken,
    handler: downloadLoadTestExecution,
  });

  // OPTIONS handler for download endpoint (for CORS preflight)
  fastify.options('/loadtestsexecutions/:id/download', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', 'http://localhost:8080');
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Authorization');
    reply.header('Access-Control-Expose-Headers', 'Content-Disposition');
    reply.send();
  });
}