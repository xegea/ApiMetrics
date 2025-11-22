# Unified Performance Timeline Chart

A modern, production-ready React component for visualizing load testing metrics with an interactive, dual-axis timeline.

## Features

### 📊 Unified Timeline
- **Single shared X-axis** for all metrics
- **Dual Y-axis** design:
  - Left axis: Request counts (stacked area chart)
  - Right axis: Latency metrics (line charts)
- **Stacked area chart** for OK/KO requests with gradient fills
- **Smooth line charts** for latency percentiles

### 🎨 Visual Enhancements
- **Dark mode optimized** color scheme
- **Reduced X-axis tick density** to prevent timestamp overlap
- **Smooth curves** using monotone interpolation
- **Interactive legend** - click to show/hide metrics
- **Quality zones** as background indicators:
  - 🟢 Green (0-200ms): Excellent performance
  - 🟡 Yellow (200-800ms): Good performance
  - 🔴 Red (800ms+): Poor performance

### 🚀 Usability Features
- **Smoothing toggle**: Apply moving average to reduce noise
- **Auto-scaling**: Logarithmic scale activates when max latency > 10× P50
- **Manual log scale toggle**: Override auto-detection
- **Hidden by default**: Min/Avg/Max latency (clickable to reveal)
- **Comprehensive tooltips**: All metrics visible on hover
- **Responsive design**: Adapts to container width

### 🎯 Color Scheme (Dark Mode Optimized)

| Metric | Color | Hex |
|--------|-------|-----|
| OK Requests | Green | `#10b981` |
| KO Requests | Red | `#ef4444` |
| P50 Latency | Blue | `#3b82f6` |
| P95 Latency | Orange | `#f97316` |
| P99 Latency | Magenta | `#ec4899` |
| Min Latency | Gray | `#6b7280` |
| Avg Latency | Light Gray | `#9ca3af` |
| Max Latency | Dark Gray | `#4b5563` |

## Installation

The component uses **Recharts** (already installed in your project):

```bash
npm install recharts
```

## Usage

### Basic Usage

```tsx
import { BucketMetricsChart } from './components/BucketMetricsChart';

function MyDashboard() {
  const buckets = [
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
    // ... more buckets
  ];

  return <BucketMetricsChart buckets={buckets} />;
}
```

### Sample Data Feature

When no `buckets` prop is provided or an empty array is passed, the component automatically displays sample data with:

- **Blue notice banner** indicating sample data is shown
- **10 sample buckets** with realistic load testing metrics
- **All interactive features** fully functional
- **Perfect for development** and demonstration

```tsx
// Shows sample data automatically
<BucketMetricsChart />

// Shows sample data (empty array)
<BucketMetricsChart buckets={[]} />

// Shows sample data (undefined)
<BucketMetricsChart buckets={undefined} />
```

### Data Structure

```typescript
interface MetricsBucket {
  id: string;
  bucketNumber: number;
  startTime: string;           // ISO 8601 timestamp
  endTime: string;             // ISO 8601 timestamp
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatency: number;          // milliseconds
  minLatency: number;          // milliseconds
  maxLatency: number;          // milliseconds
  p50Latency: number;          // milliseconds (median)
  p95Latency: number;          // milliseconds
  p99Latency: number;          // milliseconds
  successRate: number;         // percentage (0-100)
  bytesIn: number;
  bytesOut: number;
  statusCodes: Record<string, number>;
  errors: string[];
}
```

## Interactive Features

### 1. **Legend Interaction**
Click any metric name in the legend to toggle its visibility:
- Active metrics appear solid
- Hidden metrics appear crossed-out and dimmed
- Min/Avg/Max latencies are hidden by default

### 2. **Smoothing Toggle**
Click the **"📉 Smoothed" / "📊 Raw"** button to:
- Apply moving average smoothing to all latency metrics
- Window size auto-adjusts based on data length (~10% of total points)
- Useful for visualizing trends in noisy data

