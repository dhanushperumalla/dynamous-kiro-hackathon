import { logger } from './logger';

/**
 * Service Error Types
 */
export enum ServiceErrorType {
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR'
}

/**
 * Base Service Error
 */
export class ServiceError extends Error {
  constructor(
    public type: ServiceErrorType,
    public serviceName: string,
    message: string,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ServiceError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }
  
  toJSON() {
    return {
      type: this.type,
      serviceName: this.serviceName,
      message: this.message,
      retryable: this.retryable,
      originalError: this.originalError?.message
    };
  }
}

/**
 * Service Timeout Error
 */
export class ServiceTimeoutError extends ServiceError {
  constructor(serviceName: string, timeout: number) {
    super(
      ServiceErrorType.TIMEOUT,
      serviceName,
      `Service ${serviceName} timed out after ${timeout}ms`,
      undefined,
      true // Timeouts are retryable
    );
    this.name = 'ServiceTimeoutError';
  }
}

/**
 * Service Unavailable Error
 */
export class ServiceUnavailableError extends ServiceError {
  constructor(serviceName: string, originalError?: Error) {
    super(
      ServiceErrorType.UNAVAILABLE,
      serviceName,
      `Service ${serviceName} is unavailable`,
      originalError,
      true // Unavailable services are retryable
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Circuit Breaker Open Error
 */
export class CircuitBreakerOpenError extends ServiceError {
  constructor(serviceName: string) {
    super(
      ServiceErrorType.CIRCUIT_BREAKER_OPEN,
      serviceName,
      `Circuit breaker for ${serviceName} is open`,
      undefined,
      false // Don't retry when circuit is open
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Service Validation Error
 */
export class ServiceValidationError extends ServiceError {
  constructor(
    serviceName: string,
    message: string,
    public validationErrors?: any[]
  ) {
    super(
      ServiceErrorType.VALIDATION_ERROR,
      serviceName,
      message,
      undefined,
      false // Validation errors are not retryable
    );
    this.name = 'ServiceValidationError';
  }
  
  override toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Service Not Found Error
 */
export class ServiceNotFoundError extends ServiceError {
  constructor(serviceName: string, resourceType: string, resourceId: string) {
    super(
      ServiceErrorType.NOT_FOUND,
      serviceName,
      `${resourceType} with ID ${resourceId} not found in ${serviceName}`,
      undefined,
      false // Not found errors are not retryable
    );
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Service Dependency Error
 */
export class ServiceDependencyError extends ServiceError {
  constructor(
    serviceName: string,
    dependencyName: string,
    originalError?: Error
  ) {
    super(
      ServiceErrorType.DEPENDENCY_ERROR,
      serviceName,
      `Service ${serviceName} failed due to dependency ${dependencyName}`,
      originalError,
      true // Dependency errors might be retryable
    );
    this.name = 'ServiceDependencyError';
  }
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: ServiceErrorType[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    ServiceErrorType.TIMEOUT,
    ServiceErrorType.UNAVAILABLE,
    ServiceErrorType.DEPENDENCY_ERROR
  ]
};

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: { serviceName?: string; operation?: string }
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = retryConfig.initialDelay;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Log retry attempt
      if (attempt > 0) {
        logger.info('Retrying service call', {
          serviceName: context?.serviceName,
          operation: context?.operation,
          attempt,
          maxRetries: retryConfig.maxRetries,
          delay
        });
      }
      
      return await fn();
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const isRetryable = error instanceof ServiceError && error.retryable;
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt >= retryConfig.maxRetries || !isRetryable) {
        logger.error('Service call failed after retries', {
          serviceName: context?.serviceName,
          operation: context?.operation,
          attempt,
          maxRetries: retryConfig.maxRetries,
          error: lastError.message,
          retryable: isRetryable
        });
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay with exponential backoff
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Handle service error and convert to appropriate error type
 */
export function handleServiceError(
  error: any,
  serviceName: string,
  context?: string
): ServiceError {
  // If already a ServiceError, return it
  if (error instanceof ServiceError) {
    return error;
  }
  
  // Check for circuit breaker error
  if (error.circuitBreakerOpen) {
    return new CircuitBreakerOpenError(serviceName);
  }
  
  // Check for timeout error
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return new ServiceTimeoutError(serviceName, 5000);
  }
  
  // Check for connection error
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new ServiceUnavailableError(serviceName, error);
  }
  
  // Default to internal error
  const message = context 
    ? `${serviceName} error in ${context}: ${error.message}`
    : `${serviceName} error: ${error.message}`;
  
  return new ServiceError(
    ServiceErrorType.INTERNAL_ERROR,
    serviceName,
    message,
    error,
    false
  );
}

/**
 * Wrap service call with error handling
 */
export async function wrapServiceCall<T>(
  serviceName: string,
  operation: string,
  fn: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  try {
    return await retryWithBackoff(
      fn,
      retryConfig,
      { serviceName, operation }
    );
  } catch (error) {
    throw handleServiceError(error, serviceName, operation);
  }
}
