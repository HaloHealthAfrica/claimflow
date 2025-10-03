// User registration API route
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { userUtils } from '@/lib/db-utils';
import { auditLogger } from '@/lib/audit-logger';
import { handlePrismaError } from '@/lib/prisma';

// Registration validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationResult.error.errors.map(err => 
              `${err.path.join('.')}: ${err.message}`
            ),
          },
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone, dateOfBirth } = validationResult.data;

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Check if user already exists
    const existingUser = await userUtils.findByEmail(email);
    
    if (existingUser) {
      await auditLogger.log({
        action: 'REGISTRATION_FAILED',
        entityType: 'User',
        ipAddress: ip,
        success: false,
        errorMessage: 'Email already exists',
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      isActive: true,
      emailVerified: null, // Will be set when email is verified
    };

    const user = await userUtils.createUser(userData);

    // Log successful registration
    await auditLogger.log({
      userId: user.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      success: true,
    });

    // Return success response (don't include sensitive data)
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
          },
          message: 'Account created successfully',
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = handlePrismaError(error);
      
      await auditLogger.log({
        action: 'REGISTRATION_ERROR',
        entityType: 'User',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        success: false,
        errorMessage: prismaError.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: prismaError.type,
            message: prismaError.message,
          },
        },
        { status: 400 }
      );
    }

    // Log generic error
    await auditLogger.log({
      action: 'REGISTRATION_ERROR',
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
          message: 'An error occurred during registration',
        },
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
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