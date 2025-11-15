'use client';

import { useState, useEffect } from 'react';
import { getLoadTestExecutions, getLoadTestExecutionResults, deleteLoadTestExecution } from '@/lib/api';
import { LoadTestExecution, TestResult } from '@apimetrics/shared';
import { useAuth } from '@/lib/auth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

interface CommandModalState {
  isOpen: boolean;
  command: string;
  executionName: string;
  actualFilename?: string;
}

export default function LoadTestsExecutionsPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadTestExecutions, setLoadTestExecutions] = useState<LoadTestExecution[]>([]);
  const [expandedExecutions, setExpandedExecutions] = useState<string[]>([]);
  const [executionResults, setExecutionResults] = useState<Record<string, TestResult[]>>({});
  const [commandModal, setCommandModal] = useState<CommandModalState>({
    isOpen: false,
    command: '',
    executionName: '',
  });
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      fetchLoadTestExecutions();
      
      // Set up polling for running executions
      const pollInterval = setInterval(() => {
        checkForStatusUpdates();
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [session]);

  const checkForStatusUpdates = async () => {
    try {
      const response = await getLoadTestExecutions();
      const latestExecutions = response.loadTestExecutions;
      
      // Check if any running executions have been completed
      const needsUpdate = loadTestExecutions.some(existing => {
        const latest = latestExecutions.find(l => l.id === existing.id);
        return latest && existing.status === 'running' && latest.status !== 'running';
      });
      
      if (needsUpdate) {
        // Sort by createdAt descending (most recent first)
        latestExecutions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLoadTestExecutions(latestExecutions);
      }
    } catch (error) {
      // Silently ignore polling errors
      console.debug('Status check failed:', error);
    }
  };

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

  const openCommandModal = (executionName: string) => {
    // Use wildcard pattern to match any execution-plan-*.json file
    // The API generates: execution-plan-{planName}-{timestamp}.json
    const command = `npx @xegea/apimetrics-cli execute-plan ~/Downloads/execution-plan-*.json`;
    setCommandModal({
      isOpen: true,
      command,
      executionName,
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(commandModal.command);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy command to clipboard');
    }
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
                        if (window.confirm(`Are you sure you want to delete the execution "${execution.name}"? This action cannot be undone.`)) {
                          try {
                            await deleteLoadTestExecution(execution.id);
                            // Refresh the list
                            await fetchLoadTestExecutions();
                          } catch (error) {
                            console.error('Failed to delete execution:', error);
                            alert('Failed to delete execution. Please try again.');
                          }
                        }
                      }}
                      className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete execution"
                    >
                      <DeleteIcon fontSize="small" />
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
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Execution Metrics</h3>
                          {execution.avgLatency !== null && execution.avgLatency !== undefined ? (
                            <div className="space-y-6">
                              {/* Performance Overview */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {execution.avgLatency ? (execution.avgLatency / 1000000).toFixed(2) : 'N/A'}ms
                                  </div>
                                  <div className="text-sm text-gray-500">Avg Response Time</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {execution.p95Latency ? (execution.p95Latency / 1000000).toFixed(2) : 'N/A'}ms
                                  </div>
                                  <div className="text-sm text-gray-500">P95 Response Time</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {execution.successRate !== undefined ? ((execution.successRate || 0) * 100).toFixed(1) : 'N/A'}%
                                  </div>
                                  <div className="text-sm text-gray-500">Success Rate</div>
                                </div>
                              </div>

                              {/* Detailed Metrics */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Response Times */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-3">Response Times</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Mean:</span>
                                      <span className="font-mono text-gray-900">{execution.avgLatency ? (execution.avgLatency / 1000000).toFixed(2) : 'N/A'}ms</span>
                                    </div>
                                    {execution.minLatency && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Min:</span>
                                        <span className="font-mono text-gray-900">{(execution.minLatency / 1000000).toFixed(2)}ms</span>
                                      </div>
                                    )}
                                    {execution.maxLatency && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Max:</span>
                                        <span className="font-mono text-gray-900">{(execution.maxLatency / 1000000).toFixed(2)}ms</span>
                                      </div>
                                    )}
                                    {execution.p50Latency && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">P50:</span>
                                        <span className="font-mono text-gray-900">{(execution.p50Latency / 1000000).toFixed(2)}ms</span>
                                      </div>
                                    )}
                                    {execution.p95Latency && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">P95:</span>
                                        <span className="font-mono text-gray-900">{(execution.p95Latency / 1000000).toFixed(2)}ms</span>
                                      </div>
                                    )}
                                    {execution.p99Latency && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">P99:</span>
                                        <span className="font-mono text-gray-900">{(execution.p99Latency / 1000000).toFixed(2)}ms</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Performance Metrics */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-3">Performance</h4>
                                  <div className="space-y-2 text-sm">
                                    {execution.totalRequests && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Total Requests:</span>
                                        <span className="font-mono text-gray-900">{execution.totalRequests.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {execution.testDuration && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Duration:</span>
                                        <span className="font-mono text-gray-900">{execution.testDuration}</span>
                                      </div>
                                    )}
                                    {execution.actualRate && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Actual RPS:</span>
                                        <span className="font-mono text-gray-900">{execution.actualRate.toFixed(1)}</span>
                                      </div>
                                    )}
                                    {execution.throughput && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Throughput:</span>
                                        <span className="font-mono text-gray-900">{execution.throughput.toFixed(1)} req/sec</span>
                                      </div>
                                    )}
                                    {execution.bytesIn && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Bytes In:</span>
                                        <span className="font-mono text-gray-900">{(execution.bytesIn / 1024).toFixed(1)} KB</span>
                                      </div>
                                    )}
                                    {execution.bytesOut && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Bytes Out:</span>
                                        <span className="font-mono text-gray-900">{(execution.bytesOut / 1024).toFixed(1)} KB</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Status Codes */}
                              {execution.statusCodes && Object.keys(execution.statusCodes).length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-3">Status Codes</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {Object.entries(execution.statusCodes).map(([code, count]) => (
                                      <div key={code} className={`text-center p-2 rounded text-sm font-medium ${
                                        parseInt(code) >= 200 && parseInt(code) < 300 ? 'bg-green-100 text-green-800' :
                                        parseInt(code) >= 400 && parseInt(code) < 500 ? 'bg-yellow-100 text-yellow-800' :
                                        parseInt(code) >= 500 ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {code}: {count}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Errors */}
                              {execution.errorDetails && execution.errorDetails.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-red-900 mb-3">Errors ({execution.errorDetails.length})</h4>
                                  <div className="space-y-1">
                                    {execution.errorDetails.slice(0, 5).map((error, index) => (
                                      <div key={index} className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                                        {error}
                                      </div>
                                    ))}
                                    {execution.errorDetails.length > 5 && (
                                      <div className="text-sm text-red-600">
                                        ... and {execution.errorDetails.length - 5} more errors
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center space-y-4">
                              <p className="text-gray-500">No results available yet. Run tests with the CLI to populate metrics.</p>
                              {execution.status !== 'completed' && (
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

                                      // Extract the actual filename from Content-Disposition header
                                      const contentDisposition = response.headers.get('content-disposition') || '';
                                      
                                      // Generate timestamp for fallback filename (matches API format)
                                      const date = new Date(); // Use current time for unique filename on each download
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      const hours = String(date.getHours()).padStart(2, '0');
                                      const minutes = String(date.getMinutes()).padStart(2, '0');
                                      const seconds = String(date.getSeconds()).padStart(2, '0');
                                      const ms = String(date.getMilliseconds()).padStart(3, '0');
                                      const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}${ms}`;
                                      
                                      // Sanitize plan name for fallback
                                      const planName = (execution as any).executionPlan?.name || execution.name;
                                      const sanitizedPlanName = planName
                                        .replace(/\s+/g, '-') // Replace spaces with hyphens
                                        .replace(/[^a-zA-Z0-9\-_]/g, '') // Remove special characters
                                        .toLowerCase(); // Convert to lowercase
                                      
                                      let actualFilename = `execution-plan-${sanitizedPlanName}-${timestamp}.json`;
                                      
                                      if (contentDisposition) {
                                        // Parse filename from Content-Disposition header
                                        // Format: attachment; filename="name.json"; filename*=UTF-8''name.json
                                        const match = contentDisposition.match(/filename="([^"]+)"/);
                                        if (match && match[1]) {
                                          actualFilename = match[1];
                                        }
                                      }

                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      const downloadLink = document.createElement('a');
                                      downloadLink.href = url;
                                      downloadLink.download = actualFilename;
                                      document.body.appendChild(downloadLink);
                                      downloadLink.click();
                                      document.body.removeChild(downloadLink);
                                      window.URL.revokeObjectURL(url);

                                      // Open command modal with the actual filename
                                      setCommandModal({
                                        isOpen: true,
                                        command: `npx @xegea/apimetrics-cli execute-plan ~/Downloads/${actualFilename}`,
                                        executionName: execution.name,
                                        actualFilename: actualFilename,
                                      });
                                    } catch (error) {
                                      console.error('Download failed:', error);
                                      alert('Failed to download execution. Please try again.');
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                >
                                  Download and Run
                                </button>
                              )}
                            </div>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P50 Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P95 Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P99 Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Latency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Requests</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Throughput</th>
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
                                        {result.minLatency !== null && result.minLatency !== undefined ? `${(result.minLatency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.avgLatency !== null && result.avgLatency !== undefined ? `${(result.avgLatency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.p50Latency !== null && result.p50Latency !== undefined ? `${(result.p50Latency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.p95Latency !== null && result.p95Latency !== undefined ? `${(result.p95Latency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.p99Latency !== null && result.p99Latency !== undefined ? `${(result.p99Latency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.maxLatency !== null && result.maxLatency !== undefined ? `${(result.maxLatency / 1000000).toFixed(2)}ms` : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.totalRequests !== null && result.totalRequests !== undefined ? result.totalRequests.toLocaleString() : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.throughput !== null && result.throughput !== undefined ? `${result.throughput.toFixed(1)} req/s` : '-'}
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

      {/* Command Modal */}
      {commandModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Run Your Load Test</h2>
              <button
                onClick={() => setCommandModal({ ...commandModal, isOpen: false })}
                className="text-gray-500 hover:text-gray-700"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Step 1: Download info with actual filename */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm">1</div>
                  <h3 className="text-lg font-semibold text-gray-800">File Downloaded</h3>
                </div>
                <p className="text-gray-600 ml-10 mb-2">Your execution plan JSON file is ready and has been saved to your Downloads folder.</p>
                {commandModal.actualFilename && (
                  <div className="ml-10 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>Filename:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{commandModal.actualFilename}</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Run command */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm">2</div>
                  <h3 className="text-lg font-semibold text-gray-800">Copy & Run Command</h3>
                </div>
                <p className="text-gray-600 ml-10 mb-3">Paste this command in your terminal (macOS, Linux, or Windows) to run the load tests:</p>
                
                {/* Command Box */}
                <div className="ml-10 bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 flex items-center justify-between gap-4">
                  <code className="flex-1 break-all">{commandModal.command}</code>
                  <button
                    onClick={copyToClipboard}
                    className={`flex-shrink-0 p-2 rounded transition-colors ${
                      copyFeedback
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Copy to clipboard"
                  >
                    {copyFeedback ? (
                      <span className="text-sm font-semibold">✓ Copied!</span>
                    ) : (
                      <FileCopyIcon fontSize="small" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step 3: What happens */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm">3</div>
                  <h3 className="text-lg font-semibold text-gray-800">Results Uploaded</h3>
                </div>
                <p className="text-gray-600 ml-10">After tests complete, results are automatically uploaded to your dashboard where you can view metrics and analytics.</p>
              </div>

              {/* Important Note */}
              <div className="ml-10 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> Make sure Node.js and npm are installed on your computer. The command will automatically install required dependencies.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setCommandModal({ ...commandModal, isOpen: false })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={copyToClipboard}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <FileCopyIcon fontSize="small" />
                Copy Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}