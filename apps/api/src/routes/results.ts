import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TestResult } from '@apimetrics/shared';
import { prisma } from '../services/db';
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

/**
 * POST /results
 * Accept uploaded JSON from CLI
 */
async function postResults(
  request: FastifyRequest<{ Body: PostResultsBody | Buffer }>,
  reply: FastifyReply
) {
  try {
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

    // Save to database
    const saved = await prisma.testResult.upsert({
      where: { testId: result.id },
      update: {
        avgLatency: result.avgLatency,
        p95Latency: result.p95Latency,
        successRate: result.successRate,
        timestamp: new Date(result.timestamp),
      },
      create: {
        testId: result.id,
        avgLatency: result.avgLatency,
        p95Latency: result.p95Latency,
        successRate: result.successRate,
        timestamp: new Date(result.timestamp),
      },
    });

    return reply.code(201).send({
      id: saved.testId,
      message: 'Test result saved successfully',
    });
  } catch (error) {
    request.log.error(error, 'Error saving test result');
    return reply.code(500).send({ error: 'Failed to save test result' });
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

    const result = await prisma.testResult.findUnique({
      where: { testId: id },
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
    const results = await prisma.testResult.findMany({
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
  fastify.post('/results', postResults);
  fastify.get('/results', listResults);
  fastify.get('/results/:id', getResults);
}

