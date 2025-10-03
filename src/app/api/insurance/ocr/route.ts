// Insurance card OCR API route
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processDocument, validateOCRResult } from '@/lib/ocr';
import { uploadFileToS3, generateFileKey } from '@/lib/s3';

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

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Please upload a JPG, PNG, or WebP image' } },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit for insurance cards)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size must be less than 5MB' } },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process insurance card with OCR
    const ocrResult = await processDocument(buffer, 'insurance', user.id);

    // Validate OCR result
    const validation = validateOCRResult(ocrResult);

    // Upload the insurance card image to S3
    const fileKey = generateFileKey(user.id, file.name, 'insurance');
    await uploadFileToS3(buffer, fileKey, file.type, user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...ocrResult,
        cardImageKey: fileKey,
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
        },
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Insurance OCR error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OCR_FAILED',
          message: error instanceof Error ? error.message : 'Failed to process insurance card',
        },
      },
      { status: 500 }
    );
  }
}