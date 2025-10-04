'use client';

// Global error context provider for React applications
import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { globalErrorHandler, GlobalErrorConfig, OperationResult, RetryConfig } from '@/lib/global-error-handler';
import { errorHandler, ErrorContext, AppError } from '@/lib/error-handler';
import { clientErrorReporter } from '@/lib/client-error-reporter';

interface GlobalErrorContextValue {
  // Error handling methods
  handleError: (error: Error, context?: ErrorContext) => Promise<void>;
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    operationId: string,
    context?: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ) => Promise<OperationResult<T>>;
  
  // Error state
  globalErrors: AppError[];
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  
  // Configuration
  updateConfig: (config: Partial<GlobalErrorConfig>) => void;
  
  // Metrics
  getOperationMetrics: (operationId?: string) => any;
  
  // Circuit breaker controls
  resetCircuitBreaker: (operationId: string) => void;
  
  // Utility functions
  createResilientFunction: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationId: string,
    retryConfig?: Partial<RetryConfig>
  ) => (...args: T) => Promise<OperationResult<R>>;
}

const GlobalErrorContext = createContext<GlobalErrorContextValue | null>(null);

interface GlobalErrorProviderProps {
  children: ReactNode;
  config?: Partial<GlobalErrorConfig>;
  maxGlobalErrors?: number;
  errorDisplayDuration?: number;
  enableErrorToasts?: boolean;
}

export function GlobalErrorProvider({
  children,
  config,
  maxGlobalErrors = 10,
  errorDisplayDuration = 5000,
  enableErrorToasts = true,
}: GlobalErrorProviderProps) {
  const [globalErrors, setGlobalErrors] = useState<AppError[]>([]);
  const [errorHandler_] = useState(() => globalErrorHandler);

  // Initialize global error handler with config
  useEffect(() => {
    if (config) {
      errorHandler_.updateConfig(config);
    }
  }, [config, errorHandler_]);

  // Handle error and add to global state
  const handleError = useCallback(async (error: Error, context?: ErrorContext) => {
    try {
      // Normalize error
      const appError = 'code' in error && 'category' in error && 'severity' in error
        ? error as AppError
        : errorHandler.createError(
            error.name || 'UNKNOWN_ERROR',
            error.message,
            'UNKNOWN',
            'MEDIUM',
            context,
            error
          );

      // Add unique ID for tracking
      const errorWithId = {
        ...appError,
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      } as AppError & { id: string };

      // Add to global errors state
      setGlobalErrors(prev => {
        const newErrors = [errorWithId, ...prev].slice(0, maxGlobalErrors);
        return newErrors;
      });

      // Handle through global error handler
      await errorHandler.handleError(appError, context);

      // Auto-remove error after duration (for non-critical errors)
      if (appError.severity !== 'CRITICAL' && errorDisplayDuration > 0) {
        setTimeout(() => {
          clearError(errorWithId.id);
        }, errorDisplayDuration);
      }

      // Show toast notification if enabled
      if (enableErrorToasts && typeof window !== 'undefined') {
        showErrorToast(appError);
      }

    } catch (handlingError) {
      console.error('Failed to handle error in GlobalErrorProvider:', handlingError);
    }
  }, [maxGlobalErrors, errorDisplayDuration, enableErrorToasts]);

  // Execute operation with retry logic
  const executeWithRetry = useCallback(async (
    operation: () => Promise<any>,
    operationId: string,
    context?: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<OperationResult<any>> => {
    return errorHandler_.executeWithHandling(operation, operationId, context, retryConfig);
  }, [errorHandler_]);

  // Clear specific error
  const clearError = useCallback((errorId: string) => {
    setGlobalErrors(prev => prev.filter(error => (error as any).id !== errorId));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setGlobalErrors([]);
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<GlobalErrorConfig>) => {
    errorHandler_.updateConfig(newConfig);
  }, [errorHandler_]);

  // Get operation metrics
  const getOperationMetrics = useCallback((operationId?: string) => {
    return errorHandler_.getOperationMetrics(operationId);
  }, [errorHandler_]);

  // Reset circuit breaker
  const resetCircuitBreaker = useCallback((operationId: string) => {
    errorHandler_.resetCircuitBreaker(operationId);
  }, [errorHandler_]);

  // Create resilient function
  const createResilientFunction = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationId: string,
    retryConfig?: Partial<RetryConfig>
  ) => {
    return errorHandler_.createResilientFunction(fn, operationId, retryConfig);
  }, [errorHandler_]);

  const contextValue: GlobalErrorContextValue = {
    handleError,
    executeWithRetry,
    globalErrors,
    clearError,
    clearAllErrors,
    updateConfig,
    getOperationMetrics,
    resetCircuitBreaker,
    createResilientFunction,
  };

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
      {/* Global error display component */}
      <GlobalErrorDisplay errors={globalErrors} onClearError={clearError} />
    </GlobalErrorContext.Provider>
  );
}

