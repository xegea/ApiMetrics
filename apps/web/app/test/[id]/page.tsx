'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getTestResult } from '@/lib/api';
import { TestResult } from '@apimetrics/shared';
import { formatTimestamp, formatPercentage } from '@apimetrics/shared';

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const { data: result, isLoading, error } = useQuery<TestResult>({
    queryKey: ['testResult', testId],
    queryFn: () => getTestResult(testId),
    enabled: !!testId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading test details...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          Error loading test result: {error instanceof Error ? error.message : 'Test not found'}
        </div>
        <Link href="/dashboard" className="ml-4 text-indigo-600 hover:text-indigo-800">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Prepare chart data
  const latencyData = [
    {
      name: 'Latency Metrics',
      'Min': result.minLatency || 0,
      'P50': result.p50Latency || result.avgLatency,
      'Avg': result.avgLatency,
      'P95': result.p95Latency,
      'P99': result.p99Latency || result.p95Latency,
      'Max': result.maxLatency || 0,
    },
  ];

  const chartData = [
    {
      name: 'Metrics',
      'Avg Latency (ms)': result.avgLatency,
      'P95 Latency (ms)': result.p95Latency,
    },
  ];

  const successData = [
    {
      name: 'Success Rate',
      value: result.successRate * 100,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">ApiMetrics</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Test: {result.id}</h2>
            <p className="text-gray-600">Ran at {formatTimestamp(result.timestamp)}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-indigo-600">
                      {result.avgLatency}ms
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-500">Average Latency</p>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-yellow-600">
                      {result.p95Latency}ms
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-500">P95 Latency</p>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(result.successRate)}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                </div>
              </div>
            </div>

            {result.totalRequests && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.totalRequests}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-500">Total Requests</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Metrics */}
          {(result.minLatency || result.maxLatency || result.p50Latency || result.p99Latency) && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Latency Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {result.minLatency && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.minLatency}ms</div>
                    <p className="text-sm text-gray-500">Min Latency</p>
                  </div>
                )}
                {result.p50Latency && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.p50Latency}ms</div>
                    <p className="text-sm text-gray-500">P50 Latency</p>
                  </div>
                )}
                {result.p95Latency && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{result.p95Latency}ms</div>
                    <p className="text-sm text-gray-500">P95 Latency</p>
                  </div>
                )}
                {result.p99Latency && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.p99Latency}ms</div>
                    <p className="text-sm text-gray-500">P99 Latency</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Codes */}
          {result.statusCodes && Object.keys(result.statusCodes).length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status Code Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(result.statusCodes).map(([code, count]) => (
                  <div key={code} className="text-center">
                    <div className={`text-2xl font-bold ${
                      code.startsWith('2') ? 'text-green-600' :
                      code.startsWith('4') ? 'text-yellow-600' :
                      code.startsWith('5') ? 'text-red-600' : 'text-gray-600'
                    }`}>{count}</div>
                    <p className="text-sm text-gray-500">Status {code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {(result.throughput || result.actualRate || result.testDuration) && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.throughput && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.throughput.toFixed(2)}</div>
                    <p className="text-sm text-gray-500">Throughput (req/sec)</p>
                  </div>
                )}
                {result.actualRate && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{result.actualRate.toFixed(2)}</div>
                    <p className="text-sm text-gray-500">Actual Rate (req/sec)</p>
                  </div>
                )}
                {result.testDuration && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{result.testDuration}</div>
                    <p className="text-sm text-gray-500">Test Duration</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 shadow rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Latency Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Min" fill="#10B981" />
                  <Bar dataKey="P50" fill="#3B82F6" />
                  <Bar dataKey="Avg" fill="#6366F1" />
                  <Bar dataKey="P95" fill="#F59E0B" />
                  <Bar dataKey="P99" fill="#EF4444" />
                  <Bar dataKey="Max" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 shadow rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Success Rate</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={successData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Bar dataKey="value" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

