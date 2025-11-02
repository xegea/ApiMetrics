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
  avgLatency: number;
  p95Latency: number;
  successRate: number;
  timestamp: string;
}

