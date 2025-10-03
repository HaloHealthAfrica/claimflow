/* eslint-disable @typescript-eslint/no-explicit-any */
// Claim creation API route
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma, encryptClaimData, createAuditLog } from '@/lib/db';
import { claimSchema } from '@/utils/validators';

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

    const body = await request.json();
    
    // Validate input data
    const validatedData = claimSchema.parse(body);

    // Encrypt sensitive data
    const encryptedData = encryptClaimData({
      providerName: validatedData.providerName,
    });

    // Create claim with draft status
    const claim = await prisma.claim.create({
      data: {
        userId: user.id,
        providerName: encryptedData.providerName,
        providerNpi: validatedData.providerNpi,
        dateOfService: validatedData.dateOfService,
        amountCents: validatedData.amountCents,
        cptCodes: validatedData.cptCodes || [],
        icdCodes: validatedData.icdCodes || [],
        status: 'DRAFT',
        submissionMethod: 'ELECTRONIC', // Default method
        timeline: {
          created: new Date().toISOString(),
          status: 'DRAFT',
        },
        receiptUrls: [],
      },
    });

    // Log claim creation
    await createAuditLog(
      user.id,
      'CLAIM_CREATED',
      'claim',
      { 
        claimId: claim.id,
        amountCents: claim.amountCents,
        status: claim.status,
      },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      data: {
        id: claim.id,
        status: claim.status,
        amountCents: claim.amountCents,
        dateOfService: claim.dateOfService,
        createdAt: claim.createdAt,
      },
    });
  } catch (error) {
    console.error('Claim creation error:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid claim data',
            details: error,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create claim',
        },
      },
      { status: 500 }
    );
  }
}

// Get user's claims
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId: user.id };
    if (status) {
      where.status = status;
    }

    // Get claims with pagination
    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          documents: true,
        },
      }),
      prisma.claim.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        claims: claims.map(claim => ({
          id: claim.id,
          status: claim.status,
          amountCents: claim.amountCents,
          dateOfService: claim.dateOfService,
          cptCodes: claim.cptCodes,
          icdCodes: claim.icdCodes,
          submissionMethod: claim.submissionMethod,
          denialReason: claim.denialReason,
          paidAmountCents: claim.paidAmountCents,
          confidenceScore: claim.confidenceScore,
          timeline: claim.timeline,
          receiptUrls: claim.receiptUrls,
          documentsCount: claim.documents.length,
          createdAt: claim.createdAt,
          updatedAt: claim.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Claims get error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: 'Failed to retrieve claims',
        },
      },
      { status: 500 }
    );
  }
}