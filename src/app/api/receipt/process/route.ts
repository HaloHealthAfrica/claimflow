// Receipt processing API route with OCR integration
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { processDocument, validateOCRResult, ReceiptData } from '@/lib/ocr';
import { documentUtils } from '@/lib/db-utils';
import { auditLogger } from '@/lib/audit-logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = session.user.id;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not supported. Please upload JPEG, PNG, WebP, or PDF files.',
          },
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          },
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Process document with OCR
    let receiptData: ReceiptData;
    try {
      receiptData = await processDocument(buffer, 'receipt', userId) as ReceiptData;
    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError);
      
      await auditLogger.log({
        userId,
        action: 'RECEIPT_OCR_FAILED',
        entityType: 'Document',
        ipAddress: ip,
        success: false,
        errorMessage: ocrError instanceof Error ? ocrError.message : 'OCR processing failed',
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OCR_PROCESSING_FAILED',
            message: 'Failed to extract text from receipt. Please try with a clearer image.',
          },
        },
        { status: 422 }
      );
    }

    // Validate OCR result quality
    const validation = validateOCRResult(receiptData);

    // Store document metadata (we'll implement S3 upload in Task 5)
    const documentId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, we'll store a placeholder document record
    // This will be enhanced when S3 integration is implemented
    const documentRecord = await documentUtils.createDocument({
      userId,
      fileName: `receipt_${documentId}.${file.type.split('/')[1]}`,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      s3Key: `temp/${documentId}`, // Placeholder
      s3Bucket: 'claimflow-temp', // Placeholder
      documentType: 'RECEIPT',
    });

    // Enhanced receipt data with processing metadata
    const enhancedReceiptData = {
      ...receiptData,
      documentId: documentRecord.id,
      receiptKey: documentId,
      validation,
      processingMetadata: {
        fileSize: file.size,
        fileType: file.type,
        originalFileName: file.name,
        processedAt: new Date().toISOString(),
        ocrService: 'google-vision', // This would be dynamic based on which service was used
      },
      // Convert amount to cents for consistency with database
      amountCents: receiptData.amount ? Math.round(receiptData.amount * 100) : undefined,
    };

    // Log successful processing
    await auditLogger.log({
      userId,
      action: 'RECEIPT_PROCESSED',
      entityType: 'Document',
      entityId: documentRecord.id,
      ipAddress: ip,
      success: true,
      newValues: {
        confidence: receiptData.confidence,
        providerName: receiptData.providerName,
        amount: receiptData.amount,
        dateOfService: receiptData.dateOfService,
        validationScore: validation.confidence,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: enhancedReceiptData,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Receipt processing error:', error);

    // Log error
    try {
      const session = await requireAuth();
      await auditLogger.log({
        userId: session.user.id,
        action: 'RECEIPT_PROCESSING_ERROR',
        entityType: 'Document',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing the receipt',
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