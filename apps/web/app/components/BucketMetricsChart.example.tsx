/**
 * Example usage of BucketMetricsChart component
 * 
 * This file demonstrates how to use the unified performance chart
 * with sample load testing data.
 */

import { BucketMetricsChart } from './BucketMetricsChart';

// Sample data structure for the chart
const sampleBuckets: Array<{
  id: string;
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
}> = [
  {
    id: '1',
    bucketNumber: 1,
    startTime: '2025-11-22T10:00:00Z',
    endTime: '2025-11-22T10:00:10Z',
    totalRequests: 120,
    successCount: 115,
    failureCount: 5,
    avgLatency: 145.5,
    minLatency: 50,
    maxLatency: 320,
    p50Latency: 130,
    p95Latency: 280,
    p99Latency: 310,
    successRate: 95.83,
    bytesIn: 12000,
    bytesOut: 8000,
    statusCodes: { '200': 115, '500': 5 },
    errors: ['Connection timeout'],
  },
  {
    id: '2',
    bucketNumber: 2,
    startTime: '2025-11-22T10:00:10Z',
    endTime: '2025-11-22T10:00:20Z',
    totalRequests: 150,
    successCount: 145,
    failureCount: 5,
    avgLatency: 168.2,
    minLatency: 60,
    maxLatency: 420,
    p50Latency: 155,
    p95Latency: 380,
    p99Latency: 410,
    successRate: 96.67,
    bytesIn: 15000,
    bytesOut: 10000,
    statusCodes: { '200': 145, '500': 5 },
    errors: [],
  },
  {
    id: '3',
    bucketNumber: 3,
    startTime: '2025-11-22T10:00:20Z',
    endTime: '2025-11-22T10:00:30Z',
    totalRequests: 180,
    successCount: 165,
    failureCount: 15,
    avgLatency: 210.8,
    minLatency: 70,
    maxLatency: 650,
    p50Latency: 185,
    p95Latency: 580,
    p99Latency: 640,
    successRate: 91.67,
    bytesIn: 18000,
    bytesOut: 12000,
    statusCodes: { '200': 165, '500': 10, '502': 5 },
    errors: ['Gateway timeout', 'Internal server error'],
  },
  {
    id: '4',
    bucketNumber: 4,
    startTime: '2025-11-22T10:00:30Z',
    endTime: '2025-11-22T10:00:40Z',
    totalRequests: 200,
    successCount: 190,
    failureCount: 10,
    avgLatency: 192.3,
    minLatency: 55,
    maxLatency: 480,
    p50Latency: 170,
    p95Latency: 420,
    p99Latency: 470,
    successRate: 95.0,
    bytesIn: 20000,
    bytesOut: 15000,
    statusCodes: { '200': 190, '500': 8, '503': 2 },
    errors: ['Service unavailable'],
  },
  {
    id: '5',
    bucketNumber: 5,
    startTime: '2025-11-22T10:00:40Z',
    endTime: '2025-11-22T10:00:50Z',
    totalRequests: 220,
    successCount: 210,
    failureCount: 10,
    avgLatency: 175.5,
    minLatency: 45,
    maxLatency: 390,
    p50Latency: 160,
    p95Latency: 350,
    p99Latency: 380,
    successRate: 95.45,
    bytesIn: 22000,
    bytesOut: 16000,
    statusCodes: { '200': 210, '500': 10 },
    errors: [],
  },
  {
    id: '6',
    bucketNumber: 6,
    startTime: '2025-11-22T10:00:50Z',
    endTime: '2025-11-22T10:01:00Z',
    totalRequests: 250,
    successCount: 240,
    failureCount: 10,
    avgLatency: 158.7,
    minLatency: 40,
    maxLatency: 340,
    p50Latency: 145,
    p95Latency: 310,
    p99Latency: 335,
    successRate: 96.0,
    bytesIn: 25000,
    bytesOut: 18000,
    statusCodes: { '200': 240, '500': 10 },
    errors: [],
  },
  {
    id: '7',
    bucketNumber: 7,
    startTime: '2025-11-22T10:01:00Z',
    endTime: '2025-11-22T10:01:10Z',
    totalRequests: 280,
    successCount: 260,
    failureCount: 20,
    avgLatency: 195.2,
    minLatency: 50,
    maxLatency: 550,
    p50Latency: 175,
    p95Latency: 490,
    p99Latency: 540,
    successRate: 92.86,
    bytesIn: 28000,
    bytesOut: 20000,
    statusCodes: { '200': 260, '500': 15, '504': 5 },
    errors: ['Gateway timeout', 'Connection refused'],
  },
  {
    id: '8',
    bucketNumber: 8,
    startTime: '2025-11-22T10:01:10Z',
    endTime: '2025-11-22T10:01:20Z',
    totalRequests: 300,
    successCount: 285,
    failureCount: 15,
    avgLatency: 172.8,
    minLatency: 42,
    maxLatency: 420,
    p50Latency: 155,
    p95Latency: 380,
    p99Latency: 410,
    successRate: 95.0,
    bytesIn: 30000,
    bytesOut: 22000,
    statusCodes: { '200': 285, '500': 15 },
    errors: [],
  },
  {
    id: '9',
    bucketNumber: 9,
    startTime: '2025-11-22T10:01:20Z',
    endTime: '2025-11-22T10:01:30Z',
    totalRequests: 320,
    successCount: 310,
    failureCount: 10,
    avgLatency: 148.3,
    minLatency: 38,
    maxLatency: 310,
    p50Latency: 135,
    p95Latency: 280,
    p99Latency: 305,
    successRate: 96.88,
    bytesIn: 32000,
    bytesOut: 24000,
    statusCodes: { '200': 310, '500': 10 },
    errors: [],
  },
  {
    id: '10',
    bucketNumber: 10,
    startTime: '2025-11-22T10:01:30Z',
    endTime: '2025-11-22T10:01:40Z',
    totalRequests: 340,
    successCount: 330,
    failureCount: 10,
    avgLatency: 135.6,
    minLatency: 35,
    maxLatency: 280,
    p50Latency: 125,
    p95Latency: 250,
    p99Latency: 275,
    successRate: 97.06,
    bytesIn: 34000,
    bytesOut: 26000,
    statusCodes: { '200': 330, '500': 10 },
    errors: [],
  },
];

