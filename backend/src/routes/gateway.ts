import { Router, Request, Response } from 'express';
import { serviceRegistry } from '@/config/serviceRegistry';
import { circuitBreakerManager } from '@/utils/circuitBreaker';
import { logger } from '@/utils/logger';
import { requireAdmin } from '@/middleware/auth';

const router = Router();

/**
 * Gateway health check endpoint
 * Returns overall gateway health and service statuses
 */
router.get('/health', (_req: Request, res: Response) => {
  const services = serviceRegistry.getAllHealth();
  const unhealthyServices = services.filter(s => s.status === 'unhealthy');
  
  const overallStatus = unhealthyServices.length === 0 ? 'healthy' : 
                       unhealthyServices.length < services.length ? 'degraded' : 
                       'unhealthy';
  
  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    success: overallStatus !== 'unhealthy',
    data: {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: services.map(s => ({
        name: s.name,
        status: s.status,
        lastCheck: s.lastCheck,
        responseTime: s.responseTime,
        error: s.error
      }))
    }
  });
});

/**
 * Gateway status endpoint
 * Returns detailed gateway information
 */
router.get('/status', (_req: Request, res: Response) => {
  const services = serviceRegistry.getAllServices();
  const health = serviceRegistry.getAllHealth();
  const circuitBreakers = circuitBreakerManager.getAllStats();
  
  res.status(200).json({
    success: true,
    data: {
      gateway: {
        version: process.env['npm_package_version'] || '1.0.0',
        environment: process.env['NODE_ENV'] || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      services: services.map(s => {
        const serviceHealth = health.find(h => h.name === s.name);
        const circuitBreaker = circuitBreakers[s.name];
        
        return {
          name: s.name,
          baseUrl: s.baseUrl,
          timeout: s.timeout,
          health: serviceHealth,
          circuitBreaker: circuitBreaker ? {
            state: circuitBreaker.state,
            failures: circuitBreaker.failures,
            successes: circuitBreaker.successes,
            totalRequests: circuitBreaker.totalRequests
          } : null
        };
      })
    }
  });
});

/**
 * Circuit breaker status endpoint (Admin only)
 * Returns detailed circuit breaker statistics
 */
router.get('/circuit-breakers', requireAdmin, (_req: Request, res: Response) => {
  const stats = circuitBreakerManager.getAllStats();
  
  res.status(200).json({
    success: true,
    data: {
      circuitBreakers: Object.entries(stats).map(([name, stat]) => ({
        name,
        state: stat.state,
        failures: stat.failures,
        successes: stat.successes,
        totalRequests: stat.totalRequests,
        lastFailureTime: stat.lastFailureTime,
        lastSuccessTime: stat.lastSuccessTime,
        nextAttemptTime: stat.nextAttemptTime
      }))
    }
  });
});

/**
 * Reset circuit breaker endpoint (Admin only)
 * Manually reset a specific circuit breaker
 */
router.post('/circuit-breakers/:name/reset', requireAdmin, (req: Request, res: Response) => {
  const { name } = req.params;
  
  if (!name) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Circuit breaker name is required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
  
  try {
    circuitBreakerManager.reset(name);
    
    logger.info(`Circuit breaker reset via API: ${name}`, {
      requestId: req.headers['x-request-id']
    });
    
    res.status(200).json({
      success: true,
      message: `Circuit breaker ${name} has been reset`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to reset circuit breaker: ${name}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id']
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_FAILED',
        message: `Failed to reset circuit breaker: ${name}`,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Reset all circuit breakers endpoint (Admin only)
 * Manually reset all circuit breakers
 */
router.post('/circuit-breakers/reset-all', requireAdmin, (req: Request, res: Response) => {
  try {
    circuitBreakerManager.resetAll();
    
    logger.info('All circuit breakers reset via API', {
      requestId: req.headers['x-request-id']
    });
    
    res.status(200).json({
      success: true,
      message: 'All circuit breakers have been reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset all circuit breakers', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.headers['x-request-id']
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_FAILED',
        message: 'Failed to reset all circuit breakers',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Service health check endpoint
 * Returns health status for a specific service
 */
router.get('/services/:name/health', (req: Request, res: Response) => {
  const { name } = req.params;
  
  if (!name) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Service name is required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
  
  const health = serviceRegistry.getHealth(name);
  
  if (!health) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_FOUND',
        message: `Service not found: ${name}`,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: health.status === 'healthy',
    data: health
  });
});

/**
 * Gateway metrics endpoint (Admin only)
 * Returns performance and usage metrics
 */
router.get('/metrics', requireAdmin, (_req: Request, res: Response) => {
  const circuitBreakers = circuitBreakerManager.getAllStats();
  const services = serviceRegistry.getAllHealth();
  
  // Calculate aggregate metrics
  const totalRequests = Object.values(circuitBreakers).reduce(
    (sum, cb) => sum + cb.totalRequests, 
    0
  );
  
  const totalFailures = Object.values(circuitBreakers).reduce(
    (sum, cb) => sum + cb.failures, 
    0
  );
  
  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
  
  const avgResponseTime = services
    .filter(s => s.responseTime !== undefined)
    .reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.length;
  
  res.status(200).json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requests: {
        total: totalRequests,
        failures: totalFailures,
        successRate: totalRequests > 0 ? 
          ((totalRequests - totalFailures) / totalRequests * 100).toFixed(2) + '%' : 
          'N/A'
      },
      services: {
        total: services.length,
        healthy: healthyServices,
        unhealthy: unhealthyServices,
        avgResponseTime: avgResponseTime.toFixed(2) + 'ms'
      }
    }
  });
});

export default router;
