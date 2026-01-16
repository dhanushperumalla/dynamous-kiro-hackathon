import { CircuitBreaker, CircuitState, circuitBreakerManager } from '../../src/utils/circuitBreaker';
import { 
  ServiceError,
  ServiceErrorType,
  ServiceTimeoutError, 
  ServiceUnavailableError,
  CircuitBreakerOpenError,
  retryWithBackoff 
} from '../../src/utils/serviceErrors';

/**
 * Integration Test: Circuit Breaker and Error Recovery
 * Tests circuit breaker patterns and error handling scenarios
 * 
 * Requirements: 7.1, 7.3
 */

describe('Circuit Breaker Integration Tests', () => {
  describe('Circuit Breaker Basic Functionality', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 5000,
        name: 'test-breaker-1'
      });
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
    
    it('should open circuit after failure threshold is reached', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 5000,
        name: 'test-breaker-2'
      });
      
      const failingFunction = async () => {
        throw new Error('Service failure');
      };
      
      // Execute failing function multiple times
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
    
    it('should reject requests when circuit is OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 5000,
        name: 'test-breaker-3'
      });
      
      const failingFunction = async () => {
        throw new Error('Service failure');
      };
      
      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      // Try to execute when circuit is open
      try {
        await breaker.execute(async () => 'success');
        fail('Should have thrown circuit breaker open error');
      } catch (error: any) {
        expect(error.message).toContain('Circuit breaker');
        expect(error.message).toContain('is OPEN');
      }
    });
    
    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100, // Short timeout for testing
        name: 'test-breaker-4'
      });
      
      const failingFunction = async () => {
        throw new Error('Service failure');
      };
      
      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Try to execute - should transition to HALF_OPEN
      try {
        await breaker.execute(failingFunction);
      } catch (error) {
        // Expected to fail
      }
      
      expect(breaker.getState()).toBe(CircuitState.OPEN); // Back to OPEN after failure in HALF_OPEN
    });
    
    it('should close circuit after success threshold in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
        name: 'test-breaker-5'
      });
      
      let shouldFail = true;
      const conditionalFunction = async () => {
        if (shouldFail) {
          throw new Error('Service failure');
        }
        return 'success';
      };
      
      // Trigger circuit to open
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(conditionalFunction);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Now make it succeed
      shouldFail = false;
      
      // Execute successful requests
      for (let i = 0; i < 2; i++) {
        await breaker.execute(conditionalFunction);
      }
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Circuit Breaker Statistics', () => {
    it('should track failure and success counts', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 5000,
        name: 'test-breaker-stats'
      });
      
      // Execute some successful requests
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => 'success');
      }
      
      // Execute some failing requests
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }
      
      const stats = breaker.getStats();
      
      expect(stats.totalRequests).toBe(5);
      expect(stats.failures).toBe(2);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Circuit Breaker Manager', () => {
    it('should create and manage multiple circuit breakers', () => {
      const breaker1 = circuitBreakerManager.getBreaker('service-1');
      const breaker2 = circuitBreakerManager.getBreaker('service-2');
      
      expect(breaker1).toBeDefined();
      expect(breaker2).toBeDefined();
      expect(breaker1).not.toBe(breaker2);
    });
    
    it('should return same breaker instance for same name', () => {
      const breaker1 = circuitBreakerManager.getBreaker('service-3');
      const breaker2 = circuitBreakerManager.getBreaker('service-3');
      
      expect(breaker1).toBe(breaker2);
    });
    
    it('should get statistics for all breakers', async () => {
      const breaker1 = circuitBreakerManager.getBreaker('stats-service-1');
      const breaker2 = circuitBreakerManager.getBreaker('stats-service-2');
      
      // Execute some requests
      await breaker1.execute(async () => 'success');
      await breaker2.execute(async () => 'success');
      
      const allStats = circuitBreakerManager.getAllStats();
      
      expect(allStats).toBeDefined();
      expect(allStats['stats-service-1']).toBeDefined();
      expect(allStats['stats-service-2']).toBeDefined();
    });
    
    it('should reset specific circuit breaker', async () => {
      const breaker = circuitBreakerManager.getBreaker('reset-test');
      
      // Trigger some failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch (error) {
          // Expected
        }
      }
      
      const statsBefore = breaker.getStats();
      expect(statsBefore.failures).toBeGreaterThan(0);
      
      // Reset
      circuitBreakerManager.reset('reset-test');
      
      const statsAfter = breaker.getStats();
      expect(statsAfter.failures).toBe(0);
      expect(statsAfter.state).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Service Error Handling', () => {
    it('should create appropriate error types', () => {
      const timeoutError = new ServiceTimeoutError('test-service', 5000);
      expect(timeoutError).toBeInstanceOf(ServiceError);
      expect(timeoutError.type).toBe('TIMEOUT');
      expect(timeoutError.retryable).toBe(true);
      
      const unavailableError = new ServiceUnavailableError('test-service');
      expect(unavailableError).toBeInstanceOf(ServiceError);
      expect(unavailableError.type).toBe('UNAVAILABLE');
      expect(unavailableError.retryable).toBe(true);
      
      const circuitError = new CircuitBreakerOpenError('test-service');
      expect(circuitError).toBeInstanceOf(ServiceError);
      expect(circuitError.type).toBe('CIRCUIT_BREAKER_OPEN');
      expect(circuitError.retryable).toBe(false);
    });
    
    it('should serialize errors to JSON', () => {
      const error = new ServiceTimeoutError('test-service', 5000);
      const json = error.toJSON();
      
      expect(json.type).toBe('TIMEOUT');
      expect(json.serviceName).toBe('test-service');
      expect(json.retryable).toBe(true);
      expect(json.message).toBeDefined();
    });
  });
  
  describe('Retry with Backoff', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attempts = 0;
      const maxAttempts = 3;
      
      const unreliableFunction = async () => {
        attempts++;
        if (attempts < maxAttempts) {
          throw new ServiceUnavailableError('test-service');
        }
        return 'success';
      };
      
      const result = await retryWithBackoff(
        unreliableFunction,
        {
          maxRetries: 3,
          initialDelay: 10,
          maxDelay: 100,
          backoffMultiplier: 2
        }
      );
      
      expect(result).toBe('success');
      expect(attempts).toBe(maxAttempts);
    });
    
    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      
      const nonRetryableFunction = async () => {
        attempts++;
        throw new ServiceError(
          ServiceErrorType.VALIDATION_ERROR,
          'test-service',
          'Validation failed',
          undefined,
          false // Not retryable
        );
      };
      
      try {
        await retryWithBackoff(
          nonRetryableFunction,
          {
            maxRetries: 3,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2
          }
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect(attempts).toBe(1); // Should not retry
      }
    });
    
    it('should give up after max retries', async () => {
      let attempts = 0;
      
      const alwaysFailingFunction = async () => {
        attempts++;
        throw new ServiceUnavailableError('test-service');
      };
      
      try {
        await retryWithBackoff(
          alwaysFailingFunction,
          {
            maxRetries: 3,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2
          }
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect(attempts).toBe(4); // Initial attempt + 3 retries
      }
    });
  });
  
  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary service failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        name: 'recovery-test'
      });
      
      let failureCount = 0;
      const recoveringFunction = async () => {
        failureCount++;
        if (failureCount <= 2) {
          throw new Error('Temporary failure');
        }
        return 'recovered';
      };
      
      // First attempts fail
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(recoveringFunction);
        } catch (error) {
          // Expected
        }
      }
      
      // Next attempt succeeds
      const result = await breaker.execute(recoveringFunction);
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
    
    it('should handle cascading failures gracefully', async () => {
      const breaker1 = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
        name: 'cascade-1'
      });
      
      const breaker2 = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
        name: 'cascade-2'
      });
      
      // Simulate cascading failure
      const service1 = async () => {
        throw new Error('Service 1 failed');
      };
      
      const service2 = async () => {
        try {
          await breaker1.execute(service1);
        } catch (error) {
          throw new Error('Service 2 failed due to Service 1');
        }
      };
      
      // Trigger failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker2.execute(service2);
        } catch (error) {
          // Expected
        }
      }
      
      // Both circuits should be open
      expect(breaker1.getState()).toBe(CircuitState.OPEN);
      expect(breaker2.getState()).toBe(CircuitState.OPEN);
    });
  });
});
