'use client';

import { useState, useEffect } from 'react';
import { createTestEndpoint, getTestEndpoints, TestEndpoint } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function TestEndpointsPage() {
  const { user, session } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<TestEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [modalResponse, setModalResponse] = useState<string | null>(null);

  // Form fields
  const [endpoint, setEndpoint] = useState('');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [headers, setHeaders] = useState('');

  // Validate endpoint URL format
  const isValidEndpoint = () => {
    if (!endpoint.trim()) return false;
    try {
      new URL(endpoint);
      return true;
    } catch {
      return false;
    }
  };

  // On mount, fetch endpoints for the authenticated user's tenant (server derives tenantId)
  useEffect(() => {
    if (user) {
      listTestEndpoints();
    }
  }, [user]);

  // Tenant selection is managed by the server via /auth/me and /endpoints; no manual apply needed

  const listTestEndpoints = async (tid?: string) => {
    setLoading(true);
    try {
      const result = await getTestEndpoints(tid);
      
      setEndpoints(result.endpoints);
      setShowForm(result.endpoints.length === 0);
      setCurrentTenantId(result.tenantId);
      setTenantId(result.tenantId);
    } catch (error) {
      alert('Error fetching test endpoints: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveTestEndpoint = async () => {
    try {
      await createTestEndpoint({
        endpoint,
        httpMethod,
        requestBody: requestBody || undefined,
        headers: headers || undefined,
      });

      await listTestEndpoints();
      setShowForm(false);
      
      // Reset form
      setEndpoint('');
      setHttpMethod('GET');
      setRequestBody('');
      setHeaders('');
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  const tryEndpoint = async (endpointPath: string, method: string, delayMs: number, buttonId: string) => {
    if (!currentTenantId) {
      alert('Please enter and apply a Tenant ID');
      return;
    }

    const delaySeconds = Math.floor(delayMs / 1000);
    const button = document.getElementById(buttonId);
    
    if (button && delaySeconds > 0) {
      let countdown = delaySeconds;
      const intervalId = setInterval(() => {
        button.textContent = `${countdown} seconds`;
        countdown -= 1;

        if (countdown < 0) {
          clearInterval(intervalId);
          button.textContent = 'Try it';
        }
      }, 1000);
    }

    const url = `https://mockapi-3jlydfmq.uc.gateway.dev/mockserver/${currentTenantId}${endpointPath}`;
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    try {
      const response = await fetch(url, options);
      const textResponse = await response.text();
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(textResponse);
        setModalResponse(JSON.stringify(parsedResponse, null, 2));
      } catch {
        setModalResponse(textResponse);
      }
    } catch (error) {
      alert('Error making the test request: ' + (error as Error).message);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Tenant ID UI removed — server derives tenant context */}

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
          Test Server Endpoints
        </h1>

        {/* JWT Token Button */}
        <div className="text-center mb-6">
          <button
            onClick={() => {
              if (session?.access_token) {
                navigator.clipboard.writeText(session.access_token);
                alert('JWT Token copied to clipboard!');
              } else {
                alert('No active session found. Please log in.');
              }
            }}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
          >
            Copy JWT Token for Postman
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Use this token in Postman's Authorization header (Bearer Token) to authenticate test result uploads under your tenant.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Endpoints List */}
        {!loading && endpoints.length > 0 && (
          <div className="space-y-4 mb-6">
            {endpoints.map((ep, index) => {
              const key = `${ep.httpMethod}-${ep.endpoint}`;
              const buttonId = `try-button-${index}`;
              return (
                <div
                  key={key}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    onClick={() => toggleDescription(key)}
                    className="flex justify-between items-center p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`${getMethodColor(ep.httpMethod)} text-white px-4 py-2 rounded font-bold text-sm w-20 text-center`}
                      >
                        {ep.httpMethod}
                      </span>
                      <span className="text-lg font-medium text-gray-800">
                        {ep.endpoint}
                      </span>
                    </div>
                    <button
                      id={buttonId}
                      onClick={(e) => {
                        e.stopPropagation();
                        tryEndpoint(ep.endpoint, ep.httpMethod, 0, buttonId);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      Try it
                    </button>
                  </div>
                  
                  {expandedEndpoint === key && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 text-gray-700">
                      {ep.requestBody && (
                        <>
                          <p>
                            <strong>Request Body:</strong>
                          </p>
                          <pre className="mt-1 mb-3 bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                            {ep.requestBody}
                          </pre>
                        </>
                      )}
                      {ep.headers && (
                        <>
                          <p>
                            <strong>Headers:</strong>
                          </p>
                          <pre className="mt-1 bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                            {ep.headers}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No endpoints message */}
        {!loading && endpoints.length === 0 && currentTenantId && (
          <div className="text-center text-gray-600 mb-6">
            No test endpoints found for this tenant.
          </div>
        )}

        {/* Create Endpoint Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Create Test Endpoint
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Endpoint:
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://api.example.com/api/v1/health"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  readOnly={false}
                  disabled={false}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  HTTP Method:
                </label>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Request Body:
                </label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"name": "John Doe", "email": "john@example.com"}'
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-gray-900"
                  readOnly={false}
                  disabled={false}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Headers:
                </label>
                <textarea
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder={'Content-Type: application/json\nAuthorization: Bearer token123\nX-API-Key: your-api-key'}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-gray-900"
                  readOnly={false}
                  disabled={false}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveTestEndpoint}
                  disabled={!isValidEndpoint()}
                  className={`px-6 py-2 rounded-lg transition ${
                    isValidEndpoint()
                      ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
                {endpoints.length > 0 && (
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create New Endpoint Button */}
        {!showForm && endpoints.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Create New Endpoint
          </button>
        )}

        {/* Response Modal */}
        {modalResponse && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setModalResponse(null)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Response
              </h3>
              <textarea
                value={modalResponse}
                readOnly
                className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm overflow-auto resize-none focus:outline-none"
              />
              <button
                onClick={() => setModalResponse(null)}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
