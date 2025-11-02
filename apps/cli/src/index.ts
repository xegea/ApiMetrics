#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { z } from 'zod';
import { readTestConfig, runLoadTest, uploadResults } from './lib/test-runner';
import { TestConfig, TestResult } from '@apimetrics/shared';

const program = new Command();

program
  .name('apimetrics-cli')
  .description('ApiMetrics CLI for running and uploading load test results')
  .version('0.1.0')
  .option('--token <token>', 'Authentication token for API upload')
  .option('--api-url <url>', 'API endpoint URL (overrides APIMETRICS_API_URL env var)', process.env.APIMETRICS_API_URL)
  .option('--config <path>', 'Path to test.json file', 'test.json')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    console.log(chalk.blue('🚀 ApiMetrics CLI\n'));

    // Read test configuration
    console.log(chalk.gray('Reading test configuration...'));
    const testConfig = await readTestConfig(options.config);
    console.log(chalk.green(`✓ Loaded config: ${testConfig.target} @ ${testConfig.rps} RPS for ${testConfig.duration}\n`));

    // Run load test
    console.log(chalk.blue('Running load test...'));
    const testResult = await runLoadTest(testConfig);
    console.log(chalk.green('✓ Load test completed\n'));

    // Display summary
    console.log(chalk.bold('Test Results Summary:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  ID:           ${chalk.cyan(testResult.id)}`);
    console.log(`  Avg Latency:  ${chalk.yellow(testResult.avgLatency)}ms`);
    console.log(`  P95 Latency:  ${chalk.yellow(testResult.p95Latency)}ms`);
    console.log(`  Success Rate: ${chalk.green((testResult.successRate * 100).toFixed(2))}%`);
    console.log(chalk.gray('─'.repeat(50)) + '\n');

    // Upload results if API URL is provided
    if (options.apiUrl) {
      if (!options.token) {
        console.log(chalk.yellow('⚠ Warning: No --token provided. Upload may fail if authentication is required.\n'));
      }

      console.log(chalk.blue('Uploading results to API...'));
      await uploadResults(testResult, options.apiUrl, options.token);
      console.log(chalk.green(`✓ Results uploaded successfully to ${options.apiUrl}\n`));
    } else {
      console.log(chalk.yellow('⚠ No API URL provided. Skipping upload.\n'));
      console.log(chalk.gray('Set APIMETRICS_API_URL environment variable or use --api-url flag to upload results.'));
    }

    console.log(chalk.green('✨ Done!'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

