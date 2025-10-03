// Mobile API - Claims management endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { getCurrentUser } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import { prisma } from '@/lib/db';

interface MobileClaim {
  id: string;
  status: string;
  amountCents: number;
  dateOfService: string | null;
  providerName: string | null;
  insurerName: string | null;
  claimNumber: string | null;
  cptCodes: string[];
  icdCodes: string[];
  submittedAt: string | null;
  processedAt: string | null;
  paidAt: string | null;
  denialReason: string | null;
  paymentAmount: number | null;
  createdAt: string;
  updatedAt: string;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;
}

interface ClaimsResponse {
  success: boolean;
  data?: {
    claims: MobileClaim[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
    summary: {
      totalClaims: number;
      pendingClaims: number;
      approvedClaims: number;
      deniedClaims: number;
      totalAmount: number;
      paidAmount: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

interface CreateClaimRequest {
  providerName: string;
  dateOfService: string;
  amountCents: number;
  cptCodes: string[];
  icdCodes: string[];
  insurerName?: string;
  notes?: string;
}

interface CreateClaimResponse {
  success: boolean;
  data?: {
    claim: MobileClaim;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

// GET - Retrieve user's claims
export const GET = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_claims_get',
  rateLimitMax: 100,
  rateLimitWindow: 3600,
  auditLevel: 'MEDIUM',
})(async function(request: NextRequest): Promise<NextResponse<ClaimsResponse>> {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { userId: user.id };
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get claims with documents
    const [claims, totalCount] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: {
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              uploadedAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.claim.count({ where }),
    ]);

    // Get summary statistics
    const allUserClaims = await prisma.claim.findMany({
      where: { userId: user.id },
      select: {
        status: true,
        amountCents: true,
        paymentAmount: true,
      },
    });

    const summary = {
      totalClaims: allUserClaims.length,
      pendingClaims: allUserClaims.filter(c => ['DRAFT', 'SUBMITTED', 'PROCESSING'].includes(c.status)).length,
      approvedClaims: allUserClaims.filter(c => ['APPROVED', 'PAID'].includes(c.status)).length,
      deniedClaims: allUserClaims.filter(c => c.status === 'DENIED').length,
      totalAmount: allUserClaims.reduce((sum, c) => sum + c.amountCents, 0),
      paidAmount: allUserClaims
        .filter(c => c.status === 'PAID')
        .reduce((sum, c) => sum + (c.paymentAmount || c.amountCents), 0),
    };

    // Transform claims for mobile response
    const mobileClaims: MobileClaim[] = claims.map(claim => ({
      id: claim.id,
      status: claim.status,
      amountCents: claim.amountCents,
      dateOfService: claim.dateOfService?.toISOString() || null,
      providerName: claim.providerName,
      insurerName: claim.insurerName,
      claimNumber: claim.claimNumber,
      cptCodes: claim.cptCodes as string[],
      icdCodes: claim.icdCodes as string[],
      submittedAt: claim.submittedAt?.toISOString() || null,
      processedAt: claim.processedAt?.toISOString() || null,
      paidAt: claim.paidAt?.toISOString() || null,
      denialReason: claim.denialReason,
      paymentAmount: claim.paymentAmount,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      documents: claim.documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: doc.uploadedAt.toISOString(),
      })),
    }));

    // Log access
    await auditLogger.logPHIAccess(
      {
        userId: user.id,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
        requestId: crypto.randomUUID(),
      },
      'CLAIM',
      'multiple',
      'list_claims',
      true,
      { claimCount: claims.length, filters: { status, startDate, endDate } }
    );

    return NextResponse.json({
      success: true,
      data: {
        claims: mobileClaims,
        pagination: {
          total: totalCount,
          page,
          limit,
          hasMore: offset + limit < totalCount,
        },
        summary,
      },
    });
  } catch (error) {
    console.error('Mobile claims GET error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileClaimsAPI',
        action: 'get_claims',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'CLAIMS_FETCH_FAILED',
        message: 'Failed to retrieve claims. Please try again.',
      },
    }, { status: 500 });
  }
});

