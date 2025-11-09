import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TestResult } from '@apimetrics/shared';
import { prisma } from '../services/db';
import { verifyToken } from './auth';
import { ensureUserAndTenant } from '../services/tenancy';
import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

interface PostResultsBody {
  id: string;
  avgLatency: number;
  p95Latency: number;
  successRate: number;
  timestamp: string;
}

interface GetResultsParams {
  id: string;
}

interface SeedResultsBody {
  count?: number; // number of rows to generate
  project?: string; // optional project label
  tenantId?: string; // optional override
  userId?: string;   // optional override
}

/**
 * POST /results
 * Accept uploaded JSON from CLI
 */
async function postResults(
  request: FastifyRequest<{ Body: PostResultsBody | Buffer }>,
  reply: FastifyReply
) {
  let result: PostResultsBody;

    // Check if content is gzipped
    const contentType = request.headers['content-encoding'];

    if (contentType === 'gzip') {
      // Gzipped content comes as Buffer
      const jsonData = await gunzipAsync(request.body as Buffer);
      result = JSON.parse(jsonData.toString('utf-8'));
    } else if (Buffer.isBuffer(request.body)) {
      // Raw buffer (shouldn't happen with Fastify's default parser)
      result = JSON.parse(request.body.toString('utf-8'));
    } else {
      // Already parsed by Fastify
      result = request.body as PostResultsBody;
    }

    // Validate required fields
    if (!result.id || typeof result.avgLatency !== 'number' || typeof result.successRate !== 'number') {
      return reply.code(400).send({ error: 'Invalid test result data' });
    }

    // Get user info - authentication is now required for POST
    let user = (request as any).user;
    let ensured: any;
    
    const isLocal = process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development';
    
    if (!user?.userId) {
      // This should not happen since POST requires auth, but fallback for safety
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    ensured = await ensureUserAndTenant({
      userId: user.userId,
      email: user.email ?? 'unknown@example.com',
    });

    try {
      // Save to database with tenant/user context
      const saved = await prisma.testResult.create({
        data: ({
          testId: result.id,
          avgLatency: result.avgLatency,
          p95Latency: result.p95Latency,
          successRate: result.successRate,
          timestamp: new Date(result.timestamp),
          tenantId: ensured.tenantId,
          userId: ensured.userId,
        } as any),
      });

      return reply.code(201).send({
        id: saved.testId,
        message: 'Test result saved successfully',
      });
    } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    request.log.error(error, 'Error saving test result');
    console.error('Error saving test result:', errorMessage);
    return reply.code(500).send({ error: 'Failed to save test result', details: errorMessage });
  }
}

/**
 * GET /results/:id
 * Return metrics for dashboard
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
    const ensured = await ensureUserAndTenant({ userId: user.userId, email: user.email ?? 'unknown@example.com' });

    const result = await prisma.testResult.findFirst({
      where: ({ testId: id, tenantId: ensured.tenantId } as any),
      orderBy: { timestamp: 'desc' },
    });

    if (!result) {
      return reply.code(404).send({ error: 'Test result not found' });
    }

    // Return in the format expected by the dashboard
    const response: TestResult = {
      id: result.testId,
      avgLatency: result.avgLatency,
      p95Latency: result.p95Latency,
      successRate: result.successRate,
      timestamp: result.timestamp.toISOString(),
    };

    return reply.send(response);
  } catch (error) {
    request.log.error(error, 'Error fetching test result');
    return reply.code(500).send({ error: 'Failed to fetch test result' });
  }
}

/**
 * GET /results
 * List all test results (optional, for dashboard)
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
    const ensured = await ensureUserAndTenant({ userId: user.userId, email: user.email ?? 'unknown@example.com' });

    const results = await prisma.testResult.findMany({
      where: ({ tenantId: ensured.tenantId } as any),
      orderBy: { timestamp: 'desc' },
      take: 100, // Limit to recent 100 results
    });

    const response = results.map((result) => ({
      id: result.testId,
      avgLatency: result.avgLatency,
      p95Latency: result.p95Latency,
      successRate: result.successRate,
      timestamp: result.timestamp.toISOString(),
    }));

    return reply.send(response);
  } catch (error) {
    request.log.error(error, 'Error listing test results');
    return reply.code(500).send({ error: 'Failed to list test results' });
  }
}

export async function resultsRoutes(fastify: FastifyInstance) {
  // POST requires authentication to prevent unauthorized submissions
  fastify.post<{ Body: PostResultsBody | Buffer }>('/results', { preHandler: verifyToken }, postResults);
  
  fastify.get('/results', { preHandler: verifyToken }, listResults);
  fastify.get<{ Params: GetResultsParams }>('/results/:id', { preHandler: verifyToken }, getResults);

  // Seed random test results for the authenticated user's tenant
  fastify.post<{ Body: SeedResultsBody }>('/results/seed', { preHandler: verifyToken }, async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user?.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Allow optional override via body (both must be provided together)
      let tenantId = request.body?.tenantId;
      let userId = request.body?.userId;
      if (!tenantId || !userId) {
        const ensured = await ensureUserAndTenant({ userId: user.userId, email: user.email ?? 'unknown@example.com' });
        tenantId = ensured.tenantId;
        userId = ensured.userId;
      }
      const count = Math.max(1, Math.min(200, Number(request.body?.count ?? 20)));
      const project = request.body?.project ?? 'demo';

      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const rand = (min: number, max: number) => Math.random() * (max - min) + min;

      const rows = Array.from({ length: count }).map((_, i) => {
        const avg = Math.round(rand(50, 600));
        const p95 = Math.round(avg + rand(20, 300));
        const sr = Math.min(0.999, Math.max(0.6, rand(0.85, 0.99)));
        const ts = new Date(now - Math.floor(rand(0, 30)) * dayMs - Math.floor(rand(0, 86400)) * 1000);
        const id = `seed-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
        return {
          testId: id,
          avgLatency: avg,
          p95Latency: Math.max(p95, avg + 5),
          successRate: sr,
          timestamp: ts,
          project,
          tenantId: tenantId!,
          userId: userId!,
          createdAt: ts,
          updatedAt: ts,
        };
      });

      // Use createMany for performance; ignore duplicates on testId if any
      const created = await prisma.testResult.createMany({
        data: rows,
        skipDuplicates: true,
      });

      return reply.code(201).send({ inserted: created.count, tenantId, project });
    } catch (error) {
      request.log.error(error, 'Error seeding test results');
      return reply.code(500).send({ error: 'Failed to seed test results' });
    }
  });
}

