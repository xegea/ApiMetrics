'use client';

import React, { useState, useEffect, useRef } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';

interface MetricsBucket {
  id: string;
  bucketNumber: number;
  startTime: string;
  endTime: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  bytesIn: number;
  bytesOut: number;
  statusCodes: Record<string, number>;
  errors: string[];
}

interface BucketMetricsTableProps {
  executionId: string;
  apiUrl: string;
  token: string;
}

export function BucketMetricsTable({ executionId, apiUrl, token }: BucketMetricsTableProps) {
  const [buckets, setBuckets] = useState<MetricsBucket[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBuckets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${apiUrl}/loadtestsexecutions/${executionId}/buckets`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch buckets: ${response.statusText}`);
      }

      const data = await response.json();
      setBuckets(Array.isArray(data) ? data : data.buckets || []);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch buckets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayClick = async () => {
    if (isPlaying) {
      // Stop playback
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // Start playback
      setIsPlaying(true);
      // Fetch immediately
      await fetchBuckets();
      // Then fetch every 5 seconds
      intervalRef.current = setInterval(() => {
        fetchBuckets();
      }, 5000);
    }
  };

  const handleManualRefresh = () => {
    fetchBuckets();
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatLatency = (ms: number): string => {
    if (!ms) return 'N/A';
    return `${ms.toFixed(2)}ms`;
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0B';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handlePlayClick}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isPlaying
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
          title={isPlaying ? 'Stop auto-refresh' : 'Start auto-refresh (5s interval)'}
        >
          {isPlaying ? (
            <>
              <StopIcon fontSize="small" />
              Stop
            </>
          ) : (
            <>
              <PlayArrowIcon fontSize="small" />
              Play
            </>
          )}
        </button>

        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh bucket data manually"
        >
          <RefreshIcon fontSize="small" className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>

        {lastRefresh && (
          <span className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        )}

        {isPlaying && (
          <span className="flex items-center gap-1 text-sm text-green-700 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Auto-refreshing every 5s
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      {buckets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-600 font-medium">Total Buckets</div>
            <div className="text-2xl font-bold text-blue-900">{buckets.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-green-600 font-medium">Total Requests</div>
            <div className="text-2xl font-bold text-green-900">
              {buckets.reduce((sum, b) => sum + b.totalRequests, 0)}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-purple-600 font-medium">Avg Success Rate</div>
            <div className="text-2xl font-bold text-purple-900">
              {buckets.length > 0
                ? ((buckets.reduce((sum, b) => sum + b.successRate, 0) / buckets.length) * 100).toFixed(1)
                : '0'}
              %
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-orange-600 font-medium">Avg P95 Latency</div>
            <div className="text-2xl font-bold text-orange-900">
              {buckets.length > 0
                ? formatLatency(buckets.reduce((sum, b) => sum + b.p95Latency, 0) / buckets.length)
                : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Buckets Table */}
      {buckets.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Bucket</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Time Range</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Requests</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Success</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Failed</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Success Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Avg Latency</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Min</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Max</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">P50</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">P95</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">P99</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Bytes In</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Bytes Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {buckets.map((bucket) => (
                <tr key={bucket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{bucket.bucketNumber}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div>{formatTime(bucket.startTime)}</div>
                    <div>{formatTime(bucket.endTime)}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {bucket.totalRequests}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                    {bucket.successCount}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {bucket.failureCount}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span className={bucket.successRate >= 0.95 ? 'text-green-600' : bucket.successRate >= 0.8 ? 'text-yellow-600' : 'text-red-600'}>
                      {(bucket.successRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatLatency(bucket.avgLatency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatLatency(bucket.minLatency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatLatency(bucket.maxLatency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatLatency(bucket.p50Latency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatLatency(bucket.p95Latency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatLatency(bucket.p99Latency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatBytes(bucket.bytesIn)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatBytes(bucket.bytesOut)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading bucket metrics...</div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">
            {isPlaying ? 'No buckets yet. Waiting for data...' : 'Click "Play" to start loading bucket metrics'}
          </div>
        </div>
      )}
    </div>
  );
}
