// Enhanced Claims API routes with receipt processing integration
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { claimUtils, enhancedClaimUtils, enhancedDocumentUtils } from '@/lib/db-utils';
import { auditLogger } from '@/lib/audit-logger';
import { z } from 'zod';

// Enhanced validation schemas
const createClaimSchema = z.object({
  dateOfService: z.string().transform((str) => new Date(str)),
  providerName: z.string().min(1, 'Provider name is required'),
  providerNPI: z.string().optional(),
  providerAddress: z.string().optional(),
  amountCents: z.number().min(1, 'Amount must be greater than 0'),
  cptCodes: z.array(z.string()).min(1, 'At least one CPT code is required'),
  icdCodes: z.array(z.string()).min(1, 'At least one ICD code is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
  insuranceProfileId: z.string().optional(),
  // Receipt processing data
  receiptData: z.object({
    documentId: z.string().optional(),
    confidence: z.number().optional(),
    extractedFields: z.record(z.any()).optional(),
  }).optional(),
});

const claimsQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  status: z.enum(['DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'DENIED', 'APPEALED', 'PAID', 'REJECTED', 'CANCELLED']).optional(),
  dateFrom: z.string().transform((str) => new Date(str)).optional(),
  dateTo: z.string().transform((str) => new Date(str)).optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const query = claimsQuerySchema.parse(Object.fromEntries(searchParams));

    // Use the enhanced claim utilities
    const result = await claimUtils.getClaimsForUser(userId, {
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    // Calculate summary statistics
    const summaryStats = await enhancedClaimUtils.getUserClaimsSummary(userId);

    return NextResponse.json({
      success: true,
      data: {
        claims: result.claims,
        pagination: {
          total: result.total,
          page: query.page,
          limit: query.limit,
          hasMore: (query.page * query.limit) < result.total,
        },
        summary: summaryStats,
      },
    });

  } catch (error) {
    console.error('Claims fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch claims' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const body = await request.json();
    const validatedData = createClaimSchema.parse(body);

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Validate CPT codes format
    const invalidCptCodes = validatedData.cptCodes.filter(code => 
      !code.match(/^\d{5}$/)
    );
    if (invalidCptCodes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid CPT code format',
            details: [`Invalid CPT codes: ${invalidCptCodes.join(', ')}. CPT codes must be 5 digits.`],
          },
        },
        { status: 400 }
      );
    }

    // Validate ICD codes format
    const invalidIcdCodes = validatedData.icdCodes.filter(code => 
      !code.match(/^[A-Z]\d{2}(\.\d{1,2})?$/)
    );
    if (invalidIcdCodes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ICD code format',
            details: [`Invalid ICD codes: ${invalidIcdCodes.join(', ')}. ICD codes must follow ICD-10 format.`],
          },
        },
        { status: 400 }
      );
    }

    // Create claim using enhanced utilities
    const claim = await claimUtils.createClaim(userId, {
      dateOfService: validatedData.dateOfService,
      providerName: validatedData.providerName,
      providerNPI: validatedData.providerNPI,
      providerAddress: validatedData.providerAddress,
      amountCents: validatedData.amountCents,
      cptCodes: validatedData.cptCodes,
      icdCodes: validatedData.icdCodes,
      description: validatedData.description,
      notes: validatedData.notes,
      insuranceProfileId: validatedData.insuranceProfileId,
    });

    // Link receipt document if provided
    if (validatedData.receiptData?.documentId) {
      try {
        // Update document to link it to the claim
        await enhancedDocumentUtils.linkDocumentToClaim(
          validatedData.receiptData.documentId,
          claim.id
        );

        // Log receipt processing integration
        await auditLogger.log({
          userId,
          action: 'CLAIM_RECEIPT_LINKED',
          entityType: 'Claim',
          entityId: claim.id,
          ipAddress: ip,
          success: true,
          newValues: {
            documentId: validatedData.receiptData.documentId,
            ocrConfidence: validatedData.receiptData.confidence,
          },
        });
      } catch (linkError) {
        console.warn('Failed to link receipt document:', linkError);
        // Don't fail the claim creation if document linking fails
      }
    }

    // Enhanced claim data with processing metadata
    const enhancedClaim = {
      ...claim,
      processingMetadata: {
        createdViaReceipt: !!validatedData.receiptData,
        ocrConfidence: validatedData.receiptData?.confidence,
        autoPopulatedFields: validatedData.receiptData ? [
          'dateOfService',
          'providerName', 
          'amountCents'
        ] : [],
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        claim: enhancedClaim,
        message: validatedData.receiptData 
          ? 'Claim created successfully from receipt data'
          : 'Claim created successfully',
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Claim creation error:', error);

    // Log error
    try {
      const session = await requireAuth();
      await auditLogger.log({
        userId: session.user.id,
        action: 'CLAIM_CREATION_ERROR',
        entityType: 'Claim',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid claim data',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create claim' } },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}