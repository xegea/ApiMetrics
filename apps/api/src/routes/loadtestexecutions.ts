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
 * POST /loadtestexecutions
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
 * GET /loadtestexecutions
 * Get all load test executions for the tenant
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

  const loadTestExecutions = await (prisma as any).loadTestExecution.findMany({
    where,
    include: {
      executionPlan: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  reply.send({
    loadTestExecutions,
  });
}

/**
 * GET /loadtestexecutions/:id
 * Get a specific load test execution
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
    },
  });

  if (!loadTestExecution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  reply.send(loadTestExecution);
}

/**
 * GET /loadtestexecutions/:id/results
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
  const loadTestExecution = await (prisma as any).loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
  });

  if (!loadTestExecution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Return the execution with its results as a single object
  reply.send({
    testResults: [
      {
        id: loadTestExecution.id,
        testId: loadTestExecution.executionPlanId,
        avgLatency: loadTestExecution.avgLatency,
        p95Latency: loadTestExecution.p95Latency,
        successRate: loadTestExecution.successRate,
        timestamp: loadTestExecution.resultTimestamp?.toISOString() || loadTestExecution.updatedAt.toISOString(),
      },
    ],
  });
}

/**
 * PUT /loadtestexecutions/:id
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
  const updateData = request.body;

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.createdAt;
  delete updateData.executionPlanId;

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
 * DELETE /loadtestexecutions/:id
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
 * GET /loadtestexecutions/:id/download
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
      id: loadTestExecution.id,
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
  // Create a shell-friendly filename by replacing spaces with hyphens
  // Format timestamp as YYYYMMDD-HHMMSSMS for uniqueness (e.g., 20251112-095006123)
  const date = new Date(); // Use current time for unique filename on each download
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}${ms}`;
  
  const sanitizedPlanName = loadTestExecution.executionPlan.name
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9\-_]/g, '') // Remove special characters
    .toLowerCase(); // Convert to lowercase
  const fileName = `execution-plan-${sanitizedPlanName}-${timestamp}.json`;

  console.log('DEBUG: Generated filename:', fileName);
  console.log('DEBUG: Plan name:', loadTestExecution.executionPlan.name);
  console.log('DEBUG: Sanitized plan name:', sanitizedPlanName);
  console.log('DEBUG: Timestamp:', timestamp);

  // Add instructions with the actual filename
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

export default async function loadTestExecutionsRoutes(app: FastifyInstance) {
  app.post('/loadtestexecutions', {
    preHandler: verifyToken,
    handler: createLoadTestExecution,
  });

  app.get('/loadtestexecutions', {
    preHandler: verifyToken,
    handler: getLoadTestExecutions,
  });

  app.get('/loadtestexecutions/:id', {
    preHandler: verifyToken,
    handler: getLoadTestExecution,
  });

  app.get('/loadtestexecutions/:id/results', {
    preHandler: verifyToken,
    handler: getLoadTestExecutionResults,
  });

  app.put('/loadtestexecutions/:id', {
    preHandler: verifyToken,
    handler: updateLoadTestExecution,
  });

  app.delete('/loadtestexecutions/:id', {
    preHandler: verifyToken,
    handler: deleteLoadTestExecution,
  });

  app.get('/loadtestexecutions/:id/download', {
    preHandler: verifyToken,
    handler: downloadLoadTestExecution,
  });

  // OPTIONS handler for download endpoint (for CORS preflight)
  app.options('/loadtestexecutions/:id/download', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', 'http://localhost:8080');
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Authorization');
    reply.header('Access-Control-Expose-Headers', 'Content-Disposition');
    reply.send();
  });
}