import { logger } from './logger';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit from half-open
  timeout: number;               // Time in ms before attempting to close circuit
  resetTimeout?: number;         // Time in ms to reset failure count
  onStateChange?: (state: CircuitState) => void;
  name?: string;                 // Circuit breaker name for logging
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by failing fast when a service is unavailable
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private resetTimer?: NodeJS.Timeout;
  
  constructor(private options: CircuitBreakerOptions) {
    this.options.name = this.options.name || 'CircuitBreaker';
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime.getTime()) {
        logger.info(`Circuit breaker ${this.options.name} transitioning to HALF_OPEN`, {
          previousState: this.state,
          failureCount: this.failureCount
        });
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        const error = new Error(`Circuit breaker ${this.options.name} is OPEN`);
        (error as any).circuitBreakerOpen = true;
        logger.warn(`Circuit breaker ${this.options.name} rejecting request`, {
          state: this.state,
          nextAttemptTime: this.nextAttemptTime
        });
        throw error;
      }
    }
    
    try {
      // Execute the function
      const result = await fn();
      
      // Record success
      this.onSuccess();
      
      return result;
    } catch (error) {
      // Record failure
      this.onFailure();
      
      throw error;
    }
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      logger.debug(`Circuit breaker ${this.options.name} success in HALF_OPEN`, {
        successCount: this.successCount,
        successThreshold: this.options.successThreshold
      });
      
      // Check if we've reached success threshold
      if (this.successCount >= this.options.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
      
      // Clear reset timer if exists
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        delete this.resetTimer;
      }
    }
  }
  
  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.failureCount++;
    
    logger.warn(`Circuit breaker ${this.options.name} failure recorded`, {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.options.failureThreshold
    });
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've reached failure threshold
      if (this.failureCount >= this.options.failureThreshold) {
        this.open();
      } else {
        // Set reset timer if configured
        if (this.options.resetTimeout && !this.resetTimer) {
          this.resetTimer = setTimeout(() => {
            logger.debug(`Circuit breaker ${this.options.name} resetting failure count`, {
              previousFailureCount: this.failureCount
            });
            this.failureCount = 0;
            delete this.resetTimer;
          }, this.options.resetTimeout);
        }
      }
    }
  }
  
  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.options.timeout);
    
    logger.error(`Circuit breaker ${this.options.name} opened`, {
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime
    });
    
    if (this.options.onStateChange) {
      this.options.onStateChange(CircuitState.OPEN);
    }
  }
  
  /**
   * Close the circuit
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    delete this.nextAttemptTime;
    
    logger.info(`Circuit breaker ${this.options.name} closed`, {
      previousFailureCount: this.failureCount
    });
    
    if (this.options.onStateChange) {
      this.options.onStateChange(CircuitState.CLOSED);
    }
  }
  
  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const stats: CircuitBreakerStats = {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalRequests: this.totalRequests
    };
    
    if (this.lastFailureTime) {
      stats.lastFailureTime = this.lastFailureTime;
    }
    if (this.lastSuccessTime) {
      stats.lastSuccessTime = this.lastSuccessTime;
    }
    if (this.nextAttemptTime) {
      stats.nextAttemptTime = this.nextAttemptTime;
    }
    
    return stats;
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    logger.info(`Circuit breaker ${this.options.name} manually reset`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    delete this.nextAttemptTime;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      delete this.resetTimer;
    }
  }
  
  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  /**
   * Create or get a circuit breaker
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
        resetTimeout: 30000, // 30 seconds
        name,
        ...options
      };
      
      this.breakers.set(name, new CircuitBreaker(defaultOptions));
      
      logger.info(`Circuit breaker created: ${name}`, defaultOptions);
    }
    
    return this.breakers.get(name)!;
  }
  
  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    
    return stats;
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    logger.info('Resetting all circuit breakers');
    
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
  
  /**
   * Reset a specific circuit breaker
   */
  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    } else {
      logger.warn(`Circuit breaker not found: ${name}`);
    }
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();
