'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLoadTestExecutions, getLoadTestExecutionResults, deleteLoadTestExecution, downloadLoadTestExecution } from '@/lib/api';
import { ExecutionPlan, LoadTestExecution, TestResult } from '@apimetrics/shared';

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
}

interface LoadTestExecutionWithExecutions extends LoadTestExecution {
  loadtests: Execution[];
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

interface CommandModalState {
  isOpen: boolean;
  command: string;
  executionName: string;
  actualFilename?: string;
}

function LoadTestsExecutionsPage() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadTestExecutions, setLoadTestExecutions] = useState<LoadTestExecutionWithExecutions[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);
  const [expandedExecutions, setExpandedExecutions] = useState<string[]>([]);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
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
    const isExpanding = !expandedExecutions.includes(executionId);
    
    setExpandedExecutions(prev =>
      prev.includes(executionId)
        ? prev.filter(id => id !== executionId)
        : [...prev, executionId]
    );

    // Fetch results when expanding
    if (isExpanding) {
      try {
        const response = await getLoadTestExecutionResults(executionId);
        setExecutionResults(prev => ({
          ...prev,
          [executionId]: response.result,
        }));
      } catch (error) {
        console.error('Failed to fetch execution results:', error);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
                    {expandedExecutions.includes(execution.id) ? (
                      <ExpandMoreIcon className="text-2xl text-blue-600" />
                    ) : (
                      <ChevronRightIcon className="text-2xl text-blue-600" />
                    )}
                    <FolderIcon className="text-2xl text-blue-600" />
                    <div>
                      <span className="text-lg font-medium text-gray-800">{execution.name}</span>
                      <div className="text-sm text-gray-500">
                        {execution.createdAt && `Created: ${new Date(execution.createdAt).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadAndRun(execution); }} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1" title="Download & Run">
                      <PlayCircleIcon fontSize="small" />
                      Download & Run
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteExecution(execution.id); }} className="p-1 rounded text-gray-600 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <DeleteIcon fontSize="small" />
                    </button>
                  </div>
                </div>

                {expandedExecutions.includes(execution.id) && (
                  <div className="p-4">
                    {/* Loadtests list */}
                    {execution.loadtests && execution.loadtests.length > 0 ? (
                      <div className="space-y-2">
                        {execution.loadtests.map((loadtest) => (
                          <div key={loadtest.id} className="bg-gray-50 border rounded p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{loadtest.command}</span>
                                <div className="text-sm text-gray-500">
                                  Status: {loadtest.status} • Started: {new Date(loadtest.startedAt).toLocaleString()}
                                  {loadtest.completedAt && ` • Completed: ${new Date(loadtest.completedAt).toLocaleString()}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No load tests found for this load test execution.
                      </div>
                    )}

                    {/* Results section - show results for each completed loadtest */}
                    {execution.loadtests && execution.loadtests.some(loadtest => loadtest.status === 'completed' && loadtest.avgLatency) && (
                      <div className="mt-4 space-y-4">
                        {execution.loadtests
                          .filter(loadtest => loadtest.status === 'completed' && loadtest.avgLatency)
                          .map((loadtest) => (
                            <div key={loadtest.id} className="p-4 bg-green-50 border border-green-200 rounded">
                              <h4 className="font-medium text-green-800 mb-2">Test Results - {loadtest.command}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>Avg Latency: {(loadtest.avgLatency! / 1000000).toFixed(2)}ms</div>
                                <div>P95 Latency: {(loadtest.p95Latency! / 1000000).toFixed(2)}ms</div>
                                <div>Success Rate: {(loadtest.successRate! * 100).toFixed(1)}%</div>
                                <div>Total Requests: {loadtest.totalRequests}</div>
                              </div>
                            </div>
                          ))}
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

function LoadTestsExecutionsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-6"><div className="max-w-6xl mx-auto"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div></div></div>}>
      <LoadTestsExecutionsPage />
    </Suspense>
  );
}

export default LoadTestsExecutionsPageWrapper;