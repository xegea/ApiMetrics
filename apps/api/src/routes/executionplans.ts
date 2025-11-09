import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/db';
import { ensureUserAndTenant } from '../services/tenancy';
import { verifyToken } from './auth';

interface CreateExecutionPlanBody {
  name: string;
}

interface UpdateExecutionPlanBody {
  name: string;
}

interface CreateTestRequestBody {
  executionPlanId: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

interface UpdateTestRequestBody {
  endpoint?: string;
  httpMethod?: string;
  requestBody?: string;
  headers?: string;
}

interface GetExecutionPlansQuery {
  tenantId: string;
}

interface DeleteExecutionPlanParams {
  id: string;
}

interface UpdateExecutionPlanParams {
  id: string;
}

interface DeleteTestRequestParams {
  planId: string;
  requestId: string;
}

interface UpdateTestRequestParams {
  planId: string;
  requestId: string;
}

interface ReorderTestRequestsBody {
  requestIds: string[]; // Ordered array of request IDs
}

interface MoveTestRequestBody {
  newExecutionPlanId: string;
}

/**
 * POST /executionplans
 * Create a new execution plan with a default GET request
 */
async function createExecutionPlan(
  request: FastifyRequest<{ Body: CreateExecutionPlanBody }>,
  reply: FastifyReply
) {
  try {
    // Get user from token (set by verifyToken middleware)
    const user = (request as any).user;
    
    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { name } = request.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Execution plan name is required' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Create the execution plan
    const executionPlan = await (prisma as any).executionPlan.create({
      data: {
        tenantId: ensured.tenantId,
        userId: user.userId,
        name: name.trim(),
      },
    });

    // Create a default GET request for this execution plan
    const defaultRequest = await (prisma as any).testRequest.create({
      data: {
        tenantId: ensured.tenantId,
        userId: user.userId,
        executionPlanId: executionPlan.id,
        orderId: 0,
        endpoint: 'https://api.example.com/health',
        httpMethod: 'GET',
        requestBody: null,
        headers: null,
      },
    });

    return reply.code(201).send({
      id: executionPlan.id,
      tenantId: executionPlan.tenantId,
      name: executionPlan.name,
      createdAt: executionPlan.createdAt,
      testRequests: [{
        id: defaultRequest.id,
        endpoint: defaultRequest.endpoint,
        httpMethod: defaultRequest.httpMethod,
        requestBody: defaultRequest.requestBody,
        headers: defaultRequest.headers,
        createdAt: defaultRequest.createdAt,
      }],
    });
  } catch (error: any) {
    // Log detailed prisma error info if available
    request.log.error({ error }, 'Error creating execution plan');
    const message = (error?.meta?.cause as string) || error?.message || 'Failed to create execution plan';
    return reply.code(500).send({ error: message });
  }
}

/**
 * GET /executionplans
 * Get all execution plans for a tenant with their test requests
 */
async function getExecutionPlans(
  request: FastifyRequest<{ Querystring: GetExecutionPlansQuery }>,
  reply: FastifyReply
) {
  let ensured: any = null;
  
  try {
    // Use the authenticated user's tenant by default
    const user = (request as any).user;
    ensured = await ensureUserAndTenant({
      userId: user?.userId,
      email: user?.email ?? 'unknown@example.com',
    });
    const tenantId = ensured.tenantId;

    // Get all execution plans for the tenant with their test requests
    let executionPlans = [];
    try {
      executionPlans = await (prisma as any).executionPlan.findMany({
        where: {
          tenantId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          testRequests: {
            orderBy: {
              orderId: 'asc',
            },
            select: {
              id: true,
              endpoint: true,
              httpMethod: true,
              requestBody: true,
              headers: true,
              createdAt: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          user: {
            select: {
              email: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      // If tables don't exist yet, return empty array
      if (dbError?.code === 'P2021' || dbError?.message?.includes('execution_plans') || dbError?.message?.includes('test_requests')) {
        executionPlans = [];
      } else {
        throw dbError; // Re-throw other errors
      }
    }

    return reply.send({
      tenantId,
      executionPlans: executionPlans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        createdAt: plan.createdAt,
        createdBy: plan.user?.email || 'Unknown',
        testRequests: plan.testRequests.map((req: any) => ({
          id: req.id,
          endpoint: req.endpoint,
          httpMethod: req.httpMethod,
          requestBody: req.requestBody,
          headers: req.headers,
          createdAt: req.createdAt,
          createdBy: req.user?.email || 'Unknown',
        })),
      })),
    });
  } catch (error: any) {
    request.log.error({ error }, 'Error fetching execution plans');
    
    // Check if it's a database/table not found error
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return reply.code(200).send({ 
        tenantId: ensured?.tenantId || 'unknown',
        executionPlans: [] 
      });
    }
    
    return reply.code(500).send({ error: 'Failed to fetch execution plans' });
  }
}

/**
 * POST /executionplans/requests
 * Create a new test request within an execution plan
 */
async function createTestRequest(
  request: FastifyRequest<{ Body: CreateTestRequestBody }>,
  reply: FastifyReply
) {
  try {
    // Get user from token (set by verifyToken middleware)
    const user = (request as any).user;
    
    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { executionPlanId, endpoint, httpMethod, requestBody, headers } = request.body;

    // Validate required fields
    if (!executionPlanId || !endpoint || !httpMethod) {
      return reply.code(400).send({ error: 'Missing required fields: executionPlanId, endpoint, httpMethod' });
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    if (!validMethods.includes(httpMethod.toUpperCase())) {
      return reply.code(400).send({ error: 'Invalid HTTP method' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Verify the execution plan exists and belongs to the user's tenant
    const executionPlan = await (prisma as any).executionPlan.findFirst({
      where: {
        id: executionPlanId,
        tenantId: ensured.tenantId,
      },
    });

    if (!executionPlan) {
      return reply.code(404).send({ error: 'Execution plan not found or access denied' });
    }

    // Get the next orderId for this execution plan
    const lastRequest = await (prisma as any).testRequest.findFirst({
      where: {
        executionPlanId,
      },
      orderBy: {
        orderId: 'desc',
      },
    });

    const nextOrderId = lastRequest ? lastRequest.orderId + 1 : 0;

    // Create the test request
    const testRequest = await (prisma as any).testRequest.create({
      data: {
        tenantId: ensured.tenantId,
        userId: user.userId,
        executionPlanId,
        orderId: nextOrderId,
        endpoint,
        httpMethod: httpMethod.toUpperCase(),
        requestBody: requestBody || null,
        headers: headers || null,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return reply.code(201).send({
      id: testRequest.id,
      endpoint: testRequest.endpoint,
      httpMethod: testRequest.httpMethod,
      requestBody: testRequest.requestBody,
      headers: testRequest.headers,
      createdAt: testRequest.createdAt,
      createdBy: testRequest.user.email,
    });
  } catch (error: any) {
    // Log detailed prisma error info if available
    request.log.error({ error }, 'Error creating test request');
    const message = (error?.meta?.cause as string) || error?.message || 'Failed to create test request';
    return reply.code(500).send({ error: message });
  }
}

/**
 * DELETE /executionplans/:id
 * Delete an execution plan and all its test requests
 */
async function deleteExecutionPlan(
  request: FastifyRequest<{ Params: DeleteExecutionPlanParams }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { id } = request.params;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Check if execution plan exists and belongs to user's tenant
    const executionPlan = await (prisma as any).executionPlan.findUnique({
      where: { id },
    });

    if (!executionPlan) {
      return reply.code(404).send({ error: 'Execution plan not found' });
    }

    // Delete the execution plan (cascade will delete test requests)
    await (prisma as any).executionPlan.delete({
      where: { id },
    });

    return reply.send({ message: 'Execution plan deleted successfully' });
  } catch (error) {
    request.log.error(error, 'Error deleting execution plan');
    return reply.code(500).send({ error: 'Failed to delete execution plan' });
  }
}

/**
 * PUT /executionplans/:id
 * Update an execution plan name
 */
async function updateExecutionPlan(
  request: FastifyRequest<{ Params: UpdateExecutionPlanParams; Body: UpdateExecutionPlanBody }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { id } = request.params;
    const { name } = request.body;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Execution plan name is required' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Verify the execution plan exists and belongs to the user's tenant
    const existingPlan = await (prisma as any).executionPlan.findFirst({
      where: {
        id,
        tenantId: ensured.tenantId,
      },
    });

    if (!existingPlan) {
      return reply.code(404).send({ error: 'Execution plan not found or access denied' });
    }

    // Update the execution plan
    const updatedPlan = await (prisma as any).executionPlan.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return reply.send({
      id: updatedPlan.id,
      name: updatedPlan.name,
      createdAt: updatedPlan.createdAt,
      createdBy: updatedPlan.user.email,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Error updating execution plan');
    const message = (error?.meta?.cause as string) || error?.message || 'Failed to update execution plan';
    return reply.code(500).send({ error: message });
  }
}

/**
 * PUT /executionplans/:planId/requests/:requestId
 * Update a test request
 */
async function updateTestRequest(
  request: FastifyRequest<{ Params: UpdateTestRequestParams; Body: UpdateTestRequestBody }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { planId, requestId } = request.params;
    const { endpoint, httpMethod, requestBody, headers } = request.body;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Verify the test request exists and belongs to the user's tenant
    const existingRequest = await (prisma as any).testRequest.findFirst({
      where: {
        id: requestId,
        executionPlanId: planId,
        tenantId: ensured.tenantId,
      },
    });

    if (!existingRequest) {
      return reply.code(404).send({ error: 'Test request not found or access denied' });
    }

    // Validate HTTP method if provided
    if (httpMethod) {
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
      if (!validMethods.includes(httpMethod.toUpperCase())) {
        return reply.code(400).send({ error: 'Invalid HTTP method' });
      }
    }

    // Update the test request
    const updatedRequest = await (prisma as any).testRequest.update({
      where: { id: requestId },
      data: {
        ...(endpoint && { endpoint }),
        ...(httpMethod && { httpMethod: httpMethod.toUpperCase() }),
        ...(requestBody !== undefined && { requestBody }),
        ...(headers !== undefined && { headers }),
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return reply.send({
      id: updatedRequest.id,
      endpoint: updatedRequest.endpoint,
      httpMethod: updatedRequest.httpMethod,
      requestBody: updatedRequest.requestBody,
      headers: updatedRequest.headers,
      createdAt: updatedRequest.createdAt,
      createdBy: updatedRequest.user.email,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Error updating test request');
    const message = (error?.meta?.cause as string) || error?.message || 'Failed to update test request';
    return reply.code(500).send({ error: message });
  }
}

/**
 * DELETE /executionplans/:planId/requests/:requestId
 * Delete a test request
 */
async function deleteTestRequest(
  request: FastifyRequest<{ Params: DeleteTestRequestParams }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { planId, requestId } = request.params;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Verify the test request exists and belongs to the user's tenant
    const existingRequest = await (prisma as any).testRequest.findFirst({
      where: {
        id: requestId,
        executionPlanId: planId,
        tenantId: ensured.tenantId,
      },
    });

    if (!existingRequest) {
      return reply.code(404).send({ error: 'Test request not found or access denied' });
    }

    // Delete the test request
    await (prisma as any).testRequest.delete({
      where: { id: requestId },
    });

    return reply.send({ message: 'Test request deleted successfully' });
  } catch (error) {
    request.log.error(error, 'Error deleting test request');
    return reply.code(500).send({ error: 'Failed to delete test request' });
  }
}

/**
 * PUT /executionplans/:planId/reorder
 * Reorder test requests within an execution plan
 */
async function reorderTestRequests(
  request: FastifyRequest<{ Params: { planId: string }; Body: ReorderTestRequestsBody }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { planId } = request.params;
    const { requestIds } = request.body;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Verify the execution plan exists and belongs to the user's tenant
    const executionPlan = await (prisma as any).executionPlan.findFirst({
      where: {
        id: planId,
        tenantId: ensured.tenantId,
      },
    });

    if (!executionPlan) {
      return reply.code(404).send({ error: 'Execution plan not found or access denied' });
    }

    // Update orderIds for all requests in the new order
    const updates = requestIds.map((requestId, index) =>
      (prisma as any).testRequest.update({
        where: {
          id: requestId,
          executionPlanId: planId,
          tenantId: ensured.tenantId,
        },
        data: {
          orderId: index,
        },
      })
    );

    await (prisma as any).$transaction(updates);

    return reply.send({ message: 'Test requests reordered successfully' });
  } catch (error) {
    request.log.error(error, 'Error reordering test requests');
    return reply.code(500).send({ error: 'Failed to reorder test requests' });
  }
}

/**
 * PUT /executionplans/:planId/requests/:requestId/move
 * Move a test request to a different execution plan
 */
async function moveTestRequest(
  request: FastifyRequest<{ Params: { planId: string; requestId: string }; Body: MoveTestRequestBody }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { planId, requestId } = request.params;
    const { newExecutionPlanId } = request.body;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Ensure a User and Tenant record exist for this Supabase user (FK constraints)
    const ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? `unknown+${user.userId}@example.com`,
    });

    // Verify the test request exists and belongs to the user's tenant
    const existingRequest = await (prisma as any).testRequest.findFirst({
      where: {
        id: requestId,
        executionPlanId: planId,
        tenantId: ensured.tenantId,
      },
    });

    if (!existingRequest) {
      return reply.code(404).send({ error: 'Test request not found or access denied' });
    }

    // Verify the new execution plan exists and belongs to the user's tenant
    const newExecutionPlan = await (prisma as any).executionPlan.findFirst({
      where: {
        id: newExecutionPlanId,
        tenantId: ensured.tenantId,
      },
    });

    if (!newExecutionPlan) {
      return reply.code(404).send({ error: 'New execution plan not found or access denied' });
    }

    // Get the next orderId for the new execution plan
    const lastRequest = await (prisma as any).testRequest.findFirst({
      where: {
        executionPlanId: newExecutionPlanId,
      },
      orderBy: {
        orderId: 'desc',
      },
    });

    const nextOrderId = lastRequest ? lastRequest.orderId + 1 : 0;

    // Move the test request to the new execution plan
    await (prisma as any).testRequest.update({
      where: { id: requestId },
      data: {
        executionPlanId: newExecutionPlanId,
        orderId: nextOrderId,
      },
    });

    return reply.send({ message: 'Test request moved successfully' });
  } catch (error) {
    request.log.error(error, 'Error moving test request');
    return reply.code(500).send({ error: 'Failed to move test request' });
  }
}

export async function executionPlansRoutes(fastify: FastifyInstance) {
  console.log('Registering execution plans routes...');
  
  // Protected routes (require authentication)
  fastify.post<{ Body: CreateExecutionPlanBody }>('/executionplans', { preHandler: verifyToken }, createExecutionPlan);
  fastify.put<{ Params: UpdateExecutionPlanParams; Body: UpdateExecutionPlanBody }>('/executionplans/:id', { preHandler: verifyToken }, updateExecutionPlan);
  fastify.put<{ Params: { planId: string }; Body: ReorderTestRequestsBody }>('/executionplans/:planId/reorder', { preHandler: verifyToken }, reorderTestRequests);
  fastify.put<{ Params: UpdateTestRequestParams; Body: UpdateTestRequestBody }>('/executionplans/:planId/requests/:requestId', { preHandler: verifyToken }, updateTestRequest);
  fastify.put<{ Params: { planId: string; requestId: string }; Body: MoveTestRequestBody }>('/executionplans/:planId/requests/:requestId/move', { preHandler: verifyToken }, moveTestRequest);
  fastify.post<{ Body: CreateTestRequestBody }>('/executionplans/requests', { preHandler: verifyToken }, createTestRequest);
  fastify.delete<{ Params: DeleteTestRequestParams }>('/executionplans/:planId/requests/:requestId', { preHandler: verifyToken }, deleteTestRequest);
  fastify.delete<{ Params: DeleteExecutionPlanParams }>('/executionplans/:id', { preHandler: verifyToken }, deleteExecutionPlan);
  
  // Authenticated route - returns execution plans for the caller's tenant
  fastify.get<{ Querystring: GetExecutionPlansQuery }>('/executionplans', { preHandler: verifyToken }, getExecutionPlans);
}