// POST - Create new claim
export const POST = withSecurity({
  requireAuth: true,
  rateLimitKey: 'mobile_claims_create',
  rateLimitMax: 20,
  rateLimitWindow: 3600,
  auditLevel: 'HIGH',
})(async function(request: NextRequest): Promise<NextResponse<CreateClaimResponse>> {
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

    const body: CreateClaimRequest = await request.json();
    const { 
      providerName, 
      dateOfService, 
      amountCents, 
      cptCodes, 
      icdCodes, 
      insurerName, 
      notes 
    } = body;

    // Validate required fields
    const validationErrors: string[] = [];
    
    if (!providerName?.trim()) validationErrors.push('Provider name is required');
    if (!dateOfService) validationErrors.push('Date of service is required');
    if (!amountCents || amountCents <= 0) validationErrors.push('Valid amount is required');
    if (!cptCodes || cptCodes.length === 0) validationErrors.push('At least one CPT code is required');
    if (!icdCodes || icdCodes.length === 0) validationErrors.push('At least one ICD code is required');

    // Validate date
    const serviceDate = new Date(dateOfService);
    if (isNaN(serviceDate.getTime())) {
      validationErrors.push('Invalid date of service');
    } else if (serviceDate > new Date()) {
      validationErrors.push('Date of service cannot be in the future');
    }

    // Validate amount (max $100,000)
    if (amountCents > 10000000) {
      validationErrors.push('Amount cannot exceed $100,000');
    }

    // Validate codes format
    const cptRegex = /^\d{5}$/;
    const invalidCptCodes = cptCodes.filter(code => !cptRegex.test(code));
    if (invalidCptCodes.length > 0) {
      validationErrors.push(`Invalid CPT codes: ${invalidCptCodes.join(', ')}`);
    }

    const icdRegex = /^[A-Z]\d{2}(\.\d{1,2})?$/;
    const invalidIcdCodes = icdCodes.filter(code => !icdRegex.test(code));
    if (invalidIcdCodes.length > 0) {
      validationErrors.push(`Invalid ICD codes: ${invalidIcdCodes.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the following errors:',
          details: validationErrors,
        },
      }, { status: 400 });
    }

    // Create claim
    const claim = await prisma.claim.create({
      data: {
        userId: user.id,
        providerName: providerName.trim(),
        dateOfService: serviceDate,
        amountCents,
        cptCodes,
        icdCodes,
        insurerName: insurerName?.trim(),
        notes: notes?.trim(),
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            uploadedAt: true,
          },
        },
      },
    });

    // Log claim creation
    await auditLogger.log({
      eventType: 'CLAIM_CREATED',
      severity: 'MEDIUM',
      userId: user.id,
      resourceType: 'CLAIM',
      resourceId: claim.id,
      action: 'create_claim',
      details: {
        providerName,
        amountCents,
        cptCodeCount: cptCodes.length,
        icdCodeCount: icdCodes.length,
        source: 'mobile_app',
      },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'mobile-app',
      success: true,
    });

    // Transform for mobile response
    const mobileClaim: MobileClaim = {
      id: claim.id,
      status: claim.status,
      amountCents: claim.amountCents,
      dateOfService: claim.dateOfService?.toISOString() || null,
      providerName: claim.providerName,
      insurerName: claim.insurerName,
      claimNumber: claim.claimNumber,
      cptCodes: claim.cptCodes as string[],
      icdCodes: claim.icdCodes as string[],
      submittedAt: claim.submittedAt?.toISOString() || null,
      processedAt: claim.processedAt?.toISOString() || null,
      paidAt: claim.paidAt?.toISOString() || null,
      denialReason: claim.denialReason,
      paymentAmount: claim.paymentAmount,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      documents: claim.documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: doc.uploadedAt.toISOString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        claim: mobileClaim,
        message: 'Claim created successfully',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Mobile claims POST error:', error);
    
    await errorHandler.handleError(
      error as Error,
      {
        component: 'MobileClaimsAPI',
        action: 'create_claim',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
      }
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'CLAIM_CREATION_FAILED',
        message: 'Failed to create claim. Please try again.',
      },
    }, { status: 500 });
  }
});