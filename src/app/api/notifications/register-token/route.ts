// API route for FCM token registration
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_TOKEN', message: 'FCM token is required' } },
        { status: 400 }
      );
    }

    // Store or update FCM token in database
    await prisma.fcmToken.upsert({
      where: {
        userId_token: {
          userId: user.id,
          token: token,
        },
      },
      update: {
        platform: platform || 'web',
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        token: token,
        platform: platform || 'web',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'FCM token registered successfully' },
    });
  } catch (error) {
    console.error('Failed to register FCM token:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to register FCM token',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (token) {
      // Deactivate specific token
      await prisma.fcmToken.updateMany({
        where: {
          userId: user.id,
          token: token,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    } else {
      // Deactivate all tokens for user
      await prisma.fcmToken.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: 'FCM token(s) deactivated successfully' },
    });
  } catch (error) {
    console.error('Failed to deactivate FCM token:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DEACTIVATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to deactivate FCM token',
        },
      },
      { status: 500 }
    );
  }
}