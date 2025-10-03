// Password reset request API route
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { userUtils } from '@/lib/db-utils';
import { auditLogger } from '@/lib/audit-logger';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email address',
            details: validationResult.error.errors.map(err => 
              `${err.path.join('.')}: ${err.message}`
            ),
          },
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Find user by email
    const user = await userUtils.findByEmail(email);
    
    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user && user.isActive) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      });

      // Log password reset request
      await auditLogger.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ip,
        success: true,
      });

      // TODO: Send password reset email
      // This would integrate with your email service (SendGrid, etc.)
      console.log(`Password reset requested for ${email}, token: ${resetToken}`);
      
      // In development, log the reset link
      if (process.env.NODE_ENV === 'development') {
        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
        console.log(`Reset URL: ${resetUrl}`);
      }
    } else {
      // Log failed attempt (user not found or inactive)
      await auditLogger.log({
        action: 'PASSWORD_RESET_FAILED',
        entityType: 'User',
        ipAddress: ip,
        success: false,
        errorMessage: 'User not found or inactive',
      });
    }

    // Always return success response to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'If an account with that email exists, a password reset link has been sent.',
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);

    await auditLogger.log({
      action: 'PASSWORD_RESET_ERROR',
      entityType: 'User',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing your request',
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}