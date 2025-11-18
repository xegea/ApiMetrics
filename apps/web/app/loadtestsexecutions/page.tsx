'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLoadTestExecutions, deleteLoadTestExecution, downloadLoadTestExecution, deleteTestResult } from '@/lib/api';

interface Execution {
  id: string;
  loadTestExecutionId: string;
  status: 'running' | 'completed' | 'failed';
  command: string;
  output?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  // Metrics from the CLI execution
  avgLatency?: number; // Average latency in nanoseconds
  p95Latency?: number; // P95 latency in nanoseconds
  successRate?: number; // Success rate as decimal (0-1)
  resultTimestamp?: string; // Timestamp of when results were recorded
  minLatency?: number; // Minimum latency in nanoseconds
  maxLatency?: number; // Maximum latency in nanoseconds
  p50Latency?: number; // P50 latency in nanoseconds
  p99Latency?: number; // P99 latency in nanoseconds
  totalRequests?: number; // Total number of requests made
  testDuration?: string; // Duration of the test (e.g., "30.001s")
  actualRate?: number; // Actual RPS achieved
  throughput?: number; // Throughput in req/sec
  bytesIn?: number; // Total bytes received
  bytesOut?: number; // Total bytes sent
  statusCodes?: Record<string, number>; // Status code counts
  errorDetails?: string[]; // Error details
  requestMetricSummaries?: Array<{
    id: string;
    testResultId: string;
    requestIndex: number;
    method: string;
    target: string;
    totalRequests: number;
    avgLatency: string; // string form (bigint) from the API
    minLatency: string;
    maxLatency: string;
    p50Latency: string;
    p95Latency: string;
    p99Latency: string;
    successRate: number;
    bytesIn: number;
    bytesOut: number;
    statusCodes: Record<string, number>;
    errors: string[];
  }>;
}

interface LoadTestExecution {
  id: string;
  name: string;
  loadTestPlanId: string;
  createdAt: string;
  updatedAt: string;
  // Snapshot fields for immutable execution plan data
  planName?: string;
  planExecutionTime?: string;
  planIterations?: number;
  planDelayBetweenRequests?: string;
  planTestRequests?: string;
}

interface LoadTestExecutionWithExecutions extends LoadTestExecution {
  loadtests: Execution[];
}

// Helper to compute total/success/error counts for a RequestMetric summary
function getRequestStatusCounts(r: any) {
  const totalFromCounts = r.statusCodes ? Object.values(r.statusCodes).reduce((a: number, b: any) => a + Number(b), 0) : 0;
  const totalRequests = r.totalRequests ?? totalFromCounts ?? 0;

  // Count successes (2xx) from statusCodes if available
  let successFromStatus = 0;
  if (r.statusCodes) {
    for (const [code, cnt] of Object.entries(r.statusCodes)) {
      const c = Number(code);
      if (!Number.isNaN(c) && c >= 200 && c < 300) {
        successFromStatus += Number(cnt);
      }
    }
  }

  const successCount = successFromStatus || Math.round((r.successRate || 0) * totalRequests);
  const errorsCount = Math.max(0, totalRequests - successCount);

  const successRate = totalRequests > 0 ? successCount / totalRequests : (typeof r.successRate === 'number' ? r.successRate : 0);

  return { totalRequests, successCount, errorsCount, successRate };
}
import { useAuth } from '@/lib/auth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

interface CommandModalState {
  isOpen: boolean;
  command: string;
  executionName: string;
  actualFilename?: string;
}

