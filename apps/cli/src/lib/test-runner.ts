import { readFileSync } from 'fs';
import { z } from 'zod';
import { TestConfig, TestResult } from '@apimetrics/shared';
import { execVegeta } from './vegeta';
import { compressAndUpload } from './upload';

const TestConfigSchema = z.object({
  target: z.string().url(),
  rps: z.number().positive(),
  duration: z.string(),
  project: z.string().min(1),
});

/**
 * Read and validate test.json configuration file
 */
export async function readTestConfig(filePath: string): Promise<TestConfig> {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const config = JSON.parse(fileContent);
    return TestConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid test configuration: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Test configuration file not found: ${filePath}`);
    }
    throw new Error(`Failed to read test configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run a load test and return results
 */
export async function runLoadTest(config: TestConfig): Promise<TestResult> {
  const vegetaResults = await execVegeta(config);

  // Generate a test result ID (simple UUID-like string)
  const id = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    avgLatency: vegetaResults.avgLatency,
    p95Latency: vegetaResults.p95Latency,
    successRate: vegetaResults.successRate,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Upload test results to the API endpoint
 */
export async function uploadResults(
  result: TestResult,
  apiUrl: string,
  token?: string
): Promise<void> {
  await compressAndUpload(result, apiUrl, token);
}

