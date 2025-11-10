import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoadTestExecution } from '@apimetrics/shared';
import { prisma } from '../services/db';
import { verifyToken } from './auth';
import { ensureUserAndTenant } from '../services/tenancy';
import archiver from 'archiver';

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
 * Download a ZIP file containing test files and instructions for the load test execution
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

  // Set the archive name
  const timestamp = new Date(loadTestExecution.createdAt).toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const zipName = `Execution Plan ${loadTestExecution.executionPlan.name} - ${timestamp}.zip`;

  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });

  // Collect all data in buffers instead of streaming
  const buffers: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => {
    buffers.push(chunk);
  });

  // Generate test JSON files for each request
  loadTestExecution.executionPlan.testRequests.forEach((testRequest: any, index: number) => {
    const testConfig = {
      target: testRequest.endpoint,
      method: testRequest.httpMethod,
      rps: 10, // Default RPS, could be configurable
      duration: loadTestExecution.executionPlan.executionTime || '1m',
      id: `${loadTestExecution.id}-${index + 1}`,
    };

    archive.append(JSON.stringify(testConfig, null, 2), { name: `test-${index + 1}.json` });
  });

  // Generate README.md
  const readme = `# Load Test Execution: ${loadTestExecution.name}

## Instructions

1. Extract this ZIP file to a directory
2. Install the ApiMetrics CLI if not already installed:
   \`\`\`bash
   npm install -g @apimetrics/cli
   \`\`\`

3. Run each test file using the CLI:
   \`\`\`bash
   apimetrics run test-1.json --token YOUR_JWT_TOKEN
   apimetrics run test-2.json --token YOUR_JWT_TOKEN
   # ... run all test files
   \`\`\`

   Replace \`YOUR_JWT_TOKEN\` with your authentication token.

## Test Configuration

- Execution Plan: ${loadTestExecution.executionPlan.name}
- Duration: ${loadTestExecution.executionPlan.executionTime || '1m'}
- Delay Between Requests: ${loadTestExecution.executionPlan.delayBetweenRequests || '100ms'}
- Iterations: ${loadTestExecution.executionPlan.iterations || 1}

## Test Requests

${loadTestExecution.executionPlan.testRequests.map((req: any, index: number) =>
  `${index + 1}. ${req.httpMethod} ${req.endpoint}`
).join('\n')}

## Notes

- Results will be automatically uploaded to your ApiMetrics dashboard
- Make sure you have Vegeta installed for load testing
- The JWT token is required for authentication and result upload
`;

  archive.append(readme, { name: 'README.md' });

  await archive.finalize();

  const zipBuffer = Buffer.concat(buffers);

  // Set CORS headers explicitly for file download
  reply.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Authorization');
  reply.header('Access-Control-Expose-Headers', 'Content-Disposition');

  reply.header('Content-Type', 'application/zip');
  reply.header('Content-Disposition', `attachment; filename="${zipName}"`);
  reply.header('Content-Length', zipBuffer.length.toString());

  reply.send(zipBuffer);
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