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
import { getTestResult, getExecutionRequestMetrics } from '@/lib/api';
import { TestResult, RequestMetric } from '@apimetrics/shared';
import { formatTimestamp, formatPercentage } from '@apimetrics/shared';
import { useState } from 'react';

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;
  const [showRequestMetrics, setShowRequestMetrics] = useState(false);

  const { data: result, isLoading, error } = useQuery<TestResult>({
    queryKey: ['testResult', testId],
    queryFn: () => getTestResult(testId),
    enabled: !!testId,
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['requestMetrics', testId],
    queryFn: () => getExecutionRequestMetrics(testId),
    enabled: !!testId && showRequestMetrics,
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
        <Link href="/loadtestsexecutions" className="ml-4 text-indigo-600 hover:text-indigo-800">
          Back to Executions
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
              <Link href="/loadtestsexecutions" className="text-gray-600 hover:text-gray-900">
                ← Back to Executions
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

          {/* Per-Request Metrics */}
          <div className="bg-white shadow rounded-lg p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Per-Request Metrics</h3>
              <button
                onClick={() => setShowRequestMetrics(!showRequestMetrics)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
              >
                {showRequestMetrics ? 'Hide' : 'Show'} Details
              </button>
            </div>

            {showRequestMetrics && (
              <>
                {metricsLoading ? (
                  <div className="text-center text-gray-500 py-8">Loading request metrics...</div>
                ) : metricsData && metricsData.metrics && metricsData.metrics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latency (ms)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bytes In</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bytes Out</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metricsData.metrics.slice(0, 50).map((metric: RequestMetric, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(metric.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${
                                metric.statusCode >= 200 && metric.statusCode < 300 ? 'bg-green-500' :
                                metric.statusCode >= 400 && metric.statusCode < 500 ? 'bg-yellow-500' :
                                metric.statusCode >= 500 ? 'bg-red-500' : 'bg-gray-500'
                              }`}>
                                {metric.statusCode}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(metric.latency / 1000000).toFixed(2)}ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {metric.bytesIn}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {metric.bytesOut}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              {metric.error ? metric.error : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {metricsData.metrics.length > 50 && (
                      <p className="mt-4 text-sm text-gray-500 text-center">
                        Showing first 50 of {metricsData.count} requests
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">No request metrics available</div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

