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
  executionPlanId: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  avgLatency?: number; // Average latency in nanoseconds
  p95Latency?: number; // P95 latency in nanoseconds
  successRate?: number; // Success rate as decimal (0-1)
  resultTimestamp?: string; // Timestamp of when results were recorded
  createdAt: string;
  updatedAt: string;
}

