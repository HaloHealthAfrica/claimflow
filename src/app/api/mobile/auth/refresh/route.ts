// Mobile API - Token refresh endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { auditLogger } from '@/lib/audit-logger';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

interface RefreshRequest {
  refreshToken: string;
  deviceId?: string;
}

interface RefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const POST = withSecurity({
  requireAuth: false,
  rateLimitKey: 'mobile_refresh',
  rateLimitMax: 50,
  rateLimitWindow: 3600,
  auditLevel: 'MEDIUM',
})(async function(request: NextRequest): Promise<NextResponse<RefreshResponse>> {
  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken, deviceId } = body;

    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      }, { status: 400 });
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    } catch (jwtError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      }, { status: 401 });
    }

    if (decoded.type !== 'mobile_refresh') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type',
        },
      }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.active) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive',
        },
      }, { status: 401 });
    }

    // Verify device if provided
    if (deviceId) {
      const device = await prisma.mobileDevice.findUnique({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId,
          },
        },
      });

      if (!device || !device.active) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'DEVICE_NOT_REGISTERED',
            message: 'Device not registered or inactive',
          },
        }, { status: 401 });
      }
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        type: 'mobile_access',
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      { 
        userId: user.id, 
        type: 'mobile_refresh',
      },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: '30d' }
    );

    // Log token refresh
    await auditLogger.log({
      eventType: 'USER_LOGIN',
      severity: 'LOW',
      userId: user.id,
      resourceType: 'AUTH',
      action: 'token_refresh',
      details: { deviceId, method: 'mobile_app' },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'mobile-app',
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: 'Token refresh failed. Please login again.',
      },
    }, { status: 500 });
  }
});