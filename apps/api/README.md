# apimetrics-api

Fastify backend API for the ApiMetrics project.

## Features

- **POST /results** - Accept uploaded JSON test results from CLI
- **GET /results/:id** - Retrieve test result metrics by ID
- **GET /results** - List all test results
- **POST /auth/login** - JWT-based authentication
- **GET /health** - Health check endpoint

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database (Supabase recommended)
- Prisma CLI

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
JWT_SECRET="your-secret-key-here"
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up Prisma:

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (creates database schema)
npm run db:migrate
```

Or push schema directly:

```bash
npm run db:push
```

3. Start the development server:

```bash
npm run dev
```

Or build and run in production:

```bash
npm run build
npm start
```

## Database Schema

The API uses Prisma with PostgreSQL. The schema includes:

- **TestResult** - Stores load test results
  - `testId` (unique identifier from CLI)
  - `avgLatency`, `p95Latency`, `successRate`
  - `timestamp`, `project`
  
- **User** - User accounts for authentication
  - `email`, `password` (hashed)

## API Endpoints

### POST /results

Upload test results from CLI (accepts gzipped JSON).

**Request:**
```
Content-Type: application/json
Content-Encoding: gzip (optional)
Authorization: Bearer <token> (optional)

{
  "id": "test-123",
  "avgLatency": 150,
  "p95Latency": 300,
  "successRate": 0.95,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "id": "test-123",
  "message": "Test result saved successfully"
}
```

### GET /results/:id

Get test result by ID.

**Response:**
```json
{
  "id": "test-123",
  "avgLatency": 150,
  "p95Latency": 300,
  "successRate": 0.95,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /results

List all test results (recent 100).

**Response:**
```json
[
  {
    "id": "test-123",
    "avgLatency": 150,
    "p95Latency": 300,
    "successRate": 0.95,
    "timestamp": "2024-01-01T12:00:00Z"
  }
]
```

### POST /auth/login

Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

## Development

```bash
# Type check
npm run type-check

# Generate Prisma Client after schema changes
npm run db:generate

# Open Prisma Studio (database GUI)
npm run db:studio

# Run migrations
npm run db:migrate
```

## License

MIT

