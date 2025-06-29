#!/usr/bin/env node

/**
 * Production startup script with comprehensive error handling
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

// Validate environment
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your environment configuration');
  process.exit(1);
}

// Check if build exists
const serverFile = './dist/index.js';
if (!existsSync(serverFile)) {
  console.error('❌ Production build not found. Please run "npm run build" first.');
  process.exit(1);
}

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting production server...');
console.log(`📍 Server file: ${serverFile}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 Port: ${process.env.PORT || 5000}`);

// Start the server
const server = spawn('node', [serverFile], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle server events
server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
  console.log('✅ Server stopped gracefully');
});

// Handle process signals
process.on('SIGTERM', () => {
  console.log('📟 Received SIGTERM, shutting down server...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📟 Received SIGINT, shutting down server...');
  server.kill('SIGINT');
});

console.log('✅ Production server started successfully');
console.log('📋 Health check endpoints available:');
console.log('   - /health (general health check)');
console.log('   - /ready (readiness probe)');
console.log('   - /live (liveness probe)');