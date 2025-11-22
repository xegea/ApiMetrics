'use client';

import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

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

interface BucketMetricsChartProps {
  buckets?: MetricsBucket[]; // Made optional
}

// Dark mode optimized color scheme
const COLORS = {
  ok: '#10b981',      // green
  ko: '#ef4444',      // red
  p50: '#3b82f6',     // blue
  p95: '#f97316',     // orange
  p99: '#ec4899',     // magenta/pink
  min: '#6b7280',     // gray
  avg: '#9ca3af',     // light gray
  max: '#4b5563',     // dark gray
  grid: '#374151',    // dark grid
  text: '#e5e7eb',    // light text
};

// Performance quality zones (latency thresholds in ms)
const QUALITY_ZONES = {
  excellent: { max: 200, color: '#10b98120' },   // green with transparency
  good: { max: 800, color: '#eab30820' },        // yellow with transparency
  poor: { max: Infinity, color: '#ef444420' },   // red with transparency
};

/**
 * Calculate moving average for smoothing
 */
function calculateMovingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const slice = data.slice(start, end);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(avg);
  }
  return result;
}

// Sample data for demonstration when no data is provided
const SAMPLE_BUCKETS: MetricsBucket[] = [
  {
    id: '1',
    bucketNumber: 1,
    startTime: '2025-11-22T10:00:00Z',
    endTime: '2025-11-22T10:00:10Z',
    totalRequests: 120,
    successCount: 115,
    failureCount: 5,
    avgLatency: 145.5,
    minLatency: 50,
    maxLatency: 320,
    p50Latency: 130,
    p95Latency: 280,
    p99Latency: 310,
    successRate: 95.83,
    bytesIn: 12000,
    bytesOut: 8000,
    statusCodes: { '200': 115, '500': 5 },
    errors: ['Connection timeout'],
  },
  {
    id: '2',
    bucketNumber: 2,
    startTime: '2025-11-22T10:00:10Z',
    endTime: '2025-11-22T10:00:20Z',
    totalRequests: 150,
    successCount: 145,
    failureCount: 5,
    avgLatency: 168.2,
    minLatency: 60,
    maxLatency: 420,
    p50Latency: 155,
    p95Latency: 380,
    p99Latency: 410,
    successRate: 96.67,
    bytesIn: 15000,
    bytesOut: 10000,
    statusCodes: { '200': 145, '500': 5 },
    errors: [],
  },
  {
    id: '3',
    bucketNumber: 3,
    startTime: '2025-11-22T10:00:20Z',
    endTime: '2025-11-22T10:00:30Z',
    totalRequests: 180,
    successCount: 165,
    failureCount: 15,
    avgLatency: 210.8,
    minLatency: 70,
    maxLatency: 650,
    p50Latency: 185,
    p95Latency: 580,
    p99Latency: 640,
    successRate: 91.67,
    bytesIn: 18000,
    bytesOut: 12000,
    statusCodes: { '200': 165, '500': 10, '502': 5 },
    errors: ['Gateway timeout', 'Internal server error'],
  },
  {
    id: '4',
    bucketNumber: 4,
    startTime: '2025-11-22T10:00:30Z',
    endTime: '2025-11-22T10:00:40Z',
    totalRequests: 200,
    successCount: 190,
    failureCount: 10,
    avgLatency: 192.3,
    minLatency: 55,
    maxLatency: 480,
    p50Latency: 170,
    p95Latency: 420,
    p99Latency: 470,
    successRate: 95.0,
    bytesIn: 20000,
    bytesOut: 15000,
    statusCodes: { '200': 190, '500': 8, '503': 2 },
    errors: ['Service unavailable'],
  },
  {
    id: '5',
    bucketNumber: 5,
    startTime: '2025-11-22T10:00:40Z',
    endTime: '2025-11-22T10:00:50Z',
    totalRequests: 220,
    successCount: 210,
    failureCount: 10,
    avgLatency: 175.5,
    minLatency: 45,
    maxLatency: 390,
    p50Latency: 160,
    p95Latency: 350,
    p99Latency: 380,
    successRate: 95.45,
    bytesIn: 22000,
    bytesOut: 16000,
    statusCodes: { '200': 210, '500': 10 },
    errors: [],
  },
  {
    id: '6',
    bucketNumber: 6,
    startTime: '2025-11-22T10:00:50Z',
    endTime: '2025-11-22T10:01:00Z',
    totalRequests: 250,
    successCount: 240,
    failureCount: 10,
    avgLatency: 158.7,
    minLatency: 40,
    maxLatency: 340,
    p50Latency: 145,
    p95Latency: 310,
    p99Latency: 335,
    successRate: 96.0,
    bytesIn: 25000,
    bytesOut: 18000,
    statusCodes: { '200': 240, '500': 10 },
    errors: [],
  },
  {
    id: '7',
    bucketNumber: 7,
    startTime: '2025-11-22T10:01:00Z',
    endTime: '2025-11-22T10:01:10Z',
    totalRequests: 280,
    successCount: 260,
    failureCount: 20,
    avgLatency: 195.2,
    minLatency: 50,
    maxLatency: 550,
    p50Latency: 175,
    p95Latency: 490,
    p99Latency: 540,
    successRate: 92.86,
    bytesIn: 28000,
    bytesOut: 20000,
    statusCodes: { '200': 260, '500': 15, '504': 5 },
    errors: ['Gateway timeout', 'Connection refused'],
  },
  {
    id: '8',
    bucketNumber: 8,
    startTime: '2025-11-22T10:01:10Z',
    endTime: '2025-11-22T10:01:20Z',
    totalRequests: 300,
    successCount: 285,
    failureCount: 15,
    avgLatency: 172.8,
    minLatency: 42,
    maxLatency: 420,
    p50Latency: 155,
    p95Latency: 380,
    p99Latency: 410,
    successRate: 95.0,
    bytesIn: 30000,
    bytesOut: 22000,
    statusCodes: { '200': 285, '500': 15 },
    errors: [],
  },
  {
    id: '9',
    bucketNumber: 9,
    startTime: '2025-11-22T10:01:20Z',
    endTime: '2025-11-22T10:01:30Z',
    totalRequests: 320,
    successCount: 310,
    failureCount: 10,
    avgLatency: 148.3,
    minLatency: 38,
    maxLatency: 310,
    p50Latency: 135,
    p95Latency: 280,
    p99Latency: 305,
    successRate: 96.88,
    bytesIn: 32000,
    bytesOut: 24000,
    statusCodes: { '200': 310, '500': 10 },
    errors: [],
  },
  {
    id: '10',
    bucketNumber: 10,
    startTime: '2025-11-22T10:01:30Z',
    endTime: '2025-11-22T10:01:40Z',
    totalRequests: 340,
    successCount: 330,
    failureCount: 10,
    avgLatency: 135.6,
    minLatency: 35,
    maxLatency: 280,
    p50Latency: 125,
    p95Latency: 250,
    p99Latency: 275,
    successRate: 97.06,
    bytesIn: 34000,
    bytesOut: 26000,
    statusCodes: { '200': 330, '500': 10 },
    errors: [],
  },
];