// Hook to use global error context
export function useGlobalError() {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
}

// Hook for resilient operations
export function useResilientOperation() {
  const { executeWithRetry, createResilientFunction } = useGlobalError();

  const executeAPI = useCallback(async (
    apiCall: () => Promise<any>,
    endpoint: string,
    retryConfig?: Partial<RetryConfig>
  ) => {
    return executeWithRetry(apiCall, `api:${endpoint}`, { action: 'api_call', url: endpoint }, retryConfig);
  }, [executeWithRetry]);

  const executeDB = useCallback(async (
    dbOperation: () => Promise<any>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ) => {
    return executeWithRetry(
      dbOperation,
      `db:${operationName}`,
      { action: 'database_operation' },
      { maxRetries: 5, baseDelay: 500, ...retryConfig }
    );
  }, [executeWithRetry]);

  const createResilientAPI = useCallback(<T extends any[], R>(
    apiFunction: (...args: T) => Promise<R>,
    endpoint: string,
    retryConfig?: Partial<RetryConfig>
  ) => {
    return createResilientFunction(apiFunction, `api:${endpoint}`, retryConfig);
  }, [createResilientFunction]);

  return {
    executeAPI,
    executeDB,
    createResilientAPI,
    executeWithRetry,
    createResilientFunction,
  };
}

// Hook for error reporting
export function useErrorReporting() {
  const { handleError } = useGlobalError();

  const reportError = useCallback((error: Error, component?: string, action?: string) => {
    return handleError(error, {
      component,
      action,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }, [handleError]);

  const reportValidationError = useCallback((field: string, message: string, component?: string) => {
    const error = errorHandler.createError(
      'VALIDATION_ERROR',
      `Validation failed for ${field}: ${message}`,
      'VALIDATION',
      'LOW',
      { component, action: 'validation', metadata: { field } }
    );
    return handleError(error);
  }, [handleError]);

  const reportNetworkError = useCallback((url: string, status?: number, component?: string) => {
    const error = errorHandler.createError(
      'NETWORK_ERROR',
      `Network request failed: ${status || 'Unknown status'}`,
      'NETWORK',
      'MEDIUM',
      { component, action: 'network_request', metadata: { url, status } }
    );
    return handleError(error);
  }, [handleError]);

  return {
    reportError,
    reportValidationError,
    reportNetworkError,
  };
}

// Global error display component
interface GlobalErrorDisplayProps {
  errors: (AppError & { id?: string })[];
  onClearError: (errorId: string) => void;
}

function GlobalErrorDisplay({ errors, onClearError }: GlobalErrorDisplayProps) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.slice(0, 3).map((error) => (
        <ErrorToast
          key={error.id || error.code}
          error={error}
          onClose={() => error.id && onClearError(error.id)}
        />
      ))}
      {errors.length > 3 && (
        <div className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg">
          <p className="text-sm">
            +{errors.length - 3} more errors
          </p>
        </div>
      )}
    </div>
  );
}

// Individual error toast component
interface ErrorToastProps {
  error: AppError;
  onClose: () => void;
}

function ErrorToast({ error, onClose }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 border-red-700';
      case 'HIGH': return 'bg-red-500 border-red-600';
      case 'MEDIUM': return 'bg-yellow-500 border-yellow-600';
      case 'LOW': return 'bg-blue-500 border-blue-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'MEDIUM':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getSeverityColor(error.severity)} 
        text-white px-4 py-3 rounded-md shadow-lg border-l-4 max-w-md
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon(error.severity)}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {error.userMessage || error.message}
          </p>
          
          {error.code && (
            <p className="text-xs opacity-75 mt-1">
              Code: {error.code}
            </p>
          )}
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Utility function to show error toast (for non-React contexts)
function showErrorToast(error: AppError) {
  // This could integrate with a toast library like react-hot-toast
  console.warn('Error toast:', {
    message: error.userMessage || error.message,
    severity: error.severity,
    code: error.code,
  });
}

// Higher-order component for wrapping components with error handling
export function withGlobalErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function WrappedComponent(props: P) {
    const { reportError } = useErrorReporting();

    const handleComponentError = useCallback((error: Error, errorInfo?: any) => {
      reportError(error, componentName || Component.displayName || Component.name, 'render');
    }, [reportError]);

    return (
      <ErrorBoundary onError={handleComponentError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Simple error boundary for the HOC
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error, errorInfo: any) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">Something went wrong in this component.</p>
        </div>
      );
    }

    return this.props.children;
  }
}