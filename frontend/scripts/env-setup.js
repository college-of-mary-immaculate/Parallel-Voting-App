#!/usr/bin/env node

// Environment setup script
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

// Environment templates
const envTemplates = {
  development: {
    NODE_ENV: 'development',
    VITE_APP_NAME: 'Parallel Voting App (Dev)',
    VITE_APP_VERSION: '1.0.0-dev',
    VITE_API_BASE_URL: 'http://localhost:3001',
    VITE_ENABLE_ANALYTICS: 'false',
    VITE_ENABLE_PERFORMANCE_MONITORING: 'true',
    VITE_ENABLE_ERROR_REPORTING: 'false',
    VITE_SOURCE_MAP: 'true',
    VITE_MINIFY: 'false'
  },
  staging: {
    NODE_ENV: 'production',
    VITE_APP_NAME: 'Parallel Voting App (Staging)',
    VITE_APP_VERSION: '1.0.0-staging',
    VITE_API_BASE_URL: 'https://staging-api.voteapp.com',
    VITE_ENABLE_ANALYTICS: 'true',
    VITE_ENABLE_PERFORMANCE_MONITORING: 'true',
    VITE_ENABLE_ERROR_REPORTING: 'true',
    VITE_SOURCE_MAP: 'true',
    VITE_MINIFY: 'true'
  },
  production: {
    NODE_ENV: 'production',
    VITE_APP_NAME: 'Parallel Voting App',
    VITE_APP_VERSION: '1.0.0',
    VITE_API_BASE_URL: 'https://api.voteapp.com',
    VITE_ENABLE_ANALYTICS: 'true',
    VITE_ENABLE_PERFORMANCE_MONITORING: 'true',
    VITE_ENABLE_ERROR_REPORTING: 'true',
    VITE_SOURCE_MAP: 'false',
    VITE_MINIFY: 'true'
  }
};

// Create environment file
const createEnvFile = (environment, customVars = {}) => {
  const template = envTemplates[environment];
  
  if (!template) {
    log.error(`Unknown environment: ${environment}`);
    return false;
  }
  
  const envVars = { ...template, ...customVars };
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const filename = `.env.${environment}`;
  
  try {
    writeFileSync(filename, envContent);
    log.success(`Created ${filename}`);
    return true;
  } catch (error) {
    log.error(`Failed to create ${filename}: ${error.message}`);
    return false;
  }
};

// Validate environment file
const validateEnvFile = (environment) => {
  const filename = `.env.${environment}`;
  
  if (!existsSync(filename)) {
    log.error(`Environment file ${filename} not found`);
    return false;
  }
  
  try {
    const content = readFileSync(filename, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const requiredVars = [
      'VITE_API_BASE_URL',
      'VITE_APP_NAME',
      'VITE_APP_VERSION'
    ];
    
    const envVars = {};
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key] = value;
      }
    });
    
    const missingVars = requiredVars.filter(varName => !envVars[varName]);
    
    if (missingVars.length > 0) {
      log.error(`Missing required variables in ${filename}: ${missingVars.join(', ')}`);
      return false;
    }
    
    // Validate API URL format
    try {
      new URL(envVars['VITE_API_BASE_URL']);
    } catch (error) {
      log.error(`Invalid API URL in ${filename}: ${envVars['VITE_API_BASE_URL']}`);
      return false;
    }
    
    log.success(`Environment file ${filename} is valid`);
    return true;
  } catch (error) {
    log.error(`Failed to validate ${filename}: ${error.message}`);
    return false;
  }
};

// List available environments
const listEnvironments = () => {
  console.log(`${colors.bright}${colors.cyan}Available Environments:${colors.reset}`);
  console.log('');
  
  Object.keys(envTemplates).forEach(env => {
    console.log(`${colors.blue}• ${env}${colors.reset}`);
  });
};

