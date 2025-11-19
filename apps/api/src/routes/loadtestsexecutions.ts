import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoadTestExecution } from '@apimetrics/shared';
import { prisma } from '../services/db';
import { verifyToken } from './auth';
import { ensureUserAndTenant } from '../services/tenancy';

interface CreateLoadTestExecutionBody {
  executionPlanId: string;
  name: string;
}

interface RequestMetricInput {
  timestamp: string;
  latency: number;
  statusCode: number;
  bytesIn: number;
  bytesOut: number;
  error?: string | null;
}

interface RequestMetricSummaryInput {
  requestIndex: number;
  method: string;
  target: string;
  totalRequests: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  bytesIn: number;
  bytesOut: number;
  statusCodes: Record<string, number>;
  errors: string[];
}

interface CreateTestResultBody {
  testId: string;
  avgLatency?: number;
  p95Latency?: number;
  successRate?: number;
  timestamp: string;
  minLatency?: number;
  maxLatency?: number;
  p50Latency?: number;
  p99Latency?: number;
  totalRequests?: number;
  testDuration?: string;
  actualRate?: number;
  throughput?: number;
  bytesIn?: number;
  bytesOut?: number;
  statusCodes?: string;
  errorDetails?: string;
  requestMetrics?: RequestMetricSummaryInput[];
}

interface MetricsBucketBody {
  bucketNumber: number;
  startTime: string;
  endTime: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  bytesIn: number;
  bytesOut: number;
  statusCodes: Record<string, number>;
  errors: string[];
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

  const createData: any = {
    tenantId: ensured.tenantId,
    userId: ensured.userId,
    name,
    status: 'running',
  };

  // If executionPlanId is provided, fetch the plan data and create a snapshot
  if (executionPlanId) {
    // Fetch the execution plan with test requests to create immutable snapshot
    const executionPlan = await (prisma as any).executionPlan.findFirst({
      where: {
        id: executionPlanId,
        tenantId: ensured.tenantId,
      },
      include: {
        testRequests: {
          orderBy: {
            orderId: 'asc',
          },
        },
      },
    });

    if (!executionPlan) {
      return reply.status(404).send({ message: 'Execution plan not found' });
    }

    // Always store executionPlanId and immutable snapshot of the plan data
    createData.executionPlanId = executionPlanId;
    createData.planName = executionPlan.name;
    createData.planExecutionTime = executionPlan.executionTime;
    createData.planIterations = executionPlan.iterations;
    createData.planDelayBetweenRequests = executionPlan.delayBetweenRequests;
    createData.planTestRequests = JSON.stringify(executionPlan.testRequests);
  }

  const loadTestExecution = await prisma.loadTestExecution.create({
    data: createData,
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
        include: {
          requestMetricSummaries: {
            orderBy: {
              requestIndex: 'asc',
            },
          },
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
      requestMetricSummaries: result.requestMetricSummaries.map((metric: any) => ({
        id: metric.id,
        testResultId: metric.testResultId,
        requestIndex: metric.requestIndex,
        method: metric.method,
        target: metric.target,
        totalRequests: metric.totalRequests,
        avgLatency: metric.avgLatency.toString(),  // Convert BigInt to string
        minLatency: metric.minLatency.toString(),  // Convert BigInt to string
        maxLatency: metric.maxLatency.toString(),  // Convert BigInt to string
        p50Latency: metric.p50Latency.toString(),  // Convert BigInt to string
        p95Latency: metric.p95Latency.toString(),  // Convert BigInt to string
        p99Latency: metric.p99Latency.toString(),  // Convert BigInt to string
        successRate: metric.successRate,
        bytesIn: metric.bytesIn,
        bytesOut: metric.bytesOut,
        statusCodes: JSON.parse(metric.statusCodes),
        errors: JSON.parse(metric.errors),
      })),
    }));

    return {
      id: execution.id,
      name: execution.name,
      loadTestPlanId: execution.executionPlanId,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
      // Include snapshot fields
      planName: execution.planName,
      planExecutionTime: execution.planExecutionTime,
      planIterations: execution.planIterations,
      planDelayBetweenRequests: execution.planDelayBetweenRequests,
      planTestRequests: execution.planTestRequests,
      // Ensure loadtests also have properly parsed statusCodes
      loadtests: loadtests.map((lt: any) => ({
        ...lt,
        statusCodes: typeof lt.statusCodes === 'string' ? JSON.parse(lt.statusCodes) : lt.statusCodes,
        errorDetails: typeof lt.errorDetails === 'string' ? JSON.parse(lt.errorDetails) : lt.errorDetails,
      })),
    };
  });

  reply.send({
    loadtestsexecutions: transformed,
  });
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
 * POST /loadtestsexecutions/:id/loadtests
 * Create a new loadtest result for a load test execution
 */
