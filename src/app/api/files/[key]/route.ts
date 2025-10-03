// File access API route with signed URLs
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateSignedUrl, validateFileOwnership, deleteFileFromS3 } from '@/lib/s3';

interface RouteParams {
  params: Promise<{
    key: string;
  }>;
}

// Get signed URL for file access
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const fileKey = decodeURIComponent(resolvedParams.key);

    // Validate file ownership
    if (!validateFileOwnership(fileKey, user.id)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Generate signed URL
    const signedUrl = await generateSignedUrl(fileKey, user.id);

    return NextResponse.json({
      success: true,
      data: {
        url: signedUrl,
        expiresIn: 3600, // 1 hour
      },
    });
  } catch (error) {
    console.error('File access error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ACCESS_FAILED',
          message: 'Failed to access file',
        },
      },
      { status: 500 }
    );
  }
}

// Delete file
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const fileKey = decodeURIComponent(resolvedParams.key);

    // Validate file ownership
    if (!validateFileOwnership(fileKey, user.id)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Delete from S3
    await deleteFileFromS3(fileKey, user.id);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('File deletion error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete file',
        },
      },
      { status: 500 }
    );
  }
}