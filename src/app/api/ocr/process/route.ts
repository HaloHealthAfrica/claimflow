// OCR processing API route
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processDocument, validateOCRResult } from '@/lib/ocr';

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
    const documentType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    if (!documentType || !['insurance', 'receipt'].includes(documentType)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Invalid document type' } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Unsupported file type' } },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' } },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process document with OCR
    const ocrResult = await processDocument(
      buffer, 
      documentType as 'insurance' | 'receipt',
      user.id
    );

    // Validate OCR result
    const validation = validateOCRResult(ocrResult);

    return NextResponse.json({
      success: true,
      data: {
        ...ocrResult,
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
        },
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OCR_FAILED',
          message: error instanceof Error ? error.message : 'OCR processing failed',
        },
      },
      { status: 500 }
    );
  }
}