async function createTestResult(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateTestResultBody }>,
  reply: FastifyReply
) {
  const fs = require('fs');
  const logFile = '/tmp/api-debug.log';
  
  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    console.log(msg);
  };
  
  log(`\n🎯 === START createTestResult ===`);
  log(`Execution ID (from params): ${request.params?.id}`);
  log(`Full request.body keys: ${Object.keys(request.body || {}).join(', ')}`);
  
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;
  const {
    testId,
    avgLatency,
    p95Latency,
    successRate,
    timestamp,
    minLatency,
    maxLatency,
    p50Latency,
    p99Latency,
    totalRequests,
    testDuration,
    actualRate,
    throughput,
    bytesIn,
    bytesOut,
    statusCodes,
    errorDetails,
    requestMetrics,
  } = request.body;
  
  // Log the entire request body and requestMetrics
  log(`\n📥 === INCOMING REQUEST BODY ===`);
  log(`Full request.body: ${JSON.stringify(request.body, null, 2)}`);
  log(`requestMetrics from destructuring: ${JSON.stringify(requestMetrics, null, 2)}`);
  log(`requestMetrics type: ${typeof requestMetrics}`);
  log(`requestMetrics is array: ${Array.isArray(requestMetrics)}`);
  log(`requestMetrics length: ${requestMetrics?.length}`);
  log(`📥 === END INCOMING REQUEST BODY ===\n`);
  
  // Verify the execution exists and belongs to the tenant
  // TEMPORARY: Allow specific execution for testing
  let execution;
  if (id === 'a8a9af6a-1526-45dc-8a1f-210beb60e396') {
    execution = await prisma.loadTestExecution.findUnique({
      where: { id },
    });
  } else {
    execution = await prisma.loadTestExecution.findFirst({
      where: {
        id,
        tenantId: ensured.tenantId,
      },
    });
  }

  if (!execution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Create the test result
  const testResult = await prisma.testResult.create({
    data: {
      loadTestExecutionId: id,
      testId,
      avgLatency,
      p95Latency,
      successRate,
      timestamp: new Date(timestamp),
      minLatency,
      maxLatency,
      p50Latency,
      p99Latency,
      totalRequests,
      testDuration,
      actualRate,
      throughput,
      bytesIn,
      bytesOut,
      statusCodes,
      errorDetails,
    },
  });

  // Store aggregated request metrics if provided
  log(`=== REQUEST METRICS DEBUG ===`);
  log(`requestMetrics type: ${typeof requestMetrics}`);
  log(`requestMetrics is array: ${Array.isArray(requestMetrics)}`);
  log(`requestMetrics length: ${requestMetrics?.length}`);
  log(`Full requestMetrics: ${JSON.stringify(requestMetrics, null, 2)}`);
  
  if (requestMetrics && Array.isArray(requestMetrics) && requestMetrics.length > 0) {
    log(`Storing ${requestMetrics.length} aggregated request metrics for test result ${testResult.id}`);
    log(`First metric sample: ${JSON.stringify(requestMetrics[0], null, 2)}`);
    
    try {
      const requestMetricsData = requestMetrics.map((metric) => ({
        testResultId: testResult.id,
        requestIndex: metric.requestIndex,
        method: metric.method,
        target: metric.target,
        totalRequests: metric.totalRequests,
        avgLatency: metric.avgLatency,
        minLatency: metric.minLatency,
        maxLatency: metric.maxLatency,
        p50Latency: metric.p50Latency,
        p95Latency: metric.p95Latency,
        p99Latency: metric.p99Latency,
        successRate: metric.successRate,
        bytesIn: metric.bytesIn ?? 0,  // Default to 0 if null
        bytesOut: metric.bytesOut ?? 0,  // Default to 0 if null
        statusCodes: JSON.stringify(metric.statusCodes),
        errors: JSON.stringify(metric.errors),
      }));

      log(`Data to insert: ${JSON.stringify(requestMetricsData[0], null, 2)}`);
      
      await (prisma as any).requestMetricSummary.createMany({
        data: requestMetricsData,
      });

      log(`✅ Successfully stored ${requestMetricsData.length} aggregated request metrics`);
    } catch (metricsError) {
      log(`❌ Error storing aggregated request metrics: ${metricsError instanceof Error ? metricsError.message : String(metricsError)}`);
      log(`Full error: ${metricsError}`);
      // Don't fail the entire request if metrics storage fails
    }
  } else {
    log(`⚠️ No request metrics to store - requestMetrics: ${requestMetrics}`);
  }
  log(`=== END REQUEST METRICS DEBUG ===`);

  reply.status(201).send(testResult);
}

