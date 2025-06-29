/**
 * Production-specific configuration and utilities
 */

import { log } from "./vite";

export interface ProductionConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  healthCheckPath: string;
  shutdownTimeout: number;
}

/**
 * Get production configuration with environment variable validation
 */
export function getProductionConfig(): ProductionConfig {
  const config: ProductionConfig = {
    port: parseInt(process.env.PORT || '5000'),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
    logLevel: (process.env.LOG_LEVEL as ProductionConfig['logLevel']) || 'info',
    healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '30000'),
  };

  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port number: ${config.port}. Must be between 1 and 65535.`);
  }

  log(`Production config loaded - Port: ${config.port}, Host: ${config.host}`, 'production');
  
  return config;
}

/**
 * Validate required environment variables for production
 */
export function validateProductionEnvironment(): void {
  const requiredVars = [
    'DATABASE_URL',
    // Add other required production environment variables here
  ];

  const optionalVars = [
    'EVOLUTION_API_URL',
    'EVOLUTION_API_TOKEN',
    'OPENWEATHER_API_KEY',
    'SENDGRID_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  Missing optional environment variables (some features may be disabled):', missingOptional.join(', '));
  }

  console.log('✅ Environment validation passed');
}

/**
 * Setup production security headers
 */
export function setupSecurityHeaders(app: any): void {
  // Security middleware
  app.use((req: any, res: any, next: any) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CORS handling
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
    const origin = req.headers.origin;
    
    if (corsOrigins.includes('*') || (origin && corsOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });

  log('Security headers configured', 'production');
}

/**
 * Setup health check endpoint for Cloud Run and other platforms
 */
export function setupHealthCheck(app: any): void {
  const healthPath = process.env.HEALTH_CHECK_PATH || '/health';
  
  app.get(healthPath, (req: any, res: any) => {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    res.status(200).json(healthData);
  });

  // Readiness probe (for Kubernetes/Cloud Run)
  app.get('/ready', (req: any, res: any) => {
    res.status(200).json({ status: 'ready' });
  });

  // Liveness probe (for Kubernetes/Cloud Run)
  app.get('/live', (req: any, res: any) => {
    res.status(200).json({ status: 'alive' });
  });

  log(`Health check endpoints configured: ${healthPath}, /ready, /live`, 'production');
}