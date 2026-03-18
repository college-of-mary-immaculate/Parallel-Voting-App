#!/usr/bin/env node

// Deployment script for production builds
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Deployment configuration
const deployConfig = {
  environment: process.argv[2] || 'staging',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  skipTests: process.argv.includes('--skip-tests'),
  skipBuild: process.argv.includes('--skip-build')
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
  if (deployConfig.dryRun) {
    log.step(`[DRY RUN] ${description}: ${command}`);
    return;
  }
  
  log.step(description);
  
  try {
    if (deployConfig.verbose) {
      execSync(command, { stdio: 'inherit' });
    } else {
      execSync(command);
    }
    log.success(description);
  } catch (error) {
    log.error(`${description} failed`);
    if (deployConfig.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
};

// Check deployment prerequisites
const checkPrerequisites = () => {
  log.step('Checking deployment prerequisites');
  
  // Check if dist directory exists
  if (!existsSync('dist')) {
    log.error('Build directory (dist) not found. Run build first.');
    process.exit(1);
  }
  
  // Check environment-specific files
  const envFile = `.env.${deployConfig.environment}`;
  if (!existsSync(envFile)) {
    log.warning(`Environment file ${envFile} not found`);
  }
  
  // Check deployment configuration
  const deployConfigFile = 'deploy.config.json';
  if (!existsSync(deployConfigFile)) {
    log.warning('Deployment configuration file not found');
  }
  
  log.success('Prerequisites check completed');
};

// Load deployment configuration
const loadDeployConfig = () => {
  const configFile = 'deploy.config.json';
  
  if (!existsSync(configFile)) {
    return {
      environments: {
        staging: {
          host: 'staging.voteapp.com',
          path: '/var/www/staging',
          user: 'deploy',
          commands: {
            upload: 'rsync -avz --delete dist/ deploy@staging.voteapp.com:/var/www/staging/',
            restart: 'ssh deploy@staging.voteapp.com "sudo systemctl reload nginx"'
          }
        },
        production: {
          host: 'voteapp.com',
          path: '/var/www/production',
          user: 'deploy',
          commands: {
            upload: 'rsync -avz --delete dist/ deploy@voteapp.com:/var/www/production/',
            restart: 'ssh deploy@voteapp.com "sudo systemctl reload nginx"'
          }
        }
      }
    };
  }
  
  try {
    const config = JSON.parse(readFileSync(configFile, 'utf8'));
    log.success('Deployment configuration loaded');
    return config;
  } catch (error) {
    log.error('Failed to load deployment configuration');
    process.exit(1);
  }
};

// Run pre-deployment tests
const runTests = () => {
  if (deployConfig.skipTests) {
    log.info('Skipping tests');
    return;
  }
  
  log.step('Running pre-deployment tests');
  
  try {
    execSync('npm run test:run', { stdio: 'pipe' });
    log.success('Pre-deployment tests passed');
  } catch (error) {
    log.error('Pre-deployment tests failed');
    process.exit(1);
  }
};

// Build application
const build = () => {
  if (deployConfig.skipBuild) {
    log.info('Skipping build');
    return;
  }
  
  const buildCommand = `node scripts/build.js ${deployConfig.environment}`;
  exec(buildCommand, 'Building application');
};

// Upload files to server
const upload = (config) => {
  const env = config.environments[deployConfig.environment];
  
  if (!env || !env.commands || !env.commands.upload) {
    log.error('Upload command not configured');
    process.exit(1);
  }
  
  exec(env.commands.upload, 'Uploading files to server');
};

// Restart services
const restart = (config) => {
  const env = config.environments[deployConfig.environment];
  
  if (!env || !env.commands || !env.commands.restart) {
    log.info('No restart command configured');
    return;
  }
  
  exec(env.commands.restart, 'Restarting services');
};

// Health check
const healthCheck = (config) => {
  const env = config.environments[deployConfig.environment];
  
  if (!env || !env.healthCheck) {
    log.info('No health check configured');
    return;
  }
  
  log.step('Running health check');
  
  try {
    const healthUrl = env.healthCheck.url;
    const command = `curl -f -s ${healthUrl} > /dev/null`;
    
    if (deployConfig.dryRun) {
      log.step(`[DRY RUN] Health check: ${command}`);
      return;
    }
    
    execSync(command, { stdio: 'pipe' });
    log.success('Health check passed');
  } catch (error) {
    log.error('Health check failed');
    process.exit(1);
  }
};

// Generate deployment report
const generateReport = () => {
  log.step('Generating deployment report');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const buildInfo = JSON.parse(readFileSync('dist/build-info.json', 'utf8'));
    
    const report = {
      deployment: {
        timestamp: new Date().toISOString(),
        environment: deployConfig.environment,
        version: packageJson.version,
        buildInfo,
        dryRun: deployConfig.dryRun,
        skipTests: deployConfig.skipTests,
        skipBuild: deployConfig.skipBuild
      },
      status: 'success'
    };
    
    const reportFile = `deploy-report-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    log.success(`Deployment report generated: ${reportFile}`);
  } catch (error) {
    log.warning('Deployment report generation failed');
  }
};

// Notify deployment
const notify = (config) => {
  const env = config.environments[deployConfig.environment];
  
  if (!env || !env.notifications) {
    log.info('No notifications configured');
    return;
  }
  
  log.step('Sending deployment notifications');
  
  // Slack notification
  if (env.notifications.slack) {
    try {
      const webhook = env.notifications.slack.webhook;
      const message = {
        text: `🚀 Deployment completed`,
        attachments: [{
          color: 'good',
          fields: [
            { title: 'Environment', value: deployConfig.environment, short: true },
            { title: 'Version', value: packageJson.version, short: true },
            { title: 'Time', value: new Date().toISOString(), short: true }
          ]
        }]
      };
      
      if (!deployConfig.dryRun) {
        execSync(`curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(message)}' ${webhook}`, { stdio: 'pipe' });
      }
      
      log.success('Slack notification sent');
    } catch (error) {
      log.warning('Slack notification failed');
    }
  }
  
  // Email notification
  if (env.notifications.email) {
    log.info('Email notification not implemented');
  }
};