// Show environment configuration
const showEnvConfig = (environment) => {
  const template = envTemplates[environment];
  
  if (!template) {
    log.error(`Unknown environment: ${environment}`);
    return;
  }
  
  console.log(`${colors.bright}${colors.cyan}Environment: ${environment}${colors.reset}`);
  console.log('');
  
  Object.entries(template).forEach(([key, value]) => {
    console.log(`${colors.yellow}${key}${colors.reset}=${value}`);
  });
};

// Setup environment
const setupEnvironment = (environment, options = {}) => {
  console.log(`${colors.bright}${colors.cyan}🔧 Setting up ${environment} environment${colors.reset}`);
  console.log('');
  
  // Check if environment file already exists
  const filename = `.env.${environment}`;
  if (existsSync(filename) && !options.force) {
    log.warning(`Environment file ${filename} already exists`);
    log.info('Use --force to overwrite');
    return;
  }
  
  // Create environment file
  const customVars = {};
  
  // Add custom variables from options
  if (options.api) {
    customVars.VITE_API_BASE_URL = options.api;
  }
  
  if (options.analytics) {
    customVars.VITE_ENABLE_ANALYTICS = options.analytics;
  }
  
  if (options.errorReporting) {
    customVars.VITE_ENABLE_ERROR_REPORTING = options.errorReporting;
  }
  
  if (options.version) {
    customVars.VITE_APP_VERSION = options.version;
  }
  
  if (createEnvFile(environment, customVars)) {
    // Validate the created file
    if (validateEnvFile(environment)) {
      log.success(`${environment} environment setup completed`);
    }
  }
};

// Main function
const main = () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {
    force: args.includes('--force'),
    verbose: args.includes('--verbose')
  };
  
  console.log(`${colors.bright}${colors.cyan}🔧 Environment Setup Utility${colors.reset}`);
  console.log('');
  
  switch (command) {
    case 'list':
      listEnvironments();
      break;
      
    case 'show':
      const env = args[1];
      if (!env) {
        log.error('Please specify an environment to show');
        process.exit(1);
      }
      showEnvConfig(env);
      break;
      
    case 'setup':
      const targetEnv = args[1];
      if (!targetEnv) {
        log.error('Please specify an environment to setup');
        process.exit(1);
      }
      
      // Parse custom options
      const customOptions = {};
      args.forEach(arg => {
        if (arg.startsWith('--api=')) {
          customOptions.api = arg.split('=')[1];
        }
        if (arg.startsWith('--analytics=')) {
          customOptions.analytics = arg.split('=')[1];
        }
        if (arg.startsWith('--error-reporting=')) {
          customOptions.errorReporting = arg.split('=')[1];
        }
        if (arg.startsWith('--version=')) {
          customOptions.version = arg.split('=')[1];
        }
      });
      
      setupEnvironment(targetEnv, { ...options, ...customOptions });
      break;
      
    case 'validate':
      const validateEnv = args[1];
      if (!validateEnv) {
        log.error('Please specify an environment to validate');
        process.exit(1);
      }
      validateEnvFile(validateEnv);
      break;
      
    default:
      console.log(`${colors.bright}Usage:${colors.reset}`);
      console.log('  node scripts/env-setup.js <command> [options]');
      console.log('');
      console.log(`${colors.bright}Commands:${colors.reset}`);
      console.log('  list                    List available environments');
      console.log('  show <env>              Show environment configuration');
      console.log('  setup <env> [options]   Setup environment file');
      console.log('  validate <env>          Validate environment file');
      console.log('');
      console.log(`${colors.bright}Options:${colors.reset}`);
      console.log('  --force                 Overwrite existing file');
      console.log('  --verbose               Show detailed output');
      console.log('  --api=<url>             Set API base URL');
      console.log('  --analytics=<true|false> Enable/disable analytics');
      console.log('  --error-reporting=<true|false> Enable/disable error reporting');
      console.log('  --version=<version>     Set app version');
      break;
  }
};

// Run main function
main();
