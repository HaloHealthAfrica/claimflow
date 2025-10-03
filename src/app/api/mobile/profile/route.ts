// Mobile API - User profile management
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { getCurrentUser } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

interface ProfileResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      dateOfBirth?: string;
      verified: boolean;
      createdAt: string;
      lastLoginAt?: string;
    };
    preferences: {
      notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
        claimUpdates: boolean;
        paymentAlerts: boolean;
        documentReminders: boolean;
        securityAlerts: boolean;
        marketingEmails: boolean;
        weeklyDigest: boolean;
      };
      privacy: {
        shareDataForResearch: boolean;
        allowMarketingCommunications: boolean;
      };
      mobile: {
        biometricEnabled: boolean;
        autoSync: boolean;
        offlineMode: boolean;
      };
    };
    statistics: {
      totalClaims: number;
      submittedClaims: number;
      approvedClaims: number;
      totalAmountClaimed: number;
      totalAmountReceived: number;
      averageProcessingTime: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      claimUpdates?: boolean;
      paymentAlerts?: boolean;
      documentReminders?: boolean;
      securityAlerts?: boolean;
      marketingEmails?: boolean;
      weeklyDigest?: boolean;
    };
    privacy?: {
      shareDataForResearch?: boolean;
      allowMarketingCommunications?: boolean;
    };
    mobile?: {
      biometricEnabled?: boolean;
      autoSync?: boolean;
      offlineMode?: boolean;
    };
  };
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// GET - Get user profile and preferences
export const GET = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_profile_get',
  rateLimitMax: 100,
  rateLimitWindow: 3600,
  auditLevel: 'MEDIUM',
})(async function(request: NextRequest): Promise<NextResponse<ProfileResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }, { status: 401 });
    }

    // Get user with all related data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        notificationPreferences: true,
        mobileDevices: {
          where: { active: true },
          orderBy: { lastLoginAt: 'desc' },
          take: 1,
        },
        claims: {
          select: {
            status: true,
            amountCents: true,
            paymentAmount: true,
            submittedAt: true,
            processedAt: true,
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, { status: 404 });
    }

    // Calculate statistics
    const claims = userData.claims;
    const submittedClaims = claims.filter(c => c.submittedAt);
    const approvedClaims = claims.filter(c => ['APPROVED', 'PAID'].includes(c.status));
    const paidClaims = claims.filter(c => c.status === 'PAID');

    const totalAmountClaimed = claims.reduce((sum, c) => sum + c.amountCents, 0);
    const totalAmountReceived = paidClaims.reduce((sum, c) => sum + (c.paymentAmount || c.amountCents), 0);

    // Calculate average processing time
    const processedClaims = claims.filter(c => c.submittedAt && c.processedAt);
    const averageProcessingTime = processedClaims.length > 0
      ? processedClaims.reduce((sum, c) => {
          const processingTime = new Date(c.processedAt!).getTime() - new Date(c.submittedAt!).getTime();
          return sum + processingTime;
        }, 0) / processedClaims.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Get preferences
    const notifPrefs = userData.notificationPreferences;
    const mobileDevice = userData.mobileDevices[0];

    // Log profile access
    await auditLogger.logPHIAccess(
      {
        userId: user.id,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
        requestId: crypto.randomUUID(),
      },
      'USER',
      user.id,
      'view_profile',
      true
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || undefined,
          dateOfBirth: userData.dateOfBirth?.toISOString().split('T')[0] || undefined,
          verified: userData.emailVerified || false,
          createdAt: userData.createdAt.toISOString(),
          lastLoginAt: userData.lastLoginAt?.toISOString() || undefined,
        },
        preferences: {
          notifications: {
            email: notifPrefs?.emailEnabled ?? true,
            push: notifPrefs?.pushEnabled ?? true,
            sms: notifPrefs?.smsEnabled ?? false,
            claimUpdates: notifPrefs?.claimUpdates ?? true,
            paymentAlerts: notifPrefs?.paymentAlerts ?? true,
            documentReminders: notifPrefs?.documentReminders ?? true,
            securityAlerts: notifPrefs?.securityAlerts ?? true,
            marketingEmails: notifPrefs?.marketingEmails ?? false,
            weeklyDigest: notifPrefs?.weeklyDigest ?? true,
          },
          privacy: {
            shareDataForResearch: userData.shareDataForResearch ?? false,
            allowMarketingCommunications: userData.allowMarketingCommunications ?? false,
          },
          mobile: {
            biometricEnabled: mobileDevice?.biometricEnabled ?? false,
            autoSync: mobileDevice?.autoSync ?? true,
            offlineMode: mobileDevice?.offlineMode ?? false,
          },
        },
        statistics: {
          totalClaims: claims.length,
          submittedClaims: submittedClaims.length,
          approvedClaims: approvedClaims.length,
          totalAmountClaimed,
          totalAmountReceived,
          averageProcessingTime: Math.round(averageProcessingTime),
        },
      },
    });
  } catch (error) {
    console.error('Mobile profile GET error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileProfileAPI',
        action: 'get_profile',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to retrieve profile. Please try again.',
      },
    }, { status: 500 });
  }
});

