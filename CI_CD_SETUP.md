# GitHub Actions CI/CD Setup Guide

**Status:** Complete  
**Date:** 2026-04-22  
**Version:** 1.0.0

## Overview

This guide explains how to set up and configure GitHub Actions for continuous integration and continuous deployment (CI/CD) of Maya Autopartes.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Workflow Configuration](#workflow-configuration)
3. [Job Descriptions](#job-descriptions)
4. [Environment Variables & Secrets](#environment-variables--secrets)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Options](#deployment-options)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Customization](#customization)

---

## Initial Setup

### Prerequisites

1. GitHub account with repository access
2. Vercel account linked to project
3. Supabase account with database
4. (Optional) Sentry, Slack, Snyk accounts

### Step 1: Enable GitHub Actions

```bash
# No action needed - GitHub Actions is enabled by default
# Just verify in Settings → Actions → General
# "Allow all actions and reusable workflows" is checked
```

### Step 2: Create Workflow Directory

```bash
# The directory structure is already in place:
# .github/
# └── workflows/
#     └── deploy.yml
```

### Step 3: Add Required Secrets

Navigate to: **GitHub Repo → Settings → Secrets and variables → Actions**

```bash
# Click "New repository secret" for each:

# Vercel Integration
VERCEL_TOKEN          (from: vercel token)
VERCEL_ORG_ID         (from: Vercel dashboard)
VERCEL_PROJECT_ID     (from: Vercel project settings)

# Database & Auth
SUPABASE_URL          (from: Supabase project settings)
SUPABASE_KEY          (from: Supabase API keys)
JWT_SECRET            (generate: openssl rand -hex 32)

# Optional Services
SENTRY_DSN            (from: Sentry project settings)
SNYK_TOKEN            (from: Snyk account)
SLACK_WEBHOOK_URL     (from: Slack workspace)
```

---

## Workflow Configuration

### File Location

```
.github/workflows/deploy.yml
```

### Workflow Triggers

The workflow runs on:

1. **Push to main branch** (triggers deployment)
   ```yaml
   push:
     branches:
       - main
   ```

2. **Push to staging/develop** (runs tests only)
   ```yaml
   push:
     branches:
       - staging
       - develop
   ```

3. **Pull requests to main** (runs tests, displays preview)
   ```yaml
   pull_request:
     branches:
       - main
   ```

4. **Manual trigger**
   ```yaml
   workflow_dispatch:
   ```
   (Click "Run workflow" in Actions tab)

### Workflow Structure

```
├── lint               (ESLint - code quality)
├── type-check         (Type safety)
├── test              (Unit tests)
├── build             (Build verification)
├── security          (npm audit, Snyk)
├── deploy            (Deploy to Vercel)
├── health-check      (Verify deployment)
├── rollback          (If deployment fails)
└── notify            (Send status to Slack)
```

---

## Job Descriptions

### 1. Lint Job

**Purpose**: Check code quality and formatting

```yaml
lint:
  name: ESLint & Code Quality
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'
```

**What it does**:
- Runs ESLint on all `.js` files
- Checks formatting with Prettier
- Reports style issues

**Success criteria**: No ESLint errors/warnings

**Failure behavior**: Blocks merge if strict mode enabled

**Configuration files**:
- `.eslintrc.json` - ESLint rules
- `.prettierrc.json` - Formatting rules

### 2. Type Check Job

**Purpose**: Verify type safety

```yaml
type-check:
  name: Type Checking
  runs-on: ubuntu-latest
```

**What it does**:
- Validates JSDoc comments (if using JSDoc)
- Or runs TypeScript compiler (if using TS)
- Reports type mismatches

**Success criteria**: No type errors

### 3. Test Job

**Purpose**: Execute unit tests and generate coverage

```yaml
test:
  name: Unit Tests
  runs-on: ubuntu-latest
  timeout-minutes: 20
```

**What it does**:
- Runs Jest test suite
- Generates code coverage report
- Uploads to Codecov (optional)
- Archives coverage artifacts

**Environment**: Includes Postgres service for database tests

**Success criteria**: 
- All tests pass
- Coverage thresholds met (50%)

**Timeout**: 20 minutes max

**Artifacts**:
- Coverage reports (saved 7 days)

### 4. Build Job

**Purpose**: Verify application builds successfully

```yaml
build:
  name: Build Verification
  runs-on: ubuntu-latest
  timeout-minutes: 30
```

**What it does**:
- Installs dependencies
- Runs build script (if exists)
- Archives build artifacts

**Success criteria**: Build completes without errors

**Artifacts**:
- Built files (saved 5 days)

### 5. Security Job

**Purpose**: Scan for security vulnerabilities

```yaml
security:
  name: Security Scan
  runs-on: ubuntu-latest
```

**What it does**:
- Runs `npm audit` on dependencies
- Optional: Snyk security scanning
- Reports vulnerabilities

**Success criteria**: No critical vulnerabilities

**Failure behavior**: Non-blocking (continues on error)

**Tools used**:
- npm audit (always)
- Snyk (optional, requires SNYK_TOKEN)

### 6. Deploy Job

**Purpose**: Deploy to Vercel production

```yaml
deploy:
  name: Deploy to Vercel
  runs-on: ubuntu-latest
  needs: [lint, test, build, security]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  timeout-minutes: 30
```

**What it does**:
- Pulls Vercel environment configuration
- Builds project on Vercel
- Deploys to production URL
- Tests health endpoint
- Comments deployment URL on PR

**Dependencies**: All previous jobs must pass

**Success criteria**: Deployment URL returned and responding

**Timeout**: 30 minutes max

**Output**: Deployment URL in logs and comments

### 7. Health Check Job

**Purpose**: Verify deployed application is healthy

```yaml
health-check:
  name: Health Check
  runs-on: ubuntu-latest
  needs: deploy
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  timeout-minutes: 10
```

**What it does**:
- Waits 1 minute for deployment to stabilize
- Tests `/api/health` endpoint
- Retries up to 5 times (30-second intervals)
- Fails if health check never passes

**Success criteria**: Health endpoint returns 200 OK

**Failure behavior**: Triggers rollback job

### 8. Rollback Job

**Purpose**: Automatically rollback failed deployments

```yaml
rollback:
  name: Automatic Rollback
  runs-on: ubuntu-latest
  needs: deploy
  if: failure() && github.ref == 'refs/heads/main'
```

**What it does**:
- Creates GitHub issue for review
- Notifies team of failure
- Provides rollback instructions

**Note**: Manual verification recommended before auto-rollback

### 9. Notify Job

**Purpose**: Send deployment status to Slack

```yaml
notify:
  name: Notify Deployment Status
  runs-on: ubuntu-latest
  needs: [deploy, health-check]
  if: always() && github.ref == 'refs/heads/main'
```

**What it does**:
- Determines success/failure
- Sends Slack notification with:
  - Status emoji (✅ or ❌)
  - Commit hash
  - Author name
  - Run link

**Requirements**: `SLACK_WEBHOOK_URL` secret

---

## Environment Variables & Secrets

### Secrets Setup

#### Via GitHub CLI

```bash
# Add secrets one by one
gh secret set VERCEL_TOKEN -b "$(vercel token)"
gh secret set SUPABASE_URL -b "https://your-project.supabase.co"
gh secret set SUPABASE_KEY -b "your_key_here"
```

#### Via Web Interface

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: (e.g., VERCEL_TOKEN)
4. Value: (paste secret value)
5. Click **Add secret**

### Required Secrets

| Secret | How to Get | Example |
|--------|-----------|---------|
| VERCEL_TOKEN | `vercel token` | (50 char string) |
| VERCEL_ORG_ID | Vercel → Settings → Team ID | `team_abc123xyz` |
| VERCEL_PROJECT_ID | Vercel → Project → Settings | `prj_123abc` |
| SUPABASE_URL | Supabase → Project Settings → API | `https://xxx.supabase.co` |
| SUPABASE_KEY | Supabase → Project Settings → API Keys | `eyJhbGc...` |
| JWT_SECRET | Generate new | `openssl rand -hex 32` |

### Optional Secrets

| Secret | Purpose | Setup |
|--------|---------|-------|
| SENTRY_DSN | Error tracking | Sentry → Settings → DSN |
| REDIS_URL | Caching | Your Redis provider |
| SNYK_TOKEN | Security scan | Snyk → Account → Token |
| SLACK_WEBHOOK_URL | Notifications | Slack → Incoming Webhooks |
| CODECOV_TOKEN | Coverage tracking | Codecov → Settings → Token |

### Environment Variables in Workflow

```yaml
env:
  NODE_VERSION: 18
  CACHE_KEY: node-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

Access in jobs:
```yaml
steps:
  - name: Build project
    env:
      NODE_ENV: production
    run: npm run build
```

---

## Testing Strategy

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
```

### Writing Tests

```javascript
// Example: api/routes/users.test.js
const request = require('supertest');
const { app } = require('../server');

describe('Users API', () => {
  test('GET /api/v1/usuarios should return 200', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${process.env.JWT_TOKEN}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success');
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- users.test.js

# Run with coverage
npm test -- --coverage

# Watch mode (local development)
npm run test:watch

# CI mode (for GitHub Actions)
npm run test:ci
```

### Coverage Report

Coverage is generated in `coverage/` directory:

```
coverage/
├── lcov.info          (for Codecov upload)
├── coverage-final.json
└── index.html         (view in browser)
```

---

## Deployment Options

### Automatic Deployment (Main Branch)

Triggered on push to `main`:

```bash
git push origin main
# Automatically runs full CI/CD pipeline
# If all jobs pass, deploys to production
```

### Preview Deployments (Pull Requests)

Created for every PR:

```bash
git push origin feature/new-feature
# Opens PR
# Comment appears with preview URL
# Can merge after approval and tests pass
```

### Manual Deployment

```bash
# Via GitHub Actions tab
1. Go to Actions tab
2. Select "CI/CD Pipeline - Deploy to Vercel"
3. Click "Run workflow"
4. Choose branch (main)
5. Click "Run workflow"

# Via Vercel CLI
cd backend
vercel --prod

# Via git command
git push origin main
```

### Staging Deployment

For testing before production:

```bash
# Push to staging branch (no auto-deploy)
git push origin staging

# Tests run automatically
# If tests pass, manually deploy via Vercel dashboard
vercel --prod --scope=your-org
```

---

## Monitoring & Alerts

### Viewing Workflow Status

```bash
# GitHub Actions tab
https://github.com/YOUR_ORG/maya-autopartes/actions

# Recent runs show:
# ✅ Success (all jobs passed)
# ❌ Failure (job failed)
# ⏳ In progress
```

### Checking Specific Job Logs

1. Click on workflow run
2. Click job name (e.g., "test")
3. Expand step to view logs
4. Look for errors or warnings

### Common Log Patterns

```bash
# Lint failure
> npm run lint
  SyntaxError: Unexpected token

# Test failure
● My Test › should pass
  expect(received).toBe(expected)

# Build failure
error: Cannot find module 'express'

# Deployment failure
Error: Could not authenticate with Vercel
```

### Slack Notifications

Set `SLACK_WEBHOOK_URL` secret to get alerts:

```
✅ Deployment to Production - success (abc1234...)
```

Click link to view full workflow run.

### GitHub Branch Protection

Require CI to pass before merging:

1. Go to **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Check "Require status checks to pass before merging"
4. Select:
   - `lint`
   - `test`
   - `build`
   - `deploy` (if desired)
5. Save

---

## Customization

### Changing Triggers

Edit `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
      - production
  pull_request:
    branches:
      - main
  schedule:
    # Run every day at 2 AM UTC
    - cron: '0 2 * * *'
```

### Adding New Jobs

```yaml
  new-job:
    name: My New Job
    runs-on: ubuntu-latest
    needs: [test]  # Run after test job
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Do something
        run: echo "Hello, World!"
```

### Adjusting Timeouts

```yaml
test:
  timeout-minutes: 30  # Change from 20 to 30
```

### Skipping Workflows

In commit message:

```bash
git commit -m "Update docs [skip ci]"
```

### Using Environment-Specific Secrets

```yaml
deploy:
  env:
    API_URL: ${{ secrets.API_URL }}
  run: npm deploy
```

### Running Steps Conditionally

```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: vercel --prod

- name: Deploy to staging
  if: github.ref == 'refs/heads/staging'
  run: vercel
```

---

## Troubleshooting

### Workflow Won't Start

**Issue**: Push to main but workflow doesn't run

**Solution**:
1. Check branch is `main` (not `main-branch`)
2. Verify `.github/workflows/deploy.yml` exists
3. Check file isn't in a draft state
4. Commit directly (no draft PR)

### Lint Fails Locally But Passes in CI

**Issue**: Different Node/ESLint versions

**Solution**:
```bash
# Use same version locally
npm install --save-dev eslint@8.52.0

# Run same lint command
npm run lint

# Or auto-fix
npm run lint:fix
```

### Tests Timeout

**Issue**: Jest takes too long

**Solution**:
```bash
# In deploy.yml, increase timeout
timeout-minutes: 40

# Or optimize tests
npm test -- --maxWorkers=2
npm test -- --testTimeout=10000
```

### Deploy Fails With "Invalid Memory"

**Error**: `Invalid memory value: 512`

**Solution**: Check vercel.json function memory (must be 128-3008)

```json
"functions": {
  "api/**/*.js": {
    "memory": 1024
  }
}
```

### Health Check Always Fails

**Issue**: `/api/health` returns 404

**Solution**:
1. Check endpoint exists in `backend/server.js`
2. Verify environment variables set in Vercel
3. Check database connection
4. View Sentry errors if enabled

---

## Best Practices

1. **Keep main branch stable**: Only merge tested code
2. **Use descriptive commit messages**: Helps track changes
3. **Test locally first**: Run `npm test` before pushing
4. **Review logs**: Check workflow logs for warnings
5. **Update dependencies**: Run `npm audit` regularly
6. **Use branch protection**: Require CI to pass
7. **Monitor health checks**: Alert on failures
8. **Document changes**: Update docs with new features

---

## Quick Reference

```bash
# Local commands
npm run lint           # Run ESLint
npm run lint:fix       # Fix linting issues
npm test               # Run tests
npm run test:watch     # Watch mode
npm run build          # Build project
npm run deploy         # Deploy to Vercel

# GitHub commands
gh secret set KEY -b "value"          # Add secret
gh pr create -t "Title" -b "Body"     # Create PR
gh pr merge --squash                  # Merge and squash

# Vercel commands
vercel login           # Authenticate
vercel link            # Link project
vercel env add VAR     # Add env variable
vercel --prod          # Deploy to production
vercel logs --prod     # View logs
```

---

**For more information, see:**
- DEPLOYMENT_GUIDE_PHASE4.md
- PRODUCTION_SETUP.md
- ROLLBACK_PROCEDURES.md
