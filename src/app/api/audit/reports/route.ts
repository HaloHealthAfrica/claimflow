// API routes for security reports and analytics
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { withSecurity } from '@/lib/security-middleware';
import { RateLimitConfigs } from '@/lib/rate-limiter';

// GET - Generate security report (admin only)
export const GET = withSecurity({
  requireAuth: true,
  allowedRoles: ['admin', 'security_officer'],
  rateLimitKey: 'security_report',
  rateLimitMax: 5,
  rateLimitWindow: 3600,
  auditLevel: 'HIGH',
})(async function(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['admin', 'security_officer'].includes(user.role || '')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse date range (default to last 30 days)
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date();
    
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const reportType = searchParams.get('type') || 'summary';

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_DATE_RANGE', message: 'Start date must be before end date' } },
        { status: 400 }
      );
    }

    // Limit date range to prevent excessive queries
    const maxDays = 365;
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { success: false, error: { code: 'DATE_RANGE_TOO_LARGE', message: `Date range cannot exceed ${maxDays} days` } },
        { status: 400 }
      );
    }

    let reportData;

    switch (reportType) {
      case 'summary':
        reportData = await auditLogger.generateSecurityReport(startDate, endDate);
        break;
        
      case 'detailed':
        reportData = await generateDetailedSecurityReport(startDate, endDate);
        break;
        
      case 'compliance':
        reportData = await generateComplianceReport(startDate, endDate);
        break;
        
      case 'phi_access':
        reportData = await generatePHIAccessReport(startDate, endDate);
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_REPORT_TYPE', message: 'Invalid report type' } },
          { status: 400 }
        );
    }

    // Log report generation
    await auditLogger.log({
      eventType: 'DATA_EXPORT',
      severity: 'HIGH',
      userId: user.id,
      resourceType: 'SECURITY_REPORT',
      action: 'generate_report',
      details: {
        reportType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        recordCount: reportData.summary?.totalEvents || 0,
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        report: reportData,
        metadata: {
          reportType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          generatedAt: new Date().toISOString(),
          generatedBy: user.id,
        },
      },
    });
  } catch (error) {
    console.error('Failed to generate security report:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REPORT_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate security report',
        },
      },
      { status: 500 }
    );
  }
});

// Helper functions for different report types
async function generateDetailedSecurityReport(startDate: Date, endDate: Date) {
  const baseReport = await auditLogger.generateSecurityReport(startDate, endDate);
  
  // Get additional detailed metrics
  const logs = await auditLogger.getAuditLogs({
    startDate,
    endDate,
    limit: 10000,
  });

  // Analyze patterns
  const hourlyActivity = analyzeHourlyActivity(logs.logs);
  const ipAnalysis = analyzeIPActivity(logs.logs);
  const userBehavior = analyzeUserBehavior(logs.logs);
  const riskAssessment = assessSecurityRisks(logs.logs);

  return {
    ...baseReport,
    detailed: {
      hourlyActivity,
      ipAnalysis,
      userBehavior,
      riskAssessment,
    },
  };
}

