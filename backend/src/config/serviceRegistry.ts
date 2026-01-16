import { circuitBreakerManager } from '@/utils/circuitBreaker';
import { logger } from '@/utils/logger';

/**
 * Service Configuration
 */
export interface ServiceConfig {
  name: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
  };
}

/**
 * Service Health Status
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

/**
 * Service Registry
 * Manages microservice configurations and health checks
 */
export class ServiceRegistry {
  private services: Map<string, ServiceConfig> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();
  
  /**
   * Register a service
   */
  register(config: ServiceConfig): void {
    this.services.set(config.name, config);
    
    // Initialize health status
    this.healthStatus.set(config.name, {
      name: config.name,
      status: 'healthy',
      lastCheck: new Date()
    });
    
    logger.info(`Service registered: ${config.name}`, {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      circuitBreakerEnabled: config.circuitBreaker?.enabled
    });
  }
  
  /**
   * Get service configuration
   */
  getService(name: string): ServiceConfig | undefined {
    return this.services.get(name);
  }
  
  /**
   * Get all registered services
   */
  getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }
  
  /**
   * Update service health status
   */
  updateHealth(name: string, status: Partial<ServiceHealth>): void {
    const current = this.healthStatus.get(name);
    if (current) {
      this.healthStatus.set(name, {
        ...current,
        ...status,
        lastCheck: new Date()
      });
    }
  }
  
  /**
   * Get service health status
   */
  getHealth(name: string): ServiceHealth | undefined {
    return this.healthStatus.get(name);
  }
  
  /**
   * Get all service health statuses
   */
  getAllHealth(): ServiceHealth[] {
    return Array.from(this.healthStatus.values());
  }
  
  /**
   * Check if service is healthy
   */
  isHealthy(name: string): boolean {
    const health = this.healthStatus.get(name);
    return health?.status === 'healthy';
  }
  
  /**
   * Execute a service call with circuit breaker protection
   */
  async executeWithProtection<T>(
    serviceName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    
    // Check if circuit breaker is enabled
    if (service.circuitBreaker?.enabled) {
      const breaker = circuitBreakerManager.getBreaker(serviceName, {
        failureThreshold: service.circuitBreaker.failureThreshold || 5,
        successThreshold: service.circuitBreaker.successThreshold || 2,
        timeout: service.circuitBreaker.timeout || 60000,
        name: serviceName
      });
      
      try {
        const startTime = Date.now();
        const result = await breaker.execute(fn);
        const responseTime = Date.now() - startTime;
        
        // Update health status
        this.updateHealth(serviceName, {
          status: 'healthy',
          responseTime
        });
        
        return result;
      } catch (error) {
        // Update health status
        this.updateHealth(serviceName, {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    } else {
      // Execute without circuit breaker
      try {
        const startTime = Date.now();
        const result = await fn();
        const responseTime = Date.now() - startTime;
        
        this.updateHealth(serviceName, {
          status: 'healthy',
          responseTime
        });
        
        return result;
      } catch (error) {
        this.updateHealth(serviceName, {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    }
  }
}

// Create singleton instance
export const serviceRegistry = new ServiceRegistry();

/**
 * Initialize all services
 * This is called during application startup
 */
export function initializeServices(): void {
  logger.info('Initializing service registry');
  
  // Register User Service
  serviceRegistry.register({
    name: 'user-service',
    timeout: 5000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  });
  
  // Register Assessment Service
  serviceRegistry.register({
    name: 'assessment-service',
    timeout: 10000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  });
  
  // Register Recommendation Service
  serviceRegistry.register({
    name: 'recommendation-service',
    timeout: 10000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  });
  
  // Register Learning Service
  serviceRegistry.register({
    name: 'learning-service',
    timeout: 10000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  });
  
  // Register Progress Service
  serviceRegistry.register({
    name: 'progress-service',
    timeout: 5000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  });
  
  // Register Notification Service
  serviceRegistry.register({
    name: 'notification-service',
    timeout: 5000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000
    }
  });
  
  // Register Job Service
  serviceRegistry.register({
    name: 'job-service',
    timeout: 15000,
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  });
  
  logger.info('Service registry initialized', {
    serviceCount: serviceRegistry.getAllServices().length
  });
}
