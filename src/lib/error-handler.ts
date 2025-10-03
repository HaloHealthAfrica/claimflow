// Comprehensive error handling system with logging, monitoring, and recovery
import { auditLogger } from './audit-logger';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ErrorCategory = 
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NETWORK'
  | 'DATABASE'
  | 'EXTERNAL_API'
  | 'FILE_SYSTEM'
  | 'BUSINESS_LOGIC'
  | 'SYSTEM'
  | 'UNKNOWN';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface AppError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
  originalError?: Error;
  retryable?: boolean;
  userMessage?: string;
  technicalMessage?: string;
  timestamp: Date;
  stackTrace?: string;
}

export interface ErrorRecoveryStrategy {
  type: 'RETRY' | 'FALLBACK' | 'REDIRECT' | 'IGNORE' | 'ESCALATE';
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => Promise<any>;
  redirectUrl?: string;
  escalationLevel?: ErrorSeverity;
}

export interface ErrorHandlingConfig {
  enableLogging?: boolean;
  enableMonitoring?: boolean;
  enableUserNotification?: boolean;
  enableAutoRecovery?: boolean;
  logLevel?: ErrorSeverity;
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlingConfig;
  private errorCounts = new Map<string, number>();
  private recoveryStrategies = new Map<string, ErrorRecoveryStrategy>();

  private constructor(config: ErrorHandlingConfig = {}) {
    this.config = {
      enableLogging: true,
      enableMonitoring: true,
      enableUserNotification: true,
      enableAutoRecovery: true,
      logLevel: 'MEDIUM',
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      ...config,
    };

    this.setupDefaultRecoveryStrategies();
  }

  public static getInstance(config?: ErrorHandlingConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  // Create standardized error
  public createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: ErrorContext,
    originalError?: Error
  ): AppError {
    const error = new Error(message) as AppError;
    error.code = code;
    error.category = category;
    error.severity = severity;
    error.context = context;
    error.originalError = originalError;
    error.timestamp = new Date();
    error.stackTrace = error.stack;
    error.retryable = this.isRetryable(category, code);
    error.userMessage = this.getUserFriendlyMessage(code, category);
    error.technicalMessage = message;

    return error;
  }

  // Handle error with comprehensive processing
  public async handleError(error: Error | AppError, context?: ErrorContext): Promise<void> {
    const appError = this.normalizeError(error, context);
    
    try {
      // 1. Log error
      if (this.config.enableLogging && this.shouldLog(appError.severity)) {
        await this.logError(appError);
      }

      // 2. Monitor and track
      if (this.config.enableMonitoring) {
        this.trackError(appError);
      }

      // 3. Notify user if appropriate
      if (this.config.enableUserNotification && this.shouldNotifyUser(appError)) {
        await this.notifyUser(appError);
      }

      // 4. Attempt recovery if enabled
      if (this.config.enableAutoRecovery && appError.retryable) {
        await this.attemptRecovery(appError);
      }

      // 5. Escalate critical errors
      if (appError.severity === 'CRITICAL') {
        await this.escalateError(appError);
      }
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
      // Fallback logging to prevent infinite loops
      console.error('Original error:', appError);
    }
  }

