// Receipt upload and OCR processing API route
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Please upload a JPG, PNG, WebP, or PDF file' } },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit for receipts)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size must be less than 10MB' } },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process receipt with OCR
    const ocrResult = await processDocument(buffer, 'receipt', user.id);

    // Validate OCR result
    const validation = validateOCRResult(ocrResult);

    // Upload the receipt to S3
    const fileKey = generateFileKey(user.id, file.name, 'receipt');
    await uploadFileToS3(buffer, fileKey, file.type, user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...ocrResult,
        receiptKey: fileKey,
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
        },
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Receipt OCR error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OCR_FAILED',
          message: error instanceof Error ? error.message : 'Failed to process receipt',
        },
      },
      { status: 500 }
    );
  }
}