// Centralized error monitoring and reporting system
import { AppError, ErrorContext, ErrorSeverity, ErrorCategory } from './error-handler';
import { auditLogger } from './audit-logger';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: AppError;
  context: ErrorContext;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  topErrors: Array<{ code: string; count: number; lastOccurred: Date }>;
  affectedUsers: number;
  meanTimeToResolution: number;
  trends: {
    hourly: Array<{ hour: number; count: number }>;
    daily: Array<{ date: string; count: number }>;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    errorCode?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    threshold: number;
    timeWindow: number; // in minutes
  };
  actions: Array<{
    type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS';
    target: string;
    template?: string;
  }>;
  enabled: boolean;
  cooldown: number; // in minutes
  lastTriggered?: Date;
}

class ErrorMonitoring {
  private static instance: ErrorMonitoring;
  private errorReports = new Map<string, ErrorReport>();
  private errorCounts = new Map<string, { count: number; lastOccurred: Date }>();
  private alertRules: AlertRule[] = [];
  private alertCooldowns = new Map<string, Date>();

  private constructor() {
    this.setupDefaultAlertRules();
    this.startPeriodicCleanup();
  }

  public static getInstance(): ErrorMonitoring {
    if (!ErrorMonitoring.instance) {
      ErrorMonitoring.instance = new ErrorMonitoring();
    }
    return ErrorMonitoring.instance;
  }

  // Report an error for monitoring
  public async reportError(error: AppError, context: ErrorContext): Promise<string> {
    const reportId = this.generateReportId();
    const report: ErrorReport = {
      id: reportId,
      timestamp: new Date(),
      error,
      context,
      userAgent: context.userAgent,
      url: context.url,
      userId: context.userId,
      sessionId: context.sessionId,
      resolved: false,
    };

    // Store the report
    this.errorReports.set(reportId, report);

    // Update error counts
    const errorKey = `${error.category}:${error.code}`;
    this.errorCounts.set(errorKey, {
      count: (this.errorCounts.get(errorKey)?.count || 0) + 1,
      lastOccurred: new Date(),
    });

    // Check alert rules
    await this.checkAlertRules(error, context);

    // Log to audit system
    await this.logErrorReport(report);

    return reportId;
  }