  // Retry mechanism with exponential backoff
  public async withRetry<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    customRetryConfig?: Partial<ErrorHandlingConfig['retryConfig']>
  ): Promise<T> {
    const retryConfig = { ...this.config.retryConfig!, ...customRetryConfig };
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.maxRetries) {
          // Final attempt failed
          const appError = this.normalizeError(error as Error, context);
          await this.handleError(appError);
          throw appError;
        }

        // Check if error is retryable
        const appError = this.normalizeError(error as Error, context);
        if (!appError.retryable) {
          await this.handleError(appError);
          throw appError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        
        await this.sleep(jitteredDelay);
      }
    }

    throw lastError!;
  }

  // Circuit breaker pattern
  public createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitorWindow: number;
    }
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset failures if monitor window has passed
      if (now - lastFailureTime > options.monitorWindow) {
        failures = 0;
      }

      // Check circuit state
      if (state === 'OPEN') {
        if (now - lastFailureTime > options.resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw this.createError(
            'CIRCUIT_BREAKER_OPEN',
            'Circuit breaker is open',
            'SYSTEM',
            'HIGH'
          );
        }
      }

      try {
        const result = await operation();
        
        // Success - reset circuit
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= options.failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  // Register custom recovery strategy
  public registerRecoveryStrategy(errorCode: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(errorCode, strategy);
  }

  // Get error statistics
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: Array<{ code: string; count: number }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    // This would typically come from a proper monitoring system
    return {
      totalErrors,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      topErrors: Array.from(this.errorCounts.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  // Private helper methods
  private normalizeError(error: Error | AppError, context?: ErrorContext): AppError {
    if (this.isAppError(error)) {
      return { ...error, context: { ...error.context, ...context } };
    }

    // Convert regular Error to AppError
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    
    return this.createError(
      error.name || 'UNKNOWN_ERROR',
      error.message,
      category,
      severity,
      context,
      error
    );
  }

  private isAppError(error: Error): error is AppError {
    return 'code' in error && 'category' in error && 'severity' in error;
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'VALIDATION';
    }
    if (name.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'AUTHENTICATION';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'NETWORK';
    }
    if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
      return 'DATABASE';
    }
    if (message.includes('file') || message.includes('upload') || message.includes('storage')) {
      return 'FILE_SYSTEM';
    }

    return 'UNKNOWN';
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors
    if (category === 'DATABASE' || category === 'SYSTEM') {
      return 'CRITICAL';
    }
    
    // High severity errors
    if (category === 'AUTHENTICATION' || category === 'AUTHORIZATION') {
      return 'HIGH';
    }
    
    // Medium severity errors
    if (category === 'NETWORK' || category === 'EXTERNAL_API') {
      return 'MEDIUM';
    }
    
    // Low severity errors
    return 'LOW';
  }

  private isRetryable(category: ErrorCategory, code: string): boolean {
    const retryableCategories: ErrorCategory[] = ['NETWORK', 'EXTERNAL_API', 'DATABASE'];
    const nonRetryableCodes = ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN'];
    
    return retryableCategories.includes(category) && !nonRetryableCodes.includes(code);
  }

  private getUserFriendlyMessage(code: string, category: ErrorCategory): string {
    const messages: Record<string, string> = {
      NETWORK_ERROR: 'Connection issue. Please check your internet connection and try again.',
      DATABASE_ERROR: 'We\'re experiencing technical difficulties. Please try again in a few moments.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      UNAUTHORIZED: 'Please sign in to continue.',
      FORBIDDEN: 'You don\'t have permission to perform this action.',
      FILE_UPLOAD_ERROR: 'File upload failed. Please try uploading again.',
      EXTERNAL_API_ERROR: 'External service is temporarily unavailable. Please try again later.',
    };

    return messages[code] || messages[category] || 'An unexpected error occurred. Please try again.';
  }

  private shouldLog(severity: ErrorSeverity): boolean {
    const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const configLevel = severityLevels[this.config.logLevel!];
    const errorLevel = severityLevels[severity];
    
    return errorLevel >= configLevel;
  }

  private shouldNotifyUser(error: AppError): boolean {
    // Don't notify for low severity or system errors
    return error.severity !== 'LOW' && error.category !== 'SYSTEM';
  }

  private async logError(error: AppError): Promise<void> {
    try {
      await auditLogger.log({
        eventType: 'SYSTEM',
        severity: error.severity,
        userId: error.context?.userId,
        resourceType: 'ERROR',
        action: 'error_occurred',
        details: {
          code: error.code,
          category: error.category,
          message: error.message,
          stackTrace: error.stackTrace,
          context: error.context,
          originalError: error.originalError?.message,
        },
        ipAddress: error.context?.ipAddress || 'unknown',
        userAgent: error.context?.userAgent || 'unknown',
        success: false,
        errorMessage: error.message,
      });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private trackError(error: AppError): void {
    const key = `${error.category}:${error.code}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  private async notifyUser(error: AppError): Promise<void> {
    // This would integrate with your notification system
    console.warn('User notification:', {
      message: error.userMessage,
      severity: error.severity,
      code: error.code,
    });
  }

  private async attemptRecovery(error: AppError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.code);
    if (!strategy) return;

    try {
      switch (strategy.type) {
        case 'RETRY':
          // Retry logic is handled by withRetry method
          break;
        case 'FALLBACK':
          if (strategy.fallbackAction) {
            await strategy.fallbackAction();
          }
          break;
        case 'REDIRECT':
          if (strategy.redirectUrl && typeof window !== 'undefined') {
            window.location.href = strategy.redirectUrl;
          }
          break;
        case 'ESCALATE':
          await this.escalateError(error);
          break;
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
    }
  }

  private async escalateError(error: AppError): Promise<void> {
    // This would integrate with alerting systems (PagerDuty, Slack, etc.)
    console.error('CRITICAL ERROR ESCALATION:', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
    });
  }

  private setupDefaultRecoveryStrategies(): void {
    this.registerRecoveryStrategy('NETWORK_ERROR', {
      type: 'RETRY',
      maxRetries: 3,
      retryDelay: 2000,
    });

    this.registerRecoveryStrategy('DATABASE_CONNECTION_ERROR', {
      type: 'RETRY',
      maxRetries: 5,
      retryDelay: 1000,
    });

    this.registerRecoveryStrategy('UNAUTHORIZED', {
      type: 'REDIRECT',
      redirectUrl: '/auth/signin',
    });

    this.registerRecoveryStrategy('FILE_UPLOAD_ERROR', {
      type: 'FALLBACK',
      fallbackAction: async () => {
        console.log('Attempting alternative upload method...');
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error scenarios
export const ErrorUtils = {
  // Network errors
  createNetworkError: (message: string, context?: ErrorContext) =>
    errorHandler.createError('NETWORK_ERROR', message, 'NETWORK', 'MEDIUM', context),

  // Validation errors
  createValidationError: (message: string, context?: ErrorContext) =>
    errorHandler.createError('VALIDATION_ERROR', message, 'VALIDATION', 'LOW', context),

  // Authentication errors
  createAuthError: (message: string, context?: ErrorContext) =>
    errorHandler.createError('UNAUTHORIZED', message, 'AUTHENTICATION', 'HIGH', context),

  // Database errors
  createDatabaseError: (message: string, context?: ErrorContext) =>
    errorHandler.createError('DATABASE_ERROR', message, 'DATABASE', 'CRITICAL', context),

  // File system errors
  createFileError: (message: string, context?: ErrorContext) =>
    errorHandler.createError('FILE_ERROR', message, 'FILE_SYSTEM', 'MEDIUM', context),

  // Business logic errors
  createBusinessError: (code: string, message: string, context?: ErrorContext) =>
    errorHandler.createError(code, message, 'BUSINESS_LOGIC', 'MEDIUM', context),
};

// Error boundary helper for React components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function WrappedComponent(props: P) {
    // This would be implemented as a proper React Error Boundary
    // For now, returning the component as-is
    return React.createElement(Component, props);
  };
}