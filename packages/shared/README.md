# @apimetrics/shared

Shared TypeScript types and utilities for the ApiMetrics project.

## Installation

```bash
npm install @apimetrics/shared
```

## Usage

### Types

```typescript
import { TestConfig, TestResult } from '@apimetrics/shared';

const config: TestConfig = {
  target: 'https://api.example.com',
  rps: 100,
  duration: '30s',
  project: 'my-project',
};

const result: TestResult = {
  id: 'test-123',
  avgLatency: 150,
  p95Latency: 300,
  successRate: 0.95,
  timestamp: '2024-01-01T12:00:00Z',
};
```

### Utilities

```typescript
import { formatTimestamp, formatPercentage, parseDuration } from '@apimetrics/shared';

// Format timestamps
const formatted = formatTimestamp('2024-01-01T12:00:00Z');
// "Jan 1, 2024, 12:00 PM"

// Format percentages
const rate = formatPercentage(0.95); // "95.00%"
const rate2 = formatPercentage(95, false); // "95.00%"

// Parse duration strings
const ms = parseDuration('30s'); // 30000
const ms2 = parseDuration('5m'); // 300000
```

## Development

```bash
# Build
npm run build

# Type check
npm run type-check

# Clean build artifacts
npm run clean
```

## License

MIT

