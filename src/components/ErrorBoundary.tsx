'use client';

// Comprehensive React Error Boundary with user-friendly fallbacks
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler, ErrorContext, AppError } from '@/lib/error-handler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'section' | 'component';
}

interface ErrorFallbackProps {
  error: Error;
  errorId: string;
  retry: () => void;
  canRetry: boolean;
  level: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context: ErrorContext = {
      component: errorInfo.componentStack?.split('\n')[1]?.trim(),
      action: 'render',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.level || 'unknown',
        retryCount: this.state.retryCount,
      },
    };

    // Handle error through our centralized system
    errorHandler.handleError(error, context);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for transient errors
    if (this.props.enableRetry && this.canRetry()) {
      this.scheduleRetry();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => prevProps.resetKeys?.[index] !== key
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private canRetry(): boolean {
    const maxRetries = this.props.maxRetries || 3;
    return this.state.retryCount < maxRetries;
  }

  private scheduleRetry(): void {
    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }));
    }, delay);
  }

  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId}
          retry={this.resetErrorBoundary}
          canRetry={this.canRetry()}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback components for different levels
function DefaultErrorFallback({ error, errorId, retry, canRetry, level }: ErrorFallbackProps) {
  const isAppError = 'code' in error && 'userMessage' in error;
  const userMessage = isAppError ? (error as AppError).userMessage : 'Something went wrong';
  
  if (level === 'page') {
    return <PageErrorFallback error={error} errorId={errorId} retry={retry} canRetry={canRetry} />;
  }
  
  if (level === 'section') {
    return <SectionErrorFallback error={error} errorId={errorId} retry={retry} canRetry={canRetry} />;
  }
  
  return <ComponentErrorFallback error={error} errorId={errorId} retry={retry} canRetry={canRetry} />;
}

// Page-level error fallback
function PageErrorFallback({ error, errorId, retry, canRetry }: ErrorFallbackProps) {
  const isAppError = 'code' in error && 'userMessage' in error;
  const userMessage = isAppError ? (error as AppError).userMessage : 'Something went wrong';
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Oops! Something went wrong
            </h2>
            
            <p className="mt-2 text-center text-sm text-gray-600">
              {userMessage}
            </p>
            
            <div className="mt-6 space-y-4">
              {canRetry && (
                <button
                  onClick={retry}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Homepage
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh Page
              </button>
            </div>
            
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600 font-mono">
                  Error ID: {errorId}
                </p>
                <p className="text-xs text-gray-600 font-mono mt-1">
                  {error.message}
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section-level error fallback
function SectionErrorFallback({ error, errorId, retry, canRetry }: ErrorFallbackProps) {
  const isAppError = 'code' in error && 'userMessage' in error;
  const userMessage = isAppError ? (error as AppError).userMessage : 'This section failed to load';
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Section Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{userMessage}</p>
          </div>
          <div className="mt-4 flex space-x-3">
            {canRetry && (
              <button
                onClick={retry}
                className="text-sm bg-red-100 text-red-800 rounded-md px-3 py-1 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Retry
              </button>
            )}
            <details>
              <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                Details
              </summary>
              <p className="text-xs text-red-600 font-mono mt-1">
                {errorId}
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component-level error fallback
function ComponentErrorFallback({ error, errorId, retry, canRetry }: ErrorFallbackProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-800">
            This component failed to load.
          </p>
          {canRetry && (
            <button
              onClick={retry}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: ErrorContext) => {
    errorHandler.handleError(error, context);
  }, []);

  const createError = React.useCallback((
    code: string,
    message: string,
    category: any,
    severity: any,
    context?: ErrorContext
  ) => {
    return errorHandler.createError(code, message, category, severity, context);
  }, []);

  return { handleError, createError };
}

// Async error boundary for handling promise rejections
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorHandler.handleError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        {
          component: 'AsyncErrorBoundary',
          action: 'promise_rejection',
          metadata: { reason: event.reason },
        }
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}