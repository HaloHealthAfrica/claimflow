// User login API route
import { NextRequest, NextResponse } from 'next/server';
import { userLoginSchema } from '@/utils/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = userLoginSchema.parse(body);

    // Note: Actual authentication is handled by NextAuth.js
    // This endpoint is for client-side login form submission
    return NextResponse.json({
      success: true,
      message: 'Use NextAuth signIn function for authentication',
      data: {
        email: validatedData.email,
      },
    });
  } catch (error) {
    console.error('Login validation error:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login validation',
        },
      },
      { status: 500 }
    );
  }
}