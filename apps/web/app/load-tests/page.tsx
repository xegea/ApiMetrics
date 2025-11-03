'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoadTestsPage() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load tenantId from user metadata on mount
  useEffect(() => {
    if (user?.email) {
      // Use email domain as default tenantId
      const domain = user.email.split('@')[1] || 'default';
      setTenantId(domain);
      setCurrentTenantId(domain);
    }
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
        {/* Tenant ID Input */}
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-3">
            <label htmlFor="tenant-id" className="text-gray-700 font-medium">
              Tenant ID:
            </label>
            <input
              type="text"
              id="tenant-id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyTenantId()}
              placeholder="Enter Tenant ID"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={applyTenantId}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Apply
            </button>
          </div>
        </div>

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
