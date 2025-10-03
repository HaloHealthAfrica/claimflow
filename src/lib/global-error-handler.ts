// Global error handling system with comprehensive retry logic and recovery strategies
import { errorHandler, ErrorContext, AppError, ErrorSeverity, ErrorCategory } from './error-handler';
import { errorMonitoring } from './error-monitoring';
import { clientErrorReporter } from './client-error-reporter';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
}

export interface GlobalErrorConfig {
  enableGlobalHandling: boolean;
  enableRetryLogic: boolean;
  enableCircuitBreaker: boolean;
  enableRateLimiting: boolean;
  defaultRetryConfig: RetryConfig;
  circuitBreakerConfig: {
    failureThreshold: number;
    resetTimeout: number;
    monitorWindow: number;
  };
  rateLimitConfig: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  attempts: number;
  totalTime: number;
  circuitBreakerTripped?: boolean;
  rateLimited?: boolean;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private config: GlobalErrorConfig;
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private rateLimiters = new Map<string, RateLimiterState>();
  private operationMetrics = new Map<string, OperationMetrics>();

  private constructor(config: Partial<GlobalErrorConfig> = {}) {
    this.config = {
      enableGlobalHandling: true,
      enableRetryLogic: true,
      enableCircuitBreaker: true,
      enableRateLimiting: false,
      defaultRetryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
      },
      circuitBreakerConfig: {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitorWindow: 300000, // 5 minutes
      },
      rateLimitConfig: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
      },
      ...config,
    };

    this.setupGlobalHandlers();
  }

  public static getInstance(config?: Partial<GlobalErrorConfig>): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(config);
    }
    return GlobalErrorHandler.instance;
  }

  // Execute operation with comprehensive error handling
  public async executeWithHandling<T>(
    operation: () => Promise<T>,
    operationId: string,
    context?: ErrorContext,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();
    const retryConfig = { ...this.config.defaultRetryConfig, ...customRetryConfig };
    
    // Check rate limiting
    if (this.config.enableRateLimiting && this.isRateLimited(operationId)) {
      return {
        success: false,
        error: errorHandler.createError(
          'RATE_LIMITED',
          'Operation rate limit exceeded',
          'SYSTEM',
          'MEDIUM',
          context
        ),
        attempts: 0,
        totalTime: Date.now() - startTime,
        rateLimited: true,
      };
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker && this.isCircuitOpen(operationId)) {
      return {
        success: false,
        error: errorHandler.createError(
          'CIRCUIT_BREAKER_OPEN',
          'Circuit breaker is open for this operation',
          'SYSTEM',
          'HIGH',
          context
        ),
        attempts: 0,
        totalTime: Date.now() - startTime,
        circuitBreakerTripped: true,
      };
    }

    let lastError: Error;
    let attempts = 0;

    // Retry loop
    while (attempts <= retryConfig.maxRetries) {
      attempts++;
      
      try {
        // Record rate limit attempt
        if (this.config.enableRateLimiting) {
          this.recordRateLimitAttempt(operationId);
        }

        const result = await operation();
        
        // Success - reset circuit breaker
        if (this.config.enableCircuitBreaker) {
          this.recordCircuitBreakerSuccess(operationId);
        }

        // Record success metrics
        this.recordOperationMetrics(operationId, true, attempts, Date.now() - startTime);

        return {
          success: true,
          data: result,
          attempts,
          totalTime: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error as Error;
        const appError = this.normalizeError(lastError, context);

        // Record circuit breaker failure
        if (this.config.enableCircuitBreaker) {
          this.recordCircuitBreakerFailure(operationId);
        }

        // Handle error through centralized system
        await errorHandler.handleError(appError, context);

        // Check if we should retry
        if (attempts > retryConfig.maxRetries || !this.shouldRetry(appError, attempts, retryConfig)) {
          // Record failure metrics
          this.recordOperationMetrics(operationId, false, attempts, Date.now() - startTime);

          return {
            success: false,
            error: appError,
            attempts,
            totalTime: Date.now() - startTime,
          };
        }

        // Calculate delay for next retry
        if (attempts <= retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempts, retryConfig);
          await this.sleep(delay);
        }
      }
    }

    // This should never be reached, but just in case
    const finalError = this.normalizeError(lastError!, context);
    this.recordOperationMetrics(operationId, false, attempts, Date.now() - startTime);

    return {
      success: false,
      error: finalError,
      attempts,
      totalTime: Date.now() - startTime,
    };
  }

  // Batch operation with error handling
  public async executeBatch<T>(
    operations: Array<{
      operation: () => Promise<T>;
      id: string;
      context?: ErrorContext;
    }>,
    options: {
      concurrency?: number;
      failFast?: boolean;
      retryConfig?: Partial<RetryConfig>;
    } = {}
  ): Promise<Array<OperationResult<T>>> {
    const { concurrency = 5, failFast = false } = options;
    const results: Array<OperationResult<T>> = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchPromises = batch.map(({ operation, id, context }) =>
        this.executeWithHandling(operation, id, context, options.retryConfig)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Check for fail-fast condition
      if (failFast && batchResults.some(result => !result.success)) {
        break;
      }
    }

    return results;
  }

  // Create resilient function wrapper
  public createResilientFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationId: string,
    retryConfig?: Partial<RetryConfig>
  ): (...args: T) => Promise<OperationResult<R>> {
    return async (...args: T): Promise<OperationResult<R>> => {
      return this.executeWithHandling(
        () => fn(...args),
        operationId,
        { action: operationId },
        retryConfig
      );
    };
  }

  // Get operation metrics
  public getOperationMetrics(operationId?: string): OperationMetrics | Map<string, OperationMetrics> {
    if (operationId) {
      return this.operationMetrics.get(operationId) || this.createEmptyMetrics();
    }
    return new Map(this.operationMetrics);
  }

  // Reset circuit breaker
  public resetCircuitBreaker(operationId: string): void {
    this.circuitBreakers.delete(operationId);
  }

  // Reset rate limiter
  public resetRateLimiter(operationId: string): void {
    this.rateLimiters.delete(operationId);
  }

  // Configure global settings
  public updateConfig(config: Partial<GlobalErrorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return; // Server-side

    // Global unhandled error handler
    window.addEventListener('error', (event) => {
      const error = errorHandler.createError(
        'UNHANDLED_ERROR',
        event.message,
        'SYSTEM',
        'HIGH',
        {
          url: window.location.href,
          userAgent: navigator.userAgent,
          component: 'GlobalErrorHandler',
          action: 'unhandled_error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        }
      );

      this.handleGlobalError(error);
    });

    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = errorHandler.createError(
        'UNHANDLED_PROMISE_REJECTION',
        event.reason?.message || 'Unhandled promise rejection',
        'SYSTEM',
        'HIGH',
        {
          url: window.location.href,
          userAgent: navigator.userAgent,
          component: 'GlobalErrorHandler',
          action: 'unhandled_promise_rejection',
          metadata: {
            reason: event.reason,
          },
        }
      );

      this.handleGlobalError(error);
    });

    // Network error monitoring
    this.setupNetworkErrorMonitoring();

    // Performance monitoring
    this.setupPerformanceMonitoring();
  }

  private async handleGlobalError(error: AppError): Promise<void> {
    try {
      // Report to monitoring system
      await errorMonitoring.reportError(error, error.context || {});

      // Report to client error reporter
      await clientErrorReporter.reportError({
        message: error.message,
        code: error.code,
        category: error.category,
        severity: error.severity,
        stack: error.stackTrace,
        component: error.context?.component,
        action: error.context?.action,
        metadata: error.context?.metadata,
      });

      // Handle through centralized error handler
      await errorHandler.handleError(error);
    } catch (handlingError) {
      console.error('Failed to handle global error:', handlingError);
      console.error('Original error:', error);
    }
  }

  private setupNetworkErrorMonitoring(): void {
    // Monitor fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args): Promise<Response> => {
      const startTime = Date.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        
        // Record successful network operation
        this.recordOperationMetrics(`network:${url}`, true, 1, Date.now() - startTime);
        
        return response;
      } catch (error) {
        // Record failed network operation
        this.recordOperationMetrics(`network:${url}`, false, 1, Date.now() - startTime);
        
        const networkError = errorHandler.createError(
          'NETWORK_ERROR',
          `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'NETWORK',
          'MEDIUM',
          {
            url: window.location.href,
            userAgent: navigator.userAgent,
            component: 'NetworkMonitor',
            action: 'fetch',
            metadata: {
              requestUrl: url,
              requestMethod: args[1]?.method || 'GET',
            },
          }
        );

        await this.handleGlobalError(networkError);
        throw error;
      }
    };
  }

  private setupPerformanceMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold
              const performanceError = errorHandler.createError(
                'PERFORMANCE_ISSUE',
                `Long task detected: ${entry.duration}ms`,
                'SYSTEM',
                'LOW',
                {
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  component: 'PerformanceMonitor',
                  action: 'long_task',
                  metadata: {
                    duration: entry.duration,
                    startTime: entry.startTime,
                    entryType: entry.entryType,
                  },
                }
              );

              this.handleGlobalError(performanceError);
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  private normalizeError(error: Error, context?: ErrorContext): AppError {
    if ('code' in error && 'category' in error && 'severity' in error) {
      return error as AppError;
    }

    return errorHandler.createError(
      error.name || 'UNKNOWN_ERROR',
      error.message,
      this.categorizeError(error),
      this.determineSeverity(error),
      context,
      error
    );
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) return 'NETWORK';
    if (message.includes('validation') || message.includes('invalid')) return 'VALIDATION';
    if (message.includes('auth') || message.includes('unauthorized')) return 'AUTHENTICATION';
    if (message.includes('permission') || message.includes('forbidden')) return 'AUTHORIZATION';
    if (message.includes('database') || message.includes('sql')) return 'DATABASE';
    
    return 'UNKNOWN';
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) return 'CRITICAL';
    if (message.includes('auth') || message.includes('security')) return 'HIGH';
    if (message.includes('network') || message.includes('timeout')) return 'MEDIUM';
    
    return 'LOW';
  }

  private shouldRetry(error: AppError, attempt: number, config: RetryConfig): boolean {
    // Check custom retry condition
    if (config.retryCondition) {
      return config.retryCondition(error, attempt);
    }

    // Default retry logic
    const retryableCategories: ErrorCategory[] = ['NETWORK', 'EXTERNAL_API', 'DATABASE', 'SYSTEM'];
    const nonRetryableCodes = ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'];
    
    return retryableCategories.includes(error.category) && !nonRetryableCodes.includes(error.code);
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay += Math.random() * 1000;
    }
    
    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker methods
  private isCircuitOpen(operationId: string): boolean {
    const state = this.circuitBreakers.get(operationId);
    if (!state) return false;

    const now = Date.now();
    
    // Reset if monitor window has passed
    if (now - state.windowStart > this.config.circuitBreakerConfig.monitorWindow) {
      state.failures = 0;
      state.windowStart = now;
    }

    // Check if circuit should be closed after reset timeout
    if (state.state === 'OPEN' && now - state.lastFailure > this.config.circuitBreakerConfig.resetTimeout) {
      state.state = 'HALF_OPEN';
    }

    return state.state === 'OPEN';
  }

  private recordCircuitBreakerFailure(operationId: string): void {
    let state = this.circuitBreakers.get(operationId);
    if (!state) {
      state = {
        failures: 0,
        state: 'CLOSED',
        windowStart: Date.now(),
        lastFailure: Date.now(),
      };
      this.circuitBreakers.set(operationId, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreakerConfig.failureThreshold) {
      state.state = 'OPEN';
    }
  }

  private recordCircuitBreakerSuccess(operationId: string): void {
    const state = this.circuitBreakers.get(operationId);
    if (state && state.state === 'HALF_OPEN') {
      state.state = 'CLOSED';
      state.failures = 0;
    }
  }

  // Rate limiting methods
  private isRateLimited(operationId: string): boolean {
    const state = this.rateLimiters.get(operationId);
    if (!state) return false;

    const now = Date.now();
    
    // Reset window if expired
    if (now - state.windowStart > this.config.rateLimitConfig.windowMs) {
      state.requests = 0;
      state.windowStart = now;
    }

    return state.requests >= this.config.rateLimitConfig.maxRequests;
  }

  private recordRateLimitAttempt(operationId: string): void {
    let state = this.rateLimiters.get(operationId);
    if (!state) {
      state = {
        requests: 0,
        windowStart: Date.now(),
      };
      this.rateLimiters.set(operationId, state);
    }

    state.requests++;
  }

  // Metrics methods
  private recordOperationMetrics(operationId: string, success: boolean, attempts: number, duration: number): void {
    let metrics = this.operationMetrics.get(operationId);
    if (!metrics) {
      metrics = this.createEmptyMetrics();
      this.operationMetrics.set(operationId, metrics);
    }

    metrics.totalOperations++;
    metrics.totalAttempts += attempts;
    metrics.totalDuration += duration;
    
    if (success) {
      metrics.successfulOperations++;
    } else {
      metrics.failedOperations++;
    }

    metrics.averageDuration = metrics.totalDuration / metrics.totalOperations;
    metrics.successRate = metrics.successfulOperations / metrics.totalOperations;
    metrics.averageAttempts = metrics.totalAttempts / metrics.totalOperations;
    metrics.lastOperation = new Date();
  }

  private createEmptyMetrics(): OperationMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalAttempts: 0,
      totalDuration: 0,
      averageDuration: 0,
      successRate: 0,
      averageAttempts: 0,
      lastOperation: new Date(),
    };
  }
}

// Supporting interfaces
interface CircuitBreakerState {
  failures: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  windowStart: number;
  lastFailure: number;
}

interface RateLimiterState {
  requests: number;
  windowStart: number;
}

interface OperationMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalAttempts: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  averageAttempts: number;
  lastOperation: Date;
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance();

// Utility functions for common operations
export const GlobalErrorUtils = {
  // Wrap API calls with error handling
  wrapAPICall: <T>(apiCall: () => Promise<T>, endpoint: string) =>
    globalErrorHandler.executeWithHandling(apiCall, `api:${endpoint}`),

  // Wrap database operations
  wrapDatabaseOperation: <T>(operation: () => Promise<T>, operationName: string) =>
    globalErrorHandler.executeWithHandling(operation, `db:${operationName}`, undefined, {
      maxRetries: 5,
      baseDelay: 500,
    }),

  // Wrap file operations
  wrapFileOperation: <T>(operation: () => Promise<T>, operationName: string) =>
    globalErrorHandler.executeWithHandling(operation, `file:${operationName}`, undefined, {
      maxRetries: 2,
      baseDelay: 1000,
    }),

  // Create resilient fetch function
  createResilientFetch: (baseURL?: string) => {
    return globalErrorHandler.createResilientFunction(
      async (url: string, options?: RequestInit) => {
        const fullURL = baseURL ? `${baseURL}${url}` : url;
        const response = await fetch(fullURL, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      },
      'resilient-fetch'
    );
  },
};