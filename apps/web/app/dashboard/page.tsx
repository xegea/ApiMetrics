
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getTestResults, seedResults } from '@/lib/api';
import { TestResult } from '@apimetrics/shared';
import { formatTimestamp, formatPercentage } from '@apimetrics/shared';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: results, isLoading, error } = useQuery<TestResult[]>({
    queryKey: ['testResults', user?.id ?? 'anon'],
    queryFn: getTestResults,
    enabled: !!user, // don't fetch or show cached results when logged out
  });

  const seedMutation = useMutation({
    mutationFn: async (count: number) => seedResults({ count, project: 'demo' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['testResults'] });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">You're logged out</h2>
          <Link href="/login" className="text-indigo-600 hover:underline">Log in to view your results</Link>
        </div>
      </div>
    );
  }

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

  // This dashboard route has been removed — redirect to Load Test Executions
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Removed</h2>
        <p className="text-gray-600 mb-4">Dashboard was removed. Use the Test Executions page to view results.</p>
        <Link href="/loadtestsexecutions" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Test Executions</Link>
      </div>
    </div>
  );
}