/**
 * Example component showing how to use BucketMetricsChart
 */
export function BucketMetricsChartExample() {
  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">
          Load Testing Dashboard
        </h1>
        <p className="text-gray-400 mb-8">
          Real-time performance metrics with unified timeline visualization
        </p>

        <BucketMetricsChart buckets={sampleBuckets} />

        {/* Demo: Chart with no data (shows sample data) */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            Demo: Chart with No Data (Shows Sample Data)
          </h2>
          <p className="text-gray-400 mb-6">
            When no buckets are provided, the chart automatically displays sample data with a notice banner.
          </p>
          <BucketMetricsChart />
        </div>

        {/* Additional info */}
        <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            How to Use This Chart
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">1.</span>
              <div>
                <strong className="text-gray-300">Interactive Legend:</strong> Click any metric in the legend to show/hide it. 
                Min/Avg/Max latency are hidden by default to reduce clutter.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">2.</span>
              <div>
                <strong className="text-gray-300">Smoothing Toggle:</strong> Enable smoothing to apply a moving average 
                filter to latency metrics, useful for noisy data.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">3.</span>
              <div>
                <strong className="text-gray-300">Log Scale:</strong> Automatically activates when max latency exceeds 
                10× the P50 median, or toggle manually for better visualization of wide ranges.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">4.</span>
              <div>
                <strong className="text-gray-300">Quality Zones:</strong> Background colors indicate latency quality: 
                green (0-200ms excellent), yellow (200-800ms good), red (800ms+ poor).
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">5.</span>
              <div>
                <strong className="text-gray-300">Hover for Details:</strong> Hover over any point to see a comprehensive 
                tooltip with all metrics for that time bucket.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold">6.</span>
              <div>
                <strong className="text-gray-300">Sample Data:</strong> When no buckets are provided, the chart automatically 
                displays sample data with a blue notice banner at the top.
              </div>
            </div>
          </div>
        </div>

        {/* Data format reference */}
        <div className="mt-6 p-6 bg-gray-900 border border-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Expected Data Format
          </h2>
          <pre className="text-xs text-gray-400 bg-gray-950 p-4 rounded overflow-x-auto">
{`interface MetricsBucket {
  id: string;
  bucketNumber: number;
  startTime: string;           // ISO timestamp
  endTime: string;             // ISO timestamp
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatency: number;          // milliseconds
  minLatency: number;          // milliseconds
  maxLatency: number;          // milliseconds
  p50Latency: number;          // milliseconds
  p95Latency: number;          // milliseconds
  p99Latency: number;          // milliseconds
  successRate: number;         // percentage
  bytesIn: number;
  bytesOut: number;
  statusCodes: Record<string, number>;
  errors: string[];
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default BucketMetricsChartExample;
