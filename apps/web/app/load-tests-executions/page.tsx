'use client';

import { useState, useEffect } from 'react';
import { getLoadTestExecutions } from '@/lib/api';
import { LoadTestExecution } from '@apimetrics/shared';
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
      
      // Auto-expand the most recent execution if there are any
      if (executions.length > 0) {
        setExpandedExecutions([executions[0].id]);
      }
    } catch (error) {
      console.error('Failed to fetch load test executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExecution = (executionId: string) => {
    setExpandedExecutions(prev =>
      prev.includes(executionId)
        ? prev.filter(id => id !== executionId)
        : [...prev, executionId]
    );
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
                    <ChevronRightIcon className={`transform transition-transform cursor-pointer text-gray-600 hover:text-gray-800 ${
                      expandedExecutions.includes(execution.id) ? 'rotate-90' : ''
                    }`} onClick={() => toggleExecution(execution.id)} />
                  </div>
                </div>

                {expandedExecutions.includes(execution.id) && (
                  <div className="border-t border-gray-100 p-6 space-y-6">
                    {/* Empty Graph Section */}
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-600 mb-2">Execution Timeline</h3>
                      <p className="text-gray-500">Graph showing test execution over time will appear here</p>
                    </div>

                    {/* Empty Metrics Section */}
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8">
                      <h3 className="text-lg font-medium text-gray-600 mb-4 text-center">Execution Metrics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-400">--</div>
                          <div className="text-sm text-gray-500">Avg Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-400">--</div>
                          <div className="text-sm text-gray-500">P95 Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-400">--</div>
                          <div className="text-sm text-gray-500">Success Rate</div>
                        </div>
                      </div>
                    </div>

                    {/* Empty Requests Section */}
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-600 mb-2">Executed Requests</h3>
                      <p className="text-gray-500">List of executed requests and their results will appear here</p>
                    </div>
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