import { Request, Response, NextFunction } from 'express';
import { serviceOrchestrator } from '@/services/serviceOrchestrator';
import { ServiceError } from '@/utils/serviceErrors';
import { logger } from '@/utils/logger';

/**
 * Service integration middleware
 * Handles service orchestration errors and provides consistent error responses
 */
export const handleServiceErrors = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // If not a service error, pass to next error handler
  if (!(error instanceof ServiceError)) {
    return next(error);
  }
  
  // Log service error
  logger.error('Service integration error', {
    requestId,
    serviceName: error.serviceName,
    errorType: error.type,
    message: error.message,
    retryable: error.retryable,
    path: req.path,
    method: req.method
  });
  
  // Determine HTTP status code based on error type
  let statusCode = 500;
  let errorCode = 'SERVICE_ERROR';
  
  switch (error.type) {
    case 'TIMEOUT':
      statusCode = 504;
      errorCode = 'SERVICE_TIMEOUT';
      break;
    case 'UNAVAILABLE':
      statusCode = 503;
      errorCode = 'SERVICE_UNAVAILABLE';
      break;
    case 'CIRCUIT_BREAKER_OPEN':
      statusCode = 503;
      errorCode = 'SERVICE_CIRCUIT_BREAKER_OPEN';
      break;
    case 'VALIDATION_ERROR':
      statusCode = 400;
      errorCode = 'SERVICE_VALIDATION_ERROR';
      break;
    case 'NOT_FOUND':
      statusCode = 404;
      errorCode = 'SERVICE_RESOURCE_NOT_FOUND';
      break;
    case 'DEPENDENCY_ERROR':
      statusCode = 503;
      errorCode = 'SERVICE_DEPENDENCY_ERROR';
      break;
    default:
      statusCode = 500;
      errorCode = 'SERVICE_INTERNAL_ERROR';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: error.message,
      serviceName: error.serviceName,
      retryable: error.retryable,
      timestamp: new Date().toISOString(),
      requestId
    }
  });
};

/**
 * Attach service orchestrator to request
 * Makes orchestrator available in route handlers
 */
export const attachServiceOrchestrator = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  (req as any).serviceOrchestrator = serviceOrchestrator;
  next();
};

/**
 * Service health check middleware
 * Checks if required services are healthy before processing request
 */
export const requireHealthyServices = (serviceNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    try {
      const healthCheck = await serviceOrchestrator.checkAllServicesHealth();
      
      // Check if all required services are healthy
      const unhealthyRequired = serviceNames.filter(
        name => healthCheck.unhealthy.includes(name)
      );
      
      if (unhealthyRequired.length > 0) {
        logger.warn('Required services are unhealthy', {
          requestId,
          unhealthyServices: unhealthyRequired,
          path: req.path,
          method: req.method
        });
        
        res.status(503).json({
          success: false,
          error: {
            code: 'REQUIRED_SERVICES_UNHEALTHY',
            message: 'One or more required services are currently unavailable',
            unhealthyServices: unhealthyRequired,
            timestamp: new Date().toISOString(),
            requestId
          }
        });
        return;
      }
      
      next();
      
    } catch (error) {
      logger.error('Service health check failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Continue anyway - don't block requests due to health check failures
      next();
    }
  };
};

/**
 * Service timeout middleware
 * Sets a timeout for service orchestration operations
 */
export const serviceTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Set timeout
    const timeout = setTimeout(() => {
      logger.error('Service orchestration timeout', {
        requestId,
        timeoutMs,
        path: req.path,
        method: req.method
      });
      
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            code: 'ORCHESTRATION_TIMEOUT',
            message: `Request timed out after ${timeoutMs}ms`,
            timestamp: new Date().toISOString(),
            requestId
          }
        });
      }
    }, timeoutMs);
    
    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};

/**
 * Service metrics middleware
 * Tracks service call metrics for monitoring
 */
export const trackServiceMetrics = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.debug('Service orchestration metrics', {
      requestId,
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      success: res.statusCode < 400
    });
  });
  
  next();
};

/**
 * Graceful degradation middleware
 * Provides fallback responses when services are unavailable
 */
export const gracefulDegradation = (fallbackData?: any) => {
  return (error: any, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Only handle service errors
    if (!(error instanceof ServiceError)) {
      return next(error);
    }
    
    // Check if error is retryable
    if (!error.retryable) {
      return next(error);
    }
    
    // Provide fallback response
    logger.warn('Providing graceful degradation response', {
      requestId,
      serviceName: error.serviceName,
      errorType: error.type,
      hasFallbackData: !!fallbackData
    });
    
    res.status(200).json({
      success: true,
      data: fallbackData || {},
      degraded: true,
      message: 'Service temporarily unavailable, showing cached or default data',
      timestamp: new Date().toISOString(),
      requestId
    });
  };
};
