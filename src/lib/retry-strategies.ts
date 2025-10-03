// Advanced retry strategies and utilities for different types of operations
import { ErrorCategory, ErrorSeverity } from './error-handler';

export type RetryStrategy = 
  | 'exponential'
  | 'linear'
  | 'fixed'
  | 'fibonacci'
  | 'custom';

export interface RetryOptions {
  strategy: RetryStrategy;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  jitterType: 'full' | 'equal' | 'decorrelated';
  backoffMultiplier: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  timeout?: number;
  abortSignal?: AbortSignal;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  aborted: boolean;
}

export class RetryManager {
  private static defaultOptions: RetryOptions = {
    strategy: 'exponential',
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    jitterType: 'full',
    backoffMultiplier: 2,
  };

  // Execute operation with retry logic
  public static async execute<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: Error;
    let attempt = 0;

    // Setup timeout if specified
    const timeoutPromise = config.timeout 
      ? new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), config.timeout)
        )
      : null;

    while (attempt <= config.maxRetries) {
      attempt++;

      try {
        // Check for abort signal
        if (config.abortSignal?.aborted) {
          return {
            success: false,
            error: new Error('Operation aborted'),
            attempts: attempt,
            totalTime: Date.now() - startTime,
            aborted: true,
          };
        }

        // Execute operation with optional timeout
        const operationPromise = operation();
        const result = timeoutPromise 
          ? await Promise.race([operationPromise, timeoutPromise])
          : await operationPromise;

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          aborted: false,
        };

      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (attempt > config.maxRetries || !this.shouldRetry(lastError, attempt, config)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            aborted: false,
          };
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt, config);
        
        // Call retry callback if provided
        config.onRetry?.(lastError, attempt, delay);

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts: attempt,
      totalTime: Date.now() - startTime,
      aborted: false,
    };
  }

  // Create a retryable function wrapper
  public static wrap<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: Partial<RetryOptions> = {}
  ): (...args: T) => Promise<RetryResult<R>> {
    return async (...args: T): Promise<RetryResult<R>> => {
      return this.execute(() => fn(...args), options);
    };
  }

  // Batch retry operations
  public static async executeBatch<T>(
    operations: Array<{
      operation: () => Promise<T>;
      options?: Partial<RetryOptions>;
    }>,
    batchOptions: {
      concurrency?: number;
      failFast?: boolean;
      collectResults?: boolean;
    } = {}
  ): Promise<Array<RetryResult<T>>> {
    const { concurrency = 5, failFast = false, collectResults = true } = batchOptions;
    const results: Array<RetryResult<T>> = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchPromises = batch.map(({ operation, options }) =>
        this.execute(operation, options)
      );

      const batchResults = await Promise.all(batchPromises);
      
      if (collectResults) {
        results.push(...batchResults);
      }

      // Check for fail-fast condition
      if (failFast && batchResults.some(result => !result.success)) {
        break;
      }
    }

    return results;
  }

  // Retry with circuit breaker pattern
  public static async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    options: Partial<RetryOptions> & {
      circuitBreaker?: {
        failureThreshold: number;
        resetTimeout: number;
        monitorWindow: number;
      };
    } = {}
  ): Promise<RetryResult<T>> {
    const circuitBreaker = CircuitBreakerManager.getInstance();
    
    // Check if circuit is open
    if (circuitBreaker.isOpen(circuitBreakerKey)) {
      return {
        success: false,
        error: new Error('Circuit breaker is open'),
        attempts: 0,
        totalTime: 0,
        aborted: false,
      };
    }

    const result = await this.execute(operation, options);
    
    // Update circuit breaker state
    if (result.success) {
      circuitBreaker.recordSuccess(circuitBreakerKey);
    } else {
      circuitBreaker.recordFailure(circuitBreakerKey);
    }

    return result;
  }

  // Private helper methods
  private static shouldRetry(error: Error, attempt: number, config: RetryOptions): boolean {
    // Check custom retry condition first
    if (config.retryCondition) {
      return config.retryCondition(error, attempt);
    }

    // Default retry conditions based on error type
    return this.getDefaultRetryCondition(error);
  }

  private static getDefaultRetryCondition(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Retryable errors
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'temporary',
      'rate limit',
      'throttle',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ];

    // Non-retryable errors
    const nonRetryablePatterns = [
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
      'validation',
      'invalid',
      'malformed',
    ];

    // Check for non-retryable patterns first
    if (nonRetryablePatterns.some(pattern => 
      message.includes(pattern) || name.includes(pattern)
    )) {
      return false;
    }

    // Check for retryable patterns
    return retryablePatterns.some(pattern => 
      message.includes(pattern) || name.includes(pattern)
    );
  }

  private static calculateDelay(attempt: number, config: RetryOptions): number {
    let delay: number;

    switch (config.strategy) {
      case 'exponential':
        delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        break;
      
      case 'linear':
        delay = config.baseDelay * attempt;
        break;
      
      case 'fixed':
        delay = config.baseDelay;
        break;
      
      case 'fibonacci':
        delay = config.baseDelay * this.fibonacci(attempt);
        break;
      
      default:
        delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    }

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter if enabled
    if (config.jitter) {
      delay = this.applyJitter(delay, config.jitterType);
    }

    return Math.max(delay, 0);
  }

  private static applyJitter(delay: number, jitterType: RetryOptions['jitterType']): number {
    switch (jitterType) {
      case 'full':
        return Math.random() * delay;
      
      case 'equal':
        return delay * 0.5 + Math.random() * delay * 0.5;
      
      case 'decorrelated':
        // Decorrelated jitter as described in AWS Architecture Blog
        return Math.random() * delay * 3;
      
      default:
        return delay + Math.random() * 1000;
    }
  }

  private static fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 1;
    
    let a = 1, b = 1;
    for (let i = 3; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit breaker implementation
class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  private constructor() {}

  public static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  public isOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;

    const now = Date.now();

    // Reset if monitor window has passed
    if (now - state.windowStart > state.config.monitorWindow) {
      state.failures = 0;
      state.windowStart = now;
    }

    // Check if circuit should be half-open
    if (state.state === 'OPEN' && now - state.lastFailure > state.config.resetTimeout) {
      state.state = 'HALF_OPEN';
    }

    return state.state === 'OPEN';
  }

  public recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state && state.state === 'HALF_OPEN') {
      state.state = 'CLOSED';
      state.failures = 0;
    }
  }

  public recordFailure(key: string): void {
    let state = this.circuitBreakers.get(key);
    if (!state) {
      state = {
        failures: 0,
        state: 'CLOSED',
        windowStart: Date.now(),
        lastFailure: Date.now(),
        config: {
          failureThreshold: 5,
          resetTimeout: 60000,
          monitorWindow: 300000,
        },
      };
      this.circuitBreakers.set(key, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= state.config.failureThreshold) {
      state.state = 'OPEN';
    }
  }

  public reset(key: string): void {
    this.circuitBreakers.delete(key);
  }
}

