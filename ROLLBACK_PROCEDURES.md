# Rollback Procedures

**Status:** Complete  
**Date:** 2026-04-22  
**Version:** 1.0.0

## Overview

This guide explains how to quickly and safely rollback deployments when issues occur in production.

---

## Table of Contents

1. [Quick Rollback (< 5 minutes)](#quick-rollback--5-minutes)
2. [Automated Rollback](#automated-rollback)
3. [Manual Rollback via Vercel](#manual-rollback-via-vercel)
4. [Git-Based Rollback](#git-based-rollback)
5. [Database Rollback](#database-rollback)
6. [Partial Rollback](#partial-rollback)
7. [Post-Rollback Procedures](#post-rollback-procedures)
8. [Preventing Rollbacks](#preventing-rollbacks)

---

## Quick Rollback (< 5 minutes)

### Scenario 1: Health Check Failed

**Status**: Automatic rollback triggered

**What happens**:
1. Deployment succeeds
2. Health check runs and fails
3. GitHub Actions detects failure
4. Automatic rollback job starts
5. GitHub issue created for review

**Manual action**:
```bash
# View the issue created
# https://github.com/YOUR_ORG/maya-autopartes/issues

# Verify previous version is live
curl https://maya-api.vercel.app/api/health

# Check logs
vercel logs --prod --follow
```

### Scenario 2: API Returns 500 Errors

**Step 1**: Identify deployment causing issue

```bash
# Check current deployment
vercel inspect --prod
# Output shows deployment ID and creation time

# View recent deployments
vercel list --prod
```

**Step 2**: Rollback immediately

```bash
# Via Vercel CLI (fastest)
vercel rollback

# Choose previous deployment when prompted
# Deployment goes live immediately
```

**Step 3**: Verify rollback

```bash
# Check health
curl https://maya-api.vercel.app/api/health

# View logs from previous deployment
vercel logs --prod --follow
```

### Scenario 3: Database Connection Lost

**Step 1**: Check environment variables

```bash
# Verify variables are set
vercel env ls --prod

# Look for SUPABASE_URL and SUPABASE_KEY
```

**Step 2**: If variables are wrong, rollback

```bash
# Don't fix variables while broken code is live
# Rollback first, then fix
vercel rollback
```

**Step 3**: Fix the issue

```bash
# Update environment variables
vercel env add SUPABASE_URL

# Or revert the breaking commit
git revert HEAD
git push origin main
```

---

## Automated Rollback

### When It Triggers

The GitHub Actions workflow automatically initiates rollback if:

1. **Tests fail** (before deployment)
   - ESLint errors
   - Jest test failures
   - Build errors
   - Workflow stops, no deployment happens

2. **Health check fails** (after deployment)
   - `/api/health` returns non-200 status
   - Timeout connecting to deployment
   - 5 failed retry attempts
   - Rollback job executes

3. **Manual trigger** (GitHub Actions dashboard)
   - Click "Run workflow"
   - Select "rollback" job
   - Confirms previous deployment is live

### Automatic Rollback Job

**Location**: `.github/workflows/deploy.yml` (rollback job)

**What it does**:
```yaml
rollback:
  name: Automatic Rollback
  runs-on: ubuntu-latest
  needs: deploy
  if: failure() && github.ref == 'refs/heads/main'
  steps:
    - Creates GitHub issue with failure details
    - Comments deployment failure in PR
    - Logs previous deployment URL
    - Notifies team on Slack (if configured)
```

**GitHub Issue Example**:
```
Title: ❌ Deployment Failed - Manual Review Required

Body:
Commit: abc1234
Branch: main
Author: john_dev

Deployment to production failed. 
Health check did not pass after 5 retries.

Previous deployment: prj_abc123-xyz789
Verify and manually promote if needed.
```

---

## Manual Rollback via Vercel

### Method 1: Vercel CLI

**Prerequisites**:
```bash
# Must have Vercel CLI installed
npm install -g vercel@latest

# Must be authenticated
vercel login

# Must be in project directory
cd /path/to/maya-autopartes-working
```

**Rollback to previous**:
```bash
# Shows deployment list with times
vercel list --prod

# Output:
# Deployment    URL                            Age
# abc123 (current)  maya-api.vercel.app         2m
# def456         maya-api-xyzabc.vercel.app   2h
# ghi789         maya-api-qwerty.vercel.app   4h

# Rollback to previous
vercel rollback

# When prompted: Select "def456" or press Enter for default
# Deployment goes live immediately

# Verify
curl https://maya-api.vercel.app/api/health
```

### Method 2: Vercel Web Dashboard

**Via browser**:
1. Go to https://vercel.com/dashboard
2. Select **maya-autopartes** project
3. Click **Deployments** tab
4. Find previous working deployment
5. Click three dots (•••) menu
6. Select **Promote to Production**
7. Confirm when prompted

**Verification**:
- Deployment badge shows green checkmark
- URL shows as "Production"
- Visit site and verify works

### Method 3: Specific Deployment ID

```bash
# If you know the deployment ID
vercel promote prj_abc123-def456

# Output:
# ✅ Promoted deployment
# URL: https://maya-api.vercel.app
# Deployment ID: prj_abc123-def456
```

---

## Git-Based Rollback

### Method 1: Revert Last Commit

**When to use**: Issue is in recent code change

```bash
# See what to revert
git log --oneline -5
# Output:
# abc1234 Add new feature
# def5678 Fix bug
# ghi9012 Update docs

# Revert last commit
git revert HEAD

# Editor opens for commit message
# (Default message is fine, save and exit)

# Push to trigger CI/CD
git push origin main

# Wait for deployment
# GitHub Actions runs pipeline again
# Vercel deploys new version (without problematic code)
```

**What happens**:
- New commit is created that undoes previous commit
- Code is back to working state
- Full CI/CD pipeline runs
- Health checks verify success
- Live in production

### Method 2: Revert Multiple Commits

```bash
# Revert last 3 commits
git revert HEAD~2..HEAD

# Or revert to specific commit
git revert abc1234..HEAD

# Push
git push origin main
```

### Method 3: Reset to Previous Commit

**⚠️ WARNING**: Use only if absolutely necessary, loses commit history

```bash
# Find the commit to reset to
git log --oneline -10

# Reset (⚠️ This deletes history)
git reset --hard abc1234

# Force push (⚠️ Dangerous, only do this if necessary)
git push origin main --force

# Better alternative: Use git revert instead
```

### Method 4: Create Hotfix Branch

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/issue-fix

# Make critical fix
# (edit files to fix issue)

# Commit
git add .
git commit -m "Fix: Critical issue in production [hotfix]"

# Push and create PR
git push origin hotfix/issue-fix
gh pr create --title "Hotfix: Critical issue" --body "Urgent fix"

# After review and tests pass
gh pr merge --squash
# Deploy happens automatically
```

---

## Database Rollback

### Scenario 1: Data Corruption

**Step 1**: Stop application

```bash
# Put maintenance page in place
# Go to Vercel dashboard → Project → Settings → Maintenance
# Enable maintenance mode
```

**Step 2**: Restore from backup

```bash
# List available backups (via Supabase CLI)
supabase db list-backups

# Output:
# ID     Created At              Status
# bak1   2026-04-22 12:00:00    SUCCESS
# bak2   2026-04-22 06:00:00    SUCCESS
# bak3   2026-04-21 00:00:00    SUCCESS

# Restore most recent
supabase db restore --backup-id bak1
```

**Step 3**: Verify data integrity

```bash
# Connect to database
psql postgresql://...

# Check tables
SELECT COUNT(*) FROM inventory;
SELECT COUNT(*) FROM sales;
SELECT COUNT(*) FROM customers;

# Verify data consistency
SELECT SUM(quantity) FROM inventory;
```

**Step 4**: Disable maintenance mode

```bash
# In Vercel dashboard, disable maintenance
# Or API should automatically detect restored DB
```

### Scenario 2: Failed Migration

**If migration broke something**:

```bash
# Revert migration
supabase migration list
# Shows migrations applied

# Rollback last migration
supabase db reset

# Or apply previous migration
supabase migration down 1

# Verify
supabase db pull
```

### Scenario 3: Accidental Data Delete

**If users deleted data accidentally**:

```bash
# Restore from point-in-time backup
# (If Supabase PITR is enabled)

supabase db restore --backup-id bak_timestamp

# Or manual restore from exported SQL
psql postgresql://... < backup-2026-04-22.sql
```

---

## Partial Rollback

### Rollback Single Route/Module

If only one endpoint is broken:

```bash
# Create feature branch
git checkout -b fix/broken-endpoint

# Revert just that file
git checkout HEAD~1 -- backend/routes/users.js

# Commit
git add backend/routes/users.js
git commit -m "Revert: Users endpoint to previous version"

# Push and merge to main
git push origin fix/broken-endpoint
gh pr create --title "Revert broken users endpoint"

# After tests pass
gh pr merge --squash
```

### Disable Feature Flag

If new feature has bug:

```env
# In vercel.json, temporarily disable feature
"env": {
  "FEATURE_NEW_SYNC": "false"  # Disable
}
```

Then push environment variable change and redeploy.

### Kill Specific Cron Job

If scheduled job is causing issues:

```json
// vercel.json - comment out problematic cron
{
  "crons": [
    // {
    //   "path": "/api/sync/broken-job",
    //   "schedule": "0 * * * *"
    // },
    {
      "path": "/api/sync/working-job",
      "schedule": "0 * * * *"
    }
  ]
}
```

Push and redeploy.

---

## Post-Rollback Procedures

### Immediately After Rollback

1. **Verify service is up**
   ```bash
   curl https://maya-api.vercel.app/api/health
   ```

2. **Check logs for errors**
   ```bash
   vercel logs --prod --follow
   ```

3. **Notify team**
   - Send Slack message
   - Email stakeholders
   - Post in incident channel

4. **Monitor metrics**
   - Vercel Analytics
   - Sentry error rates
   - Database performance

### Investigation Phase

1. **Find root cause**
   ```bash
   # Check recent changes
   git log --oneline -10
   
   # Review deployment logs
   vercel logs --prod
   
   # Check environment variables
   vercel env ls --prod
   
   # Review Sentry errors
   # https://sentry.io/organizations/[ORG]/issues/
   ```

2. **Document issue**
   - What failed?
   - When did it start?
   - What was deployed?
   - How was it fixed?

3. **Create issue for fixing**
   ```bash
   gh issue create --title "BUG: Issue from rollback" --body "Details..."
   ```

### Fix and Redeploy

1. **Fix the code**
   ```bash
   git checkout -b fix/issue-name
   # Edit files to fix issue
   git add .
   git commit -m "Fix: Description of fix"
   git push origin fix/issue-name
   gh pr create --title "Fix: Issue name"
   ```

2. **Ensure tests pass**
   - Wait for GitHub Actions
   - Verify all checks pass
   - Code review

3. **Merge and deploy**
   ```bash
   gh pr merge --squash
   # Automatic deploy happens
   # Monitor in Actions tab
   ```

### Post-Incident Review

**Within 24 hours**, conduct review:

1. **Timeline**
   - When was issue detected?
   - How long before rollback?
   - Time to recovery?

2. **Root cause**
   - What actually failed?
   - Why wasn't it caught in testing?
   - System failure or human error?

3. **Prevention**
   - Can tests catch this in future?
   - Do we need better monitoring?
   - Process improvements?

4. **Documentation**
   - Update runbooks
   - Add to FAQ
   - Share learnings with team

---

## Preventing Rollbacks

### 1. Comprehensive Testing

```bash
# Local testing before push
npm test
npm run lint
npm run build

# Push to branch and verify CI
git push origin feature-branch
# Wait for GitHub Actions to pass
```

### 2. Code Review

- Always get peer review
- Check for database changes
- Verify environment variable usage
- Test in staging first

### 3. Gradual Rollout

```bash
# Deploy to staging first
git push origin staging
# Verify works in production-like environment

# If OK, merge to main
git merge staging
git push origin main
```

### 4. Monitoring Before Deploy

```bash
# Check current metrics
vercel analytics
curl https://maya-api.vercel.app/api/health

# Deploy
git push origin main

# Watch metrics
# If anything unusual, rollback immediately
```

### 5. Deployment Windows

- Deploy during business hours (when team is available)
- Avoid late Friday deployments
- Have communication channel open
- Team ready to respond if issues occur

### 6. Feature Flags

```env
# New features behind flags
FEATURE_COOL_NEW_FEATURE=false

# Once verified in production
FEATURE_COOL_NEW_FEATURE=true

# Can be toggled back without code change
```

### 7. Automated Health Checks

The CI/CD pipeline includes:
- Automatic health check after deployment
- 5 retry attempts with 30-second intervals
- Automatic rollback if all fail
- GitHub issue creation for manual review

---

## Rollback Decision Tree

```
                    Issue Detected?
                          |
                          v
                    How Severe?
                    /           \
                 Minor       Critical
                  |               |
                  v               v
            Can fix in code?   Rollback now
            /         \            |
          YES         NO           v
           |           |        Use: vercel rollback
           v           v
          Fix+     Rollback
          Deploy   & Fix
           |           |
           v           v
        Monitor     Monitor
           |           |
           v           v
          Done    After 1hr
                   investigate
```

---

## Emergency Contacts

**If rollback is needed and team is unavailable**:

```
Primary (Omar):   coronelomar131@gmail.com

Steps:
1. Use vercel rollback
2. Create GitHub issue
3. Notify via email/Slack
4. Monitor metrics
5. Document what happened
```

---

## Testing Rollback Procedure

**Once per month**, practice rollback:

```bash
# 1. Deploy to staging
git push origin staging

# 2. Verify deployment
vercel --scope staging
curl https://maya-staging.vercel.app/api/health

# 3. Test rollback
vercel rollback

# 4. Verify previous version
curl https://maya-staging.vercel.app/api/health

# 5. Document time taken
# Goal: < 5 minutes from issue detection to recovery
```

---

## Useful Commands Reference

```bash
# Rollback commands
vercel rollback                           # Rollback to previous
vercel promote <DEPLOYMENT_ID>            # Promote specific deployment
vercel list --prod                        # View deployment history
vercel inspect --prod                     # View current deployment details
vercel logs --prod --follow               # Watch live logs

# Git commands
git revert HEAD                           # Undo last commit
git revert abc123..HEAD                   # Undo multiple commits
git log --oneline -10                     # View recent commits
git diff abc123 def456                    # Compare commits

# Database commands
supabase db restore --backup-id bak1      # Restore from backup
supabase db list-backups                  # View available backups
supabase db reset                         # Reset to initial state
```

---

**For more information:**
- DEPLOYMENT_GUIDE_PHASE4.md
- PRODUCTION_SETUP.md
- CI_CD_SETUP.md
