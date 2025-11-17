# apimetrics-web

Next.js 15 frontend for the ApiMetrics project.

## Features

- **Login Page** (`/login`) - User authentication
- **Test Detail** (`/test/[id]`) - Detailed view with charts for latency and success rate
- Built with Next.js 15 App Router
- Tailwind CSS for styling
- TanStack Query (React Query) for data fetching
- Recharts for data visualization

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APIMETRICS_API_URL=http://localhost:3000
# or
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Build

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
app/
  ├── layout.tsx          # Root layout with providers
  ├── page.tsx            # Home page (redirects to dashboard)
  ├── login/              # Login page
  │   └── page.tsx
  ├── dashboard/          # (removed) Dashboard with test results list
  │   └── page.tsx
  ├── test/[id]/          # Test detail page with charts
  │   └── page.tsx
  ├── providers.tsx       # TanStack Query provider
  └── globals.css         # Global styles with Tailwind
lib/
  └── api.ts              # API client functions
```

## Pages

### Login (`/login`)

Authentication page with email and password form. Stores JWT token in localStorage.

### Dashboard (removed)

The dashboard route has been removed from the navigation — test results are still available via the "Test Executions" section.

### Test Detail (`/test/[id]`)

Shows detailed metrics for a specific test:
- Summary cards with key metrics
- Bar chart comparing average and P95 latency
- Success rate visualization

## Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Data fetching and caching
- **Recharts** - Chart library for React
- **@apimetrics/shared** - Shared types and utilities

## Development

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Development server with hot reload
npm run dev
```

## License

MIT

