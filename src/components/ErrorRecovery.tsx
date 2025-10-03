'use client';

// Error recovery component with user guidance and retry mechanisms
import React, { useState, useEffect } from 'react';
import { clientErrorReporter } from '@/lib/client-error-reporter';

interface ErrorRecoveryProps {
  error: Error;
  errorId?: string;
  component?: string;
  onRetry?: () => void;
  onRecover?: () => void;
  showTechnicalDetails?: boolean;
  recoveryStrategies?: RecoveryStrategy[];
}

interface RecoveryStrategy {
  id: string;
  title: string;
  description: string;
  action: () => Promise<void> | void;
  icon?: React.ReactNode;
  priority: number;
}

export default function ErrorRecovery({
  error,
  errorId,
  component,
  onRetry,
  onRecover,
  showTechnicalDetails = false,
  recoveryStrategies = [],
}: ErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [reportStatus, setReportStatus] = useState<string>('reported');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const maxRetries = 3;
  const canRetry = onRetry && retryCount < maxRetries;

  // Default recovery strategies
  const defaultStrategies: RecoveryStrategy[] = [
    {
      id: 'refresh',
      title: 'Refresh the page',
      description: 'Reload the current page to start fresh',
      action: () => window.location.reload(),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      priority: 1,
    },
    {
      id: 'home',
      title: 'Go to homepage',
      description: 'Navigate back to the main page',
      action: () => { window.location.href = '/'; },
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      priority: 2,
    },
    {
      id: 'back',
      title: 'Go back',
      description: 'Return to the previous page',
      action: () => window.history.back(),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      ),
      priority: 3,
    },
    {
      id: 'clear-cache',
      title: 'Clear browser cache',
      description: 'Clear cached data that might be causing issues',
      action: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      },
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      priority: 4,
    },
  ];

  const allStrategies = [...recoveryStrategies, ...defaultStrategies]
    .sort((a, b) => a.priority - b.priority);

  useEffect(() => {
    // Check report status if errorId is provided
    if (errorId) {
      checkReportStatus();
    }
  }, [errorId]);

  const checkReportStatus = async () => {
    if (!errorId) return;
    
    try {
      const status = await clientErrorReporter.getReportStatus(errorId);
      if (status) {
        setReportStatus(status.resolved ? 'resolved' : 'investigating');
      }
    } catch (error) {
      console.error('Failed to check report status:', error);
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
      onRecover?.();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      // Report retry failure
      clientErrorReporter.reportUserActionError(
        'retry',
        retryError instanceof Error ? retryError.message : 'Retry failed',
        component,
        { originalError: error.message, retryCount: retryCount + 1 }
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleStrategyAction = async (strategy: RecoveryStrategy) => {
    setSelectedStrategy(strategy.id);
    
    try {
      await strategy.action();
      onRecover?.();
    } catch (actionError) {
      console.error('Recovery strategy failed:', actionError);
      clientErrorReporter.reportUserActionError(
        'recovery_strategy',
        actionError instanceof Error ? actionError.message : 'Recovery strategy failed',
        component,
        { strategy: strategy.id, originalError: error.message }
      );
    } finally {
      setSelectedStrategy(null);
    }
  };

  const getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Validation Error';
    }
    if (message.includes('timeout')) {
      return 'Timeout Error';
    }
    
    return 'Application Error';
  };

  const getErrorGuidance = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'This appears to be a network connectivity issue. Please check your internet connection and try again.';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You may need to sign in again or contact support if you believe you should have access.';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and make sure all required fields are filled correctly.';
    }
    if (message.includes('timeout')) {
      return 'The request took too long to complete. This might be due to slow internet or server issues.';
    }
    
    return 'An unexpected error occurred. Try refreshing the page or contact support if the problem persists.';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'investigating': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {getErrorCategory(error)}
          </h3>
          <p className="text-gray-600 text-sm mb-3">
            {getErrorGuidance(error)}
          </p>
          
          {/* Report Status */}
          {errorId && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-500">Report Status:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(reportStatus)}`}>
                {reportStatus === 'resolved' ? 'Resolved' : 
                 reportStatus === 'investigating' ? 'Under Investigation' : 'Reported'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Retry Section */}
      {canRetry && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Try Again</h4>
              <p className="text-sm text-blue-700">
                Attempt to retry the operation ({retryCount}/{maxRetries} attempts used)
              </p>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Retrying...
                </div>
              ) : (
                'Retry'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Recovery Strategies */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Recovery Options</h4>
        <div className="space-y-2">
          {allStrategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => handleStrategyAction(strategy)}
              disabled={selectedStrategy === strategy.id}
              className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 text-gray-400">
                {selectedStrategy === strategy.id ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  strategy.icon
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{strategy.title}</div>
                <div className="text-xs text-gray-500">{strategy.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className={`h-4 w-4 transform transition-transform ${showDetails ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Technical Details
        </button>
        
        {showDetails && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="space-y-2 text-xs text-gray-600 font-mono">
              {errorId && (
                <div>
                  <span className="font-semibold">Report ID:</span> {errorId}
                </div>
              )}
              <div>
                <span className="font-semibold">Error:</span> {error.name}
              </div>
              <div>
                <span className="font-semibold">Message:</span> {error.message}
              </div>
              {component && (
                <div>
                  <span className="font-semibold">Component:</span> {component}
                </div>
              )}
              <div>
                <span className="font-semibold">Timestamp:</span> {new Date().toISOString()}
              </div>
              <div>
                <span className="font-semibold">User Agent:</span> {navigator.userAgent}
              </div>
              <div>
                <span className="font-semibold">URL:</span> {window.location.href}
              </div>
              {showTechnicalDetails && error.stack && (
                <div>
                  <span className="font-semibold">Stack Trace:</span>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">{error.stack}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact Support */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          If the problem persists, please{' '}
          <a href="/support" className="text-blue-600 hover:text-blue-800 underline">
            contact support
          </a>
          {errorId && (
            <span> and reference error ID: <code className="font-mono">{errorId}</code></span>
          )}
        </p>
      </div>
    </div>
  );
}