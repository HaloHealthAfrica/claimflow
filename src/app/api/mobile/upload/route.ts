// Mobile API - File upload endpoint for documents
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { getCurrentUser } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import { prisma } from '@/lib/db';

interface UploadResponse {
  success: boolean;
  data?: {
    document: {
      id: string;
      name: string;
      type: string;
      size: number;
      url: string;
      uploadedAt: string;
    };
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
  'image/webp',
];

const DOCUMENT_TYPES = [
  'RECEIPT',
  'INSURANCE_CARD',
  'MEDICAL_RECORD',
  'PRESCRIPTION',
  'LAB_RESULT',
  'REFERRAL',
  'OTHER',
] as const;

export const POST = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_upload',
  rateLimitMax: 20,
  rateLimitWindow: 3600,
  auditLevel: 'HIGH',
})(async function(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const claimId = formData.get('claimId') as string;
    const documentType = formData.get('documentType') as string;
    const description = formData.get('description') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'File is required',
        },
      }, { status: 400 });
    }

    if (!claimId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_CLAIM_ID',
          message: 'Claim ID is required',
        },
      }, { status: 400 });
    }

    if (!documentType || !DOCUMENT_TYPES.includes(documentType as any)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_DOCUMENT_TYPE',
          message: `Document type must be one of: ${DOCUMENT_TYPES.join(', ')}`,
        },
      }, { status: 400 });
    }

    // Validate file
    const validationErrors: string[] = [];

    if (file.size > MAX_FILE_SIZE) {
      validationErrors.push(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      validationErrors.push(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
    }

    // Validate filename
    const filename = file.name;
    if (!filename || filename.length > 255) {
      validationErrors.push('Invalid filename');
    }

    // Check for malicious file patterns
    const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
    if (suspiciousPatterns.some(pattern => filename.toLowerCase().includes(pattern))) {
      validationErrors.push('File type not allowed for security reasons');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File validation failed:',
          details: validationErrors,
        },
      }, { status: 400 });
    }

    // Verify claim ownership
    const claim = await prisma.claim.findFirst({
      where: {
        id: claimId,
        userId: user.id,
      },
    });

    if (!claim) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CLAIM_NOT_FOUND',
          message: 'Claim not found or access denied',
        },
      }, { status: 404 });
    }

    // Check if claim is still editable
    if (!['DRAFT', 'SUBMITTED'].includes(claim.status)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CLAIM_NOT_EDITABLE',
          message: 'Cannot upload documents to processed claims',
        },
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = filename.split('.').pop() || '';
    const uniqueFilename = `${user.id}_${claimId}_${timestamp}_${randomSuffix}.${fileExtension}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // In a real implementation, you would:
    // 1. Upload to S3 or similar storage service
    // 2. Scan for viruses/malware
    // 3. Generate thumbnails for images
    // 4. Extract text content for searchability
    
    // Mock storage URL - replace with actual storage service
    const storageUrl = `https://storage.example.com/documents/${uniqueFilename}`;
    
    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        claimId,
        name: filename,
        originalName: filename,
        type: documentType,
        mimeType: file.type,
        size: file.size,
        url: storageUrl,
        description: description || null,
        uploadedAt: new Date(),
        metadata: {
          originalFilename: filename,
          uploadSource: 'mobile_app',
          fileHash: 'mock_hash', // In real implementation, calculate file hash
          dimensions: file.type.startsWith('image/') ? { width: 0, height: 0 } : undefined,
        },
      },
    });

    // Log document upload
    await auditLogger.log({
      eventType: 'DOCUMENT_UPLOADED',
      severity: 'MEDIUM',
      userId: user.id,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      action: 'upload_document',
      details: {
        claimId,
        documentType,
        filename,
        fileSize: file.size,
        mimeType: file.type,
        source: 'mobile_app',
      },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'mobile-app',
      success: true,
    });

    // Update claim's updated timestamp
    await prisma.claim.update({
      where: { id: claimId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: document.id,
          name: document.name,
          type: document.type,
          size: document.size,
          url: document.url,
          uploadedAt: document.uploadedAt.toISOString(),
        },
        message: 'Document uploaded successfully',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Mobile upload error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileUploadAPI',
        action: 'upload_document',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'File upload failed. Please try again.',
      },
    }, { status: 500 });
  }
});

// GET - Get upload requirements and limits
export const GET = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_upload_info',
  rateLimitMax: 100,
  rateLimitWindow: 3600,
})(async function(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        maxFileSize: MAX_FILE_SIZE,
        maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
        allowedTypes: ALLOWED_TYPES,
        documentTypes: DOCUMENT_TYPES,
        requirements: {
          RECEIPT: 'Medical receipt or invoice showing services and costs',
          INSURANCE_CARD: 'Front and back of insurance card',
          MEDICAL_RECORD: 'Relevant medical records or doctor notes',
          PRESCRIPTION: 'Prescription or medication documentation',
          LAB_RESULT: 'Laboratory test results',
          REFERRAL: 'Doctor referral or authorization',
          OTHER: 'Other supporting documentation',
        },
        tips: [
          'Ensure documents are clear and readable',
          'Include all relevant information',
          'Take photos in good lighting',
          'Avoid blurry or cropped images',
          'PDF files are preferred for text documents',
        ],
      },
    });
  } catch (error) {
    console.error('Upload info error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INFO_FAILED',
        message: 'Failed to get upload information',
      },
    }, { status: 500 });
  }
});