interface CircuitBreakerState {
  failures: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  windowStart: number;
  lastFailure: number;
  config: {
    failureThreshold: number;
    resetTimeout: number;
    monitorWindow: number;
  };
}

// Predefined retry configurations for common scenarios
export const RetryConfigs = {
  // Network operations
  network: {
    strategy: 'exponential' as RetryStrategy,
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
    jitterType: 'full' as const,
    backoffMultiplier: 2,
  },

  // Database operations
  database: {
    strategy: 'exponential' as RetryStrategy,
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 5000,
    jitter: true,
    jitterType: 'equal' as const,
    backoffMultiplier: 1.5,
  },

  // File operations
  fileSystem: {
    strategy: 'linear' as RetryStrategy,
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 3000,
    jitter: false,
    jitterType: 'full' as const,
    backoffMultiplier: 1,
  },

  // External API calls
  externalAPI: {
    strategy: 'exponential' as RetryStrategy,
    maxRetries: 4,
    baseDelay: 2000,
    maxDelay: 30000,
    jitter: true,
    jitterType: 'decorrelated' as const,
    backoffMultiplier: 2.5,
  },

  // Quick operations (validation, etc.)
  quick: {
    strategy: 'fixed' as RetryStrategy,
    maxRetries: 1,
    baseDelay: 500,
    maxDelay: 500,
    jitter: false,
    jitterType: 'full' as const,
    backoffMultiplier: 1,
  },

  // Critical operations
  critical: {
    strategy: 'fibonacci' as RetryStrategy,
    maxRetries: 7,
    baseDelay: 1000,
    maxDelay: 60000,
    jitter: true,
    jitterType: 'equal' as const,
    backoffMultiplier: 1,
  },
};

// Utility functions for common retry scenarios
export const RetryUtils = {
  // Retry API calls
  retryAPI: <T>(apiCall: () => Promise<T>, endpoint?: string) =>
    RetryManager.execute(apiCall, {
      ...RetryConfigs.network,
      onRetry: (error, attempt, delay) => {
        console.warn(`API retry ${attempt} for ${endpoint || 'unknown'}: ${error.message} (delay: ${delay}ms)`);
      },
    }),

  // Retry database operations
  retryDB: <T>(dbOperation: () => Promise<T>, operationName?: string) =>
    RetryManager.execute(dbOperation, {
      ...RetryConfigs.database,
      onRetry: (error, attempt, delay) => {
        console.warn(`DB retry ${attempt} for ${operationName || 'unknown'}: ${error.message} (delay: ${delay}ms)`);
      },
    }),

  // Retry file operations
  retryFile: <T>(fileOperation: () => Promise<T>, fileName?: string) =>
    RetryManager.execute(fileOperation, {
      ...RetryConfigs.fileSystem,
      onRetry: (error, attempt, delay) => {
        console.warn(`File retry ${attempt} for ${fileName || 'unknown'}: ${error.message} (delay: ${delay}ms)`);
      },
    }),

  // Create retryable fetch function
  createRetryableFetch: (baseURL?: string, defaultOptions?: RequestInit) => {
    return RetryManager.wrap(async (url: string, options?: RequestInit) => {
      const fullURL = baseURL ? `${baseURL}${url}` : url;
      const mergedOptions = { ...defaultOptions, ...options };
      
      const response = await fetch(fullURL, mergedOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    }, RetryConfigs.network);
  },

  // Retry with timeout
  retryWithTimeout: <T>(
    operation: () => Promise<T>,
    timeout: number,
    retryOptions?: Partial<RetryOptions>
  ) =>
    RetryManager.execute(operation, {
      ...RetryConfigs.network,
      ...retryOptions,
      timeout,
    }),

  // Retry with abort signal
  retryWithAbort: <T>(
    operation: () => Promise<T>,
    abortSignal: AbortSignal,
    retryOptions?: Partial<RetryOptions>
  ) =>
    RetryManager.execute(operation, {
      ...RetryConfigs.network,
      ...retryOptions,
      abortSignal,
    }),
};