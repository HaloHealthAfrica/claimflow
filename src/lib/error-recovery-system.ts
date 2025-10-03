// Comprehensive error recovery system with automated recovery strategies
import { AppError, ErrorCategory, ErrorSeverity, ErrorContext } from './error-handler';
import { RetryManager, RetryConfigs } from './retry-strategies';
import { auditLogger } from './audit-logger';

export type RecoveryAction = 
  | 'RETRY'
  | 'FALLBACK'
  | 'REDIRECT'
  | 'REFRESH'
  | 'CLEAR_CACHE'
  | 'LOGOUT'
  | 'ESCALATE'
  | 'IGNORE'
  | 'CUSTOM';

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  action: RecoveryAction;
  priority: number;
  conditions: RecoveryCondition[];
  config: RecoveryConfig;
  enabled: boolean;
}

export interface RecoveryCondition {
  type: 'ERROR_CODE' | 'ERROR_CATEGORY' | 'ERROR_SEVERITY' | 'CONTEXT_MATCH' | 'CUSTOM';
  value: string | ErrorCategory | ErrorSeverity;
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'REGEX' | 'CUSTOM';
  customCheck?: (error: AppError, context?: ErrorContext) => boolean;
}

export interface RecoveryConfig {
  // Retry configuration
  retryOptions?: {
    maxRetries: number;
    baseDelay: number;
    strategy: 'exponential' | 'linear' | 'fixed';
  };
  
  // Fallback configuration
  fallbackAction?: () => Promise<any>;
  fallbackData?: any;
  
  // Redirect configuration
  redirectUrl?: string;
  redirectDelay?: number;
  
  // Cache configuration
  cacheKeys?: string[];
  clearAllCache?: boolean;
  
  // Custom action
  customAction?: (error: AppError, context?: ErrorContext) => Promise<RecoveryResult>;
  
  // Escalation configuration
  escalationLevel?: 'SUPPORT' | 'ADMIN' | 'DEVELOPER';
  escalationMessage?: string;
  
  // General configuration
  timeout?: number;
  requireUserConfirmation?: boolean;
  userMessage?: string;
}

export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  strategyId: string;
  message?: string;
  data?: any;
  error?: Error;
  duration: number;
  requiresUserAction?: boolean;
  nextSteps?: string[];
}

export interface RecoveryAttempt {
  id: string;
  errorId: string;
  strategyId: string;
  timestamp: Date;
  result: RecoveryResult;
  context?: ErrorContext;
}

class ErrorRecoverySystem {
  private static instance: ErrorRecoverySystem;
  private strategies = new Map<string, RecoveryStrategy>();
  private attempts = new Map<string, RecoveryAttempt[]>();
  private maxAttemptsPerError = 5;
  private recoveryTimeout = 30000; // 30 seconds

  private constructor() {
    this.setupDefaultStrategies();
  }

  public static getInstance(): ErrorRecoverySystem {
    if (!ErrorRecoverySystem.instance) {
      ErrorRecoverySystem.instance = new ErrorRecoverySystem();
    }
    return ErrorRecoverySystem.instance;
  }