// Rollback deployment
const rollback = (config) => {
  const env = config.environments[deployConfig.environment];
  
  if (!env || !env.rollback) {
    log.error('Rollback not configured');
    process.exit(1);
  }
  
  log.step('Rolling back deployment');
  
  try {
    if (env.rollback.command) {
      exec(env.rollback.command, 'Rolling back deployment');
    }
    
    log.success('Rollback completed');
  } catch (error) {
    log.error('Rollback failed');
    process.exit(1);
  }
};

// Main deployment process
const main = async () => {
  console.log(`${colors.bright}${colors.cyan}🚀 Deployment Process${colors.reset}`);
  console.log(`${colors.bright}Environment: ${deployConfig.environment}${colors.reset}`);
  console.log(`${colors.bright}Dry Run: ${deployConfig.dryRun}${colors.reset}`);
  console.log('');
  
  try {
    // Load configuration
    const config = loadDeployConfig();
    
    // Deployment steps
    checkPrerequisites();
    runTests();
    build();
    upload(config);
    restart(config);
    healthCheck(config);
    generateReport();
    notify(config);
    
    console.log('');
    console.log(`${colors.bright}${colors.green}✓ Deployment completed successfully!${colors.reset}`);
    
  } catch (error) {
    console.log('');
    console.log(`${colors.bright}${colors.red}✗ Deployment failed${colors.reset}`);
    
    // Attempt rollback if not dry run
    if (!deployConfig.dryRun) {
      console.log(`${colors.yellow}Attempting rollback...${colors.reset}`);
      try {
        const config = loadDeployConfig();
        rollback(config);
      } catch (rollbackError) {
        console.log(`${colors.red}Rollback failed${colors.reset}`);
      }
    }
    
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n');
  log.warning('Deployment process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n');
  log.warning('Deployment process terminated');
  process.exit(1);
});

// Run main process
main().catch(error => {
  console.error('Deployment script error:', error);
  process.exit(1);
});
