#!/usr/bin/env node

// Production build script with optimizations
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Build configuration
const buildConfig = {
  mode: process.argv[2] || 'production',
  analyze: process.argv.includes('--analyze'),
  deploy: process.argv.includes('--deploy'),
  verbose: process.argv.includes('--verbose')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging utility
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}→${colors.reset} ${msg}`)
};

// Execute command with error handling
const exec = (command, description) => {
  log.step(description);
  
  try {
    if (buildConfig.verbose) {
      execSync(command, { stdio: 'inherit' });
    } else {
      execSync(command);
    }
    log.success(description);
  } catch (error) {
    log.error(`${description} failed`);
    if (buildConfig.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
};

// Check environment variables
const checkEnvironment = () => {
  log.step('Checking environment variables');
  
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_APP_NAME',
    'VITE_APP_VERSION'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log.error(`Missing environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  log.success('Environment variables check passed');
};

// Clean build directory
const cleanBuild = () => {
  log.step('Cleaning build directory');
  
  try {
    execSync('rm -rf dist', { stdio: 'pipe' });
    log.success('Build directory cleaned');
  } catch (error) {
    // Directory might not exist, which is fine
    log.info('Build directory already clean');
  }
};

// Run type checking
const typeCheck = () => {
  log.step('Running type checking');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    log.success('Type checking passed');
  } catch (error) {
    log.warning('Type checking failed (continuing build)');
  }
};

// Run linting
const lint = () => {
  log.step('Running linting');
  
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    log.success('Linting passed');
  } catch (error) {
    log.warning('Linting failed (continuing build)');
  }
};

// Run tests
const test = () => {
  log.step('Running tests');
  
  try {
    execSync('npm run test:run', { stdio: 'pipe' });
    log.success('Tests passed');
  } catch (error) {
    log.error('Tests failed');
    process.exit(1);
  }
};

// Build application
const build = () => {
  const buildCommand = buildConfig.analyze 
    ? `npm run build:analyze`
    : `npm run build -- --mode ${buildConfig.mode}`;
  
  exec(buildCommand, 'Building application');
};

// Analyze bundle size
const analyzeBundle = () => {
  if (!buildConfig.analyze) return;
  
  log.step('Analyzing bundle size');
  
  try {
    execSync('npm run analyze:bundle', { stdio: 'pipe' });
    log.success('Bundle analysis completed');
  } catch (error) {
    log.warning('Bundle analysis failed');
  }
};

// Generate build report
const generateBuildReport = () => {
  log.step('Generating build report');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const buildInfo = {
      buildDate: new Date().toISOString(),
      mode: buildConfig.mode,
      version: packageJson.version,
      dependencies: packageJson.dependencies,
      devDependencies: packageJson.devDependencies
    };
    
    writeFileSync(
      'dist/build-info.json',
      JSON.stringify(buildInfo, null, 2)
    );
    
    log.success('Build report generated');
  } catch (error) {
    log.warning('Build report generation failed');
  }
};

// Optimize build assets
const optimizeAssets = () => {
  log.step('Optimizing build assets');
  
  try {
    // Compress images if available
    execSync('npm run optimize:images', { stdio: 'pipe' });
    log.success('Image optimization completed');
  } catch (error) {
    log.info('Image optimization skipped (not available)');
  }
  
  try {
    // Generate service worker
    execSync('npm run generate:sw', { stdio: 'pipe' });
    log.success('Service worker generated');
  } catch (error) {
    log.info('Service worker generation skipped (not available)');
  }
};

// Deploy to staging
const deploy = () => {
  if (!buildConfig.deploy) return;
  
  log.step('Deploying to staging');
  
  try {
    execSync('npm run deploy:staging', { stdio: 'pipe' });
    log.success('Deployment completed');
  } catch (error) {
    log.error('Deployment failed');
    process.exit(1);
  }
};

// Main build process
const main = async () => {
  console.log(`${colors.bright}${colors.cyan}🚀 Production Build Process${colors.reset}`);
  console.log(`${colors.bright}Mode: ${buildConfig.mode}${colors.reset}`);
  console.log('');
  
  try {
    // Build steps
    checkEnvironment();
    cleanBuild();
    typeCheck();
    lint();
    test();
    build();
    analyzeBundle();
    generateBuildReport();
    optimizeAssets();
    deploy();
    
    console.log('');
    console.log(`${colors.bright}${colors.green}✓ Build completed successfully!${colors.reset}`);
    
    if (buildConfig.analyze) {
      console.log(`${colors.cyan}📊 Bundle analysis available in dist/report.html${colors.reset}`);
    }
    
    if (buildConfig.deploy) {
      console.log(`${colors.cyan}🚀 Deployment completed${colors.reset}`);
    }
    
  } catch (error) {
    console.log('');
    console.log(`${colors.bright}${colors.red}✗ Build failed${colors.reset}`);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n');
  log.warning('Build process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n');
  log.warning('Build process terminated');
  process.exit(1);
});

// Run main process
main().catch(error => {
  console.error('Build script error:', error);
  process.exit(1);
});