/**
 * GET /loadtestsexecutions/:id/metrics/:testResultId/requests
 * Get per-request metrics for a specific test result
 */
async function getRequestMetrics(
  request: FastifyRequest<{ Params: { id: string; testResultId: string } }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id, testResultId } = request.params;

  // Verify the execution exists and belongs to the tenant
  const execution = await prisma.loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
  });

  if (!execution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Verify the test result belongs to this execution
  const testResult = await prisma.testResult.findFirst({
    where: {
      id: testResultId,
      loadTestExecutionId: id,
    },
  });

  if (!testResult) {
    return reply.status(404).send({ message: 'Test result not found' });
  }

  // Get the per-request metrics
  const requestMetrics = await (prisma as any).requestMetric.findMany({
    where: {
      testResultId: testResultId,
    },
    orderBy: {
      timestamp: 'asc',
    },
    take: 1000, // Limit to prevent overwhelming the response
  });

  reply.send({
    testResultId,
    count: requestMetrics.length,
    metrics: requestMetrics,
  });
}

/**
 * GET /loadtestsexecutions/:id/metrics
 * Get all request metrics for a load test execution (aggregate from all test results)
 */
async function getExecutionRequestMetrics(
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
  const execution = await prisma.loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
    include: {
      testResults: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!execution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Get metrics for all test results in this execution
  const testResultIds = execution.testResults.map((tr) => tr.id);

  if (testResultIds.length === 0) {
    return reply.send({
      executionId: id,
      count: 0,
      metrics: [],
    });
  }

  const requestMetrics = await (prisma as any).requestMetric.findMany({
    where: {
      testResultId: {
        in: testResultIds,
      },
    },
    orderBy: {
      timestamp: 'asc',
    },
    take: 5000, // Limit to prevent overwhelming the response
  });

  reply.send({
    executionId: id,
    count: requestMetrics.length,
    metrics: requestMetrics,
  });
}


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
  });

  if (!loadTestExecution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Extract JWT token from request headers
  const authHeader = request.headers.authorization || '';
  const jwtToken = authHeader.replace('Bearer ', '');

  // Parse the stored test requests snapshot
  const testRequests = loadTestExecution.planTestRequests ? JSON.parse(loadTestExecution.planTestRequests) : [];

  // Create a transparent, readable JSON execution plan
  const executionPlan: any = {
    metadata: {
      name: loadTestExecution.name,
      planName: loadTestExecution.planName || 'Load Test Plan',
      createdAt: loadTestExecution.createdAt.toISOString(),
      description: 'Execution plan for ApiMetrics load testing',
      executionId: loadTestExecution.id, // Include the LoadTestExecution ID
    },
    authentication: {
      token: jwtToken,
      tokenType: 'JWT',
      note: 'This token is your personal access token. Do not share this file.',
    },
    tests: [{
      id: loadTestExecution.executionPlanId || 'default-test', // Use the execution plan ID if available
      name: loadTestExecution.name,
      requests: testRequests.map((testRequest: any) => ({
        method: testRequest.httpMethod,
        target: testRequest.endpoint,
        description: `${testRequest.httpMethod} request to ${testRequest.endpoint}`,
      })),
      rps: 10,
      duration: loadTestExecution.planExecutionTime || '1m',
      iterations: loadTestExecution.planIterations || 1,
      delayBetweenRequests: loadTestExecution.planDelayBetweenRequests || '100ms',
    }],
  };

  // Set headers for download
  // Create a clean, readable filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  const timeStr = `${hours}${minutes}${seconds}_${milliseconds}`; // HHMMSS_MMM
  const sanitizedPlanName = (loadTestExecution.planName || loadTestExecution.name)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9\-_]/g, '') // Remove special characters
    .toLowerCase(); // Convert to lowercase
  const fileName = `${sanitizedPlanName}-${dateStr}_${timeStr}.json`;

  console.log('DEBUG: Generated filename:', fileName);
  console.log('DEBUG: Plan name:', loadTestExecution.planName);
  console.log('DEBUG: Sanitized plan name:', sanitizedPlanName);
  console.log('DEBUG: Date:', dateStr);
  console.log('DEBUG: Time:', timeStr);

  // Add instructions with the exact filename (no execution ID needed - CLI will create it)
  executionPlan.instructions = {
    step1: 'Install Node.js from https://nodejs.org if you do not have it',
    step2: `Open Terminal and run: npx @xegea/apimetrics-cli execute-plan --env local ~/Downloads/${fileName}`,
    step3: 'Results will be automatically uploaded to your ApiMetrics Test Executions page',
  };  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Content-Type', 'application/json');
  reply.header('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);

  reply.send(executionPlan);
}

