'use client';

import { useState, useEffect } from 'react';
import { getLoadTestExecutions, getLoadTestExecutionResults } from '@/lib/api';
import { LoadTestExecution, TestResult } from '@apimetrics/shared';
import { useAuth } from '@/lib/auth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export default function LoadTestsExecutionsPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadTestExecutions, setLoadTestExecutions] = useState<LoadTestExecution[]>([]);
  const [expandedExecutions, setExpandedExecutions] = useState<string[]>([]);
  const [executionResults, setExecutionResults] = useState<Record<string, TestResult[]>>({});

  useEffect(() => {
    if (session?.user?.email) {
      fetchLoadTestExecutions();
    }
  }, [session]);

  const fetchLoadTestExecutions = async () => {
    try {
      setLoading(true);
      const response = await getLoadTestExecutions();
      const executions = response.loadTestExecutions;
      
      // Sort by createdAt descending (most recent first)
      executions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLoadTestExecutions(executions);
    } catch (error) {
      console.error('Failed to fetch load test executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExecution = async (executionId: string) => {
    const isExpanding = !expandedExecutions.includes(executionId);
    
    setExpandedExecutions(prev =>
      prev.includes(executionId)
        ? prev.filter(id => id !== executionId)
        : [...prev, executionId]
    );

    // Fetch results when expanding
    if (isExpanding) {
      try {
        console.log('Fetching results for execution:', executionId);
        const response = await getLoadTestExecutionResults(executionId);
        console.log('Got results response:', response);
        setExecutionResults(prev => ({
          ...prev,
          [executionId]: response.testResults,
        }));
      } catch (error) {
        console.error('Failed to fetch execution results:', error);
        // Set empty array on error so loading spinner disappears
        setExecutionResults(prev => ({
          ...prev,
          [executionId]: [],
        }));
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">Load Tests Executions</h1>

        {loading && <div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}

        {!loading && loadTestExecutions.length === 0 && (
          <div className="text-center py-12">
            <FolderIcon className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No load test executions found.</p>
            <p className="text-gray-500">Run a load test from an execution plan to see executions here.</p>
          </div>
        )}

        {!loading && loadTestExecutions.length > 0 && (
          <div className="space-y-4">
            {loadTestExecutions.map((execution) => (
              <div key={execution.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center p-4">
                  <div onClick={() => toggleExecution(execution.id)} className="flex items-center gap-4 cursor-pointer flex-1">
                    <FolderIcon className="text-2xl text-blue-600" />
                    <div>
                      <span className="text-lg font-medium text-gray-800">{execution.name}</span>
                      <div className="text-sm text-gray-500">
                        Status: <span className={`px-2 py-1 rounded text-xs font-medium ${
                          execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>{execution.status}</span>
                        • Created: {formatTimestamp(execution.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const token = session?.access_token;
                          if (!token) {
                            alert('You must be logged in to download executions');
                            return;
                          }

                          // Create a temporary link element for download
                          const link = document.createElement('a');
                          link.href = `${process.env.NEXT_PUBLIC_APIMETRICS_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/loadtestexecutions/${execution.id}/download`;
                          link.style.display = 'none';
                          link.target = '_blank'; // Open in new tab to avoid CORS issues

                          // For authenticated requests, we need to use fetch
                          const response = await fetch(link.href, {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                          });

                          if (!response.ok) {
                            throw new Error(`Download failed: ${response.status}`);
                          }

                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const downloadLink = document.createElement('a');
                          downloadLink.href = url;
                          downloadLink.download = `Execution Plan ${execution.name}.zip`;
                          document.body.appendChild(downloadLink);
                          downloadLink.click();
                          document.body.removeChild(downloadLink);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Download failed:', error);
                          alert('Failed to download execution. Please try again.');
                        }
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      Download Execution
                    </button>
                    <ChevronRightIcon className={`transform transition-transform cursor-pointer text-gray-600 hover:text-gray-800 ${
                      expandedExecutions.includes(execution.id) ? 'rotate-90' : ''
                    }`} onClick={() => toggleExecution(execution.id)} />
                  </div>
                </div>

                {expandedExecutions.includes(execution.id) && (
                  <div className="border-t border-gray-100 p-6 space-y-6">
                    {/* Execution Results */}
                    {executionResults[execution.id] !== undefined ? (
                      <>
                        {/* Metrics Section */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Execution Metrics</h3>
                          {executionResults[execution.id]?.length > 0 && executionResults[execution.id][0].avgLatency !== null ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {(executionResults[execution.id].reduce((sum, r) => sum + (r.avgLatency || 0), 0) / executionResults[execution.id].length / 1000000).toFixed(2)}ms
                                </div>
                                <div className="text-sm text-gray-500">Avg Response Time</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {(executionResults[execution.id].reduce((sum, r) => sum + (r.p95Latency || 0), 0) / executionResults[execution.id].length / 1000000).toFixed(2)}ms
                                </div>
                                <div className="text-sm text-gray-500">P95 Response Time</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {((executionResults[execution.id].reduce((sum, r) => sum + (r.successRate || 0), 0) / executionResults[execution.id].length) * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-500">Success Rate</div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center">No results available yet. Run tests with the CLI to populate metrics.</p>
                          )}
                        </div>

                        {/* Test Results Table */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
                          {executionResults[execution.id]?.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P95 Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {executionResults[execution.id].map((result) => (
                                    <tr key={result.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {result.testId}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(result.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.avgLatency !== null ? `${(result.avgLatency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.p95Latency !== null ? `${(result.p95Latency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                          result.successRate !== null && result.successRate >= 0.95 ? 'bg-green-100 text-green-800' :
                                          result.successRate !== null && result.successRate >= 0.8 ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {result.successRate !== null ? `${(result.successRate * 100).toFixed(1)}%` : '-'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center">No test results found. Run the downloaded tests with the CLI to see results here.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading execution results...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}