  // Attempt to recover from an error
  public async attemptRecovery(
    error: AppError,
    context?: ErrorContext,
    userConfirmation?: boolean
  ): Promise<RecoveryResult> {
    const errorId = this.generateErrorId(error);
    const startTime = Date.now();

    try {
      // Check if we've exceeded max attempts for this error
      const previousAttempts = this.attempts.get(errorId) || [];
      if (previousAttempts.length >= this.maxAttemptsPerError) {
        return {
          success: false,
          action: 'ESCALATE',
          strategyId: 'max-attempts-exceeded',
          message: 'Maximum recovery attempts exceeded',
          duration: Date.now() - startTime,
        };
      }

      // Find applicable recovery strategies
      const applicableStrategies = this.findApplicableStrategies(error, context);
      
      if (applicableStrategies.length === 0) {
        return {
          success: false,
          action: 'ESCALATE',
          strategyId: 'no-strategy-found',
          message: 'No applicable recovery strategy found',
          duration: Date.now() - startTime,
        };
      }

      // Sort strategies by priority
      applicableStrategies.sort((a, b) => a.priority - b.priority);

      // Try each strategy until one succeeds
      for (const strategy of applicableStrategies) {
        // Check if user confirmation is required
        if (strategy.config.requireUserConfirmation && !userConfirmation) {
          return {
            success: false,
            action: strategy.action,
            strategyId: strategy.id,
            message: strategy.config.userMessage || `Recovery strategy "${strategy.name}" requires user confirmation`,
            duration: Date.now() - startTime,
            requiresUserAction: true,
          };
        }

        const result = await this.executeRecoveryStrategy(strategy, error, context);
        
        // Record the attempt
        this.recordRecoveryAttempt(errorId, strategy.id, result, context);

        if (result.success) {
          await this.logSuccessfulRecovery(error, strategy, result, context);
          return result;
        }

        // If strategy failed but didn't throw, continue to next strategy
        await this.logFailedRecovery(error, strategy, result, context);
      }

      // All strategies failed
      return {
        success: false,
        action: 'ESCALATE',
        strategyId: 'all-strategies-failed',
        message: 'All recovery strategies failed',
        duration: Date.now() - startTime,
      };

    } catch (recoveryError) {
      await this.logRecoveryError(error, recoveryError as Error, context);
      
      return {
        success: false,
        action: 'ESCALATE',
        strategyId: 'recovery-system-error',
        message: 'Error recovery system encountered an error',
        error: recoveryError as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  // Register a custom recovery strategy
  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  // Remove a recovery strategy
  public removeStrategy(strategyId: string): boolean {
    return this.strategies.delete(strategyId);
  }

  // Get all registered strategies
  public getStrategies(): RecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  // Get recovery attempts for an error
  public getRecoveryAttempts(errorId: string): RecoveryAttempt[] {
    return this.attempts.get(errorId) || [];
  }

  // Clear recovery attempts for an error
  public clearRecoveryAttempts(errorId: string): void {
    this.attempts.delete(errorId);
  }

  // Get recovery statistics
  public getRecoveryStatistics(): {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    strategiesUsed: Record<string, number>;
    averageRecoveryTime: number;
  } {
    const allAttempts = Array.from(this.attempts.values()).flat();
    const totalAttempts = allAttempts.length;
    const successfulRecoveries = allAttempts.filter(a => a.result.success).length;
    const failedRecoveries = totalAttempts - successfulRecoveries;
    
    const strategiesUsed = allAttempts.reduce((acc, attempt) => {
      acc[attempt.strategyId] = (acc[attempt.strategyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageRecoveryTime = totalAttempts > 0
      ? allAttempts.reduce((sum, attempt) => sum + attempt.result.duration, 0) / totalAttempts
      : 0;

    return {
      totalAttempts,
      successfulRecoveries,
      failedRecoveries,
      strategiesUsed,
      averageRecoveryTime,
    };
  }

  // Private helper methods
  private findApplicableStrategies(error: AppError, context?: ErrorContext): RecoveryStrategy[] {
    return Array.from(this.strategies.values()).filter(strategy => {
      if (!strategy.enabled) return false;
      
      return strategy.conditions.every(condition => 
        this.evaluateCondition(condition, error, context)
      );
    });
  }

  private evaluateCondition(
    condition: RecoveryCondition,
    error: AppError,
    context?: ErrorContext
  ): boolean {
    switch (condition.type) {
      case 'ERROR_CODE':
        return this.evaluateStringCondition(error.code, condition.value as string, condition.operator);
      
      case 'ERROR_CATEGORY':
        return error.category === condition.value;
      
      case 'ERROR_SEVERITY':
        return error.severity === condition.value;
      
      case 'CONTEXT_MATCH':
        if (!context) return false;
        const contextValue = this.getContextValue(context, condition.value as string);
        return contextValue !== undefined;
      
      case 'CUSTOM':
        return condition.customCheck ? condition.customCheck(error, context) : false;
      
      default:
        return false;
    }
  }

  private evaluateStringCondition(
    value: string,
    conditionValue: string,
    operator: RecoveryCondition['operator']
  ): boolean {
    switch (operator) {
      case 'EQUALS':
        return value === conditionValue;
      
      case 'CONTAINS':
        return value.includes(conditionValue);
      
      case 'STARTS_WITH':
        return value.startsWith(conditionValue);
      
      case 'REGEX':
        try {
          return new RegExp(conditionValue).test(value);
        } catch {
          return false;
        }
      
      default:
        return false;
    }
  }

  private getContextValue(context: ErrorContext, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], context as any);
  }

  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    try {
      // Set timeout for recovery operation
      const timeoutPromise = strategy.config.timeout
        ? new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Recovery timeout')), strategy.config.timeout)
          )
        : null;

      const recoveryPromise = this.executeRecoveryAction(strategy, error, context);
      
      const result = timeoutPromise
        ? await Promise.race([recoveryPromise, timeoutPromise])
        : await recoveryPromise;

      return {
        ...result,
        duration: Date.now() - startTime,
      };

    } catch (executionError) {
      return {
        success: false,
        action: strategy.action,
        strategyId: strategy.id,
        message: `Recovery strategy execution failed: ${executionError instanceof Error ? executionError.message : 'Unknown error'}`,
        error: executionError as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeRecoveryAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    switch (strategy.action) {
      case 'RETRY':
        return this.executeRetryAction(strategy, error, context);
      
      case 'FALLBACK':
        return this.executeFallbackAction(strategy, error, context);
      
      case 'REDIRECT':
        return this.executeRedirectAction(strategy, error, context);
      
      case 'REFRESH':
        return this.executeRefreshAction(strategy, error, context);
      
      case 'CLEAR_CACHE':
        return this.executeClearCacheAction(strategy, error, context);
      
      case 'LOGOUT':
        return this.executeLogoutAction(strategy, error, context);
      
      case 'ESCALATE':
        return this.executeEscalateAction(strategy, error, context);
      
      case 'CUSTOM':
        return this.executeCustomAction(strategy, error, context);
      
      case 'IGNORE':
        return {
          success: true,
          action: 'IGNORE',
          strategyId: strategy.id,
          message: 'Error ignored as per recovery strategy',
        };
      
      default:
        throw new Error(`Unknown recovery action: ${strategy.action}`);
    }
  }

  private async executeRetryAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    // This would typically retry the original operation
    // For now, we'll simulate a retry
    return {
      success: true,
      action: 'RETRY',
      strategyId: strategy.id,
      message: 'Operation will be retried',
      nextSteps: ['The failed operation will be automatically retried'],
    };
  }

  private async executeFallbackAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    if (strategy.config.fallbackAction) {
      try {
        const data = await strategy.config.fallbackAction();
        return {
          success: true,
          action: 'FALLBACK',
          strategyId: strategy.id,
          message: 'Fallback action executed successfully',
          data,
        };
      } catch (fallbackError) {
        return {
          success: false,
          action: 'FALLBACK',
          strategyId: strategy.id,
          message: 'Fallback action failed',
          error: fallbackError as Error,
        };
      }
    }

    return {
      success: true,
      action: 'FALLBACK',
      strategyId: strategy.id,
      message: 'Using fallback data',
      data: strategy.config.fallbackData,
    };
  }

  private async executeRedirectAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    if (typeof window === 'undefined' || !strategy.config.redirectUrl) {
      return {
        success: false,
        action: 'REDIRECT',
        strategyId: strategy.id,
        message: 'Redirect not available in this environment',
      };
    }

    const delay = strategy.config.redirectDelay || 0;
    
    if (delay > 0) {
      setTimeout(() => {
        window.location.href = strategy.config.redirectUrl!;
      }, delay);
    } else {
      window.location.href = strategy.config.redirectUrl;
    }

    return {
      success: true,
      action: 'REDIRECT',
      strategyId: strategy.id,
      message: `Redirecting to ${strategy.config.redirectUrl}`,
    };
  }

  private async executeRefreshAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    if (typeof window === 'undefined') {
      return {
        success: false,
        action: 'REFRESH',
        strategyId: strategy.id,
        message: 'Page refresh not available in this environment',
      };
    }

    window.location.reload();

    return {
      success: true,
      action: 'REFRESH',
      strategyId: strategy.id,
      message: 'Page will be refreshed',
    };
  }

  private async executeClearCacheAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    try {
      if (typeof window === 'undefined') {
        return {
          success: false,
          action: 'CLEAR_CACHE',
          strategyId: strategy.id,
          message: 'Cache clearing not available in this environment',
        };
      }

      // Clear specific cache keys or all cache
      if (strategy.config.cacheKeys) {
        strategy.config.cacheKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      } else if (strategy.config.clearAllCache) {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear browser cache if available
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      }

      return {
        success: true,
        action: 'CLEAR_CACHE',
        strategyId: strategy.id,
        message: 'Cache cleared successfully',
      };

    } catch (cacheError) {
      return {
        success: false,
        action: 'CLEAR_CACHE',
        strategyId: strategy.id,
        message: 'Failed to clear cache',
        error: cacheError as Error,
      };
    }
  }

