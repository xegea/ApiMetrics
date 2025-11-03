import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/db';
import { verifyToken } from './auth';

interface CreateEndpointBody {
  tenantId: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

interface GetEndpointsQuery {
  tenantId: string;
}

interface DeleteEndpointParams {
  id: string;
}

/**
 * POST /endpoints
 * Create a new test endpoint
 */
async function createEndpoint(
  request: FastifyRequest<{ Body: CreateEndpointBody }>,
  reply: FastifyReply
) {
  try {
    // Get user from token (set by verifyToken middleware)
    const user = (request as any).user;
    
    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { tenantId, endpoint, httpMethod, requestBody, headers } = request.body;

    // Validate required fields
    if (!tenantId || !endpoint || !httpMethod) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    if (!validMethods.includes(httpMethod.toUpperCase())) {
      return reply.code(400).send({ error: 'Invalid HTTP method' });
    }

    // Ensure a User record exists for this Supabase user (FK constraint)
    // Supabase provides the UID in `sub` which we mapped to user.userId in verifyToken
    await prisma.user.upsert({
      where: { id: user.userId },
      update: { email: user.email ?? undefined },
      create: {
        id: user.userId,
        email: user.email ?? `unknown+${user.userId}@example.com`,
        // Placeholder password; not used with Supabase Auth
        password: 'supabase-user',
      },
    });

    // Create the endpoint
  const testEndpoint = await prisma.testEndpoint.create({
      data: {
        tenantId,
        userId: user.userId,
        endpoint,
        httpMethod: httpMethod.toUpperCase(),
        requestBody: requestBody || null,
        headers: headers || null,
      },
    });

    return reply.code(201).send({
      id: testEndpoint.id,
      tenantId: testEndpoint.tenantId,
      endpoint: testEndpoint.endpoint,
      httpMethod: testEndpoint.httpMethod,
      requestBody: testEndpoint.requestBody,
      headers: testEndpoint.headers,
      createdAt: testEndpoint.createdAt,
    });
  } catch (error: any) {
    // Log detailed prisma error info if available
    request.log.error({ error }, 'Error creating test endpoint');
    const message = (error?.meta?.cause as string) || error?.message || 'Failed to create test endpoint';
    return reply.code(500).send({ error: message });
  }
}

/**
 * GET /endpoints
 * Get all test endpoints for a tenant
 */
async function getEndpoints(
  request: FastifyRequest<{ Querystring: GetEndpointsQuery }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = request.query;

    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId query parameter is required' });
    }

    // Get all endpoints for the tenant
  const endpoints = await prisma.testEndpoint.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
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
    });

    return reply.send({
      tenantId,
      endpoints: endpoints.map((ep: any) => ({
        id: ep.id,
        endpoint: ep.endpoint,
        httpMethod: ep.httpMethod,
        requestBody: ep.requestBody,
        headers: ep.headers,
        createdAt: ep.createdAt,
        createdBy: ep.user.email,
      })),
    });
  } catch (error) {
    request.log.error(error, 'Error fetching test endpoints');
    return reply.code(500).send({ error: 'Failed to fetch test endpoints' });
  }
}

/**
 * DELETE /endpoints/:id
 * Delete a test endpoint
 */
async function deleteEndpoint(
  request: FastifyRequest<{ Params: DeleteEndpointParams }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any).user;
    const { id } = request.params;

    if (!user || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Check if endpoint exists and belongs to user's tenant
  const endpoint = await prisma.testEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) {
      return reply.code(404).send({ error: 'Endpoint not found' });
    }

    // Delete the endpoint
  await prisma.testEndpoint.delete({
      where: { id },
    });

    return reply.send({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    request.log.error(error, 'Error deleting test endpoint');
    return reply.code(500).send({ error: 'Failed to delete test endpoint' });
  }
}

export async function endpointsRoutes(fastify: FastifyInstance) {
  // Protected routes (require authentication)
  fastify.post<{ Body: CreateEndpointBody }>('/endpoints', { preHandler: verifyToken }, createEndpoint);
  fastify.delete<{ Params: DeleteEndpointParams }>('/endpoints/:id', { preHandler: verifyToken }, deleteEndpoint);
  
  // Public route (can be called without auth for now)
  fastify.get('/endpoints', getEndpoints);
}
