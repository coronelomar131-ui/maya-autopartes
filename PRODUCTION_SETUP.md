# Production Setup Guide

**Status:** Complete  
**Date:** 2026-04-22  
**Version:** 1.0.0

## Overview

This guide covers the complete setup required to run Maya Autopartes in production on Vercel with Supabase.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Vercel Configuration](#vercel-configuration)
3. [Supabase Setup](#supabase-setup)
4. [GitHub Secrets](#github-secrets)
5. [Security Hardening](#security-hardening)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Logging](#monitoring--logging)
8. [Disaster Recovery](#disaster-recovery)

---

## Environment Variables

### Production Variables

All variables should be added to Vercel's environment configuration.

#### Database Configuration

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Alternative: For direct database access
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

#### Authentication & Security

```env
# JWT Configuration
JWT_SECRET=a_very_long_random_string_min_32_chars_long_abc123xyz...
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=10

# Session
SESSION_SECRET=another_random_secret_min_32_chars...
SESSION_TIMEOUT_MS=3600000  # 1 hour

# CSRF Protection
CSRF_TOKEN_SECRET=csrf_secret_key...
CSRF_PROTECTION=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

#### API & Server Configuration

```env
# Server
NODE_ENV=production
PORT=3000  # For Vercel, use 3000
API_URL=https://maya-api.vercel.app
API_PREFIX=/api/v1
API_TIMEOUT=30000  # 30 seconds

# CORS
CORS_ORIGIN=https://maya-autopartes.vercel.app,https://your-custom-domain.com
CORS_CREDENTIALS=true
```

#### External Services

```env
# Google Drive API
GOOGLE_CLIENT_ID=abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_REDIRECT_URI=https://maya-api.vercel.app/api/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/drive.file

# Microsoft OneDrive
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_SCOPES=https://graph.microsoft.com/.default

# MercadoLibre API
MERCADOLIBRE_CLIENT_ID=your_ml_client_id
MERCADOLIBRE_CLIENT_SECRET=your_ml_secret
MERCADOLIBRE_ACCESS_TOKEN=your_ml_token
MERCADOLIBRE_REFRESH_TOKEN=your_ml_refresh_token

# Slack Webhook (for notifications)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Email Configuration

```env
# SMTP for transactional emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@mayaautopartes.com
SMTP_PASS=your_app_password  # Use app-specific password
SMTP_FROM_NAME=Maya Autopartes
SMTP_FROM_EMAIL=noreply@mayaautopartes.com

# Email templates
EMAIL_TEMPLATE_PATH=/api/templates/email
SEND_EMAILS=true
```

#### Caching & Performance

```env
# Redis Cache
REDIS_ENABLED=false  # Optional, only if using Redis
REDIS_URL=redis://default:password@your-redis-host:6379/0
REDIS_TTL=3600  # 1 hour cache lifetime

# Response Caching
CACHE_CONTROL_MAX_AGE=3600
CACHE_STATIC_ASSETS=true
```

#### Monitoring & Logging

```env
# Sentry Error Tracking
SENTRY_ENABLED=true
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0000000
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=1.0.0

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DESTINATION=console  # or file path
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
SLOW_QUERY_LOG_MS=1000  # Log queries taking > 1 second
```

#### Feature Flags

```env
# Enable/Disable Features
FEATURE_GOOGLE_DRIVE_SYNC=true
FEATURE_ONEDRIVE_SYNC=true
FEATURE_MERCADOLIBRE_SYNC=true
FEATURE_INVENTORY_AUTO_SYNC=true
FEATURE_EMAIL_NOTIFICATIONS=true
FEATURE_SMS_NOTIFICATIONS=false

# Beta Features
BETA_FEATURES_ENABLED=false
BETA_USER_IDS=user1,user2,user3
```

#### Database Backups & Maintenance

```env
# Backups
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 3 * * *  # Daily at 3 AM UTC
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=gzip
BACKUP_DESTINATION=s3://your-bucket/backups

# Database Maintenance
ENABLE_VACUUM=true
VACUUM_SCHEDULE=0 4 * * 0  # Sunday at 4 AM UTC
ENABLE_ANALYZE=true
```

### Setting Variables in Vercel

#### Via CLI

```bash
# Interactive setup
vercel env add SUPABASE_URL
# Choose: production, preview, development

# List all
vercel env ls --prod

# Remove
vercel env rm VARIABLE_NAME
```

#### Via Web Dashboard

1. Go to **Vercel Dashboard**
2. Select **Project → Settings → Environment Variables**
3. Click **Add New**
4. Name: `SUPABASE_URL`
5. Value: `https://your-project.supabase.co`
6. Select **Production** (checkbox)
7. Click **Save**

### Local Development Variables

Create `.env.local` (never commit):

```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=dev_secret_key
# ... other variables
```

Use `.env.example` for template (commit to repo).

---

## Vercel Configuration

### vercel.json Structure

```json
{
  "version": 2,
  "name": "maya-autopartes-api",
  "env": {
    "NODE_ENV": "production",
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_KEY": "@supabase_key",
    "JWT_SECRET": "@jwt_secret"
  },
  "functions": {
    "backend/**/*.js": {
      "memory": 1024,
      "maxDuration": 60
    },
    "api/**/*.js": {
      "memory": 512,
      "maxDuration": 30
    }
  },
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "public": false,
  "rewrites": [
    {
      "source": "/api/v1/(.*)",
      "destination": "/backend/server.js"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

### Vercel Project Settings

1. **Settings → General**
   - Environment: Node.js
   - Node.js version: 18.x (LTS)
   - Root directory: ./
   - Build command: (leave empty for buildless)
   - Output directory: (leave empty)

2. **Settings → Environment Variables**
   - Add all production variables
   - Mark sensitive variables

3. **Settings → Functions**
   - Memory: 1024 MB (for API functions)
   - Max Duration: 60 seconds
   - Cold start handling: Standard

4. **Settings → Domains**
   - Add custom domains
   - Configure SSL certificates (automatic)

5. **Settings → Git**
   - Deployments: "Automatic"
   - Deploy on push to main
   - Preview for PRs: enabled

---

## Supabase Setup

### Database Configuration

1. **Create Project**
   - Region: Choose closest to your users (Mexico City recommended)
   - Database password: Strong, random, 32+ characters
   - Project name: `maya-autopartes`

2. **Get Connection Strings**
   - Go to **Settings → Database → Connection strings**
   - Copy `PostgreSQL` URI
   - Copy `Direct connection` URI (for admin operations)

3. **Initial Setup**
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli

   # Login
   supabase login

   # Link project
   supabase link --project-ref your_project_ref

   # Pull remote schema
   supabase db pull
   ```

### Authentication Setup

1. **Enable Auth Providers**
   - Go to **Authentication → Providers**
   - Enable: Email, Google, Microsoft (optional)

2. **Configure OAuth**
   - Google: Add OAuth credentials from Google Cloud Console
   - Microsoft: Add from Azure AD
   - Redirect URI: `https://maya-autopartes.vercel.app/auth/callback`

3. **Create Service Role Key**
   - Go to **Settings → API**
   - Copy `service_role` key (for server-side auth)
   - Keep secret, add to Vercel environment

### Row-Level Security (RLS)

Enable for all tables:

```sql
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own data
CREATE POLICY "Users can read own data"
ON inventory FOR SELECT
USING (auth.uid() = user_id);
```

### Backups Configuration

1. **Automatic Backups**
   - Go to **Settings → Backups**
   - Frequency: Daily (at 3 AM UTC)
   - Retention: 30 days

2. **Manual Backup**
   ```bash
   supabase db dump --local --schema public > backup.sql
   ```

3. **Restore from Backup**
   ```bash
   supabase db push < backup.sql
   ```

---

## GitHub Secrets

Required secrets for CI/CD pipeline:

### Vercel Secrets

```
VERCEL_TOKEN           → vercel token
VERCEL_ORG_ID          → From Vercel dashboard
VERCEL_PROJECT_ID      → From Vercel project
```

### Database Secrets

```
SUPABASE_URL           → https://your-project.supabase.co
SUPABASE_KEY           → Public anon key from Supabase
JWT_SECRET             → openssl rand -hex 32
```

### Optional Service Secrets

```
SENTRY_DSN             → Sentry project DSN
SNYK_TOKEN             → Snyk API token
SLACK_WEBHOOK_URL      → Slack incoming webhook
CODECOV_TOKEN          → Codecov API token
```

### Setting Secrets via CLI

```bash
# Vercel secrets
gh secret set VERCEL_TOKEN -b "$(vercel token)"
gh secret set VERCEL_ORG_ID -b "team_abc123"
gh secret set VERCEL_PROJECT_ID -b "prj_xyz789"

# Database secrets
gh secret set SUPABASE_URL -b "https://your-project.supabase.co"
gh secret set SUPABASE_KEY -b "$(cat supabase_key.txt)"
gh secret set JWT_SECRET -b "$(openssl rand -hex 32)"
```

---

## Security Hardening

### 1. Environment Variable Protection

```bash
# Never commit .env files
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Use .env.example for documentation
cp .env.example backend/.env.example
```

### 2. JWT Secret Strength

```bash
# Generate strong JWT secret
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Verify length (must be 32+ characters)
echo "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" | wc -c  # 65 (includes newline)
```

### 3. CORS Configuration

```env
# Only allow your domains
CORS_ORIGIN=https://maya-autopartes.vercel.app,https://your-custom-domain.com

# NOT production
CORS_ORIGIN=*
```

### 4. Security Headers

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 5. Database Security

```sql
-- Create separate roles for different access levels
CREATE ROLE app_user WITH LOGIN PASSWORD 'password';
CREATE ROLE app_admin WITH LOGIN PASSWORD 'password';

-- Grant minimal necessary permissions
GRANT SELECT, INSERT, UPDATE ON inventory TO app_user;
GRANT ALL ON inventory TO app_admin;

-- Enable Row-Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
```

### 6. API Key Rotation

```bash
# Every 90 days, generate new keys

# Supabase
# 1. Go to Settings → API
# 2. Click "Rotate" next to anon key
# 3. Update Vercel environment variables
# 4. Deploy

# JWT Secret
# 1. Generate new: openssl rand -hex 32
# 2. Update Vercel environment
# 3. All new sessions use new secret
# 4. Old sessions expire naturally
```

### 7. Rate Limiting

```env
# Prevent brute force attacks
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# For login endpoint
LOGIN_RATE_LIMIT_WINDOW_MS=3600000
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
```

---

## Performance Optimization

### 1. Function Memory & Timeout

```json
{
  "functions": {
    "backend/routes/heavy-processing.js": {
      "memory": 3008,
      "maxDuration": 900
    },
    "api/sync/google-drive.js": {
      "memory": 2048,
      "maxDuration": 300
    }
  }
}
```

### 2. Response Caching

```env
# Cache static assets
CACHE_STATIC_ASSETS=true

# API response caching
CACHE_API_RESPONSES=true
CACHE_TTL=3600  # 1 hour
```

### 3. Database Connection Pooling

```env
# If using direct DB connections
DB_POOL_SIZE=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_REAP_INTERVAL=1000
```

### 4. CDN Configuration

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 5. Compression

```bash
# Automatically enabled by Vercel
# Compress responses > 1KB
# GZIP compression for text/json
# Brotli for modern browsers
```

---

## Monitoring & Logging

### 1. Vercel Analytics

```bash
# View in Vercel Dashboard
https://vercel.com/dashboard/projects/[PROJECT_ID]/analytics

# Metrics:
# - Page load times
# - Core Web Vitals
# - Regional performance
# - Function cold starts
```

### 2. Sentry Integration

```env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0000000
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

```javascript
// In server.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 3. Custom Logging

```env
LOG_LEVEL=info
LOG_FORMAT=json
```

```javascript
// Structured logging
const logger = {
  info: (msg, data) => console.log(JSON.stringify({ level: 'info', msg, data, timestamp: new Date() })),
  error: (msg, error) => console.error(JSON.stringify({ level: 'error', msg, error: error.message, timestamp: new Date() }))
};
```

### 4. Health Check Endpoint

```bash
# Test regularly
curl https://maya-api.vercel.app/api/health

# Response
{
  "status": "OK",
  "timestamp": "2026-04-22T12:00:00Z",
  "environment": "production",
  "uptime": 86400,
  "database": "CONNECTED"
}
```

---

## Disaster Recovery

### Backup Strategy

```env
# Automated daily backups
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 3 * * *  # 3 AM UTC
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=gzip
```

### Recovery Procedures

**If database is corrupted:**

```bash
# 1. Stop application
# 2. Restore from backup
supabase db push < backup.sql

# 3. Verify integrity
curl https://maya-api.vercel.app/api/health

# 4. Notify users if needed
```

**If credentials are compromised:**

```bash
# 1. Revoke old credentials
# Supabase: Settings → API → Rotate key
# GitHub: Settings → Secrets → Delete
# Vercel: Settings → Environment Variables → Delete

# 2. Generate new credentials
# 3. Update in all services
# 4. Monitor for unusual activity (Sentry)
```

**If deployment fails:**

```bash
# 1. Check logs
vercel logs --prod

# 2. Review recent commits
git log --oneline -5

# 3. Rollback if needed
vercel rollback

# 4. Or revert commit
git revert HEAD
git push origin main
```

---

## Checklist: Pre-Production

Before deploying to production:

- [ ] All environment variables configured in Vercel
- [ ] Database credentials are correct
- [ ] JWT_SECRET is strong (32+ chars)
- [ ] CORS origins are whitelisted
- [ ] Security headers enabled in vercel.json
- [ ] HTTPS/SSL enabled
- [ ] Backup strategy configured
- [ ] Monitoring (Sentry) set up
- [ ] Health check endpoint working
- [ ] Load tests passed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team trained on deployment process
- [ ] Incident response plan documented
- [ ] Rollback procedure tested

---

## Useful Commands

```bash
# Vercel
vercel env ls --prod
vercel logs --prod --follow
vercel inspect [DEPLOYMENT_ID]
vercel rollback [DEPLOYMENT_ID]

# Supabase
supabase status
supabase db push
supabase db pull
supabase migration new [name]

# Git
git log --oneline -10
git show HEAD
git revert HEAD
git push origin main

# Security
openssl rand -hex 32  # Generate secret
npm audit            # Check dependencies
npm audit fix        # Auto-fix vulnerabilities
```

---

**For more information:**
- DEPLOYMENT_GUIDE_PHASE4.md - Deployment process
- CI_CD_SETUP.md - GitHub Actions configuration
- ROLLBACK_PROCEDURES.md - How to rollback
