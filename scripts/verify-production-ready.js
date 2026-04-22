#!/usr/bin/env node

/**
 * Pre-deployment verification script
 * Verifica que la aplicación está lista para producción
 *
 * Uso: node scripts/verify-production-ready.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function title(message) {
  console.log('\n');
  log(`${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

let checks = 0;
let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  checks++;
  if (condition) {
    success(name);
    passed++;
    if (details) info(`   ${details}`);
  } else {
    error(name);
    failed++;
    if (details) warning(`   ${details}`);
  }
}

// Start verification
title('🚀 Production Readiness Verification');

// 1. Check Node version
info('Checking Node.js version...');
try {
  const version = execSync('node --version', { encoding: 'utf8' }).trim();
  const major = parseInt(version.split('.')[0].substring(1));
  check('Node.js version >= 16', major >= 16, `Current: ${version}`);
} catch (e) {
  check('Node.js installed', false, 'Node.js not found');
}

// 2. Check npm version
info('Checking npm version...');
try {
  const version = execSync('npm --version', { encoding: 'utf8' }).trim();
  const major = parseInt(version.split('.')[0]);
  check('npm version >= 8', major >= 8, `Current: ${version}`);
} catch (e) {
  check('npm installed', false, 'npm not found');
}

// 3. Check required files
title('📁 Required Configuration Files');

const requiredFiles = [
  'package.json',
  'vercel.json',
  '.env.production',
  'backend/package.json',
  'backend/server.js',
  'api/package.json',
  '.github/workflows/deploy.yml',
  'DEPLOY_PRODUCTION.md',
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  check(
    `${file} exists`,
    exists,
    exists ? 'Found' : `Missing at ${path.join(process.cwd(), file)}`
  );
});

// 4. Check .env files
title('🔐 Environment Variables');

const envExample = path.join(process.cwd(), '.env.example');
if (fs.existsSync(envExample)) {
  const content = fs.readFileSync(envExample, 'utf8');
  const hasSupabase = content.includes('SUPABASE_URL');
  const hasJWT = content.includes('JWT_SECRET');
  const hasSentry = content.includes('SENTRY_DSN');

  check('SUPABASE_URL configured', hasSupabase);
  check('JWT_SECRET configured', hasJWT);
  check('SENTRY_DSN configured', hasSentry);
}

// 5. Check .gitignore
title('🔒 Security Checks');

const gitignore = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignore)) {
  const content = fs.readFileSync(gitignore, 'utf8');
  check('.env files in .gitignore', content.includes('.env'));
  check('node_modules in .gitignore', content.includes('node_modules'));
  check('coverage in .gitignore', content.includes('coverage'));
  check('.DS_Store in .gitignore', content.includes('.DS_Store'));
}

// 6. Check package.json scripts
title('📝 Build & Deploy Scripts');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasScripts = {
  build: packageJson.scripts?.build,
  test: packageJson.scripts?.test,
  lint: packageJson.scripts?.lint,
  deploy: packageJson.scripts?.deploy,
  verify: packageJson.scripts?.verify,
};

Object.entries(hasScripts).forEach(([name, exists]) => {
  check(`npm run ${name} script exists`, !!exists);
});

// 7. Check backend config
title('🔧 Backend Configuration');

const backendPackage = JSON.parse(
  fs.readFileSync('backend/package.json', 'utf8')
);
check('Backend has start script', !!backendPackage.scripts?.start);
check('Backend has test script', !!backendPackage.scripts?.test);
check('Express dependency present', !!backendPackage.dependencies?.express);
check('Supabase SDK present', !!backendPackage.dependencies['@supabase/supabase-js']);

// 8. Check Vercel config
title('☁️  Vercel Configuration');

const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
check('vercel.json version 2', vercelConfig.version === 2);
check('Environment variables configured', !!vercelConfig.env);
check('Build command configured', !!vercelConfig.buildCommand);
check('Functions configured', !!vercelConfig.functions);
check('Rewrites configured', !!vercelConfig.rewrites);
check('Security headers configured', !!vercelConfig.headers);

if (vercelConfig.headers) {
  const hasCORS = JSON.stringify(vercelConfig.headers).includes('Access-Control');
  const hasCSP = JSON.stringify(vercelConfig.headers).includes('Content-Security-Policy');
  const hasHSTS = JSON.stringify(vercelConfig.headers).includes('Strict-Transport-Security');

  check('CORS headers configured', hasCORS);
  check('CSP header configured', hasCSP);
  check('HSTS header configured', hasHSTS);
}

// 9. Check GitHub Actions
title('🤖 CI/CD Pipeline (GitHub Actions)');

const workflowPath = path.join(process.cwd(), '.github/workflows/deploy.yml');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  check('Deploy workflow exists', true);
  check('Tests job configured', workflow.includes('test:'));
  check('Lint job configured', workflow.includes('lint:'));
  check('Build job configured', workflow.includes('build:'));
  check('Security scan configured', workflow.includes('security:'));
  check('Deploy job configured', workflow.includes('deploy:'));
  check('Health check configured', workflow.includes('health-check:'));
}

// 10. Check documentation
title('📚 Documentation');

const deployGuide = path.join(process.cwd(), 'DEPLOY_PRODUCTION.md');
check('DEPLOY_PRODUCTION.md exists', fs.existsSync(deployGuide));

// Summary
title('📊 Verification Summary');

const totalChecks = checks;
const passPercentage = Math.round((passed / totalChecks) * 100);

log(`Total checks: ${totalChecks}`, 'cyan');
log(`✅ Passed: ${passed}`, 'green');
log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
log(`Progress: ${passPercentage}%`, passPercentage === 100 ? 'green' : 'yellow');

if (failed === 0) {
  console.log('\n');
  log('🎉 Your application is READY FOR PRODUCTION!', 'green');
  log('Next steps:', 'cyan');
  log('  1. Review DEPLOY_PRODUCTION.md', 'cyan');
  log('  2. Configure environment variables in Vercel', 'cyan');
  log('  3. Push to main branch to trigger deployment', 'cyan');
  log('  4. Monitor the GitHub Actions workflow', 'cyan');
  process.exit(0);
} else {
  console.log('\n');
  log('⚠️  Please fix the issues above before deploying to production', 'yellow');
  log('Common fixes:', 'cyan');
  log('  • Add missing environment variables to .env.production', 'cyan');
  log('  • Install dependencies: npm install', 'cyan');
  log('  • Run verification: npm run verify', 'cyan');
  log('  • Check documentation: DEPLOY_PRODUCTION.md', 'cyan');
  process.exit(1);
}
