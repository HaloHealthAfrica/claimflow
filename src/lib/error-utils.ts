// Comprehensive error handling utilities and helpers
import { AppError, ErrorCategory, ErrorSeverity, ErrorContext, errorHandler } from './error-handler';
import { globalErrorHandler } from './global-error-handler';
import { errorRecoverySystem } from './error-recovery-system';
import { RetryManager, RetryConfigs } from './retry-strategies';

// Error classification utilities
export class ErrorClassifier {
  // Classify error by analyzing message and context
  public static classifyError(error: Error): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    retryable: boolean;
    userFriendly: boolean;
  } {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Determine category
    let category: ErrorCategory = 'UNKNOWN';
    if (this.isNetworkError(message, name)) category = 'NETWORK';
    else if (this.isValidationError(message, name)) category = 'VALIDATION';
    else if (this.isAuthError(message, name)) category = 'AUTHENTICATION';
    else if (this.isDatabaseError(message, name)) category = 'DATABASE';
    else if (this.isFileSystemError(message, name)) category = 'FILE_SYSTEM';
    else if (this.isExternalAPIError(message, name)) category = 'EXTERNAL_API';
    else if (this.isBusinessLogicError(message, name)) category = 'BUSINESS_LOGIC';
    else if (this.isSystemError(message, name)) category = 'SYSTEM';

    // Determine severity
    let severity: ErrorSeverity = 'MEDIUM';
    if (this.isCriticalError(message, name, category)) severity = 'CRITICAL';
    else if (this.isHighSeverityError(message, name, category)) severity = 'HIGH';
    else if (this.isLowSeverityError(message, name, category)) severity = 'LOW';

    // Determine if retryable
    const retryable = this.isRetryableError(message, name, category);

    // Determine if user-friendly message is needed
    const userFriendly = this.needsUserFriendlyMessage(category, severity);

    return { category, severity, retryable, userFriendly };
  }

  private static isNetworkError(message: string, name: string): boolean {
    const patterns = ['network', 'fetch', 'timeout', 'connection', 'cors', 'dns'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isValidationError(message: string, name: string): boolean {
    const patterns = ['validation', 'invalid', 'required', 'format', 'schema'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isAuthError(message: string, name: string): boolean {
    const patterns = ['auth', 'unauthorized', 'forbidden', 'token', 'login', 'permission'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isDatabaseError(message: string, name: string): boolean {
    const patterns = ['database', 'sql', 'query', 'connection', 'transaction', 'constraint'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isFileSystemError(message: string, name: string): boolean {
    const patterns = ['file', 'upload', 'download', 'storage', 'disk', 'path'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isExternalAPIError(message: string, name: string): boolean {
    const patterns = ['api', 'service', 'endpoint', 'gateway', 'upstream'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isBusinessLogicError(message: string, name: string): boolean {
    const patterns = ['business', 'rule', 'policy', 'workflow', 'process'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isSystemError(message: string, name: string): boolean {
    const patterns = ['system', 'internal', 'server', 'runtime', 'memory', 'cpu'];
    return patterns.some(pattern => message.includes(pattern) || name.includes(pattern));
  }

  private static isCriticalError(message: string, name: string, category: ErrorCategory): boolean {
    const criticalPatterns = ['critical', 'fatal', 'crash', 'corruption', 'security'];
    return criticalPatterns.some(pattern => message.includes(pattern) || name.includes(pattern)) ||
           category === 'DATABASE' && message.includes('connection') ||
           category === 'SYSTEM' && message.includes('memory');
  }

  private static isHighSeverityError(message: string, name: string, category: ErrorCategory): boolean {
    return category === 'AUTHENTICATION' || 
           category === 'DATABASE' ||
           message.includes('security') ||
           message.includes('breach');
  }

  private static isLowSeverityError(message: string, name: string, category: ErrorCategory): boolean {
    return category === 'VALIDATION' ||
           message.includes('warning') ||
           message.includes('info');
  }

  private static isRetryableError(message: string, name: string, category: ErrorCategory): boolean {
    const retryableCategories: ErrorCategory[] = ['NETWORK', 'EXTERNAL_API', 'DATABASE', 'SYSTEM'];
    const nonRetryablePatterns = ['validation', 'unauthorized', 'forbidden', 'not found', 'bad request'];
    
    return retryableCategories.includes(category) && 
           !nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  private static needsUserFriendlyMessage(category: ErrorCategory, severity: ErrorSeverity): boolean {
    return severity !== 'LOW' && category !== 'SYSTEM';
  }
}

// Error transformation utilities
export class ErrorTransformer {
  // Transform any error into a standardized AppError
  public static toAppError(
    error: unknown,
    context?: ErrorContext,
    defaultCategory: ErrorCategory = 'UNKNOWN'
  ): AppError {
    if (error instanceof Error) {
      // Check if already an AppError
      if ('code' in error && 'category' in error && 'severity' in error) {
        return error as AppError;
      }

      // Classify the error
      const classification = ErrorClassifier.classifyError(error);
      
      return errorHandler.createError(
        error.name || 'UNKNOWN_ERROR',
        error.message,
        classification.category,
        classification.severity,
        context,
        error
      );
    }

    // Handle non-Error objects
    const message = typeof error === 'string' ? error : 
                   typeof error === 'object' && error !== null ? JSON.stringify(error) :
                   'Unknown error occurred';

    return errorHandler.createError(
      'UNKNOWN_ERROR',
      message,
      defaultCategory,
      'MEDIUM',
      context
    );
  }

  // Transform API response errors
  public static fromAPIResponse(
    response: Response,
    context?: ErrorContext
  ): AppError {
    const status = response.status;
    let category: ErrorCategory = 'EXTERNAL_API';
    let severity: ErrorSeverity = 'MEDIUM';
    let code = `HTTP_${status}`;

    // Classify based on HTTP status
    if (status >= 400 && status < 500) {
      if (status === 401) {
        category = 'AUTHENTICATION';
        severity = 'HIGH';
        code = 'UNAUTHORIZED';
      } else if (status === 403) {
        category = 'AUTHORIZATION';
        severity = 'HIGH';
        code = 'FORBIDDEN';
      } else if (status === 404) {
        category = 'EXTERNAL_API';
        severity = 'LOW';
        code = 'NOT_FOUND';
      } else if (status === 422) {
        category = 'VALIDATION';
        severity = 'LOW';
        code = 'VALIDATION_ERROR';
      } else {
        category = 'EXTERNAL_API';
        severity = 'MEDIUM';
        code = 'CLIENT_ERROR';
      }
    } else if (status >= 500) {
      category = 'EXTERNAL_API';
      severity = 'HIGH';
      code = 'SERVER_ERROR';
    }

    return errorHandler.createError(
      code,
      `${response.status} ${response.statusText}`,
      category,
      severity,
      {
        ...context,
        metadata: {
          ...context?.metadata,
          httpStatus: status,
          httpStatusText: response.statusText,
          url: response.url,
        },
      }
    );
  }

  // Transform validation errors
  public static fromValidationErrors(
    errors: Array<{ field: string; message: string; code?: string }>,
    context?: ErrorContext
  ): AppError {
    const message = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    
    return errorHandler.createError(
      'VALIDATION_ERROR',
      message,
      'VALIDATION',
      'LOW',
      {
        ...context,
        metadata: {
          ...context?.metadata,
          validationErrors: errors,
        },
      }
    );
  }
}

// Error handling decorators and wrappers
export class ErrorHandlers {
  // Wrap async function with comprehensive error handling
  public static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      operationId?: string;
      context?: Partial<ErrorContext>;
      retryConfig?: any;
      enableRecovery?: boolean;
      fallbackValue?: R;
    } = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        const operationId = options.operationId || fn.name || 'anonymous-operation';
        
        const result = await globalErrorHandler.executeWithHandling(
          () => fn(...args),
          operationId,
          options.context,
          options.retryConfig
        );

        if (result.success) {
          return result.data!;
        }

        // Attempt recovery if enabled
        if (options.enableRecovery && result.error) {
          const recoveryResult = await errorRecoverySystem.attemptRecovery(
            result.error,
            options.context
          );

          if (recoveryResult.success && recoveryResult.data) {
            return recoveryResult.data;
          }
        }

        // Return fallback value if provided
        if (options.fallbackValue !== undefined) {
          return options.fallbackValue;
        }

        throw result.error;
      } catch (error) {
        const appError = ErrorTransformer.toAppError(error, options.context);
        await errorHandler.handleError(appError, options.context);
        throw appError;
      }
    };
  }

  // Wrap sync function with error handling
  public static wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    options: {
      context?: Partial<ErrorContext>;
      fallbackValue?: R;
    } = {}
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        const appError = ErrorTransformer.toAppError(error, options.context);
        errorHandler.handleError(appError, options.context);
        
        if (options.fallbackValue !== undefined) {
          return options.fallbackValue;
        }
        
        throw appError;
      }
    };
  }

  // Create resilient API client
  public static createResilientAPIClient(baseURL: string, defaultOptions: RequestInit = {}) {
    return {
      get: this.wrapAsync(async (url: string, options?: RequestInit) => {
        const response = await fetch(`${baseURL}${url}`, {
          ...defaultOptions,
          ...options,
          method: 'GET',
        });
        
        if (!response.ok) {
          throw ErrorTransformer.fromAPIResponse(response, {
            action: 'api_get',
            url: `${baseURL}${url}`,
          });
        }
        
        return response.json();
      }, {
        operationId: 'api-get',
        retryConfig: RetryConfigs.network,
        enableRecovery: true,
      }),

      post: this.wrapAsync(async (url: string, data?: any, options?: RequestInit) => {
        const response = await fetch(`${baseURL}${url}`, {
          ...defaultOptions,
          ...options,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...defaultOptions.headers,
            ...options?.headers,
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        
        if (!response.ok) {
          throw ErrorTransformer.fromAPIResponse(response, {
            action: 'api_post',
            url: `${baseURL}${url}`,
          });
        }
        
        return response.json();
      }, {
        operationId: 'api-post',
        retryConfig: RetryConfigs.network,
        enableRecovery: true,
      }),

      put: this.wrapAsync(async (url: string, data?: any, options?: RequestInit) => {
        const response = await fetch(`${baseURL}${url}`, {
          ...defaultOptions,
          ...options,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...defaultOptions.headers,
            ...options?.headers,
          },
          body: data ? JSON.stringify(data) : undefined,
        });
        
        if (!response.ok) {
          throw ErrorTransformer.fromAPIResponse(response, {
            action: 'api_put',
            url: `${baseURL}${url}`,
          });
        }
        
        return response.json();
      }, {
        operationId: 'api-put',
        retryConfig: RetryConfigs.network,
        enableRecovery: true,
      }),

      delete: this.wrapAsync(async (url: string, options?: RequestInit) => {
        const response = await fetch(`${baseURL}${url}`, {
          ...defaultOptions,
          ...options,
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw ErrorTransformer.fromAPIResponse(response, {
            action: 'api_delete',
            url: `${baseURL}${url}`,
          });
        }
        
        return response.status === 204 ? null : response.json();
      }, {
        operationId: 'api-delete',
        retryConfig: RetryConfigs.network,
        enableRecovery: true,
      }),
    };
  }
}

// Error aggregation utilities
export class ErrorAggregator {
  private errors: AppError[] = [];
  private context?: ErrorContext;

  constructor(context?: ErrorContext) {
    this.context = context;
  }

  // Add error to aggregation
  public addError(error: unknown, additionalContext?: Partial<ErrorContext>): void {
    const appError = ErrorTransformer.toAppError(error, {
      ...this.context,
      ...additionalContext,
    });
    this.errors.push(appError);
  }

  // Check if there are any errors
  public hasErrors(): boolean {
    return this.errors.length > 0;
  }

  // Get all errors
  public getErrors(): AppError[] {
    return [...this.errors];
  }

  // Get errors by severity
  public getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  // Get errors by category
  public getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errors.filter(error => error.category === category);
  }

  // Create combined error
  public createCombinedError(): AppError | null {
    if (this.errors.length === 0) return null;
    
    if (this.errors.length === 1) return this.errors[0];

    const highestSeverity = this.getHighestSeverity();
    const categories = [...new Set(this.errors.map(e => e.category))];
    const messages = this.errors.map(e => e.message);

    return errorHandler.createError(
      'MULTIPLE_ERRORS',
      `Multiple errors occurred: ${messages.join('; ')}`,
      categories.length === 1 ? categories[0] : 'UNKNOWN',
      highestSeverity,
      this.context,
      undefined
    );
  }

  // Handle all errors
  public async handleAll(): Promise<void> {
    for (const error of this.errors) {
      await errorHandler.handleError(error, this.context);
    }
  }

  // Clear all errors
  public clear(): void {
    this.errors = [];
  }

  private getHighestSeverity(): ErrorSeverity {
    const severityOrder: Record<ErrorSeverity, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4,
    };

    return this.errors.reduce((highest, error) => {
      return severityOrder[error.severity] > severityOrder[highest] ? error.severity : highest;
    }, 'LOW' as ErrorSeverity);
  }
}

// Utility functions for common error scenarios
export const ErrorUtils = {
  // Create user-friendly error messages
  createUserMessage: (error: AppError): string => {
    const userMessages: Record<string, string> = {
      'NETWORK_ERROR': 'Please check your internet connection and try again.',
      'VALIDATION_ERROR': 'Please check your input and correct any errors.',
      'UNAUTHORIZED': 'Please sign in to continue.',
      'FORBIDDEN': 'You don\'t have permission to perform this action.',
      'NOT_FOUND': 'The requested resource was not found.',
      'SERVER_ERROR': 'We\'re experiencing technical difficulties. Please try again later.',
      'TIMEOUT': 'The request took too long. Please try again.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
    };

    return error.userMessage || 
           userMessages[error.code] || 
           userMessages[error.category] || 
           'An unexpected error occurred. Please try again.';
  },

  // Check if error is recoverable
  isRecoverable: (error: AppError): boolean => {
    const recoverableCategories: ErrorCategory[] = ['NETWORK', 'EXTERNAL_API', 'DATABASE'];
    const nonRecoverableCodes = ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN'];
    
    return recoverableCategories.includes(error.category) && 
           !nonRecoverableCodes.includes(error.code);
  },

  // Get error icon for UI
  getErrorIcon: (error: AppError): string => {
    switch (error.severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '❌';
      case 'MEDIUM': return '⚠️';
      case 'LOW': return 'ℹ️';
      default: return '❓';
    }
  },

  // Get error color for UI
  getErrorColor: (error: AppError): string => {
    switch (error.severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'blue';
      default: return 'gray';
    }
  },
};