// Comprehensive audit logging system for PHI access and security monitoring
import { prisma } from './db';
import { NextRequest } from 'next/server';

export type AuditEventType = 
  | 'PHI_ACCESS'
  | 'PHI_CREATED'
  | 'PHI_UPDATED'
  | 'PHI_DELETED'
  | 'CLAIM_CREATED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_VIEWED'
  | 'CLAIM_UPDATED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_ACCESSED'
  | 'DOCUMENT_DELETED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_FAILED_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'SECURITY_VIOLATION'
  | 'DATA_EXPORT'
  | 'ADMIN_ACTION'
  | 'API_ACCESS'
  | 'UNAUTHORIZED_ACCESS';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
}

class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: AuditLogEntry[] = [];
  private isProcessing = false;

  private constructor() {
    // Start background processing
    this.startBackgroundProcessing();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Log audit event
  public async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Add to queue for batch processing
    this.logQueue.push(auditEntry);

    // For critical events, log immediately
    if (entry.severity === 'CRITICAL') {
      await this.writeToDatabase([auditEntry]);
    }
  }

  // Log PHI access
  public async logPHIAccess(
    context: SecurityContext,
    resourceType: string,
    resourceId: string,
    action: string,
    success: boolean = true,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      eventType: 'PHI_ACCESS',
      severity: 'HIGH',
      userId: context.userId,
      resourceType,
      resourceId,
      action,
      details: {
        ...details,
        requestId: context.requestId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success,
    });
  }

  // Log security violation
  public async logSecurityViolation(
    context: SecurityContext,
    violationType: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      eventType: 'SECURITY_VIOLATION',
      severity: 'CRITICAL',
      userId: context.userId,
      resourceType: 'SECURITY',
      action: violationType,
      details: {
        ...details,
        requestId: context.requestId,
        violationType,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success: false,
    });

    // Trigger security alert
    await this.triggerSecurityAlert(violationType, context, details);
  }

  // Log user authentication events
  public async logAuthEvent(
    eventType: 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_FAILED_LOGIN',
    context: SecurityContext,
    success: boolean = true,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      eventType,
      severity: success ? 'LOW' : 'MEDIUM',
      userId: context.userId,
      resourceType: 'AUTH',
      action: eventType.toLowerCase().replace('user_', ''),
      details: {
        ...details,
        requestId: context.requestId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success,
    });
  }

  // Log claim operations
  public async logClaimOperation(
    context: SecurityContext,
    claimId: string,
    action: string,
    success: boolean = true,
    details: Record<string, any> = {}
  ): Promise<void> {
    const eventType = this.getClaimEventType(action);
    
    await this.log({
      eventType,
      severity: 'MEDIUM',
      userId: context.userId,
      resourceType: 'CLAIM',
      resourceId: claimId,
      action,
      details: {
        ...details,
        requestId: context.requestId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success,
    });
  }

  // Log document operations
  public async logDocumentOperation(
    context: SecurityContext,
    documentId: string,
    action: string,
    success: boolean = true,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      eventType: 'DOCUMENT_ACCESSED',
      severity: 'HIGH', // Documents contain PHI
      userId: context.userId,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      action,
      details: {
        ...details,
        requestId: context.requestId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success,
    });
  }

  // Get audit logs with filtering
  public async getAuditLogs(filters: {
    userId?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const where: any = {};

      if (filters.userId) where.userId = filters.userId;
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.severity) where.severity = filters.severity;
      if (filters.resourceType) where.resourceType = filters.resourceType;
      if (filters.resourceId) where.resourceId = filters.resourceId;
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: filters.limit || 100,
          skip: filters.offset || 0,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs: logs.map(log => ({
          id: log.id,
          eventType: log.eventType as AuditEventType,
          severity: log.severity as AuditSeverity,
          userId: log.userId || undefined,
          resourceType: log.resourceType,
          resourceId: log.resourceId || undefined,
          action: log.action,
          details: log.details as Record<string, any>,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          sessionId: log.sessionId || undefined,
          timestamp: log.timestamp,
          success: log.success,
          errorMessage: log.errorMessage || undefined,
          metadata: log.metadata as Record<string, any> || undefined,
        })),
        total,
      };
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return { logs: [], total: 0 };
    }
  }

  // Generate security report
  public async generateSecurityReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: {
      totalEvents: number;
      securityViolations: number;
      failedLogins: number;
      phiAccess: number;
      criticalEvents: number;
    };
    topUsers: Array<{ userId: string; eventCount: number }>;
    eventsByType: Array<{ eventType: string; count: number }>;
    securityViolations: AuditLogEntry[];
  }> {
    try {
      const logs = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 10000, // Get all events for analysis
      });

      const summary = {
        totalEvents: logs.total,
        securityViolations: logs.logs.filter(l => l.eventType === 'SECURITY_VIOLATION').length,
        failedLogins: logs.logs.filter(l => l.eventType === 'USER_FAILED_LOGIN').length,
        phiAccess: logs.logs.filter(l => l.eventType === 'PHI_ACCESS').length,
        criticalEvents: logs.logs.filter(l => l.severity === 'CRITICAL').length,
      };

      // Top users by activity
      const userActivity = logs.logs.reduce((acc, log) => {
        if (log.userId) {
          acc[log.userId] = (acc[log.userId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topUsers = Object.entries(userActivity)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      // Events by type
      const eventTypeCount = logs.logs.reduce((acc, log) => {
        acc[log.eventType] = (acc[log.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventsByType = Object.entries(eventTypeCount)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count);

      const securityViolations = logs.logs.filter(l => 
        l.eventType === 'SECURITY_VIOLATION' || l.severity === 'CRITICAL'
      );

      return {
        summary,
        topUsers,
        eventsByType,
        securityViolations,
      };
    } catch (error) {
      console.error('Failed to generate security report:', error);
      throw new Error('Failed to generate security report');
    }
  }

  // Private methods
  private getClaimEventType(action: string): AuditEventType {
    switch (action.toLowerCase()) {
      case 'create': return 'CLAIM_CREATED';
      case 'submit': return 'CLAIM_SUBMITTED';
      case 'view': return 'CLAIM_VIEWED';
      case 'update': return 'CLAIM_UPDATED';
      default: return 'CLAIM_VIEWED';
    }
  }

  private async startBackgroundProcessing(): Promise<void> {
    setInterval(async () => {
      if (!this.isProcessing && this.logQueue.length > 0) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;
    try {
      const batch = this.logQueue.splice(0, 100); // Process in batches of 100
      await this.writeToDatabase(batch);
    } catch (error) {
      console.error('Failed to process audit log queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async writeToDatabase(entries: AuditLogEntry[]): Promise<void> {
    try {
      await prisma.auditLog.createMany({
        data: entries.map(entry => ({
          eventType: entry.eventType,
          severity: entry.severity,
          userId: entry.userId,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          action: entry.action,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
          timestamp: entry.timestamp,
          success: entry.success,
          errorMessage: entry.errorMessage,
          metadata: entry.metadata,
        })),
      });
    } catch (error) {
      console.error('Failed to write audit logs to database:', error);
      // Re-queue failed entries
      this.logQueue.unshift(...entries);
    }
  }

  private async triggerSecurityAlert(
    violationType: string,
    context: SecurityContext,
    details: Record<string, any>
  ): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Send alerts to security team
      // 2. Potentially block the user/IP
      // 3. Trigger automated responses
      
      console.error('SECURITY ALERT:', {
        violationType,
        userId: context.userId,
        ipAddress: context.ipAddress,
        timestamp: new Date().toISOString(),
        details,
      });

      // TODO: Implement actual alerting mechanism
      // - Email alerts to security team
      // - Slack/Teams notifications
      // - Integration with SIEM systems
      // - Automated blocking for severe violations
    } catch (error) {
      console.error('Failed to trigger security alert:', error);
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Helper function to extract security context from request
export function getSecurityContext(request: NextRequest, userId?: string): SecurityContext {
  return {
    userId,
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
    sessionId: request.cookies.get('session-id')?.value,
  };
}

// Middleware helper for automatic audit logging
export function withAuditLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  eventType: AuditEventType,
  resourceType: string,
  getResourceId?: (...args: T) => string
) {
  return async (...args: T): Promise<R> => {
    const context = args[0] as SecurityContext; // Assume first arg is context
    const resourceId = getResourceId ? getResourceId(...args) : undefined;
    
    try {
      const result = await fn(...args);
      
      await auditLogger.log({
        eventType,
        severity: 'MEDIUM',
        userId: context.userId,
        resourceType,
        resourceId,
        action: fn.name || 'unknown',
        details: { args: args.slice(1) }, // Exclude context from details
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        success: true,
      });
      
      return result;
    } catch (error) {
      await auditLogger.log({
        eventType,
        severity: 'HIGH',
        userId: context.userId,
        resourceType,
        resourceId,
        action: fn.name || 'unknown',
        details: { args: args.slice(1) },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  };
}