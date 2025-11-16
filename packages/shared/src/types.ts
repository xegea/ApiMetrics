/**
 * Configuration for a load test
 */
export interface TestConfig {
  target: string;
  rps: number;
  duration: string;
  project: string;
}

/**
 * Results from a load test execution
 */
export interface TestResult {
  id: string;
  testId: string;
  avgLatency: number;
  p95Latency: number;
  successRate: number;
  timestamp: string;
  // Detailed metrics from Vegeta
  minLatency?: number; // Minimum latency in nanoseconds
  maxLatency?: number; // Maximum latency in nanoseconds
  p50Latency?: number; // P50 latency in nanoseconds
  p99Latency?: number; // P99 latency in nanoseconds
  totalRequests?: number; // Total number of requests made
  testDuration?: string; // Duration of the test (e.g., "30.001s")
  actualRate?: number; // Actual RPS achieved
  throughput?: number; // Throughput in req/sec
  bytesIn?: number; // Total bytes received
  bytesOut?: number; // Total bytes sent
  statusCodes?: Record<string, number>; // Status code counts
  errorDetails?: string[]; // Error details
}

/**
 * A test request within an execution plan
 */
export interface TestRequest {
  id: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateTestRequestRequest {
  executionPlanId: string;
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

/**
 * A load test execution with optional result fields
 */
export interface LoadTestExecution {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * An individual execution from the API metrics CLI
 */
export interface Execution {
  id: string;
  loadTestExecutionId: string;
  status: 'running' | 'completed' | 'failed';
  command: string;
  output?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  // Metrics from the CLI execution
  avgLatency?: number; // Average latency in nanoseconds
  p95Latency?: number; // P95 latency in nanoseconds
  successRate?: number; // Success rate as decimal (0-1)
  resultTimestamp?: string; // Timestamp of when results were recorded
  minLatency?: number; // Minimum latency in nanoseconds
  maxLatency?: number; // Maximum latency in nanoseconds
  p50Latency?: number; // P50 latency in nanoseconds
  p99Latency?: number; // P99 latency in nanoseconds
  totalRequests?: number; // Total number of requests made
  testDuration?: string; // Duration of the test (e.g., "30.001s")
  actualRate?: number; // Actual RPS achieved
  throughput?: number; // Throughput in req/sec
  bytesIn?: number; // Total bytes received
  bytesOut?: number; // Total bytes sent
  statusCodes?: Record<string, number>; // Status code counts
  errorDetails?: string[]; // Error details
}

/**
 * A load test execution with its loadtests
 */
export interface LoadTestExecutionWithExecutions {
  id: string;
  name: string;
  loadTestPlanId: string;
  createdAt: string;
  updatedAt: string;
  loadtests: Execution[];
}

/**
 * An execution plan with its load test executions
 */
export interface LoadTestPlan {
  id: string;
  name: string;
  executionTime: string;
  delayBetweenRequests?: string;
  iterations: number;
  rampUpPeriods?: string;
  createdAt: string;
  updatedAt: string;
  loadTestExecutions: LoadTestExecution[];
}

