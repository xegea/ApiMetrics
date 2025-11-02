# apimetrics-cli

NPX CLI tool for running and uploading ApiMetrics load tests.

## Installation

```bash
npm install -g apimetrics-cli
```

Or use with npx:

```bash
npx apimetrics-cli
```

## Usage

### Basic Usage

```bash
apimetrics-cli
```

This will:
1. Read `test.json` from the current directory
2. Run a load test (using Vegeta if available, otherwise simulated)
3. Display results summary
4. Upload results to API if `APIMETRICS_API_URL` is set

### Options

```bash
apimetrics-cli [options]

Options:
  --token <token>        Authentication token for API upload
  --api-url <url>        API endpoint URL (overrides APIMETRICS_API_URL env var)
  --config <path>        Path to test.json file (default: test.json)
  -V, --version          Show version number
  -h, --help             Show help
```

### Environment Variables

- `APIMETRICS_API_URL` - Default API endpoint URL for uploading results

### Test Configuration

Create a `test.json` file in your project directory:

```json
{
  "target": "https://api.example.com/endpoint",
  "rps": 100,
  "duration": "30s",
  "project": "my-project"
}
```

### Examples

```bash
# Run with custom config file
apimetrics-cli --config ./tests/my-test.json

# Upload to API with authentication
apimetrics-cli --api-url https://api.example.com --token your-token-here

# Use environment variable for API URL
export APIMETRICS_API_URL=https://api.example.com
apimetrics-cli --token your-token-here
```

## Vegeta Integration

The CLI uses [Vegeta](https://github.com/tsenart/vegeta) for load testing. If Vegeta is not installed, the CLI will simulate test results.

### Installing Vegeta

**macOS:**
```bash
brew install vegeta
```

**Linux:**
```bash
# Download from https://github.com/tsenart/vegeta/releases
```

**Windows:**
```bash
# Download from https://github.com/tsenart/vegeta/releases
```

## Development

```bash
# Build
npm run build

# Run in development mode
npm run dev

# Type check
npm run type-check
```

## License

MIT

