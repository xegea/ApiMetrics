'use client';

import { useState, useEffect } from 'react';
import { getTestEndpoints, deleteTestEndpoint, TestEndpoint } from '@/lib/api';

export default function ListEndpointsPage() {
  const [tenantId, setTenantId] = useState('');
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<TestEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  // Load tenantId from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('user_email');
      if (userEmail) {
        // Use email domain as default tenantId
        const domain = userEmail.split('@')[1] || 'default';
        setTenantId(domain);
        setCurrentTenantId(domain);
        listTestEndpoints(domain);
      }
    }
  }, []);

  const applyTenantId = async () => {
    if (!tenantId) {
      alert('Please enter a Tenant ID');
      return;
    }
    setCurrentTenantId(tenantId);
    await listTestEndpoints(tenantId);
  };

  const listTestEndpoints = async (tid: string) => {
    setLoading(true);
    try {
      const result = await getTestEndpoints(tid);
      
      setEndpoints(result.endpoints);
    } catch (error) {
      alert('Error fetching test endpoints: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEndpoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) {
      return;
    }

    try {
      await deleteTestEndpoint(id);
      // Refresh the list
      if (currentTenantId) {
        await listTestEndpoints(currentTenantId);
      }
    } catch (error) {
      alert('Error deleting endpoint: ' + (error as Error).message);
    }
  };

  const toggleDescription = (key: string) => {
    setExpandedEndpoint(expandedEndpoint === key ? null : key);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500',
      POST: 'bg-blue-500',
      PUT: 'bg-orange-500',
      PATCH: 'bg-yellow-500',
      DELETE: 'bg-red-500',
      OPTIONS: 'bg-purple-500'
    };
    return colors[method] || 'bg-gray-500';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch = ep.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'ALL' || ep.httpMethod === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

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
              Load Endpoints
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
          My Test Endpoints
        </h1>

        {/* Filters */}
        {currentTenantId && endpoints.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-gray-700 font-medium mb-2 text-sm">
                  Search Endpoint:
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter by path..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Method Filter */}
              <div className="md:w-48">
                <label className="block text-gray-700 font-medium mb-2 text-sm">
                  Filter by Method:
                </label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {methods.map(method => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 flex gap-6 text-sm text-gray-600">
              <span>
                <strong>Total:</strong> {endpoints.length} endpoints
              </span>
              <span>
                <strong>Filtered:</strong> {filteredEndpoints.length} endpoints
              </span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading endpoints...</p>
          </div>
        )}

        {/* Endpoints List */}
        {!loading && currentTenantId && filteredEndpoints.length > 0 && (
          <div className="space-y-3">
            {filteredEndpoints.map((ep, index) => {
              const key = `${ep.id}-${ep.httpMethod}-${ep.endpoint}`;
              const fullUrl = `${process.env.NEXT_PUBLIC_APIMETRICS_API_URL || 'http://localhost:3000'}/mock/${currentTenantId}${ep.endpoint}`;
              
              return (
                <div
                  key={key}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    onClick={() => toggleDescription(key)}
                    className="flex justify-between items-center p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span
                        className={`${getMethodColor(ep.httpMethod)} text-white px-3 py-1.5 rounded font-bold text-xs w-20 text-center flex-shrink-0`}
                      >
                        {ep.httpMethod}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-medium text-gray-800 block truncate">
                          {ep.endpoint}
                        </span>
                        <span className="text-xs text-gray-500">
                          {ep.createdBy && `Created by: ${ep.createdBy}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(fullUrl);
                        }}
                        className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition"
                        title="Copy full URL"
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEndpoint(ep.id);
                        }}
                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                        title="Delete endpoint"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {expandedEndpoint === key && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                      {/* Full URL */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          Full URL:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-gray-50 px-3 py-2 rounded border border-gray-200 overflow-x-auto">
                            {fullUrl}
                          </code>
                          <button
                            onClick={() => copyToClipboard(fullUrl)}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition flex-shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* Request Body */}
                      {ep.requestBody && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-semibold text-gray-700">
                              Request Body:
                            </p>
                            <button
                              onClick={() => copyToClipboard(ep.requestBody!)}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border border-gray-200 max-h-48 overflow-y-auto">
                            {ep.requestBody}
                          </pre>
                        </div>
                      )}

                      {/* Headers */}
                      {ep.headers && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-semibold text-gray-700">
                              Headers:
                            </p>
                            <button
                              onClick={() => copyToClipboard(ep.headers!)}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border border-gray-200">
                            {ep.headers}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No endpoints message */}
        {!loading && currentTenantId && endpoints.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No endpoints found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a test endpoint.
            </p>
            <div className="mt-6">
              <a
                href="/test-endpoints"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Test Endpoint
              </a>
            </div>
          </div>
        )}

        {/* No results from filter */}
        {!loading && currentTenantId && endpoints.length > 0 && filteredEndpoints.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No matching endpoints</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Prompt to load */}
        {!loading && !currentTenantId && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              View Your Test Endpoints
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Enter your Tenant ID above to load and view all your test endpoints in one place.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
