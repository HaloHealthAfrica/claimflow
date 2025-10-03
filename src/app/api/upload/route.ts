// File upload API route with S3 integration
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadFileToS3, generateFileKey, validateFile, UPLOAD_CONFIG } from '@/lib/s3';

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    if (!type || !['insurance', 'receipt', 'document', 'claim', 'appeal'].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Invalid file type specified' } },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE', message: validation.error } },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique file key
    const fileKey = generateFileKey(user.id, file.name, type as 'insurance' | 'receipt' | 'document' | 'claim' | 'appeal');

    // Upload to S3
    await uploadFileToS3(buffer, fileKey, file.type, user.id);

    return NextResponse.json({
      success: true,
      data: {
        key: fileKey,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('File upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload file',
        },
      },
      { status: 500 }
    );
  }
}

// Get upload configuration
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      maxFileSize: UPLOAD_CONFIG.maxFileSize,
      allowedMimeTypes: UPLOAD_CONFIG.allowedMimeTypes,
      allowedExtensions: UPLOAD_CONFIG.allowedExtensions,
    },
  });
}