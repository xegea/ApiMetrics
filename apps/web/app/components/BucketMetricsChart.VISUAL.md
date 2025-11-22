# BucketMetricsChart Visual Preview

## 🎨 Visual States & Features

### Default View
```
┌────────────────────────────────────────────────────────────────┐
│  Load Testing Performance Timeline          [📊 Raw] [📏 Linear]│
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐│
│  │                                            Latency (ms)     ││
│  │  350├─────────────────────────────────────────────┤         ││
│  │     │                   ◆ P99 (magenta)          │ 350     ││
│  │     │                 ◆ P95 (orange)             │         ││
│  │  250├────────────◆ P50 (blue)──────────────────┤ 250     ││
│  │     │           ╱╲                               │         ││
│  │     │          ╱  ╲                              │         ││
│  │  150├─────────┤   GREEN ZONE (0-200ms)  ────────┤ 150     ││
│  │     │        ╱                                   │         ││
│  │     ├───────┤ YELLOW ZONE (200-800ms) ──────────┤         ││
│  │   50├───────────────────────────────────────────┤ 50      ││
│  │     │  ████████████████  OK Requests (green)    │         ││
│  │     │  ▓▓▓▓ KO Requests (red)                   │         ││
│  │     └────────┬────────┬────────┬────────┬───────┘         ││
│  │         10:00:00  10:00:20  10:00:40  10:01:00           ││
│  │              Time                        Requests          ││
│  └───────────────────────────────────────────────────────────┘│
│                                                                 │
│  Legend (click to toggle):                                     │
│  ▬ OK Requests  ▬ KO Requests  ─ P50  ─ P95  ─ P99            │
│  Min  Avg  Max  (hidden by default)                           │
└────────────────────────────────────────────────────────────────┘
```

### With Smoothing Enabled
```
┌────────────────────────────────────────────────────────────────┐
│  Load Testing Performance Timeline      [📉 Smoothed] [📏 Linear]│
├────────────────────────────────────────────────────────────────┤
│  Smoothed lines (moving average applied):                      │
│  • Reduces noise in latency metrics                            │
│  • Makes trends more visible                                   │
│  • Window size: ~10% of total data points                      │
│                                                                 │
│  Lines appear less jagged, following overall trend ~~~         │
└────────────────────────────────────────────────────────────────┘
```

### Logarithmic Scale (Auto or Manual)
```
┌────────────────────────────────────────────────────────────────┐
│  Load Testing Performance Timeline      [📊 Raw] [📐 Log Scale] │
├────────────────────────────────────────────────────────────────┤
│  Log scale automatically activates when:                        │
│  maxLatency > 10 × median(P50)                                 │
│                                                                 │
│  Y-axis (Latency):                                             │
│  10000 ├─────────────────────────────────────────────┤         │
│   1000 ├─────────────────◆───────────────────────────┤         │
│    100 ├──────────◆──────────────────────────────────┤         │
│     10 ├─────◆────────────────────────────────────────┤         │
│      1 ├────────────────────────────────────────────┤         │
│        └──────────────────────────────────────────────┘         │
│                                                                 │
│  Useful for: Wide latency ranges, outliers, spike detection    │
└────────────────────────────────────────────────────────────────┘
```

### Interactive Tooltip (on hover)
```
┌──────────────────────────────┐
│ Bucket 5 - 10:00:40          │
├──────────────────────────────┤
│ REQUESTS                     │
│ ✓ OK: 210                    │
│ ✗ KO: 10                     │
│ Total: 220                   │
├──────────────────────────────┤
│ LATENCY (MS)                 │
│ P50: 160.00                  │
│ P95: 350.00                  │
│ P99: 380.00                  │
│ ─────────────────────────    │
│ Min: 45.00                   │
│ Avg: 175.50                  │
│ Max: 390.00                  │
└──────────────────────────────┘
```

## 🎯 Color Reference

### Request Metrics (Left Y-Axis)
- **OK Requests**: Green gradient fill (#10b981)
  - Stacked area chart
  - Represents successful requests
  
- **KO Requests**: Red gradient fill (#ef4444)
  - Stacked on top of OK requests
  - Represents failed requests

### Latency Metrics (Right Y-Axis)
- **P50 (Median)**: Blue line (#3b82f6)
  - 50th percentile
  - Half of requests faster than this
  
- **P95**: Orange line (#f97316)
  - 95th percentile
  - Most requests (95%) faster than this
  
- **P99**: Magenta/Pink line (#ec4899)
  - 99th percentile
  - Nearly all requests (99%) faster than this

### Hidden by Default (Low Opacity, Dashed)
- **Min**: Gray dashed (#6b7280, opacity 0.5)
- **Avg**: Light gray dashed (#9ca3af, opacity 0.5)
- **Max**: Dark gray dashed (#4b5563, opacity 0.5)

## 📊 Quality Zones (Background)

Visual indicators for latency performance:

```
┌─────────────────────────────────────┐
│ 🟢 GREEN (0-200ms)                  │
│    Excellent performance            │
│    Most users won't notice delay    │
├─────────────────────────────────────┤
│ 🟡 YELLOW (200-800ms)               │
│    Good performance                 │
│    Acceptable for most use cases    │
├─────────────────────────────────────┤
│ 🔴 RED (800ms+)                     │
│    Poor performance                 │
│    Users will notice significant    │
│    delay, may abandon               │
└─────────────────────────────────────┘
```

## 🖱️ Interactive Elements

### Legend Items
```
Normal state:  ▬ P50 Latency
Hover state:   ▬ P50 Latency  (slightly highlighted)
Hidden state:  ▬̶ P̶5̶0̶ ̶L̶a̶t̶e̶n̶c̶y̶  (crossed out, dimmed)
```

### Control Buttons
```
Inactive:  [📊 Raw]        [📏 Linear]
Active:    [📉 Smoothed]   [📐 Log Scale]
           └─ blue bg      └─ orange bg
```

## 📐 Responsive Behavior

### Desktop (>1200px)
- Full width chart
- All legend items in single row
- Comfortable spacing

### Tablet (768px - 1200px)
- Chart scales to container
- Legend may wrap to 2 rows
- Maintains readability

### Mobile (<768px)
- Chart remains full width
- Legend wraps to multiple rows
- Controls stack vertically
- Tooltip font size adjusted

## 🎪 Animation & Transitions

### On Load
- No animation (isAnimationActive={false})
- Instant render for better UX
- Prevents confusion with real-time data

### On Interaction
- Legend toggle: Smooth fade in/out
- Button clicks: Immediate response
- Tooltip: Instant appearance

## 💡 Usage Tips

1. **Start with default view** to see main trends
2. **Click Min/Avg/Max** in legend to reveal detailed metrics
3. **Enable smoothing** if lines are too noisy
4. **Check quality zones** to quickly assess performance
5. **Hover for details** on any interesting spike or dip

## 🔧 Technical Details

### Chart Dimensions
- Default height: 500px
- Width: 100% (responsive)
- Margins: top(20), right(80), left(20), bottom(60)

### X-Axis
- Angle: -45° for better readability
- Format: HH:MM:SS (24-hour)
- Auto-reduced tick density

### Y-Axes
- Left (Requests): Linear scale, auto domain
- Right (Latency): Linear or log scale, auto domain

### Performance
- Memo-ized calculations
- Efficient re-renders
- Handles up to 500 data points smoothly