// PUT - Update user profile and preferences
export const PUT = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_profile_update',
  rateLimitMax: 20,
  rateLimitWindow: 3600,
  auditLevel: 'HIGH',
})(async function(request: NextRequest): Promise<NextResponse<ProfileResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }, { status: 401 });
    }

    const body: UpdateProfileRequest = await request.json();
    const { firstName, lastName, phone, dateOfBirth, preferences } = body;

    // Validate updates
    const validationErrors: string[] = [];

    if (firstName !== undefined && (!firstName.trim() || firstName.length > 50)) {
      validationErrors.push('First name must be 1-50 characters');
    }

    if (lastName !== undefined && (!lastName.trim() || lastName.length > 50)) {
      validationErrors.push('Last name must be 1-50 characters');
    }

    if (phone !== undefined && phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(phone)) {
        validationErrors.push('Invalid phone number format');
      }
    }

    if (dateOfBirth !== undefined && dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        validationErrors.push('Invalid date of birth');
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

    // Update user profile
    const userUpdates: any = {};
    if (firstName !== undefined) userUpdates.firstName = firstName.trim();
    if (lastName !== undefined) userUpdates.lastName = lastName.trim();
    if (phone !== undefined) userUpdates.phone = phone.trim() || null;
    if (dateOfBirth !== undefined) userUpdates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (preferences?.privacy) {
      if (preferences.privacy.shareDataForResearch !== undefined) {
        userUpdates.shareDataForResearch = preferences.privacy.shareDataForResearch;
      }
      if (preferences.privacy.allowMarketingCommunications !== undefined) {
        userUpdates.allowMarketingCommunications = preferences.privacy.allowMarketingCommunications;
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdates,
      });
    }

    // Update notification preferences
    if (preferences?.notifications) {
      const notifUpdates: any = {};
      const notifPrefs = preferences.notifications;
      
      if (notifPrefs.email !== undefined) notifUpdates.emailEnabled = notifPrefs.email;
      if (notifPrefs.push !== undefined) notifUpdates.pushEnabled = notifPrefs.push;
      if (notifPrefs.sms !== undefined) notifUpdates.smsEnabled = notifPrefs.sms;
      if (notifPrefs.claimUpdates !== undefined) notifUpdates.claimUpdates = notifPrefs.claimUpdates;
      if (notifPrefs.paymentAlerts !== undefined) notifUpdates.paymentAlerts = notifPrefs.paymentAlerts;
      if (notifPrefs.documentReminders !== undefined) notifUpdates.documentReminders = notifPrefs.documentReminders;
      if (notifPrefs.securityAlerts !== undefined) notifUpdates.securityAlerts = notifPrefs.securityAlerts;
      if (notifPrefs.marketingEmails !== undefined) notifUpdates.marketingEmails = notifPrefs.marketingEmails;
      if (notifPrefs.weeklyDigest !== undefined) notifUpdates.weeklyDigest = notifPrefs.weeklyDigest;

      if (Object.keys(notifUpdates).length > 0) {
        await prisma.notificationPreferences.upsert({
          where: { userId: user.id },
          update: notifUpdates,
          create: {
            userId: user.id,
            ...notifUpdates,
          },
        });
      }
    }

    // Update mobile device preferences
    if (preferences?.mobile) {
      const mobileUpdates: any = {};
      const mobilePrefs = preferences.mobile;
      
      if (mobilePrefs.biometricEnabled !== undefined) mobileUpdates.biometricEnabled = mobilePrefs.biometricEnabled;
      if (mobilePrefs.autoSync !== undefined) mobileUpdates.autoSync = mobilePrefs.autoSync;
      if (mobilePrefs.offlineMode !== undefined) mobileUpdates.offlineMode = mobilePrefs.offlineMode;

      if (Object.keys(mobileUpdates).length > 0) {
        // Update the most recent active device
        await prisma.mobileDevice.updateMany({
          where: {
            userId: user.id,
            active: true,
          },
          data: mobileUpdates,
        });
      }
    }

    // Log profile update
    await auditLogger.log({
      eventType: 'PHI_UPDATED',
      severity: 'MEDIUM',
      userId: user.id,
      resourceType: 'USER',
      resourceId: user.id,
      action: 'update_profile',
      details: {
        updatedFields: Object.keys(userUpdates),
        preferencesUpdated: !!preferences,
        source: 'mobile_app',
      },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'mobile-app',
      success: true,
    });

    // Return updated profile (reuse GET logic)
    return GET(request);
  } catch (error) {
    console.error('Mobile profile update error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileProfileAPI',
        action: 'update_profile',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Failed to update profile. Please try again.',
      },
    }, { status: 500 });
  }
});

// POST - Change password
export const POST = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_password_change',
  rateLimitMax: 5,
  rateLimitWindow: 3600,
  auditLevel: 'HIGH',
})(async function(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }, { status: 401 });
    }

    const body: ChangePasswordRequest = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'All password fields are required',
        },
      }, { status: 400 });
    }

    // Validate new password
    if (newPassword !== confirmPassword) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'New passwords do not match',
        },
      }, { status: 400 });
    }

    // Validate password strength
    const validationErrors: string[] = [];
    if (newPassword.length < 8) validationErrors.push('Password must be at least 8 characters long');
    if (!/(?=.*[a-z])/.test(newPassword)) validationErrors.push('Password must contain at least one lowercase letter');
    if (!/(?=.*[A-Z])/.test(newPassword)) validationErrors.push('Password must contain at least one uppercase letter');
    if (!/(?=.*\d)/.test(newPassword)) validationErrors.push('Password must contain at least one number');

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet requirements:',
          details: validationErrors,
        },
      }, { status: 400 });
    }

    // Get user with password
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true },
    });

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, { status: 404 });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData.password);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
        },
      }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    // Log password change
    await auditLogger.log({
      eventType: 'PASSWORD_CHANGED',
      severity: 'HIGH',
      userId: user.id,
      resourceType: 'USER',
      resourceId: user.id,
      action: 'change_password',
      details: { source: 'mobile_app' },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'mobile-app',
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  } catch (error) {
    console.error('Mobile password change error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileProfileAPI',
        action: 'change_password',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message: 'Failed to change password. Please try again.',
      },
    }, { status: 500 });
  }
});