async function generateComplianceReport(startDate: Date, endDate: Date) {
  const logs = await auditLogger.getAuditLogs({
    startDate,
    endDate,
    limit: 10000,
  });

  // HIPAA compliance metrics
  const phiAccess = logs.logs.filter(l => l.eventType === 'PHI_ACCESS');
  const unauthorizedAccess = logs.logs.filter(l => l.eventType === 'UNAUTHORIZED_ACCESS');
  const dataExports = logs.logs.filter(l => l.eventType === 'DATA_EXPORT');
  const securityViolations = logs.logs.filter(l => l.eventType === 'SECURITY_VIOLATION');

  // Access patterns
  const accessByUser = phiAccess.reduce((acc, log) => {
    if (log.userId) {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Compliance score calculation
  const totalEvents = logs.logs.length;
  const violationCount = securityViolations.length + unauthorizedAccess.length;
  const complianceScore = totalEvents > 0 ? Math.max(0, 100 - (violationCount / totalEvents) * 100) : 100;

  return {
    complianceScore: Math.round(complianceScore),
    phiAccessCount: phiAccess.length,
    unauthorizedAccessCount: unauthorizedAccess.length,
    dataExportCount: dataExports.length,
    securityViolationCount: securityViolations.length,
    accessByUser: Object.entries(accessByUser)
      .map(([userId, count]) => ({ userId, accessCount: count }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 20),
    recommendations: generateComplianceRecommendations(logs.logs),
  };
}

async function generatePHIAccessReport(startDate: Date, endDate: Date) {
  const logs = await auditLogger.getAuditLogs({
    startDate,
    endDate,
    eventType: 'PHI_ACCESS',
    limit: 10000,
  });

  // Analyze PHI access patterns
  const accessByResource = logs.logs.reduce((acc, log) => {
    const key = `${log.resourceType}:${log.resourceId}`;
    if (!acc[key]) {
      acc[key] = {
        resourceType: log.resourceType,
        resourceId: log.resourceId || 'unknown',
        accessCount: 0,
        uniqueUsers: new Set(),
        lastAccessed: log.timestamp,
      };
    }
    acc[key].accessCount++;
    if (log.userId) acc[key].uniqueUsers.add(log.userId);
    if (log.timestamp > acc[key].lastAccessed) {
      acc[key].lastAccessed = log.timestamp;
    }
    return acc;
  }, {} as Record<string, any>);

  // Convert to array and add unique user count
  const resourceAccess = Object.values(accessByResource).map((item: any) => ({
    ...item,
    uniqueUserCount: item.uniqueUsers.size,
    uniqueUsers: undefined, // Remove Set object
  }));

  return {
    totalPHIAccess: logs.logs.length,
    uniqueResourcesAccessed: resourceAccess.length,
    resourceAccess: resourceAccess
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 50),
    accessTrends: analyzeAccessTrends(logs.logs),
  };
}

// Analysis helper functions
function analyzeHourlyActivity(logs: any[]) {
  const hourlyCount = new Array(24).fill(0);
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourlyCount[hour]++;
  });

  return hourlyCount.map((count, hour) => ({ hour, count }));
}

function analyzeIPActivity(logs: any[]) {
  const ipCount = logs.reduce((acc, log) => {
    acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(ipCount)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function analyzeUserBehavior(logs: any[]) {
  const userActivity = logs.reduce((acc, log) => {
    if (!log.userId) return acc;
    
    if (!acc[log.userId]) {
      acc[log.userId] = {
        userId: log.userId,
        totalEvents: 0,
        eventTypes: {},
        firstActivity: log.timestamp,
        lastActivity: log.timestamp,
      };
    }
    
    acc[log.userId].totalEvents++;
    acc[log.userId].eventTypes[log.eventType] = (acc[log.userId].eventTypes[log.eventType] || 0) + 1;
    
    if (log.timestamp < acc[log.userId].firstActivity) {
      acc[log.userId].firstActivity = log.timestamp;
    }
    if (log.timestamp > acc[log.userId].lastActivity) {
      acc[log.userId].lastActivity = log.timestamp;
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(userActivity)
    .sort((a: any, b: any) => b.totalEvents - a.totalEvents)
    .slice(0, 20);
}

function assessSecurityRisks(logs: any[]) {
  const risks = [];
  
  // Check for suspicious patterns
  const failedLogins = logs.filter(l => l.eventType === 'USER_FAILED_LOGIN');
  const securityViolations = logs.filter(l => l.eventType === 'SECURITY_VIOLATION');
  const unauthorizedAccess = logs.filter(l => l.eventType === 'UNAUTHORIZED_ACCESS');
  
  if (failedLogins.length > 50) {
    risks.push({
      type: 'HIGH_FAILED_LOGIN_RATE',
      severity: 'HIGH',
      description: `${failedLogins.length} failed login attempts detected`,
      recommendation: 'Review failed login patterns and consider implementing additional security measures',
    });
  }
  
  if (securityViolations.length > 0) {
    risks.push({
      type: 'SECURITY_VIOLATIONS',
      severity: 'CRITICAL',
      description: `${securityViolations.length} security violations detected`,
      recommendation: 'Immediate investigation required for all security violations',
    });
  }
  
  if (unauthorizedAccess.length > 0) {
    risks.push({
      type: 'UNAUTHORIZED_ACCESS',
      severity: 'CRITICAL',
      description: `${unauthorizedAccess.length} unauthorized access attempts detected`,
      recommendation: 'Review access controls and user permissions',
    });
  }

  return risks;
}

function generateComplianceRecommendations(logs: any[]) {
  const recommendations = [];
  
  const phiAccess = logs.filter(l => l.eventType === 'PHI_ACCESS');
  const violations = logs.filter(l => l.eventType === 'SECURITY_VIOLATION');
  
  if (phiAccess.length > 1000) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'PHI_ACCESS',
      description: 'High volume of PHI access detected',
      action: 'Review PHI access patterns and implement additional monitoring',
    });
  }
  
  if (violations.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'SECURITY',
      description: 'Security violations detected',
      action: 'Investigate all security violations and strengthen security controls',
    });
  }
  
  return recommendations;
}

function analyzeAccessTrends(logs: any[]) {
  // Group by day
  const dailyAccess = logs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(dailyAccess)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}