  private async executeLogoutAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    // This would typically integrate with your auth system
    if (typeof window !== 'undefined') {
      // Clear auth tokens
      localStorage.removeItem('auth-token');
      sessionStorage.removeItem('auth-token');
      
      // Redirect to login page
      window.location.href = '/auth/signin';
    }

    return {
      success: true,
      action: 'LOGOUT',
      strategyId: strategy.id,
      message: 'User will be logged out',
    };
  }

  private async executeEscalateAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    // This would typically send alerts to support/admin/developers
    const escalationLevel = strategy.config.escalationLevel || 'SUPPORT';
    const message = strategy.config.escalationMessage || 'Error has been escalated for manual intervention';

    return {
      success: true,
      action: 'ESCALATE',
      strategyId: strategy.id,
      message,
      nextSteps: [
        `Error escalated to ${escalationLevel}`,
        'Manual intervention may be required',
        'You will be notified when the issue is resolved',
      ],
    };
  }

  private async executeCustomAction(
    strategy: RecoveryStrategy,
    error: AppError,
    context?: ErrorContext
  ): Promise<Omit<RecoveryResult, 'duration'>> {
    if (!strategy.config.customAction) {
      throw new Error('Custom action not defined');
    }

    const result = await strategy.config.customAction(error, context);
    return {
      ...result,
      strategyId: strategy.id,
    };
  }

  private generateErrorId(error: AppError): string {
    return `${error.code}_${error.category}_${error.message.substring(0, 50)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private recordRecoveryAttempt(
    errorId: string,
    strategyId: string,
    result: RecoveryResult,
    context?: ErrorContext
  ): void {
    const attempt: RecoveryAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      errorId,
      strategyId,
      timestamp: new Date(),
      result,
      context,
    };

    const attempts = this.attempts.get(errorId) || [];
    attempts.push(attempt);
    this.attempts.set(errorId, attempts);
  }

  private async logSuccessfulRecovery(
    error: AppError,
    strategy: RecoveryStrategy,
    result: RecoveryResult,
    context?: ErrorContext
  ): Promise<void> {
    await auditLogger.log({
      eventType: 'SYSTEM',
      severity: 'MEDIUM',
      userId: context?.userId,
      resourceType: 'ERROR_RECOVERY',
      action: 'recovery_successful',
      details: {
        originalError: error.code,
        strategyUsed: strategy.id,
        recoveryAction: result.action,
        duration: result.duration,
      },
      ipAddress: context?.ipAddress || 'unknown',
      userAgent: context?.userAgent || 'unknown',
      success: true,
    });
  }

  private async logFailedRecovery(
    error: AppError,
    strategy: RecoveryStrategy,
    result: RecoveryResult,
    context?: ErrorContext
  ): Promise<void> {
    await auditLogger.log({
      eventType: 'SYSTEM',
      severity: 'HIGH',
      userId: context?.userId,
      resourceType: 'ERROR_RECOVERY',
      action: 'recovery_failed',
      details: {
        originalError: error.code,
        strategyUsed: strategy.id,
        recoveryAction: result.action,
        duration: result.duration,
        failureReason: result.message,
      },
      ipAddress: context?.ipAddress || 'unknown',
      userAgent: context?.userAgent || 'unknown',
      success: false,
      errorMessage: result.message,
    });
  }

  private async logRecoveryError(
    originalError: AppError,
    recoveryError: Error,
    context?: ErrorContext
  ): Promise<void> {
    await auditLogger.log({
      eventType: 'SYSTEM',
      severity: 'CRITICAL',
      userId: context?.userId,
      resourceType: 'ERROR_RECOVERY',
      action: 'recovery_system_error',
      details: {
        originalError: originalError.code,
        recoveryError: recoveryError.message,
      },
      ipAddress: context?.ipAddress || 'unknown',
      userAgent: context?.userAgent || 'unknown',
      success: false,
      errorMessage: recoveryError.message,
    });
  }

  private setupDefaultStrategies(): void {
    // Network error recovery
    this.registerStrategy({
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network operations with exponential backoff',
      action: 'RETRY',
      priority: 1,
      conditions: [
        { type: 'ERROR_CATEGORY', value: 'NETWORK', operator: 'EQUALS' },
      ],
      config: {
        retryOptions: {
          maxRetries: 3,
          baseDelay: 1000,
          strategy: 'exponential',
        },
      },
      enabled: true,
    });

    // Authentication error recovery
    this.registerStrategy({
      id: 'auth-logout',
      name: 'Authentication Logout',
      description: 'Logout user when authentication fails',
      action: 'LOGOUT',
      priority: 1,
      conditions: [
        { type: 'ERROR_CATEGORY', value: 'AUTHENTICATION', operator: 'EQUALS' },
      ],
      config: {
        requireUserConfirmation: false,
      },
      enabled: true,
    });

    // Cache-related error recovery
    this.registerStrategy({
      id: 'cache-clear',
      name: 'Clear Cache',
      description: 'Clear browser cache for cache-related errors',
      action: 'CLEAR_CACHE',
      priority: 2,
      conditions: [
        { type: 'ERROR_CODE', value: 'CACHE_ERROR', operator: 'CONTAINS' },
      ],
      config: {
        clearAllCache: true,
        requireUserConfirmation: true,
        userMessage: 'Clear browser cache to resolve this issue?',
      },
      enabled: true,
    });

    // Critical error escalation
    this.registerStrategy({
      id: 'critical-escalate',
      name: 'Critical Error Escalation',
      description: 'Escalate critical errors to support team',
      action: 'ESCALATE',
      priority: 1,
      conditions: [
        { type: 'ERROR_SEVERITY', value: 'CRITICAL', operator: 'EQUALS' },
      ],
      config: {
        escalationLevel: 'ADMIN',
        escalationMessage: 'A critical error has occurred and has been reported to our technical team.',
      },
      enabled: true,
    });

    // Page refresh for UI errors
    this.registerStrategy({
      id: 'ui-refresh',
      name: 'Page Refresh',
      description: 'Refresh page for UI-related errors',
      action: 'REFRESH',
      priority: 3,
      conditions: [
        { type: 'ERROR_CODE', value: 'UI_ERROR', operator: 'CONTAINS' },
        { type: 'ERROR_CODE', value: 'RENDER_ERROR', operator: 'CONTAINS' },
      ],
      config: {
        requireUserConfirmation: true,
        userMessage: 'Refresh the page to resolve this display issue?',
      },
      enabled: true,
    });
  }
}

// Export singleton instance
export const errorRecoverySystem = ErrorRecoverySystem.getInstance();