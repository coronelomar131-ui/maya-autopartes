# Deployment Guide - Phase 4: CI/CD & Automatic Deployment

**Status:** Complete (2026-04-22)  
**Version:** 1.0.0  
**Target:** Production deployment to Vercel with automated CI/CD pipeline

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [GitHub Actions Workflow](#github-actions-workflow)
5. [Vercel Configuration](#vercel-configuration)
6. [Secrets & Environment Variables](#secrets--environment-variables)
7. [Deployment Process](#deployment-process)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This phase establishes a complete CI/CD pipeline for Maya Autopartes:

- **Automated Testing**: Unit tests, linting, and type checking on every push
- **Security Scanning**: npm audit and Snyk integration
- **Buildless Deployment**: Direct deployment to Vercel serverless platform
- **Automatic Rollback**: Triggered when health checks fail
- **Production Monitoring**: Continuous health monitoring and alerting

### Architecture

```
GitHub Push (main)
    ↓
┌─────────────────────────────────────┐
│    GitHub Actions CI/CD Pipeline    │
├─────────────────────────────────────┤
│ 1. Lint (ESLint)                    │
│ 2. Type Check (TypeScript/JSDoc)    │
│ 3. Unit Tests (Jest)                │
│ 4. Security Scan (npm audit, Snyk)  │
│ 5. Build Verification               │
└─────────────────────────────────────┘
    ↓ (If all pass)
┌─────────────────────────────────────┐
│    Deploy to Vercel Production      │
├─────────────────────────────────────┤
│ - Upload code                       │
│ - Set environment variables         │
│ - Build serverless functions        │
│ - Route API/frontend                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Health Check & Monitoring     │
├─────────────────────────────────────┤
│ - Check /api/health endpoint        │
│ - Verify database connectivity      │
│ - Test API endpoints                │
│ - Alert on failure                  │
└─────────────────────────────────────┘
    ↓ (If health check fails)
┌─────────────────────────────────────┐
│     Automatic Rollback              │
├─────────────────────────────────────┤
│ - Create GitHub issue               │
│ - Notify team (Slack)               │
│ - Revert to previous version        │
└─────────────────────────────────────┘
```

---

## Prerequisites

### Required Accounts & Access

1. **GitHub**: Repository access with admin/maintainer permissions
2. **Vercel**: Organization account with project setup
3. **Supabase**: Production database URL and API keys
4. **Optional Services**:
   - Sentry: Error tracking
   - Snyk: Security scanning
   - Slack: Notifications
   - Codecov: Coverage reporting

### Local Development Tools

```bash
# Install globally
npm install -g vercel@latest @supabase/cli

# Install locally (backend)
cd backend
npm install
npm install --save-dev eslint prettier jest supertest
```

---

## Setup Instructions

### Step 1: Initialize GitHub Actions

```bash
# Create workflows directory
mkdir -p .github/workflows

# Copy the workflow file
# File: .github/workflows/deploy.yml (already created)
```

### Step 2: Configure Vercel Project

```bash
# Login to Vercel
vercel login

# Link project (run in project root)
vercel link

# This creates:
# - .vercel/project.json
# - .vercel/settings.json
```

### Step 3: Set GitHub Secrets

Navigate to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add the following secrets:

```
VERCEL_TOKEN              = <Vercel CLI token>
VERCEL_ORG_ID             = <Your Vercel organization ID>
VERCEL_PROJECT_ID         = <Your Vercel project ID>
SUPABASE_URL              = https://your-project.supabase.co
SUPABASE_KEY              = your_public_anon_key
JWT_SECRET                = your_jwt_secret_min_32_chars
REDIS_URL                 = redis://your-redis-url:6379
SENTRY_DSN                = https://your-sentry-dsn@sentry.io
SNYK_TOKEN                = <Optional: Snyk token>
SLACK_WEBHOOK_URL         = <Optional: Slack webhook>
```

### Step 4: Create .env.example

```bash
# This file documents all environment variables
# Location: backend/.env.example (already created)
# Never commit actual .env files
```

### Step 5: Install Linting & Testing Tools

```bash
cd backend

# ESLint & Prettier
npm install --save-dev eslint prettier eslint-config-airbnb-base eslint-plugin-import

# Jest & Supertest
npm install --save-dev jest supertest

# Create Jest config
cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['**/*.js', '!node_modules/**', '!coverage/**'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
EOF
```

---

## GitHub Actions Workflow

### Workflow File: `.github/workflows/deploy.yml`

The workflow includes these jobs:

#### 1. **Lint Job**
- Runs ESLint on all JavaScript files
- Checks code formatting with Prettier
- Runs on PR and main branch pushes

#### 2. **Type Check Job**
- Verifies type safety (JSDoc or TypeScript)
- Optional but recommended

#### 3. **Test Job**
- Executes Jest unit tests
- Generates coverage report
- Uploads to Codecov
- Runs for 20 minutes max

#### 4. **Build Job**
- Verifies build can complete
- Archives artifacts
- Runs for 30 minutes max

#### 5. **Security Job**
- Runs `npm audit` for dependencies
- Optional Snyk scanning
- Non-blocking (continues on error)

#### 6. **Deploy Job**
- Only runs on main branch push
- Requires all previous jobs to pass
- Deploys to Vercel production
- Tests deployment health
- Comments deployment URL on PRs

#### 7. **Health Check Job**
- Waits for deployment to be live
- Checks `/api/health` endpoint
- Retries 5 times with 30-second intervals
- Runs for 10 minutes max

#### 8. **Rollback Job**
- Triggered if deployment fails
- Creates GitHub issue for manual review
- Notifies team on Slack
- Non-blocking (uses continue-on-error)

#### 9. **Notify Job**
- Sends final status to Slack
- Includes commit info and run link
- Optional but recommended

### Triggering the Workflow

The workflow is triggered by:

```yaml
# 1. Push to main branch
git push origin main

# 2. Push to staging/develop branches (tests only, no deploy)
git push origin staging
git push origin develop

# 3. Pull request to main/staging
git pull request origin main

# 4. Manual trigger from GitHub Actions tab
# Click "Run workflow" button
```

### Monitoring Workflow Status

```bash
# View in GitHub Actions tab
# https://github.com/YOUR_ORG/maya-autopartes/actions

# Recent runs appear with status:
# ✅ Success (all jobs passed)
# ❌ Failure (one or more jobs failed)
# ⏳ In Progress
```

---

## Vercel Configuration

### File: `vercel.json`

Contains:

```json
{
  "version": 2,
  "env": { /* Environment variables */ },
  "functions": { /* Memory & timeout settings */ },
  "rewrites": [ /* Route mapping */ ],
  "redirects": [ /* URL redirects */ ],
  "headers": [ /* Security headers */ ],
  "crons": [ /* Scheduled jobs */ ]
}
```

### Key Configurations

#### Environment Variables
```json
"env": {
  "SUPABASE_URL": "@supabase_url",
  "SUPABASE_KEY": "@supabase_key",
  "JWT_SECRET": "@jwt_secret",
  "NODE_ENV": "production"
}
```
Variables prefixed with `@` are references to Vercel secret values.

#### Function Settings
```json
"functions": {
  "api/**/*.js": {
    "memory": 512,
    "maxDuration": 30
  }
}
```
- Memory: 128-3008 MB (default 1024)
- maxDuration: 5-900 seconds (default 60)

#### Routes & Rewrites
```json
"rewrites": [
  {
    "source": "/api/(.*)",
    "destination": "/backend/server.js"
  }
]
```

#### Security Headers
```json
"headers": [
  {
    "source": "/api/(.*)",
    "headers": [
      { "key": "Access-Control-Allow-Origin", "value": "*" },
      { "key": "Strict-Transport-Security", "value": "max-age=31536000" }
    ]
  }
]
```

#### Scheduled Jobs (Crons)
```json
"crons": [
  {
    "path": "/api/sync/drive",
    "schedule": "0 */6 * * *"  // Every 6 hours
  }
]
```

---

## Secrets & Environment Variables

### Vercel Secrets Setup

1. **via CLI**:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add JWT_SECRET
# ... (prompted for value, choose production)
```

2. **via Web Dashboard**:
- Settings → Environment Variables
- Add secrets marked as sensitive

### GitHub Actions Secrets

Stored in: **Settings → Secrets and variables → Actions**

Never commit `.env` files. Example:
```bash
# Good - documented but no actual values
.env.example

# Bad - never commit
.env
.env.local
.env.production
```

### Required Secrets

| Secret | Source | Example |
|--------|--------|---------|
| VERCEL_TOKEN | `vercel token` command | `<50 chars>` |
| VERCEL_ORG_ID | Vercel dashboard URL | `team_abc123` |
| VERCEL_PROJECT_ID | Vercel project settings | `prj_xyz789` |
| SUPABASE_URL | Supabase dashboard | `https://xxx.supabase.co` |
| SUPABASE_KEY | Supabase dashboard | `eyJ...` |
| JWT_SECRET | Generate new: `openssl rand -hex 32` | `abc123...` |

### Optional Secrets

- `SENTRY_DSN`: Error tracking
- `REDIS_URL`: Caching layer
- `SLACK_WEBHOOK_URL`: Notifications
- `SNYK_TOKEN`: Security scanning
- `CODECOV_TOKEN`: Coverage tracking

---

## Deployment Process

### Step-by-Step Deployment

#### 1. Prepare Code
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/my-feature
```

#### 2. Open Pull Request
```bash
# GitHub CLI
gh pr create --title "Add new feature" --body "Description"

# Or via GitHub web interface
# https://github.com/YOUR_ORG/maya-autopartes/pulls
```

#### 3. CI Checks Run
- Linting (ESLint)
- Tests (Jest)
- Type checking
- Security scan

#### 4. Code Review
- Team members review
- Request changes if needed
- Approve when ready

#### 5. Merge to Main
```bash
# Via GitHub web interface (Squash and merge)
# Or via CLI
gh pr merge --squash
```

#### 6. Auto Deploy to Vercel
- GitHub detects push to main
- Workflow runs automatically
- Deployment takes 2-5 minutes
- Health checks verify success

#### 7. Monitor Production
```bash
# Check status
vercel status

# View logs
vercel logs --prod

# Check health
curl https://maya-api.vercel.app/api/health
```

### Manual Deployments

```bash
# Deploy from local machine
cd backend
vercel --prod

# Promote preview to production
vercel promote <DEPLOYMENT_URL>

# Rollback to previous version
vercel rollback
```

---

## Monitoring & Health Checks

### Health Check Endpoint

```bash
# Endpoint
GET /api/health

# Response (200 OK)
{
  "status": "OK",
  "timestamp": "2026-04-22T12:00:00Z",
  "environment": "production",
  "uptime": 3600,
  "database": "CONNECTED"
}
```

### Monitoring Tools

#### 1. Vercel Analytics
```bash
# View via dashboard
https://vercel.com/dashboard/projects/[PROJECT_ID]/analytics
```

#### 2. GitHub Actions Logs
```bash
# View via Actions tab
https://github.com/YOUR_ORG/maya-autopartes/actions
```

#### 3. Sentry Integration (Optional)
```bash
# Error tracking
https://sentry.io/organizations/[ORG]/issues/
```

#### 4. Slack Notifications
- Deployment status (success/failure)
- Health check results
- Rollback alerts
- Team mentions for critical issues

### Checking Logs

```bash
# Vercel function logs
vercel logs --prod

# Filter by endpoint
vercel logs --prod --follow /api/

# View specific deployment
vercel logs --prod -- --deploymentId=<ID>

# Sentry errors
curl https://sentry.io/api/0/organizations/[ORG]/events/
```

---

## Troubleshooting

### Common Issues

#### Issue: Workflow Fails on Lint

```bash
# Local fix
npm run lint:fix
git add .
git commit -m "Fix linting errors"
git push
```

#### Issue: Tests Timeout

```yaml
# In .github/workflows/deploy.yml
timeout-minutes: 30  # Increase from 20

# Or optimize tests
npm test -- --maxWorkers=2
```

#### Issue: Deployment Fails

**Check logs**:
```bash
# GitHub Actions
https://github.com/YOUR_ORG/maya-autopartes/actions

# Vercel
vercel logs --prod

# Environment variables
vercel env ls --prod
```

**Common causes**:
1. Missing environment variables → Add to Vercel secrets
2. Database connection fails → Check SUPABASE_URL and SUPABASE_KEY
3. Port conflict → Change PORT in vercel.json
4. Memory/timeout → Increase in functions section

#### Issue: Health Check Fails

```bash
# Test manually
curl https://maya-api.vercel.app/api/health

# Check database
curl https://maya-api.vercel.app/api/info

# View Sentry errors (if enabled)
# https://sentry.io/organizations/[ORG]/issues/
```

#### Issue: Rollback Needed

```bash
# Automatic rollback attempts if health checks fail

# Manual rollback
vercel rollback [DEPLOYMENT_ID]

# Or revert commit
git revert HEAD
git push origin main
```

### Debug Commands

```bash
# Check environment in production
vercel env ls --prod

# Verify Vercel config
cat vercel.json | jq '.'

# Test health endpoint
curl -v https://maya-api.vercel.app/api/health

# View recent deployments
vercel list --prod

# Check function status
vercel inspect [DEPLOYMENT_ID]
```

### Getting Help

1. **GitHub Issues**: Create issue with workflow logs
2. **Vercel Docs**: https://vercel.com/docs
3. **GitHub Actions Docs**: https://docs.github.com/en/actions

---

## Security Checklist

Before deploying to production:

- [ ] All secrets added to Vercel
- [ ] Environment variables set correctly
- [ ] Database credentials are production-safe
- [ ] JWT_SECRET is strong (min 32 chars)
- [ ] CORS origins are whitelisted
- [ ] Security headers enabled in vercel.json
- [ ] ESLint passes locally
- [ ] Tests pass locally and in CI
- [ ] npm audit shows no critical vulnerabilities
- [ ] Sentry is configured for error tracking
- [ ] Slack notifications are working

---

## Next Steps

1. **Configure Monitoring**: Set up Sentry for error tracking
2. **Add Alerts**: Configure Slack/email notifications
3. **Setup Backups**: Configure automatic database backups
4. **Performance**: Monitor Vercel Analytics
5. **Scaling**: Configure auto-scaling if needed

---

**For questions or issues, refer to:**
- `CI_CD_SETUP.md` - GitHub Actions configuration
- `PRODUCTION_SETUP.md` - Environment variables guide
- `ROLLBACK_PROCEDURES.md` - How to rollback deployments
