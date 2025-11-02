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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 shadow rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Latency Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Avg Latency (ms)" fill="#4F46E5" />
                  <Bar dataKey="P95 Latency (ms)" fill="#F59E0B" />
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