  // Get error metrics and analytics
  public getErrorMetrics(timeRange: { start: Date; end: Date }): ErrorMetrics {
    const reportsInRange = Array.from(this.errorReports.values()).filter(
      report => report.timestamp >= timeRange.start && report.timestamp <= timeRange.end
    );

    const totalErrors = reportsInRange.length;
    const timeRangeHours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
    const errorRate = totalErrors / Math.max(timeRangeHours, 1);

    // Group by category
    const errorsByCategory = reportsInRange.reduce((acc, report) => {
      acc[report.error.category] = (acc[report.error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    // Group by severity
    const errorsBySeverity = reportsInRange.reduce((acc, report) => {
      acc[report.error.severity] = (acc[report.error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    // Top errors
    const errorCodeCounts = reportsInRange.reduce((acc, report) => {
      const key = report.error.code;
      if (!acc[key]) {
        acc[key] = { count: 0, lastOccurred: report.timestamp };
      }
      acc[key].count++;
      if (report.timestamp > acc[key].lastOccurred) {
        acc[key].lastOccurred = report.timestamp;
      }
      return acc;
    }, {} as Record<string, { count: number; lastOccurred: Date }>);

    const topErrors = Object.entries(errorCodeCounts)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Affected users
    const affectedUsers = new Set(
      reportsInRange.filter(r => r.userId).map(r => r.userId)
    ).size;

    // Mean time to resolution
    const resolvedReports = reportsInRange.filter(r => r.resolved && r.resolvedAt);
    const meanTimeToResolution = resolvedReports.length > 0
      ? resolvedReports.reduce((sum, report) => {
          const resolutionTime = report.resolvedAt!.getTime() - report.timestamp.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedReports.length / (1000 * 60) // Convert to minutes
      : 0;

    // Trends
    const hourlyTrends = this.calculateHourlyTrends(reportsInRange);
    const dailyTrends = this.calculateDailyTrends(reportsInRange);

    return {
      totalErrors,
      errorRate,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
      affectedUsers,
      meanTimeToResolution,
      trends: {
        hourly: hourlyTrends,
        daily: dailyTrends,
      },
    };
  }

  // Get error reports with filtering
  public getErrorReports(filters: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    userId?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): { reports: ErrorReport[]; total: number } {
    let filteredReports = Array.from(this.errorReports.values());

    // Apply filters
    if (filters.severity) {
      filteredReports = filteredReports.filter(r => r.error.severity === filters.severity);
    }
    if (filters.category) {
      filteredReports = filteredReports.filter(r => r.error.category === filters.category);
    }
    if (filters.userId) {
      filteredReports = filteredReports.filter(r => r.userId === filters.userId);
    }
    if (filters.resolved !== undefined) {
      filteredReports = filteredReports.filter(r => r.resolved === filters.resolved);
    }
    if (filters.startDate) {
      filteredReports = filteredReports.filter(r => r.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredReports = filteredReports.filter(r => r.timestamp <= filters.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredReports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredReports.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginatedReports = filteredReports.slice(offset, offset + limit);

    return { reports: paginatedReports, total };
  }

  // Resolve an error report
  public async resolveError(reportId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    const report = this.errorReports.get(reportId);
    if (!report) return false;

    report.resolved = true;
    report.resolvedAt = new Date();
    report.resolvedBy = resolvedBy;
    report.notes = notes;

    // Log resolution
    await auditLogger.log({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      userId: resolvedBy,
      resourceType: 'ERROR_REPORT',
      resourceId: reportId,
      action: 'resolve_error',
      details: { notes, originalError: report.error.code },
      ipAddress: 'unknown',
      userAgent: 'unknown',
      success: true,
    });

    return true;
  }

  // Add or update alert rule
  public addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = this.generateRuleId();
    const alertRule: AlertRule = { ...rule, id: ruleId };
    this.alertRules.push(alertRule);
    return ruleId;
  }

  // Remove alert rule
  public removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index === -1) return false;
    
    this.alertRules.splice(index, 1);
    return true;
  }

  // Get alert rules
  public getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // Private helper methods
  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkAlertRules(error: AppError, context: ErrorContext): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.alertCooldowns.get(rule.id);
      if (lastTriggered) {
        const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldown * 60 * 1000);
        if (new Date() < cooldownEnd) continue;
      }

      // Check if rule matches
      if (this.ruleMatches(rule, error)) {
        // Check threshold within time window
        const windowStart = new Date(Date.now() - rule.condition.timeWindow * 60 * 1000);
        const matchingErrors = Array.from(this.errorReports.values()).filter(
          report => report.timestamp >= windowStart && this.ruleMatches(rule, report.error)
        );

        if (matchingErrors.length >= rule.condition.threshold) {
          await this.triggerAlert(rule, error, context, matchingErrors.length);
          this.alertCooldowns.set(rule.id, new Date());
        }
      }
    }
  }

  private ruleMatches(rule: AlertRule, error: AppError): boolean {
    if (rule.condition.errorCode && rule.condition.errorCode !== error.code) return false;
    if (rule.condition.category && rule.condition.category !== error.category) return false;
    if (rule.condition.severity && rule.condition.severity !== error.severity) return false;
    return true;
  }

  private async triggerAlert(
    rule: AlertRule,
    error: AppError,
    context: ErrorContext,
    errorCount: number
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, rule, error, context, errorCount);
      } catch (alertError) {
        console.error('Failed to execute alert action:', alertError);
      }
    }

    // Log alert trigger
    await auditLogger.log({
      eventType: 'SYSTEM',
      severity: 'HIGH',
      resourceType: 'ALERT',
      action: 'alert_triggered',
      details: {
        ruleName: rule.name,
        errorCode: error.code,
        errorCount,
        threshold: rule.condition.threshold,
      },
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent || 'unknown',
      success: true,
    });
  }

  private async executeAlertAction(
    action: AlertRule['actions'][0],
    rule: AlertRule,
    error: AppError,
    context: ErrorContext,
    errorCount: number
  ): Promise<void> {
    const alertData = {
      ruleName: rule.name,
      errorCode: error.code,
      errorMessage: error.message,
      errorCount,
      threshold: rule.condition.threshold,
      timeWindow: rule.condition.timeWindow,
      context,
    };

    switch (action.type) {
      case 'EMAIL':
        await this.sendEmailAlert(action.target, alertData);
        break;
      case 'SLACK':
        await this.sendSlackAlert(action.target, alertData);
        break;
      case 'WEBHOOK':
        await this.sendWebhookAlert(action.target, alertData);
        break;
      case 'SMS':
        await this.sendSMSAlert(action.target, alertData);
        break;
    }
  }

  private async sendEmailAlert(email: string, data: any): Promise<void> {
    // This would integrate with your email service
    console.log('Email alert sent to:', email, data);
  }

  private async sendSlackAlert(webhook: string, data: any): Promise<void> {
    // This would integrate with Slack webhook
    console.log('Slack alert sent to:', webhook, data);
  }

  private async sendWebhookAlert(url: string, data: any): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Webhook alert failed:', error);
    }
  }

  private async sendSMSAlert(phone: string, data: any): Promise<void> {
    // This would integrate with SMS service
    console.log('SMS alert sent to:', phone, data);
  }

  private async logErrorReport(report: ErrorReport): Promise<void> {
    await auditLogger.log({
      eventType: 'SYSTEM',
      severity: report.error.severity,
      userId: report.userId,
      resourceType: 'ERROR_REPORT',
      resourceId: report.id,
      action: 'error_reported',
      details: {
        errorCode: report.error.code,
        errorCategory: report.error.category,
        errorMessage: report.error.message,
        context: report.context,
      },
      ipAddress: report.context.ipAddress || 'unknown',
      userAgent: report.context.userAgent || 'unknown',
      success: false,
      errorMessage: report.error.message,
    });
  }

  private calculateHourlyTrends(reports: ErrorReport[]): Array<{ hour: number; count: number }> {
    const hourCounts = new Array(24).fill(0);
    
    reports.forEach(report => {
      const hour = report.timestamp.getHours();
      hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  private calculateDailyTrends(reports: ErrorReport[]): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};
    
    reports.forEach(report => {
      const date = report.timestamp.toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private setupDefaultAlertRules(): void {
    // Critical error alert
    this.addAlertRule({
      name: 'Critical Error Alert',
      condition: {
        severity: 'CRITICAL',
        threshold: 1,
        timeWindow: 5,
      },
      actions: [
        { type: 'EMAIL', target: 'admin@example.com' },
        { type: 'SLACK', target: process.env.SLACK_WEBHOOK_URL || '' },
      ],
      enabled: true,
      cooldown: 15,
    });

    // High error rate alert
    this.addAlertRule({
      name: 'High Error Rate',
      condition: {
        threshold: 10,
        timeWindow: 10,
      },
      actions: [
        { type: 'EMAIL', target: 'devops@example.com' },
      ],
      enabled: true,
      cooldown: 30,
    });

    // Authentication failure alert
    this.addAlertRule({
      name: 'Authentication Failures',
      condition: {
        category: 'AUTHENTICATION',
        threshold: 5,
        timeWindow: 5,
      },
      actions: [
        { type: 'EMAIL', target: 'security@example.com' },
      ],
      enabled: true,
      cooldown: 10,
    });
  }

  private startPeriodicCleanup(): void {
    // Clean up old error reports every hour
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      for (const [id, report] of this.errorReports.entries()) {
        if (report.timestamp < cutoffDate) {
          this.errorReports.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoring.getInstance();