// Insurance profile save API route
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma, encryptInsuranceData, createAuditLog } from '@/lib/db';
import { insuranceProfileSchema } from '@/utils/validators';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input data
    const validatedData = insuranceProfileSchema.parse(body);

    // Encrypt sensitive data
    const encryptedData = encryptInsuranceData(validatedData);

    // Check if user already has an insurance profile
    const existingProfile = await prisma.insuranceProfile.findUnique({
      where: { userId: user.id },
    });

    let insuranceProfile;

    if (existingProfile) {
      // Update existing profile
      insuranceProfile = await prisma.insuranceProfile.update({
        where: { userId: user.id },
        data: {
          insurer: encryptedData.insurer || '',
          plan: encryptedData.plan,
          memberId: encryptedData.memberId || '',
          groupId: encryptedData.groupId,
          payerId: encryptedData.payerId,
          address: encryptedData.address,
          updatedAt: new Date(),
        },
      });

      // Log profile update
      await createAuditLog(
        user.id,
        'INSURANCE_UPDATED',
        'insurance_profile',
        { profileId: insuranceProfile.id },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );
    } else {
      // Create new profile
      insuranceProfile = await prisma.insuranceProfile.create({
        data: {
          userId: user.id,
          insurer: encryptedData.insurer || '',
          plan: encryptedData.plan,
          memberId: encryptedData.memberId || '',
          groupId: encryptedData.groupId,
          payerId: encryptedData.payerId,
          address: encryptedData.address,
        },
      });

      // Log profile creation
      await createAuditLog(
        user.id,
        'INSURANCE_CREATED',
        'insurance_profile',
        { profileId: insuranceProfile.id },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: insuranceProfile.id,
        createdAt: insuranceProfile.createdAt,
        updatedAt: insuranceProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Insurance save error:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid insurance data',
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
          code: 'SAVE_FAILED',
          message: 'Failed to save insurance profile',
        },
      },
      { status: 500 }
    );
  }
}

// Get user's insurance profile
export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get insurance profile
    const insuranceProfile = await prisma.insuranceProfile.findUnique({
      where: { userId: user.id },
    });

    if (!insuranceProfile) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Note: We don't decrypt data here for security - that should be done on the client side when needed
    return NextResponse.json({
      success: true,
      data: {
        id: insuranceProfile.id,
        hasProfile: true,
        createdAt: insuranceProfile.createdAt,
        updatedAt: insuranceProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Insurance get error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: 'Failed to retrieve insurance profile',
        },
      },
      { status: 500 }
    );
  }
}