### 3. **Logarithmic Scale**
Click the **"📐 Log Scale" / "📏 Linear"** button to:
- Switch between linear and logarithmic Y-axis for latency
- Auto-activates when `maxLatency > 10 × p50Median`
- Useful for visualizing wide latency ranges

### 4. **Hover Tooltips**
Hover over any point to see:
- Bucket number and timestamp
- Request counts (OK, KO, Total)
- All latency metrics (P50, P95, P99, Min, Avg, Max)
- Dark-themed, easy-to-read format

## Component Architecture

```
BucketMetricsChart.tsx
├── State Management
│   ├── hiddenMetrics: Set<string>        # Track hidden metrics
│   ├── enableSmoothing: boolean          # Smoothing toggle
│   └── useLogScale: boolean              # Log scale toggle
├── Data Processing
│   ├── rawChartData: useMemo             # Transform bucket data
│   ├── chartData: useMemo                # Apply smoothing
│   └── shouldUseLogScale: useMemo        # Auto-detect log scale
├── Components
│   ├── CustomTooltip                     # Hover information
│   ├── CustomLegend                      # Interactive legend
│   └── ComposedChart                     # Main chart
└── Visual Elements
    ├── Quality Zones (ReferenceArea)     # Background indicators
    ├── Stacked Areas (OK + KO)           # Request volumes
    └── Lines (P50, P95, P99, etc.)       # Latency metrics
```

## Customization

### Adjusting Quality Zones

Edit the `QUALITY_ZONES` constant in `BucketMetricsChart.tsx`:

```typescript
const QUALITY_ZONES = {
  excellent: { max: 200, color: '#10b98120' },   // 0-200ms
  good: { max: 800, color: '#eab30820' },        // 200-800ms
  poor: { max: Infinity, color: '#ef444420' },   // 800ms+
};
```

### Changing Colors

Edit the `COLORS` constant:

```typescript
const COLORS = {
  ok: '#10b981',      // Success requests
  ko: '#ef4444',      // Failed requests
  p50: '#3b82f6',     // P50 percentile
  p95: '#f97316',     // P95 percentile
  p99: '#ec4899',     // P99 percentile
  // ... more colors
};
```

### Adjusting X-Axis Density

The component auto-calculates tick interval, but you can modify the logic:

```typescript
const xAxisInterval = useMemo(() => {
  const dataLength = chartData.length;
  if (dataLength <= 10) return 0;        // Show all ticks
  if (dataLength <= 30) return Math.floor(dataLength / 10);
  return Math.floor(dataLength / 15);    // Show ~15 ticks max
}, [chartData]);
```

## Performance Considerations

### Data Volume
- **Optimized for**: 10-100 data points
- **Maximum recommended**: 500 data points
- **Smoothing**: Automatically adjusts window size (10% of data length)

### Rendering Performance
- Uses `useMemo` for expensive calculations
- Recharts handles canvas rendering efficiently
- No unnecessary re-renders with proper state management

## Browser Compatibility

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML structure
- Keyboard-navigable legend buttons
- Color contrast meets WCAG AA standards (dark mode)
- Tooltips provide text alternatives for visual data

## Troubleshooting

### Issue: Timestamps overlap on X-axis
**Solution**: The component auto-reduces tick density. For more control, increase `xAxisInterval` calculation.

### Issue: Latency lines not visible
**Solution**: Check if metrics are hidden. Click legend items to toggle visibility. Min/Avg/Max are hidden by default.

### Issue: Chart appears too cluttered
**Solution**: 
1. Enable smoothing to reduce noise
2. Hide unnecessary metrics via legend
3. Use logarithmic scale for wide ranges

### Issue: Quality zones don't show
**Solution**: Ensure right Y-axis domain includes the zone ranges. Check that `ReferenceArea` components have correct yAxisId.

## Examples

See `BucketMetricsChart.example.tsx` for:
- Complete working example
- Sample data generator
- Usage instructions
- Data format reference

## License

Part of the ApiMetrics project.

## Support

For issues or feature requests, please refer to the main ApiMetrics repository.