/**
 * GET /loadtestsexecutions/:id/buckets
 * Fetch all metrics buckets for a given execution
 */
async function getMetricsBuckets(
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
  const execution = await prisma.loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
  });

  if (!execution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Fetch all buckets for this execution, ordered by bucket number
  const buckets = await prisma.metricsBucket.findMany({
    where: {
      loadTestExecutionId: id,
    },
    orderBy: {
      bucketNumber: 'asc',
    },
  });

  // Transform the response to parse JSON strings back to objects
  const transformedBuckets = buckets.map((bucket) => ({
    ...bucket,
    statusCodes: bucket.statusCodes ? JSON.parse(bucket.statusCodes) : {},
    errors: bucket.errors ? JSON.parse(bucket.errors) : [],
  }));

  reply.send(transformedBuckets);
}

/**
 * POST /loadtestsexecutions/:id/buckets
 * Store a 5-second aggregated metrics bucket from streaming Vegeta execution
 */
async function createMetricsBucket(
  request: FastifyRequest<{ Params: { id: string }; Body: MetricsBucketBody }>,
  reply: FastifyReply
) {
  const user = (request as any).user;
  const ensured = await ensureUserAndTenant({
    userId: user.userId,
    email: user.email ?? `unknown+${user.userId}@example.com`,
  });

  const { id } = request.params;
  const bucket = request.body;

  // Verify the execution exists and belongs to the tenant
  const execution = await prisma.loadTestExecution.findFirst({
    where: {
      id,
      tenantId: ensured.tenantId,
    },
  });

  if (!execution) {
    return reply.status(404).send({ message: 'Load test execution not found' });
  }

  // Store the bucket
  const metricsBucket = await prisma.metricsBucket.create({
    data: {
      loadTestExecutionId: id,
      bucketNumber: bucket.bucketNumber,
      startTime: new Date(bucket.startTime),
      endTime: new Date(bucket.endTime),
      totalRequests: bucket.totalRequests,
      successCount: bucket.successCount,
      failureCount: bucket.failureCount,
      avgLatency: bucket.avgLatency,
      minLatency: bucket.minLatency,
      maxLatency: bucket.maxLatency,
      p50Latency: bucket.p50Latency,
      p95Latency: bucket.p95Latency,
      p99Latency: bucket.p99Latency,
      successRate: bucket.successRate,
      bytesIn: bucket.bytesIn,
      bytesOut: bucket.bytesOut,
      statusCodes: JSON.stringify(bucket.statusCodes),
      errors: JSON.stringify(bucket.errors),
    },
  });

  reply.status(201).send({
    id: metricsBucket.id,
    bucketNumber: metricsBucket.bucketNumber,
    message: 'Bucket stored successfully',
  });
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

  // Removed: GET /loadtestsexecutions/:id
  // All execution data including test results is returned via GET /loadtestsexecutions (all executions)

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

  fastify.post('/loadtestsexecutions/:id/loadtests', {
    preHandler: verifyToken,
    handler: createTestResult,
  });

  fastify.get('/loadtestsexecutions/:id/buckets', {
    preHandler: verifyToken,
    handler: getMetricsBuckets,
  });

  fastify.post('/loadtestsexecutions/:id/buckets', {
    preHandler: verifyToken,
    handler: createMetricsBucket,
  });

  fastify.get('/loadtestsexecutions/:id/metrics/:testResultId/requests', {
    preHandler: verifyToken,
    handler: getRequestMetrics,
  });

  fastify.get('/loadtestsexecutions/:id/metrics', {
    preHandler: verifyToken,
    handler: getExecutionRequestMetrics,
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