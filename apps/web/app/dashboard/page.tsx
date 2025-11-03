
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getTestResults, seedResults } from '@/lib/api';
import { TestResult } from '@apimetrics/shared';
import { formatTimestamp, formatPercentage } from '@apimetrics/shared';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: results, isLoading, error } = useQuery<TestResult[]>({
    queryKey: ['testResults'],
    queryFn: getTestResults,
  });

  const seedMutation = useMutation({
    mutationFn: async (count: number) => seedResults({ count, project: 'demo' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['testResults'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading test results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">ApiMetrics</h1>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error loading test results</h3>
              <p className="text-red-600">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <p className="text-sm text-red-500 mt-4">
                Make sure the API server is running and check your NEXT_PUBLIC_APIMETRICS_API_URL environment variable.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ApiMetrics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900"
                onClick={() => localStorage.removeItem('auth_token')}
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Test Results</h2>
            <button
              onClick={() => seedMutation.mutate(25)}
              disabled={seedMutation.isPending}
              className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              title="Generate 25 demo results for your tenant"
            >
              {seedMutation.isPending ? 'Seeding…' : 'Seed demo data'}
            </button>
          </div>

          {!results || results.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center text-gray-700">
              <p className="mb-4">No test results yet.</p>
              <button
                onClick={() => seedMutation.mutate(25)}
                disabled={seedMutation.isPending}
                className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {seedMutation.isPending ? 'Seeding…' : 'Generate 25 demo results'}
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {results.map((result) => (
                  <li key={result.id}>
                    <Link
                      href={`/test/${result.id}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {result.id}
                            </p>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {formatPercentage(result.successRate)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex space-x-4">
                            <p className="flex items-center text-sm text-gray-500">
                              Avg Latency: <span className="ml-1 font-medium text-gray-900">{result.avgLatency}ms</span>
                            </p>
                            <p className="flex items-center text-sm text-gray-500">
                              P95 Latency: <span className="ml-1 font-medium text-gray-900">{result.p95Latency}ms</span>
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>{formatTimestamp(result.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

