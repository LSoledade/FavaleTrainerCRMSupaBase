/**
 * Deployment configuration for production environments
 * This file ensures proper build and deployment settings
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const config = {
  // Build configuration
  buildDir: 'dist',
  publicDir: 'dist/public',
  serverFile: 'dist/index.js',
  
  // Environment requirements
  requiredEnvVars: [
    'DATABASE_URL',
    'NODE_ENV'
  ],
  
  // Optional environment variables
  optionalEnvVars: [
    'PORT',
    'HOST',
    'EVOLUTION_API_URL',
    'EVOLUTION_API_TOKEN',
    'OPENWEATHER_API_KEY',
    'SENDGRID_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'CORS_ORIGINS',
    'LOG_LEVEL',
    'HEALTH_CHECK_PATH',
    'SHUTDOWN_TIMEOUT'
  ]
};

/**
 * Validates environment variables before deployment
 */
function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const missing = config.requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  const missingOptional = config.optionalEnvVars.filter(envVar => !process.env[envVar]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  Optional environment variables not set:', missingOptional.join(', '));
  }
  
  console.log('✅ Environment validation passed');
}

/**
 * Ensures build directories exist
 */
function prepareBuildDirectories() {
  console.log('📁 Preparing build directories...');
  
  if (!existsSync(config.buildDir)) {
    mkdirSync(config.buildDir, { recursive: true });
  }
  
  if (!existsSync(config.publicDir)) {
    mkdirSync(config.publicDir, { recursive: true });
  }
  
  console.log('✅ Build directories ready');
}

/**
 * Runs the build process
 */
function runBuild() {
  console.log('🔨 Building application...');
  
  try {
    // Build frontend
    console.log('Building frontend...');
    execSync('vite build', { stdio: 'inherit' });
    
    // Build backend with production config included
    console.log('Building backend...');
    execSync(`esbuild server/index.ts server/production-config.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --keep-names --sourcemap`, { stdio: 'inherit' });
    
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Validates the build output
 */
function validateBuild() {
  console.log('🔍 Validating build output...');
  
  const requiredFiles = [
    config.serverFile,
    path.join(config.publicDir, 'index.html')
  ];
  
  const missing = requiredFiles.filter(file => !existsSync(file));
  
  if (missing.length > 0) {
    console.error('❌ Missing build files:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Build validation passed');
}

/**
 * Main deployment preparation function
 */
function prepareDeploy() {
  console.log('🚀 Preparing for deployment...');
  
  validateEnvironment();
  prepareBuildDirectories();
  runBuild();
  validateBuild();
  
  console.log('✅ Deployment preparation completed successfully');
  console.log('📋 Next steps:');
  console.log('   1. Ensure all required environment variables are set in your deployment platform');
  console.log('   2. Use "npm start" to run the production server');
  console.log('   3. The application will be available on the configured port (default: 5000)');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prepareDeploy();
}

export { config, validateEnvironment, prepareBuildDirectories, runBuild, validateBuild, prepareDeploy };