interface LoadTestResultCardProps {
  loadtest: Execution;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function LoadTestResultCard({ loadtest, index, isExpanded, onToggle, onDelete }: LoadTestResultCardProps) {

  const formatLatency = (nanoseconds?: number) => {
    if (!nanoseconds) return 'N/A';
    return `${(nanoseconds / 1000000).toFixed(2)}ms`;
  };

  const formatLatencyFromString = (nanosecondsStr?: string) => {
    if (!nanosecondsStr) return 'N/A';
    // nanoseconds come as strings (BigInt from DB); parse as number safely
    const n = Number(nanosecondsStr);
    if (Number.isNaN(n)) return 'N/A';
    return `${(n / 1000000).toFixed(2)}ms`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Build request summary rows to avoid JSX parser issues
  const requestRows = (loadtest.requestMetricSummaries || []).map((r) => {
    const { totalRequests: rTotal, successCount: rSuccessCount, errorsCount: rErrorsCount, successRate: rSuccessRate } = getRequestStatusCounts(r);
    return (
      <tr key={r.id} className="border-t">
        <td className="px-3 py-2">{r.requestIndex + 1}</td>
        <td className="px-3 py-2 font-medium text-gray-800">{r.method}</td>
        <td className="px-3 py-2 break-all text-blue-700">{r.target}</td>
        <td className="px-3 py-2 text-right text-gray-800">{rTotal}</td>
        <td className="px-3 py-2 text-right">{formatLatencyFromString(r.avgLatency)}</td>
        <td className="px-3 py-2 text-right">{formatLatencyFromString(r.minLatency)}</td>
        <td className="px-3 py-2 text-right">{formatLatencyFromString(r.maxLatency)}</td>
        <td className="px-3 py-2 text-right">{formatLatencyFromString(r.p50Latency)}</td>
        <td className="px-3 py-2 text-right">{formatLatencyFromString(r.p95Latency)}</td>
        <td className="px-3 py-2 text-right">{formatLatencyFromString(r.p99Latency)}</td>
        <td className="px-3 py-2 text-right">{typeof r.successRate === 'number' ? (r.successRate * 100).toFixed(1) + '%' : (rTotal > 0 ? (rSuccessRate * 100).toFixed(1) + '%' : 'N/A')}</td>
        <td className="px-3 py-2 text-right">{rErrorsCount}</td>
      </tr>
    );
  });

  return (
    <div className={`border rounded-lg ${getStatusColor(loadtest.status)} group relative`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div
          onClick={onToggle}
          className="flex items-center gap-4 flex-1 cursor-pointer hover:bg-opacity-75 transition-all"
        >
          {isExpanded ? (
            <ExpandMoreIcon className="text-gray-600" />
          ) : (
            <ChevronRightIcon className="text-gray-600" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-gray-800">Test #{index}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(loadtest.status)}`}>
                {loadtest.status}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Started: {new Date(loadtest.startedAt).toISOString().split('T')[0]} {new Date(loadtest.startedAt).toISOString().split('T')[1].split('.')[0]}</div>
              {loadtest.avgLatency && (
                <div className="flex gap-4">
                  <span>Avg: {formatLatency(loadtest.avgLatency)}</span>
                  <span>P95: {formatLatency(loadtest.p95Latency)}</span>
                  <span>Success: {(loadtest.successRate ? loadtest.successRate * 100 : 0).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
                  {/* requests summary insertion point */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="p-1 rounded text-gray-600 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" 
          title="Delete Test"
        >
          <DeleteIcon fontSize="small" />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* Request Metrics */}
          {loadtest.totalRequests && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Request Metrics</h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{loadtest.totalRequests}</div>
                    <div className="text-sm text-blue-800 font-medium">Total Requests</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{(loadtest.successRate ? loadtest.successRate * 100 : 0).toFixed(1)}%</div>
                    <div className="text-sm text-green-800 font-medium">Success Rate</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">{loadtest.testDuration}</div>
                    <div className="text-sm text-purple-800 font-medium">Duration</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">{loadtest.actualRate?.toFixed(2)}</div>
                    <div className="text-sm text-orange-800 font-medium">RPS</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Summary Totals */}
          {loadtest.requestMetricSummaries && loadtest.requestMetricSummaries.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Load Test Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {(() => {
                  const totalRequests = loadtest.requestMetricSummaries!.reduce((sum, r) => {
                    const { totalRequests: rTotal } = getRequestStatusCounts(r);
                    return sum + rTotal;
                  }, 0);
                  const totalSuccess = loadtest.requestMetricSummaries!.reduce((sum, r) => {
                    const { successCount } = getRequestStatusCounts(r);
                    return sum + successCount;
                  }, 0);
                  const totalErrors = loadtest.requestMetricSummaries!.reduce((sum, r) => {
                    const { errorsCount } = getRequestStatusCounts(r);
                    return sum + errorsCount;
                  }, 0);
                  const successRatio = totalRequests > 0 ? (totalSuccess / totalRequests * 100).toFixed(1) + '%' : 'N/A';

                  return (
                    <>
                      <div className="p-3 text-center">
                        <div className="text-gray-600 font-semibold">Total Requests</div>
                        <div className="font-extrabold text-2xl text-gray-900">{totalRequests}</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-gray-600 font-semibold">Success</div>
                        <div className="font-extrabold text-2xl text-green-600">{totalSuccess}</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-gray-600 font-semibold">Errors</div>
                        <div className="font-extrabold text-2xl text-red-600">{totalErrors}</div>
                      </div>
                      <div className="p-3 text-center">
                        <div className="text-gray-600 font-semibold">Success Ratio</div>
                        <div className="font-extrabold text-2xl text-blue-600">{successRatio}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Throughput & Data Transfer */}
          {(loadtest.throughput || loadtest.bytesIn || loadtest.bytesOut) && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Throughput & Data</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {loadtest.throughput !== undefined && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">Throughput</div>
                    <div className="font-semibold text-lg text-gray-900">{loadtest.throughput.toFixed(2)} req/s</div>
                  </div>
                )}
                {loadtest.bytesIn !== undefined && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">Bytes In</div>
                    <div className="font-semibold text-lg text-gray-900">{formatBytes(loadtest.bytesIn)}</div>
                  </div>
                )}
                {loadtest.bytesOut !== undefined && (
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">Bytes Out</div>
                    <div className="font-semibold text-lg text-gray-900">{formatBytes(loadtest.bytesOut)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {loadtest.avgLatency && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Performance Metrics</h3>
              <div className="space-y-4">
                {/* First row: Avg, Min, Max Latency */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">Avg Latency</div>
                    <div className="font-semibold text-lg text-gray-900">{formatLatency(loadtest.avgLatency)}</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">Min Latency</div>
                    <div className="font-semibold text-lg text-gray-900">{formatLatency(loadtest.minLatency)}</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">Max Latency</div>
                    <div className="font-semibold text-lg text-gray-900">{formatLatency(loadtest.maxLatency)}</div>
                  </div>
                </div>
                {/* Second row: P50, P95, P99 Latency */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">P50 Latency</div>
                    <div className="font-semibold text-lg text-gray-900">{formatLatency(loadtest.p50Latency)}</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">P95 Latency</div>
                    <div className="font-semibold text-lg text-gray-900">{formatLatency(loadtest.p95Latency)}</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="text-gray-600">P99 Latency</div>
                    <div className="font-semibold text-lg text-gray-900">{formatLatency(loadtest.p99Latency)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Codes */}
          {loadtest.statusCodes && Object.keys(loadtest.statusCodes).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Status Codes</h3>
              <div className="space-y-2">
                {Object.entries(loadtest.statusCodes).map(([code, count]) => {
                  const statusColor = parseInt(code) >= 200 && parseInt(code) < 300 ? 'text-green-600' :
                                    parseInt(code) >= 400 && parseInt(code) < 500 ? 'text-yellow-600' :
                                    parseInt(code) >= 500 ? 'text-red-600' : 'text-gray-600';
                  return (
                    <div key={code} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          parseInt(code) >= 200 && parseInt(code) < 300 ? 'bg-green-100 text-green-800' :
                          parseInt(code) >= 400 && parseInt(code) < 500 ? 'bg-yellow-100 text-yellow-800' :
                          parseInt(code) >= 500 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {code}
                        </span>
                        <span className="text-gray-600">HTTP {code}</span>
                        <span className={`font-semibold ${statusColor}`}>({Number(count)} requests)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Errors */}
          {loadtest.errorDetails && loadtest.errorDetails.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Errors</h3>
              <div className="space-y-2">
                {loadtest.errorDetails.map((error, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Summaries for this test */}
          {loadtest.requestMetricSummaries && loadtest.requestMetricSummaries.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Requests Summary</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-gray-800">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-left">Endpoint</th>
                      <th className="px-3 py-2 text-right">Requests</th>
                      <th className="px-3 py-2 text-right">Avg</th>
                      <th className="px-3 py-2 text-right">Min</th>
                      <th className="px-3 py-2 text-right">Max</th>
                      <th className="px-3 py-2 text-right">P50</th>
                      <th className="px-3 py-2 text-right">P95</th>
                      <th className="px-3 py-2 text-right">P99</th>
                      <th className="px-3 py-2 text-right">Success</th>
                      <th className="px-3 py-2 text-right">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestRows}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadTestsExecutionsPage() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadTestExecutions, setLoadTestExecutions] = useState<LoadTestExecutionWithExecutions[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [expandedLoadTest, setExpandedLoadTest] = useState<string | null>(null);
  const [commandModal, setCommandModal] = useState<CommandModalState>({
    isOpen: false,
    command: '',
    executionName: '',
  });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (session?.user?.email && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchLoadTestExecutions();
    }
  }, [session?.user?.email]);

  useEffect(() => {
    // Check if there's an expandId parameter in the URL and expand it
    const expandId = searchParams.get('expandId');
    if (expandId) {
      // Use a small delay to ensure executions are loaded first
      setTimeout(() => {
        toggleExecution(expandId);
      }, 100);
      // Remove the parameter from URL
      window.history.replaceState({}, '', '/loadtestsexecutions');
    }
  }, [searchParams.get('expandId')]);

  const fetchLoadTestExecutions = async () => {
    try {
      setLoading(true);
      const response = await getLoadTestExecutions();
      const executions = response.loadtestsexecutions;
      
      // Sort by createdAt descending (most recent first)
      executions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLoadTestExecutions(executions as LoadTestExecutionWithExecutions[]);
    } catch (error) {
      console.error('Failed to fetch execution plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (planId: string) => {
    setExpandedPlans(prev =>
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const toggleExecution = async (executionId: string) => {
    const isCollapsing = expandedExecution === executionId;
    setExpandedExecution(prev => prev === executionId ? null : executionId);
    // Reset expanded load test when collapsing execution
    if (isCollapsing) {
      setExpandedLoadTest(null);
    }
    // Results are already included in the execution data via loadtests array
    // No need to fetch separately
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').split('.')[0];
  };

  const formatLatencyFromString = (nanosecondsStr?: string) => {
    if (!nanosecondsStr) return 'N/A';
    const n = Number(nanosecondsStr);
    if (Number.isNaN(n)) return 'N/A';
    return `${(n / 1000000).toFixed(2)}ms`;
  };

  const openCommandModal = (executionName: string, filename?: string, instructions?: any) => {
    // Use instructions from the downloaded file if available
    let command = instructions?.step2 || `npx @xegea/apimetrics-cli execute-plan ~/Downloads/${filename || 'execution-plan-*.json'}`;
    // Extract just the command part (remove "Open Terminal and run: " prefix if present)
    if (command.startsWith('Open Terminal and run: ')) {
      command = command.substring('Open Terminal and run: '.length);
    }
    setCommandModal({
      isOpen: true,
      command,
      executionName,
      actualFilename: filename,
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

  const handleDeleteExecution = async (executionId: string) => {
    if (window.confirm('Are you sure you want to delete this load test execution? This action cannot be undone.')) {
      try {
        await deleteLoadTestExecution(executionId);
        await fetchLoadTestExecutions();
      } catch (error) {
        console.error('Failed to delete execution:', error);
        alert('Failed to delete execution. Please try again.');
      }
    }
  };

  const handleDeleteTestResult = async (testResultId: string, executionId: string) => {
    if (window.confirm('Are you sure you want to delete this test result? This action cannot be undone.')) {
      try {
        await deleteTestResult(testResultId);
        // Update local state to remove the deleted test result without full refresh
        setLoadTestExecutions(prev => prev.map(execution => 
          execution.id === executionId 
            ? { ...execution, loadtests: execution.loadtests.filter(test => test.id !== testResultId) }
            : execution
        ));
      } catch (error) {
        console.error('Failed to delete test result:', error);
        alert('Failed to delete test result. Please try again.');
      }
    }
  };

  const handleRefreshExecution = async (executionId: string) => {
    try {
      // Refresh all executions without showing global loading state
      const response = await getLoadTestExecutions();
      const executions = response.loadtestsexecutions;
      
      // Sort by createdAt descending (most recent first)
      executions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLoadTestExecutions(executions as LoadTestExecutionWithExecutions[]);
    } catch (error) {
      console.error('Failed to refresh execution:', error);
      alert('Failed to refresh execution. Please try again.');
    }
  };

  const handleDownloadAndRun = async (execution: LoadTestExecutionWithExecutions) => {
    try {
      // Download the execution plan and get the filename + instructions
      const { filename, instructions } = await downloadLoadTestExecution(execution.id);
      
      // Open command modal with the actual filename from the downloaded file
      openCommandModal(execution.name, filename, instructions);
    } catch (error) {
      console.error('Failed to download execution plan:', error);
      alert('Failed to download execution plan. Please try again.');
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
            <p className="text-gray-500">Create a load test from the load test plans page.</p>
          </div>
        )}

        {!loading && loadTestExecutions.length > 0 && (
          <div className="space-y-4">
            {loadTestExecutions.map((execution) => (
              <div key={execution.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* Execution Plan Header */}
                <div className="flex justify-between items-center p-4 bg-blue-50 border-b">
                  <div onClick={() => toggleExecution(execution.id)} className="flex items-center gap-4 cursor-pointer flex-1">
                    {expandedExecution === execution.id ? (
                      <ExpandMoreIcon className="text-2xl text-blue-600" />
                    ) : (
                      <ChevronRightIcon className="text-2xl text-blue-600" />
                    )}
                    <FolderIcon className="text-2xl text-blue-600" />
                    <div>
                      <span className="text-lg font-medium text-gray-800">{execution.name}</span>
                      <div className="text-sm text-gray-500">
                        {execution.createdAt && `Created: ${new Date(execution.createdAt).toISOString().split('T')[0]} ${new Date(execution.createdAt).toISOString().split('T')[1].split('.')[0]}`}
                      </div>
                      {execution.planName && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Plan:</span> {execution.planName}
                          {execution.planExecutionTime && <span> • Duration: {execution.planExecutionTime}</span>}
                          {execution.planIterations && <span> • Iterations: {execution.planIterations}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadAndRun(execution); }} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1" title="Download & Run">
                      <PlayCircleIcon fontSize="small" />
                      Download & Run
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRefreshExecution(execution.id); }} className="p-1 rounded text-gray-600 hover:text-blue-600 hover:bg-blue-50" title="Refresh">
                      <RefreshIcon fontSize="small" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteExecution(execution.id); }} className="p-1 rounded text-gray-600 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <DeleteIcon fontSize="small" />
                    </button>
                  </div>
                </div>

                {expandedExecution === execution.id && (
                  <div className="p-4">
                    {/* Metrics Graph Section */}
                    {execution.loadtests && execution.loadtests.length > 0 && (() => {
                      // Sort loadtests by time (oldest first) for the graph
                      const sortedLoadtests = [...execution.loadtests].sort((a, b) => 
                        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
                      );
                      
                      // Derive per-test totals from request summaries as fallback so the Legend matches the bars
                      const loadtestsWithTotals = sortedLoadtests.map((t) => {
                        const fallbackTotal = (t.requestMetricSummaries || []).reduce((acc, r) => acc + (r.totalRequests || 0), 0);
                        const computedTotal = (t.totalRequests ?? 0) || fallbackTotal;

                        let computedSuccessRate = 0;
                        if (typeof t.successRate === 'number') computedSuccessRate = t.successRate;
                        else if (t.statusCodes && Object.keys(t.statusCodes).length > 0) {
                          const totalFromStatus = Object.values(t.statusCodes).reduce((a: number, b: any) => a + Number(b), 0);
                          const okFromStatus = Object.entries(t.statusCodes).reduce((a, [code, cnt]) => {
                            const c = Number(code);
                            if (c >= 200 && c < 300) return a + Number(cnt);
                            return a;
                          }, 0);
                          computedSuccessRate = totalFromStatus > 0 ? okFromStatus / totalFromStatus : 0;
                        }

                        const errorCount = computedTotal - Math.round(computedTotal * computedSuccessRate);
                        const successCount = computedTotal - errorCount;
                        return { ...t, computedTotalRequests: computedTotal, computedErrorCount: errorCount, computedSuccessCount: successCount } as any;
                      });

                      const totalRequests = loadtestsWithTotals.reduce((sum, t) => sum + (t.computedTotalRequests || 0), 0);
                      const totalErrors = loadtestsWithTotals.reduce((sum, t) => sum + (t.computedErrorCount || 0), 0);
                      const totalSuccess = totalRequests - totalErrors;

                      // Build aggregated request summary rows across all executions
                      // Group summaries by endpoint (method + target) to aggregate totals across all request positions
                      const aggregatedSummaries = new Map<string, any>();
                      sortedLoadtests.forEach((loadtest: any) => {
                        if (loadtest.requestMetricSummaries) {
                          loadtest.requestMetricSummaries.forEach((r: any) => {
                            // Key is just method + target, so all requests to same endpoint are aggregated
                            const key = `${r.method}|${r.target}`;
                            if (!aggregatedSummaries.has(key)) {
                              aggregatedSummaries.set(key, {
                                method: r.method,
                                target: r.target,
                                totalRequests: 0,
                                successCount: 0,
                                errorsCount: 0,
                              });
                            }
                            const agg = aggregatedSummaries.get(key);
                            const { totalRequests: rTotal, successCount: rSuccessCount, errorsCount: rErrorsCount } = getRequestStatusCounts(r);
                            agg.totalRequests += rTotal;
                            agg.successCount += rSuccessCount;
                            agg.errorsCount += rErrorsCount;
                          });
                        }
                      });

                      // Convert aggregated map to array
                      const aggregatedSummaryArray = Array.from(aggregatedSummaries.values());

                      const latestSummaryRows = aggregatedSummaryArray.map((r: any, idx: number) => {
                        const successRate = r.totalRequests > 0 ? r.successCount / r.totalRequests : 0;
                        return (
                          <tr key={`${r.method}-${r.target}-${idx}`} className="border-t">
                            <td className="px-3 py-2">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{r.method}</td>
                            {/* Endpoint: allow wrapping so long URLs wrap to multiple lines instead of truncating */}
                            <td className="px-3 py-2 break-words whitespace-normal text-blue-700 max-w-[560px]">{r.target}</td>
                            <td className="px-3 py-2 text-right text-gray-800">{r.totalRequests}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{(successRate * 100).toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{r.successCount}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{r.errorsCount}</td>
                          </tr>
                        );
                      });
                      
                      return (
                      <div className="mb-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Test Metrics Timeline
                        </h3>
                        
                        {/* Legend with totals */}
                        <div className="inline-flex items-center gap-4 mb-4 text-sm bg-gray-100 rounded-lg px-4 py-2 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded"></div>
                            <span className="text-gray-700 font-medium">Total: <span className="font-bold text-blue-600">{totalRequests}</span></span>
                          </div>
                          <div className="w-px h-4 bg-gray-300"></div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-green-600 rounded"></div>
                            <span className="text-gray-700 font-medium">OK: <span className="font-bold text-green-600">{totalSuccess}</span></span>
                          </div>
                          <div className="w-px h-4 bg-gray-300"></div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-br from-red-400 to-red-600 rounded"></div>
                            <span className="text-gray-700 font-medium">Errors: <span className="font-bold text-red-600">{totalErrors}</span></span>
                          </div>
                        </div>
                        
                        {/* Timeline Graph */}
                        <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
                          <div className="relative" style={{ height: '200px' }}>
                            {/* Calculate max values */}
                            {(() => {
                              // loadtestsWithTotals already computed above to match the legend; use it here
                              const maxRequests = Math.max(...loadtestsWithTotals.map(t => t.computedTotalRequests || 0));
                              const maxValue = maxRequests;
                              const ySteps = 5;
                              const stepValue = maxValue / ySteps;
                              
                              return (
                                <>
                                  {/* Y-axis labels and grid lines */}
                                  <div className="absolute left-0 top-0 bottom-12 w-20 flex flex-col justify-between">
                                    {Array.from({ length: ySteps + 1 }).map((_, i) => (
                                      <div key={i} className="relative">
                                        <span className="absolute right-3 text-sm font-medium text-gray-600 transform -translate-y-1/2">
                                          {Math.round(stepValue * (ySteps - i))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Grid lines horizontal */}
                                  <div className="absolute left-20 right-0 top-0 bottom-12">
                                    <div className="relative h-full">
                                      {Array.from({ length: ySteps + 1 }).map((_, i) => (
                                        <div 
                                          key={i} 
                                          className="absolute left-0 right-0 border-t border-slate-200"
                                          style={{ top: `${(i / ySteps) * 100}%` }}
                                        ></div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Graph area - Bars */}
                                  <div className="absolute left-20 right-0 top-0 bottom-12 flex items-end justify-around gap-3 px-6" style={{ height: 'calc(100% - 48px)' }}>
                                    {loadtestsWithTotals.map((loadtest, index) => {
                                      const errorCount = loadtest.computedErrorCount || 0;
                                      const successCount = loadtest.computedSuccessCount || 0;
                                      
                                      // Calculate heights as percentage of max value
                                      const successHeightPercent = maxValue > 0 ? (successCount / maxValue) * 100 : 0;
                                      const errorHeightPercent = maxValue > 0 ? (errorCount / maxValue) * 100 : 0;
                                      
                                      return (
                                        <div 
                                          key={loadtest.id} 
                                          className="flex-1 flex flex-col justify-end items-center group relative"
                                          style={{ height: '100%' }}
                                        >
                                          {/* Single Tooltip for the whole bar */}
                                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-2 h-2 bg-blue-500 rounded"></div>
                                              <span className="text-xs text-gray-300">Total:</span>
                                              <span className="font-bold">{loadtest.computedTotalRequests || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-2 h-2 bg-green-500 rounded"></div>
                                              <span className="text-xs text-gray-300">OK:</span>
                                              <span className="font-bold text-green-400">{successCount}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-red-500 rounded"></div>
                                              <span className="text-xs text-gray-300">Errors:</span>
                                              <span className="font-bold text-red-400">{errorCount}</span>
                                            </div>
                                          </div>

                                          {/* Bar with absolute positioning for stacking */}
                                          <div className="relative w-full max-w-[70px]" style={{ height: '100%' }}>
                                            {/* Success bar at bottom */}
                                            <div 
                                              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 transition-all duration-200 cursor-pointer flex items-center justify-center rounded-t-lg border-2 border-white shadow-lg"
                                              style={{ height: `${successHeightPercent}%` }}
                                            >
                                            </div>
                                            {/* Error bar stacked on top */}
                                            {errorCount > 0 && (
                                              <div 
                                                className="absolute left-0 right-0 bg-gradient-to-t from-red-500 to-red-400 hover:from-red-600 hover:to-red-500 transition-all duration-200 cursor-pointer flex items-center justify-center border-x-2 border-t-2 border-white rounded-t-lg shadow-lg"
                                                style={{ 
                                                  bottom: `${successHeightPercent}%`,
                                                  height: `${errorHeightPercent}%`
                                                }}
                                              >
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* X-axis labels (Test numbers) */}
                                  <div className="absolute left-20 right-0 bottom-0 flex justify-around items-start h-12 px-6">
                                    {loadtestsWithTotals.map((loadtest, index) => (
                                      <div key={loadtest.id} className="flex-1 flex flex-col items-center max-w-[70px]">
                                        <div className="text-sm font-bold text-gray-800 bg-white px-2 py-1 rounded-md shadow-sm">#{index + 1}</div>
                                        <div className="text-xs text-gray-500 mt-1">{new Date(loadtest.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Aggregated Request Summary across all executions */}
                        {sortedLoadtests.length > 0 && latestSummaryRows && latestSummaryRows.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Requests Overview</h3>
                            <div className="border rounded-lg bg-white overflow-x-auto">
                              {/*
                                - Horizontal scrolling allowed by outer container (overflow-x-auto)
                                - Vertical scrolling enabled on inner wrapper with sticky header
                                - Set a max-height to show up to ~10 rows; adjust as needed
                              */}
                              <div className="max-h-[480px] overflow-y-auto">
                                <table className="min-w-full text-sm text-gray-800">
                                <thead className="bg-gray-50">
                                    {/* Make header sticky so it remains visible when scrolling vertically */}
                                  <tr>
                                    <th className="px-3 py-2 text-left sticky top-0 bg-gray-50 z-10">#</th>
                                    <th className="px-3 py-2 text-left sticky top-0 bg-gray-50 z-10">Method</th>
                                    <th className="px-3 py-2 text-left sticky top-0 bg-gray-50 z-10">Endpoint</th>
                                    <th className="px-3 py-2 text-right sticky top-0 bg-gray-50 z-10">Requests</th>
                                    <th className="px-3 py-2 text-right sticky top-0 bg-gray-50 z-10">Success %</th>
                                    <th className="px-3 py-2 text-right sticky top-0 bg-gray-50 z-10">Success</th>
                                    <th className="px-3 py-2 text-right sticky top-0 bg-gray-50 z-10">Errors</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/*
                                    For long endpoints: allow wrapping so cells fit vertically
                                    while keeping numeric fields single-line for horizontal scroll.
                                  */}
                                  {latestSummaryRows.map((r: any) => (
                                    // ensure consistent row height so that max-height corresponds to 10 rows
                                    React.cloneElement(r, { className: (r.props.className || '') + ' h-12' })
                                  ))}
                                </tbody>
                              </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })()}

                    {/* Loadtests list */}
                    {execution.loadtests && execution.loadtests.length > 0 ? (
                      <div className="space-y-3">
                        {[...execution.loadtests]
                          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                          .map((loadtest, index) => (
                            <LoadTestResultCard 
                              key={loadtest.id} 
                              loadtest={loadtest} 
                              index={execution.loadtests.length - index}
                              isExpanded={expandedLoadTest === loadtest.id}
                              onToggle={() => setExpandedLoadTest(prev => prev === loadtest.id ? null : loadtest.id)}
                              onDelete={() => handleDeleteTestResult(loadtest.id, execution.id)}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                          No load tests found for this load test execution.
                        </div>
                        <div className="text-gray-600 mb-6 flex justify-center">
                          <button onClick={() => handleDownloadAndRun(execution)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2" title="Download & Run">
                            <PlayCircleIcon />
                            Download & Run
                          </button>
                        </div>
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
                <div className="ml-10">
                  <p className="text-gray-700 mb-2">Open Terminal and run:</p>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-100 flex items-center justify-between gap-4">
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
              </div>

              {/* Step 3: What happens */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm">3</div>
                  <h3 className="text-lg font-semibold text-gray-800">Results Uploaded</h3>
                </div>
                <p className="text-gray-600 ml-10">After tests complete, results are automatically uploaded to your Test Executions page where you can view metrics and analytics.</p>
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

function LoadTestsExecutionsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-6xl mx-auto"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div></div></div>}>
      <LoadTestsExecutionsPage />
    </Suspense>
  );
}

export default LoadTestsExecutionsPageWrapper;