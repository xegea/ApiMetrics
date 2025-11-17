# ApiMetrics Deployment Guide

This guide covers deploying the ApiMetrics MVP to production with automatic deployments from GitHub.

## Overview

- **Backend API**: Render (Free tier)
- **Frontend Web**: Vercel (Free tier)
- **Database**: Supabase (Free PostgreSQL)
- **CLI**: Published to npm for NPX usage
- **Deployment**: Automatic on GitHub commits

---

## Prerequisites

1. GitHub account with your ApiMetrics repository
2. Render account (sign up at [render.com](https://render.com))
3. Vercel account (sign up at [vercel.com](https://vercel.com))
4. Supabase account (sign up at [supabase.com](https://supabase.com))
5. npm account (for publishing CLI - [npmjs.com](https://npmjs.com))

---

## Step 1: Set Up Supabase Database

### 1.1 Create a New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `apimetrics-db`
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait for project to finish provisioning (~2 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project, go to **Settings** → **Database**
2. Find **"Connection string"** section
3. Select **"URI"** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your database password
6. Save this for Step 2 (Render setup)

### 1.3 Optional: Set Up Database Schema

The database schema will be created automatically when you run Prisma migrations on Render, but you can also run it locally first:

```bash
cd apps/api
npm install
npx prisma generate
npx prisma db push
```

---

## Step 2: Deploy Backend API to Render

### 2.1 Prepare the Repository

Ensure your `apps/api` directory is ready:

1. Commit all changes to GitHub
2. Make sure `apps/api/package.json` has a `start` script
3. Verify Prisma schema is in `apps/api/prisma/schema.prisma`

### 2.2 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your ApiMetrics repository
5. Configure the service:
   - **Name**: `apimetrics-api`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npm start`

### 2.3 Set Environment Variables

In the Render service settings, add these environment variables:

```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
PORT=10000
```

**Important**: 
- Replace `DATABASE_URL` with your Supabase connection string from Step 1.2
- Generate a strong random string for `JWT_SECRET` (you can use: `openssl rand -base64 32`)
- `PORT` should be set to `10000` (Render requirement) or use `$PORT` env var

### 2.4 Optional: OpenAI API Key

If you plan to use AI summaries later:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2.5 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the application
   - Run Prisma migrations
   - Start the service
3. Wait for deployment to complete (~5-10 minutes on first deploy)
4. Note your service URL: `https://apimetrics-api.onrender.com` (or custom domain)

### 2.6 Verify Deployment

Test the health endpoint:
```bash
curl https://your-api-url.onrender.com/health
```

You should see:
```json
{"status":"ok","timestamp":"2024-01-01T12:00:00.000Z"}
```

### 2.7 Set Up Automatic Deployments

- **Auto-deploy**: Enabled by default
- Every push to the main branch will trigger a new deployment
- You can also enable preview deployments for pull requests

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Prepare the Repository

Ensure your `apps/web` directory is ready:

1. Commit all changes to GitHub
2. Verify `apps/web/package.json` is configured correctly
3. Make sure Next.js config is set up

### 3.2 Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### 3.3 Set Environment Variables

Add the following environment variable:

```
NEXT_PUBLIC_APIMETRICS_API_URL=https://your-api-url.onrender.com
```

Or if using the alternative name:

```
NEXT_PUBLIC_API_URL=https://your-api-url.onrender.com
```

**Important**: Replace with your actual Render API URL from Step 2.5

### 3.4 Deploy

1. Click **"Deploy"**
2. Vercel will automatically:
   - Clone your repository
   - Install dependencies
   - Build the Next.js application
   - Deploy to production
3. Wait for deployment to complete (~2-5 minutes)
4. You'll get a deployment URL: `https://your-project.vercel.app`

### 3.5 Verify Deployment

1. Visit your Vercel deployment URL
2. You should be redirected to `/loadtestsexecutions` or `/login`
3. Test the login flow (you'll need to create a user first via API or database)

### 3.6 Set Up Automatic Deployments

- **Automatic deployments**: Enabled by default
- Every push to main branch → production deployment
- Pull requests → preview deployments

### 3.7 Optional: Custom Domain

1. In Vercel project settings, go to **"Domains"**
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Step 4: Publish CLI to npm

### 4.1 Prepare CLI Package

1. Navigate to CLI directory:
   ```bash
   cd apps/cli
   ```

2. Ensure `package.json` is properly configured:
   - Unique package name: `apimetrics-cli`
   - Version number: `0.1.0` (or use semantic versioning)
   - `bin` field pointing to compiled entry point
   - All dependencies listed

3. Update the workspace dependency reference:
   - If using a monorepo, you may need to build and reference the shared package
   - Or publish `@apimetrics/shared` separately first

### 4.2 Build the CLI

```bash
npm run build
```

### 4.3 Test Locally (Optional)

```bash
npm link
apimetrics-cli --help
```

### 4.4 Login to npm

```bash
npm login
```

Enter your npm credentials.

### 4.5 Publish

```bash
npm publish --access public
```

**Note**: Package name must be available. If `apimetrics-cli` is taken, use a scoped package:
- Update `package.json` name to `@your-username/apimetrics-cli`
- Publish with: `npm publish --access public`

### 4.6 Verify Publication

Test the published package:

```bash
npx apimetrics-cli@latest --help
```

### 4.7 Update Documentation

Update your CLI README with installation instructions:

```bash
npm install -g apimetrics-cli
# or use with npx
npx apimetrics-cli
```

---

## Step 5: Set Up Database Schema (If Not Done)

If you haven't run migrations yet, you can do it in two ways:

### Option A: Run Migrations on Render

1. In Render dashboard, go to your API service
2. Open **Shell** (or use SSH)
3. Run:
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Run Migrations Locally

```bash
cd apps/api
DATABASE_URL="your-supabase-connection-string" npx prisma migrate deploy
```

### Option C: Push Schema Directly

```bash
cd apps/api
DATABASE_URL="your-supabase-connection-string" npx prisma db push
```

---

## Step 6: Create Initial User (Optional)

You can create an initial user via the database or create a migration script:

### Option A: Via Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   INSERT INTO users (email, password)
   VALUES (
     'admin@example.com',
     '$2b$10$YourHashedPasswordHere'
   );
   ```

**Note**: You'll need to hash the password using bcrypt. You can use an online tool or create a quick script.

### Option B: Create a Seed Script

Create `apps/api/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('your-password', 10);
  
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
    },
  });
  
  console.log('User created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Then run:
```bash
DATABASE_URL="your-connection-string" tsx prisma/seed.ts
```

---

## Step 7: Test End-to-End

### 7.1 Test API

```bash
# Health check
curl https://your-api.onrender.com/health

# Create user (via database first)
# Login
curl -X POST https://your-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

### 7.2 Test Frontend

1. Visit your Vercel URL
2. Login with credentials
3. View dashboard
4. Upload a test result (via CLI)

### 7.3 Test CLI

```bash
# Create test.json
cat > test.json << EOF
{
  "target": "https://example.com",
  "rps": 10,
  "duration": "10s",
  "project": "test"
}
EOF

# Run CLI with API URL
npx apimetrics-cli \
  --api-url https://your-api.onrender.com \
  --token your-jwt-token-here
```

---

## Monitoring and Maintenance

### Render

- **Logs**: Available in Render dashboard
- **Metrics**: CPU, Memory, Response times
- **Restarts**: Automatic on crashes (with limits on free tier)

### Vercel

- **Analytics**: Available in Vercel dashboard
- **Logs**: Function logs and build logs
- **Performance**: Web Vitals and Core Web Vitals

### Supabase

- **Database**: Monitor connections, queries, storage
- **Logs**: SQL logs and query performance
- **Backups**: Automatic daily backups on free tier

---

## Troubleshooting

### API Not Starting on Render

- Check build logs for errors
- Verify `DATABASE_URL` is correct
- Ensure Prisma Client is generated
- Check that `PORT` environment variable is used in code

### Frontend Can't Connect to API

- Verify `NEXT_PUBLIC_APIMETRICS_API_URL` is set correctly
- Check CORS settings on API (if needed)
- Verify API is accessible via curl

### Database Connection Issues

- Verify Supabase connection string
- Check IP allowlist in Supabase (if enabled)
- Ensure database is not paused (free tier pauses after inactivity)

### CLI Not Working

- Verify package is published correctly
- Check npm registry access
- Ensure all dependencies are included

---

## Cost Overview (Free Tier)

- **Render**: Free tier with limitations (spins down after inactivity)
- **Vercel**: Generous free tier for Next.js apps
- **Supabase**: Free tier with 500MB database, pauses after 7 days inactivity
- **npm**: Free for public packages

**Total Cost**: $0/month for MVP

---

## Next Steps

1. Set up custom domains (optional)
2. Configure SSL certificates (automatic with Render/Vercel)
3. Set up monitoring and alerts
4. Add CI/CD pipeline for testing
5. Implement AI summaries (if using OpenAI)
6. Scale database if needed
7. Add caching layer (Redis) for production

---

## Support

For issues:
- Render: [render.com/docs](https://render.com/docs)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)

---

## Quick Reference

### Environment Variables Summary

**Render (API)**:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=10000
OPENAI_API_KEY=sk-... (optional)
```

**Vercel (Web)**:
```
NEXT_PUBLIC_APIMETRICS_API_URL=https://your-api.onrender.com
```

**CLI**:
```bash
export FAKELOAD_API_URL=https://your-api.onrender.com
```

---

**Last Updated**: January 2025

