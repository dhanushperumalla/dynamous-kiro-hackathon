import app from './app';
import { connectDatabase } from '@/config/database';
import { logger } from '@/utils/logger';

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connection
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise
  });
  process.exit(1);
});

// Start server
const PORT = process.env['PORT'] || 3000;
const server = app.listen(PORT, async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    logger.info('AI-Sikshak API Server started', {
      port: PORT,
      environment: process.env['NODE_ENV'] || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
});