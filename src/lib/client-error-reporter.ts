// Client-side error reporting utility
import { ErrorCategory, ErrorSeverity } from './error-handler';

export interface ClientErrorReport {
  message: string;
  stack?: string;
  code?: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  url?: string;
  userAgent?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReportResponse {
  success: boolean;
  reportId?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

class ClientErrorReporter {
  private static instance: ClientErrorReporter;
  private reportQueue: ClientErrorReport[] = [];
  private isOnline = true;
  private maxQueueSize = 100;
  private reportEndpoint = '/api/errors/report';

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupOnlineStatusMonitoring();
    this.startPeriodicFlush();
  }

  public static getInstance(): ClientErrorReporter {
    if (!ClientErrorReporter.instance) {
      ClientErrorReporter.instance = new ClientErrorReporter();
    }
    return ClientErrorReporter.instance;
  }

  // Report error to server
  public async reportError(error: ClientErrorReport): Promise<ErrorReportResponse> {
    try {
      // Add default metadata
      const enrichedError: ClientErrorReport = {
        ...error,
        url: error.url || window.location.href,
        userAgent: error.userAgent || navigator.userAgent,
        metadata: {
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          screen: {
            width: screen.width,
            height: screen.height,
          },
          ...error.metadata,
        },
      };

      if (this.isOnline) {
        return await this.sendErrorReport(enrichedError);
      } else {
        // Queue for later if offline
        this.queueError(enrichedError);
        return {
          success: true,
          message: 'Error queued for reporting when online',
        };
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      
      // Queue the original error for retry
      this.queueError(error);
      
      return {
        success: false,
        error: {
          code: 'REPORTING_FAILED',
          message: 'Failed to report error, queued for retry',
        },
      };
    }
  }

  // Report JavaScript error
  public reportJSError(error: Error, component?: string, action?: string): Promise<ErrorReportResponse> {
    return this.reportError({
      message: error.message,
      stack: error.stack,
      code: error.name || 'JS_ERROR',
      category: 'SYSTEM',
      severity: 'MEDIUM',
      component,
      action,
    });
  }

  // Report network error
  public reportNetworkError(
    url: string,
    status?: number,
    statusText?: string,
    component?: string
  ): Promise<ErrorReportResponse> {
    return this.reportError({
      message: `Network request failed: ${status} ${statusText}`,
      code: 'NETWORK_ERROR',
      category: 'NETWORK',
      severity: 'MEDIUM',
      component,
      metadata: {
        requestUrl: url,
        status,
        statusText,
      },
    });
  }

  // Report validation error
  public reportValidationError(
    field: string,
    value: any,
    rule: string,
    component?: string
  ): Promise<ErrorReportResponse> {
    return this.reportError({
      message: `Validation failed for field ${field}: ${rule}`,
      code: 'VALIDATION_ERROR',
      category: 'VALIDATION',
      severity: 'LOW',
      component,
      metadata: {
        field,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        rule,
      },
    });
  }

  // Report user action error
  public reportUserActionError(
    action: string,
    error: string,
    component?: string,
    metadata?: Record<string, any>
  ): Promise<ErrorReportResponse> {
    return this.reportError({
      message: `User action failed: ${action} - ${error}`,
      code: 'USER_ACTION_ERROR',
      category: 'BUSINESS_LOGIC',
      severity: 'MEDIUM',
      component,
      action,
      metadata,
    });
  }

  // Report performance issue
  public reportPerformanceIssue(
    metric: string,
    value: number,
    threshold: number,
    component?: string
  ): Promise<ErrorReportResponse> {
    return this.reportError({
      message: `Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`,
      code: 'PERFORMANCE_ISSUE',
      category: 'SYSTEM',
      severity: 'LOW',
      component,
      metadata: {
        metric,
        value,
        threshold,
        performance: this.getPerformanceMetrics(),
      },
    });
  }

  // Get error report status
  public async getReportStatus(reportId: string): Promise<{
    reportId: string;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
    status: string;
  } | null> {
    try {
      const response = await fetch(`${this.reportEndpoint}?reportId=${reportId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get report status:', error);
      return null;
    }
  }

  // Private methods
  private async sendErrorReport(error: ClientErrorReport): Promise<ErrorReportResponse> {
    const response = await fetch(this.reportEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error),
    });

    const result = await response.json();
    return result;
  }

  private queueError(error: ClientErrorReport): void {
    if (this.reportQueue.length >= this.maxQueueSize) {
      // Remove oldest error to make room
      this.reportQueue.shift();
    }
    
    this.reportQueue.push(error);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('errorQueue', JSON.stringify(this.reportQueue));
    } catch (storageError) {
      console.warn('Failed to persist error queue:', storageError);
    }
  }

  private async flushQueue(): Promise<void> {
    if (!this.isOnline || this.reportQueue.length === 0) return;

    const errors = [...this.reportQueue];
    this.reportQueue = [];

    for (const error of errors) {
      try {
        await this.sendErrorReport(error);
      } catch (flushError) {
        // Re-queue failed errors
        this.queueError(error);
        console.error('Failed to flush error:', flushError);
      }
    }

    // Update localStorage
    try {
      localStorage.setItem('errorQueue', JSON.stringify(this.reportQueue));
    } catch (storageError) {
      console.warn('Failed to update error queue:', storageError);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportJSError(
        new Error(event.message),
        'GlobalErrorHandler',
        'uncaught_error'
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.reportJSError(error, 'GlobalErrorHandler', 'unhandled_rejection');
    });

    // Handle network errors (fetch failures)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.reportNetworkError(
            args[0] as string,
            response.status,
            response.statusText,
            'FetchInterceptor'
          );
        }
        
        return response;
      } catch (error) {
        this.reportNetworkError(
          args[0] as string,
          undefined,
          error instanceof Error ? error.message : 'Unknown error',
          'FetchInterceptor'
        );
        throw error;
      }
    };
  }

  private setupOnlineStatusMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;
  }

  private startPeriodicFlush(): void {
    // Flush queue every 30 seconds
    setInterval(() => {
      this.flushQueue();
    }, 30000);

    // Load persisted queue on startup
    try {
      const persistedQueue = localStorage.getItem('errorQueue');
      if (persistedQueue) {
        this.reportQueue = JSON.parse(persistedQueue);
      }
    } catch (error) {
      console.warn('Failed to load persisted error queue:', error);
    }
  }

  private getPerformanceMetrics(): Record<string, number> {
    if (!window.performance) return {};

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      memoryUsed: (performance as any).memory?.usedJSHeapSize || 0,
      memoryTotal: (performance as any).memory?.totalJSHeapSize || 0,
    };
  }
}

// Export singleton instance
export const clientErrorReporter = ClientErrorReporter.getInstance();

// Utility functions for common error reporting scenarios
export const ClientErrorUtils = {
  // Report form validation error
  reportFormError: (formName: string, field: string, error: string) =>
    clientErrorReporter.reportValidationError(field, '', error, `Form:${formName}`),

  // Report API call error
  reportAPIError: (endpoint: string, status: number, error: string) =>
    clientErrorReporter.reportNetworkError(endpoint, status, error, 'APIClient'),

  // Report component render error
  reportRenderError: (component: string, error: Error) =>
    clientErrorReporter.reportJSError(error, component, 'render'),

  // Report user interaction error
  reportInteractionError: (component: string, action: string, error: string) =>
    clientErrorReporter.reportUserActionError(action, error, component),

  // Report slow performance
  reportSlowPerformance: (component: string, operation: string, duration: number) =>
    clientErrorReporter.reportPerformanceIssue(
      `${operation}_duration`,
      duration,
      5000, // 5 second threshold
      component
    ),
};

// React hook for error reporting
export function useErrorReporter() {
  const reportError = React.useCallback((error: ClientErrorReport) => {
    return clientErrorReporter.reportError(error);
  }, []);

  const reportJSError = React.useCallback((error: Error, component?: string, action?: string) => {
    return clientErrorReporter.reportJSError(error, component, action);
  }, []);

  const reportNetworkError = React.useCallback((url: string, status?: number, statusText?: string, component?: string) => {
    return clientErrorReporter.reportNetworkError(url, status, statusText, component);
  }, []);

  return {
    reportError,
    reportJSError,
    reportNetworkError,
    getReportStatus: clientErrorReporter.getReportStatus.bind(clientErrorReporter),
  };
}