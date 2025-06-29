// Carregar variáveis de ambiente no início da aplicação
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { validateProductionEnvironment, setupSecurityHeaders, setupHealthCheck, getProductionConfig } from "./production-config";
import type { Server } from "http";

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

if (isProduction) {
  log('Starting application in production mode', 'startup');
  validateProductionEnvironment();
} else {
  log('Starting application in development mode', 'startup');
  // Basic environment validation for development
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
}

const app = express();

// Setup production security headers and CORS
if (isProduction) {
  setupSecurityHeaders(app);
}

// Aumentar o limite de tamanho para processamento de dados grandes (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

let server: Server;

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  log(`Received ${signal}, shutting down gracefully...`, 'shutdown');
  
  if (server) {
    server.close(() => {
      log('HTTP server closed', 'shutdown');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      log('Forcing shutdown after timeout', 'shutdown');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

(async () => {
  try {
    server = await registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error details in production
      if (isProduction) {
        console.error('Server Error:', {
          status,
          message,
          stack: err.stack,
          url: _req.url,
          method: _req.method,
          timestamp: new Date().toISOString()
        });
      }

      res.status(status).json({ 
        message: isProduction ? "Internal Server Error" : message,
        ...(isDevelopment && { stack: err.stack })
      });
    });

    // Setup Vite in development or serve static files in production
    if (isDevelopment || app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Setup health check endpoints before starting server
    setupHealthCheck(app);

    // Port configuration with Cloud Run compatibility
    const config = isProduction ? getProductionConfig() : { port: 5000, host: "127.0.0.1" };
    const port = config.port;
    const host = config.host;

    // Only use reusePort if not on Windows
    const isWindows = process.platform === 'win32';
    const listenOptions: any = { port: Number(port), host };
    if (!isProduction && !isWindows) {
      listenOptions.reusePort = true;
    }

    server.listen(listenOptions, () => {
      log(`Server running on ${host}:${port} in ${process.env.NODE_ENV || 'development'} mode`, 'startup');
      
      if (isProduction) {
        log('Production mode active - Security headers enabled', 'startup');
        log('Health check endpoints: /health, /ready, /live', 'startup');
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();