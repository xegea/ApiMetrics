'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getMe, getTestResults, deleteTestResult } from '@/lib/api';
import { TestResult } from '@apimetrics/shared';
import { formatTimestamp, formatPercentage } from '@apimetrics/shared';
import DeleteIcon from '@mui/icons-material/Delete';

export default function LoadTestsPage() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [hoveredResultId, setHoveredResultId] = useState<string | null>(null);

  // Fetch the user's tenant id from the API
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const me = await getMe();
        setTenantId(me.tenantId);
        setCurrentTenantId(me.tenantId);
        // Fetch results
        const testResults = await getTestResults();
        setResults(testResults);
      } catch (e) {
        // Non-blocking for now
      }
    })();
  }, [user]);

  const applyTenantId = async () => {
    if (!tenantId) {
      alert('Please enter a Tenant ID');
      return;
    }
    setCurrentTenantId(tenantId);
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this test result?')) {
      return;
    }

    try {
      await deleteTestResult(resultId);
      // Remove the result from the local state
      setResults(results.filter(result => result.id !== resultId));
    } catch (error) {
      console.error('Failed to delete test result:', error);
      alert('Failed to delete test result. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Tenant ID UI removed — using /auth/me */}

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
          Load Tests
        </h1>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && currentTenantId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Test Results</h2>
            {results.length === 0 ? (
              <p className="text-gray-600">No test results found. Run some load tests to see data here.</p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={`${result.id}-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div 
                      className="flex justify-between items-start mb-2 relative group cursor-pointer"
                      onMouseEnter={() => setHoveredResultId(result.id)}
                      onMouseLeave={() => setHoveredResultId(null)}
                    >
                      <h3 className="text-lg font-medium text-gray-800">Test ID: {result.id}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{formatTimestamp(result.timestamp)}</span>
                        {hoveredResultId === result.id && (
                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                            title="Delete test result"
                          >
                            <DeleteIcon fontSize="small" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Avg Latency</p>
                        <p className="text-xl font-semibold text-blue-600">{(result.avgLatency / 1000000).toFixed(2)} ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">P95 Latency</p>
                        <p className="text-xl font-semibold text-orange-600">{(result.p95Latency / 1000000).toFixed(2)} ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-xl font-semibold text-green-600">{formatPercentage(result.successRate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Tenant ID */}
        {!loading && !currentTenantId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-center text-gray-600">
              Please enter and apply a Tenant ID to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
