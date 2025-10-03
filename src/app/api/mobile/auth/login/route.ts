// Mobile API - Authentication login endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { RateLimitConfigs } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
  deviceType?: 'ios' | 'android';
  appVersion?: string;
  pushToken?: string;
}

interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      verified: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    preferences: {
      notifications: boolean;
      biometric: boolean;
      autoSync: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export const POST = withSecurity({
  requireAuth: false,
  rateLimitKey: 'mobile_login',
  rateLimitMax: RateLimitConfigs.LOGIN.max,
  rateLimitWindow: RateLimitConfigs.LOGIN.window,
  auditLevel: 'HIGH',
})(async function(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, deviceId, deviceType, appVersion, pushToken } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required',
        },
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please enter a valid email address',
        },
      }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        mobileDevices: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      await auditLogger.logAuthEvent(
        'USER_FAILED_LOGIN',
        {
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
          requestId: crypto.randomUUID(),
        },
        false,
        { email, reason: 'user_not_found' }
      );

      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await auditLogger.logAuthEvent(
        'USER_FAILED_LOGIN',
        {
          userId: user.id,
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
          requestId: crypto.randomUUID(),
        },
        false,
        { email, reason: 'invalid_password' }
      );

      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }

    // Check if account is active
    if (!user.active) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Please contact support.',
        },
      }, { status: 403 });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        type: 'mobile_access',
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { 
        userId: user.id, 
        type: 'mobile_refresh',
      },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: '30d' }
    );

    // Register/update mobile device
    if (deviceId) {
      await prisma.mobileDevice.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId,
          },
        },
        update: {
          deviceType,
          appVersion,
          pushToken,
          lastLoginAt: new Date(),
          active: true,
        },
        create: {
          userId: user.id,
          deviceId,
          deviceType: deviceType || 'unknown',
          appVersion,
          pushToken,
          lastLoginAt: new Date(),
          active: true,
        },
      });
    }

    // Update user last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful login
    await auditLogger.logAuthEvent(
      'USER_LOGIN',
      {
        userId: user.id,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
        requestId: crypto.randomUUID(),
      },
      true,
      { 
        email, 
        deviceId, 
        deviceType, 
        appVersion,
        loginMethod: 'mobile_app',
      }
    );

    // Prepare response
    const response: LoginResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || undefined,
          verified: user.emailVerified || false,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        },
        preferences: {
          notifications: user.notificationPreferences?.pushEnabled ?? true,
          biometric: user.mobileDevices?.[0]?.biometricEnabled ?? false,
          autoSync: user.mobileDevices?.[0]?.autoSync ?? true,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Mobile login error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileAuthAPI',
        action: 'login',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Login failed. Please try again.',
      },
    }, { status: 500 });
  }
});