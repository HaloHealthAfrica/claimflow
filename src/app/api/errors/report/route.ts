// API route for client-side error reporting
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { errorHandler, ErrorUtils } from '@/lib/error-handler';
import { errorMonitoring } from '@/lib/error-monitoring';
import { withSecurity } from '@/lib/security-middleware';
import { RateLimitConfigs } from '@/lib/rate-limiter';

// POST - Report client-side error
export const POST = withSecurity({
  requireAuth: false, // Allow anonymous error reporting
  rateLimitKey: 'error_report',
  rateLimitMax: 20, // Allow more error reports
  rateLimitWindow: 3600,
  auditLevel: 'MEDIUM',
})(async function(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    
    const {
      message,
      stack,
      code,
      category,
      severity,
      url,
      userAgent,
      component,
      action,
      metadata,
    } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_MESSAGE', message: 'Error message is required' } },
        { status: 400 }
      );
    }

    // Create error context
    const context = {
      userId: user?.id,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      url: url || request.url,
      component,
      action,
      metadata: {
        ...metadata,
        clientReported: true,
        reportedAt: new Date().toISOString(),
      },
    };

    // Create standardized error
    const appError = errorHandler.createError(
      code || 'CLIENT_ERROR',
      message,
      category || 'UNKNOWN',
      severity || 'MEDIUM',
      context
    );

    // Add stack trace if provided
    if (stack) {
      appError.stackTrace = stack;
    }

    // Report to monitoring system
    const reportId = await errorMonitoring.reportError(appError, context);

    // Handle the error through our system
    await errorHandler.handleError(appError, context);

    return NextResponse.json({
      success: true,
      data: {
        reportId,
        message: 'Error reported successfully',
      },
    });
  } catch (error) {
    console.error('Failed to report error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to report error',
        },
      },
      { status: 500 }
    );
  }
});

// GET - Get error report status (for follow-up)
export const GET = withSecurity({
  requireAuth: false,
  rateLimitKey: 'error_status',
  rateLimitMax: 50,
  rateLimitWindow: 3600,
})(async function(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_REPORT_ID', message: 'Report ID is required' } },
        { status: 400 }
      );
    }

    // Get error reports (this would typically check if user has access)
    const { reports } = errorMonitoring.getErrorReports({
      limit: 1,
      offset: 0,
    });

    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: { code: 'REPORT_NOT_FOUND', message: 'Error report not found' } },
        { status: 404 }
      );
    }

    // Return limited information for security
    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        timestamp: report.timestamp,
        resolved: report.resolved,
        resolvedAt: report.resolvedAt,
        status: report.resolved ? 'resolved' : 'investigating',
      },
    });
  } catch (error) {
    console.error('Failed to get error report status:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check error status',
        },
      },
      { status: 500 }
    );
  }
});