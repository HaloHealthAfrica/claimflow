// Admin API routes for error monitoring and management
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { errorMonitoring } from '@/lib/error-monitoring';
import { withSecurity } from '@/lib/security-middleware';
import { RateLimitConfigs } from '@/lib/rate-limiter';

// GET - Get error reports and metrics (admin only)
export const GET = withSecurity({
  requireAuth: true,
  allowedRoles: ['admin', 'developer'],
  rateLimitKey: 'error_admin',
  rateLimitMax: RateLimitConfigs.API_GENERAL.max,
  rateLimitWindow: RateLimitConfigs.API_GENERAL.window,
  auditLevel: 'HIGH',
})(async function(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['admin', 'developer'].includes(user.role || '')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'reports';

    switch (action) {
      case 'reports':
        return await handleGetReports(searchParams);
      case 'metrics':
        return await handleGetMetrics(searchParams);
      case 'alerts':
        return await handleGetAlerts();
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error admin API failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_API_FAILED',
          message: error instanceof Error ? error.message : 'Admin API request failed',
        },
      },
      { status: 500 }
    );
  }
});

// POST - Admin actions (resolve errors, manage alerts)
export const POST = withSecurity({
  requireAuth: true,
  allowedRoles: ['admin', 'developer'],
  rateLimitKey: 'error_admin_action',
  rateLimitMax: 50,
  rateLimitWindow: 3600,
  auditLevel: 'HIGH',
})(async function(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['admin', 'developer'].includes(user.role || '')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, reportId, notes, alertRule } = body;

    switch (action) {
      case 'resolve':
        if (!reportId) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_REPORT_ID', message: 'Report ID is required' } },
            { status: 400 }
          );
        }
        
        const resolved = await errorMonitoring.resolveError(reportId, user.id, notes);
        if (!resolved) {
          return NextResponse.json(
            { success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Error report not found' } },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: { message: 'Error report resolved successfully' },
        });

      case 'add_alert':
        if (!alertRule) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_ALERT_RULE', message: 'Alert rule is required' } },
            { status: 400 }
          );
        }
        
        const ruleId = errorMonitoring.addAlertRule(alertRule);
        return NextResponse.json({
          success: true,
          data: { ruleId, message: 'Alert rule added successfully' },
        });

      case 'remove_alert':
        const { ruleId: removeRuleId } = body;
        if (!removeRuleId) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_RULE_ID', message: 'Rule ID is required' } },
            { status: 400 }
          );
        }
        
        const removed = errorMonitoring.removeAlertRule(removeRuleId);
        if (!removed) {
          return NextResponse.json(
            { success: false, error: { code: 'RULE_NOT_FOUND', message: 'Alert rule not found' } },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: { message: 'Alert rule removed successfully' },
        });

      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error admin action failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_ACTION_FAILED',
          message: error instanceof Error ? error.message : 'Admin action failed',
        },
      },
      { status: 500 }
    );
  }
});

// Helper functions
async function handleGetReports(searchParams: URLSearchParams) {
  const filters = {
    severity: searchParams.get('severity') as any,
    category: searchParams.get('category') as any,
    userId: searchParams.get('userId') || undefined,
    resolved: searchParams.get('resolved') ? searchParams.get('resolved') === 'true' : undefined,
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  };

  const result = errorMonitoring.getErrorReports(filters);

  return NextResponse.json({
    success: true,
    data: {
      reports: result.reports,
      total: result.total,
      filters,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < result.total,
      },
    },
  });
}

async function handleGetMetrics(searchParams: URLSearchParams) {
  const endDate = searchParams.get('endDate') 
    ? new Date(searchParams.get('endDate')!) 
    : new Date();
  
  const startDate = searchParams.get('startDate') 
    ? new Date(searchParams.get('startDate')!) 
    : new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  const metrics = errorMonitoring.getErrorMetrics({ start: startDate, end: endDate });

  return NextResponse.json({
    success: true,
    data: {
      metrics,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    },
  });
}

async function handleGetAlerts() {
  const alertRules = errorMonitoring.getAlertRules();

  return NextResponse.json({
    success: true,
    data: { alertRules },
  });
}