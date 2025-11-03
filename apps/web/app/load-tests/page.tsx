'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';

export default function LoadTestsPage() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch the user's tenant id from the API
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const me = await getMe();
        setTenantId(me.tenantId);
        setCurrentTenantId(me.tenantId);
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
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Load Testing Coming Soon
              </h2>
              <p className="text-gray-600 mb-6">
                Run performance and load tests on your endpoints to measure throughput, 
                latency, and reliability under stress.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-gray-800 mb-1">Performance Metrics</h3>
                  <p className="text-sm text-gray-600">
                    Track latency, throughput, and error rates
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-gray-800 mb-1">Stress Testing</h3>
                  <p className="text-sm text-gray-600">
                    Simulate high traffic loads and concurrent users
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl mb-2">📈</div>
                  <h3 className="font-semibold text-gray-800 mb-1">Detailed Reports</h3>
                  <p className="text-sm text-gray-600">
                    Visualize test results with charts and graphs
                  </p>
                </div>
              </div>
            </div>
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