export function BucketMetricsChart({ buckets }: BucketMetricsChartProps) {
  // Use sample data if no buckets provided
  const dataToUse = buckets && buckets.length > 0 ? buckets : SAMPLE_BUCKETS;
  const isSampleData = !buckets || buckets.length === 0;

  // State for interactive features
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(
    new Set(['minLatency', 'avgLatency', 'maxLatency']) // Hidden by default
  );
  const [enableSmoothing, setEnableSmoothing] = useState(false);
  const [useLogScale, setUseLogScale] = useState(false);

  // Transform and sort data
  const rawChartData = useMemo(() => {
    return dataToUse
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((bucket, index) => ({
        index,
        name: `${bucket.bucketNumber}`,
        timestamp: new Date(bucket.startTime).getTime(),
        time: new Date(bucket.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        // Request metrics
        okRequests: bucket.successCount,
        koRequests: bucket.failureCount,
        totalRequests: bucket.totalRequests,
        // Latency metrics (ms)
        minLatency: bucket.minLatency,
        maxLatency: bucket.maxLatency,
        avgLatency: bucket.avgLatency,
        p50Latency: bucket.p50Latency,
        p95Latency: bucket.p95Latency,
        p99Latency: bucket.p99Latency,
      }));
  }, [dataToUse]);

  // Apply smoothing if enabled
  const chartData = useMemo(() => {
    if (!enableSmoothing) return rawChartData;

    const windowSize = Math.max(3, Math.floor(rawChartData.length * 0.1));
    const metrics = ['p50Latency', 'p95Latency', 'p99Latency', 'minLatency', 'avgLatency', 'maxLatency'];
    
    const smoothedData = rawChartData.map((point, i) => ({ ...point }));
    
    metrics.forEach(metric => {
      const values = rawChartData.map(d => (d as any)[metric]);
      const smoothed = calculateMovingAverage(values, windowSize);
      smoothedData.forEach((point, i) => {
        (point as any)[metric] = smoothed[i];
      });
    });

    return smoothedData;
  }, [rawChartData, enableSmoothing]);

  // Auto-detect if logarithmic scale should be used
  const shouldUseLogScale = useMemo(() => {
    if (chartData.length === 0) return false;
    const maxLatency = Math.max(...chartData.map(d => d.maxLatency));
    const p50Median = chartData.reduce((sum, d) => sum + d.p50Latency, 0) / chartData.length;
    return maxLatency > p50Median * 10;
  }, [chartData]);

  const effectiveLogScale = useLogScale || shouldUseLogScale;

  // Calculate tick density for X-axis (show fewer ticks to avoid overlap)
  const xAxisInterval = useMemo(() => {
    const dataLength = chartData.length;
    if (dataLength <= 10) return 0;
    if (dataLength <= 30) return Math.floor(dataLength / 10);
    return Math.floor(dataLength / 15);
  }, [chartData]);

  // Toggle metric visibility
  const handleLegendClick = (dataKey: string) => {
    setHiddenMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  // Custom tooltip with all metrics
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 text-sm">
        <p className="font-semibold text-gray-100 mb-2 pb-2 border-b border-gray-700">
          Bucket {data.name} - {data.time}
        </p>
        
        {/* Request metrics */}
        <div className="mb-2">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Requests</p>
          <p style={{ color: COLORS.ok }} className="font-medium">
            ✓ OK: {data.okRequests.toLocaleString()}
          </p>
          <p style={{ color: COLORS.ko }} className="font-medium">
            ✗ KO: {data.koRequests.toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Total: {data.totalRequests.toLocaleString()}
          </p>
        </div>

        {/* Latency metrics */}
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Latency (ms)</p>
          <p style={{ color: COLORS.p50 }} className="font-medium">
            P50: {data.p50Latency.toFixed(2)}
          </p>
          <p style={{ color: COLORS.p95 }} className="font-medium">
            P95: {data.p95Latency.toFixed(2)}
          </p>
          <p style={{ color: COLORS.p99 }} className="font-medium">
            P99: {data.p99Latency.toFixed(2)}
          </p>
          <div className="mt-1 pt-1 border-t border-gray-800 text-xs">
            <p className="text-gray-500">Min: {data.minLatency.toFixed(2)}</p>
            <p className="text-gray-500">Avg: {data.avgLatency.toFixed(2)}</p>
            <p className="text-gray-500">Max: {data.maxLatency.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  };

  // Custom legend with click handlers
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
        {payload.map((entry: any) => {
          const isHidden = hiddenMetrics.has(entry.dataKey);
          return (
            <button
              key={entry.dataKey}
              onClick={() => handleLegendClick(entry.dataKey)}
              className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all ${
                isHidden 
                  ? 'opacity-40 hover:opacity-60' 
                  : 'opacity-100 hover:bg-gray-800'
              }`}
              title={`Click to ${isHidden ? 'show' : 'hide'} ${entry.value}`}
            >
              <span
                className="w-8 h-0.5 rounded"
                style={{ 
                  backgroundColor: entry.color,
                  opacity: isHidden ? 0.3 : 1,
                }}
              />
              <span className={`text-sm ${isHidden ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                {entry.value}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Unified Chart */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-6">
        {/* Sample data notice */}
        {isSampleData && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">ℹ️</span>
              <span className="text-blue-300 text-sm font-medium">
                Showing sample data - No metrics data available yet
              </span>
            </div>
            <p className="text-blue-400 text-xs mt-1">
              This chart displays example load testing data to demonstrate features.
              Connect your API metrics to see real data.
            </p>
          </div>
        )}

        {/* Header with controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-gray-100">
            Load Testing Performance Timeline
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {/* Smoothing toggle */}
            <button
              onClick={() => setEnableSmoothing(!enableSmoothing)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                enableSmoothing
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Apply moving average smoothing"
            >
              {enableSmoothing ? '📉 Smoothed' : '📊 Raw'}
            </button>

            {/* Log scale toggle */}
            <button
              onClick={() => setUseLogScale(!useLogScale)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                effectiveLogScale
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Toggle logarithmic scale for latency"
            >
              {effectiveLogScale ? '📐 Log Scale' : '📏 Linear'}
            </button>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart 
            data={chartData} 
            margin={{ top: 20, right: 80, left: 20, bottom: 60 }}
          >
            <defs>
              {/* Gradients for stacked areas */}
              <linearGradient id="okGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.ok} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.ok} stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="koGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.ko} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.ko} stopOpacity={0.3}/>
              </linearGradient>
            </defs>

            {/* Quality zones as background */}
            <ReferenceArea
              yAxisId="right"
              y1={0}
              y2={QUALITY_ZONES.excellent.max}
              fill={QUALITY_ZONES.excellent.color}
              fillOpacity={0.3}
            />
            <ReferenceArea
              yAxisId="right"
              y1={QUALITY_ZONES.excellent.max}
              y2={QUALITY_ZONES.good.max}
              fill={QUALITY_ZONES.good.color}
              fillOpacity={0.3}
            />

            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} opacity={0.3} />
            
            {/* X-Axis: Time (reduced tick density) */}
            <XAxis
              dataKey="time"
              stroke={COLORS.text}
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={70}
              interval={xAxisInterval}
              tick={{ fill: COLORS.text }}
            />

            {/* Left Y-Axis: Request count */}
            <YAxis
              yAxisId="left"
              stroke={COLORS.ok}
              style={{ fontSize: '11px' }}
              label={{
                value: 'Requests',
                angle: -90,
                position: 'insideLeft',
                style: { fill: COLORS.text, fontSize: '12px' },
              }}
              tick={{ fill: COLORS.text }}
            />

            {/* Right Y-Axis: Latency */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={COLORS.p95}
              style={{ fontSize: '11px' }}
              scale={effectiveLogScale ? 'log' : 'auto'}
              domain={effectiveLogScale ? [1, 'auto'] : ['auto', 'auto']}
              label={{
                value: `Latency (ms)${effectiveLogScale ? ' - Log Scale' : ''}`,
                angle: 90,
                position: 'insideRight',
                style: { fill: COLORS.text, fontSize: '12px' },
              }}
              tick={{ fill: COLORS.text }}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />

            {/* Stacked areas for OK + KO requests (left axis) */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="okRequests"
              stackId="requests"
              stroke={COLORS.ok}
              fill="url(#okGradient)"
              name="OK Requests"
              hide={hiddenMetrics.has('okRequests')}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="koRequests"
              stackId="requests"
              stroke={COLORS.ko}
              fill="url(#koGradient)"
              name="KO Requests"
              hide={hiddenMetrics.has('koRequests')}
            />

            {/* Latency percentile lines (right axis) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="p50Latency"
              stroke={COLORS.p50}
              strokeWidth={2.5}
              name="P50 Latency"
              dot={false}
              hide={hiddenMetrics.has('p50Latency')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="p95Latency"
              stroke={COLORS.p95}
              strokeWidth={2.5}
              name="P95 Latency"
              dot={false}
              hide={hiddenMetrics.has('p95Latency')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="p99Latency"
              stroke={COLORS.p99}
              strokeWidth={2.5}
              name="P99 Latency"
              dot={false}
              hide={hiddenMetrics.has('p99Latency')}
            />

            {/* Min/Avg/Max latency lines (hidden by default, low opacity) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="minLatency"
              stroke={COLORS.min}
              strokeWidth={1}
              strokeDasharray="3 3"
              name="Min Latency"
              dot={false}
              opacity={0.5}
              hide={hiddenMetrics.has('minLatency')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgLatency"
              stroke={COLORS.avg}
              strokeWidth={1}
              strokeDasharray="3 3"
              name="Avg Latency"
              dot={false}
              opacity={0.5}
              hide={hiddenMetrics.has('avgLatency')}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="maxLatency"
              stroke={COLORS.max}
              strokeWidth={1}
              strokeDasharray="3 3"
              name="Max Latency"
              dot={false}
              opacity={0.5}
              hide={hiddenMetrics.has('maxLatency')}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend and info */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 font-medium mb-1">📊 Request Status</p>
              <p className="text-gray-500 text-xs">
                Stacked areas show OK (green) and KO (red) requests over time
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium mb-1">⚡ Latency Metrics</p>
              <p className="text-gray-500 text-xs">
                P50/P95/P99 percentiles on right axis. Min/Avg/Max hidden by default
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium mb-1">🎨 Quality Zones</p>
              <p className="text-gray-500 text-xs">
                Green: 0-200ms (excellent) • Yellow: 200-800ms (good) • Red: 800ms+ (poor)
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3 italic">
            💡 Click legend items to show/hide metrics • Use smoothing for noisy data • 
            Log scale auto-activates when max latency {'>'} 10× P50
          </p>
        </div>
      </div>
    </div>
  );
}
