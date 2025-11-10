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

  app.put('/loadtestexecutions/:id', {
    preHandler: verifyToken,
    handler: updateLoadTestExecution,
  });

  app.delete('/loadtestexecutions/:id', {
    preHandler: verifyToken,
    handler: deleteLoadTestExecution,
  });
}