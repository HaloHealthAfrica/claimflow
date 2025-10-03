// Mobile API - User registration endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { RateLimitConfigs } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  deviceId?: string;
  deviceType?: 'ios' | 'android';
  appVersion?: string;
  pushToken?: string;
}

interface RegisterResponse {
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
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

export const POST = withSecurity({
  requireAuth: false,
  rateLimitKey: 'mobile_register',
  rateLimitMax: RateLimitConfigs.SIGNUP.max,
  rateLimitWindow: RateLimitConfigs.SIGNUP.window,
  auditLevel: 'HIGH',
})(async function(request: NextRequest): Promise<NextResponse<RegisterResponse>> {
  try {
    const body: RegisterRequest = await request.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      dateOfBirth,
      deviceId, 
      deviceType, 
      appVersion, 
      pushToken 
    } = body;

    // Validate required fields
    const validationErrors: string[] = [];
    
    if (!email) validationErrors.push('Email is required');
    if (!password) validationErrors.push('Password is required');
    if (!firstName) validationErrors.push('First name is required');
    if (!lastName) validationErrors.push('Last name is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      validationErrors.push('Please enter a valid email address');
    }

    // Validate password strength
    if (password) {
      if (password.length < 8) {
        validationErrors.push('Password must be at least 8 characters long');
      }
      if (!/(?=.*[a-z])/.test(password)) {
        validationErrors.push('Password must contain at least one lowercase letter');
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        validationErrors.push('Password must contain at least one uppercase letter');
      }
      if (!/(?=.*\d)/.test(password)) {
        validationErrors.push('Password must contain at least one number');
      }
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(phone)) {
        validationErrors.push('Please enter a valid phone number');
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the following errors:',
          details: validationErrors,
        },
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email already exists',
        },
      }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        active: true,
        emailVerified: false,
        createdAt: new Date(),
      },
    });

    // Create default notification preferences
    await prisma.notificationPreferences.create({
      data: {
        userId: user.id,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        claimUpdates: true,
        paymentAlerts: true,
        documentReminders: true,
        securityAlerts: true,
        marketingEmails: false,
        weeklyDigest: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      },
    });

    // Register mobile device if provided
    if (deviceId) {
      await prisma.mobileDevice.create({
        data: {
          userId: user.id,
          deviceId,
          deviceType: deviceType || 'unknown',
          appVersion,
          pushToken,
          lastLoginAt: new Date(),
          active: true,
          biometricEnabled: false,
          autoSync: true,
        },
      });
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

    // Log registration
    await auditLogger.log({
      eventType: 'USER_LOGIN',
      severity: 'MEDIUM',
      userId: user.id,
      resourceType: 'AUTH',
      action: 'user_registration',
      details: { 
        email: user.email,
        deviceId, 
        deviceType, 
        appVersion,
        registrationMethod: 'mobile_app',
      },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'mobile-app',
      success: true,
    });

    // TODO: Send verification email
    // await sendVerificationEmail(user.email, user.id);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || undefined,
          verified: false,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        },
        message: 'Account created successfully. Please check your email to verify your account.',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Mobile registration error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileAuthAPI',
        action: 'register',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Registration failed. Please try again.',
      },
    }, { status: 500 });
  }
});