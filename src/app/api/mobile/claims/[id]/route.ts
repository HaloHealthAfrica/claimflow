// Mobile API - Individual claim management
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { getCurrentUser } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import { prisma } from '@/lib/db';

interface ClaimDetailResponse {
  success: boolean;
  data?: {
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
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    documents: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      uploadedAt: string;
      url?: string;
    }>;
    timeline: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      metadata?: Record<string, any>;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface UpdateClaimRequest {
  providerName?: string;
  dateOfService?: string;
  amountCents?: number;
  cptCodes?: string[];
  icdCodes?: string[];
  insurerName?: string;
  notes?: string;
}

// GET - Get individual claim details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ClaimDetailResponse>> {
  return withSecurity({
    requireAuth: true,
    rateLimitKey: 'mobile_claim_detail',
    rateLimitMax: 200,
    rateLimitWindow: 3600,
    auditLevel: 'HIGH',
  })(async () => {
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

      const claimId = params.id;

      // Get claim with all related data
      const claim = await prisma.claim.findFirst({
        where: {
          id: claimId,
          userId: user.id, // Ensure user owns the claim
        },
        include: {
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              uploadedAt: true,
              url: true,
            },
          },
          auditLogs: {
            where: {
              resourceType: 'CLAIM',
              resourceId: claimId,
            },
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
        },
      });

      if (!claim) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CLAIM_NOT_FOUND',
            message: 'Claim not found',
          },
        }, { status: 404 });
      }

      // Generate timeline from audit logs and claim data
      const timeline = [
        {
          id: 'created',
          type: 'CREATED',
          title: 'Claim Created',
          description: 'Claim was created and saved as draft',
          timestamp: claim.createdAt.toISOString(),
          metadata: { source: 'system' },
        },
        ...(claim.submittedAt ? [{
          id: 'submitted',
          type: 'SUBMITTED',
          title: 'Claim Submitted',
          description: 'Claim was submitted to insurance company',
          timestamp: claim.submittedAt.toISOString(),
          metadata: { source: 'system' },
        }] : []),
        ...(claim.status === 'PROCESSING' ? [{
          id: 'processing',
          type: 'PROCESSING',
          title: 'Processing Started',
          description: 'Insurance company began processing your claim',
          timestamp: claim.updatedAt.toISOString(),
          metadata: { source: 'system' },
        }] : []),
        ...(claim.status === 'APPROVED' && claim.processedAt ? [{
          id: 'approved',
          type: 'APPROVED',
          title: 'Claim Approved',
          description: 'Your claim has been approved for payment',
          timestamp: claim.processedAt.toISOString(),
          metadata: { source: 'system' },
        }] : []),
        ...(claim.status === 'DENIED' && claim.processedAt ? [{
          id: 'denied',
          type: 'DENIED',
          title: 'Claim Denied',
          description: claim.denialReason || 'Claim was denied by insurance company',
          timestamp: claim.processedAt.toISOString(),
          metadata: { source: 'system', reason: claim.denialReason },
        }] : []),
        ...(claim.status === 'PAID' && claim.paidAt ? [{
          id: 'paid',
          type: 'PAID',
          title: 'Payment Processed',
          description: `Payment of $${((claim.paymentAmount || claim.amountCents) / 100).toFixed(2)} was processed`,
          timestamp: claim.paidAt.toISOString(),
          metadata: { source: 'system', amount: claim.paymentAmount || claim.amountCents },
        }] : []),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Log access
      await auditLogger.logPHIAccess(
        {
          userId: user.id,
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
          requestId: crypto.randomUUID(),
        },
        'CLAIM',
        claimId,
        'view_claim_detail',
        true
      );

      return NextResponse.json({
        success: true,
        data: {
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
          notes: claim.notes,
          createdAt: claim.createdAt.toISOString(),
          updatedAt: claim.updatedAt.toISOString(),
          documents: claim.documents.map(doc => ({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            size: doc.size,
            uploadedAt: doc.uploadedAt.toISOString(),
            url: doc.url || undefined,
          })),
          timeline,
        },
      });
    } catch (error) {
      console.error('Mobile claim detail GET error:', error);
      
      await errorHandler.handleError(
        error as Error,
        {
          component: 'MobileClaimDetailAPI',
          action: 'get_claim_detail',
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
        }
      );

      return NextResponse.json({
        success: false,
        error: {
          code: 'CLAIM_DETAIL_FAILED',
          message: 'Failed to retrieve claim details. Please try again.',
        },
      }, { status: 500 });
    }
  })(request);
}

// PUT - Update claim (only if status is DRAFT)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ClaimDetailResponse>> {
  return withSecurity({
    requireAuth: true,
    rateLimitKey: 'mobile_claim_update',
    rateLimitMax: 50,
    rateLimitWindow: 3600,
    auditLevel: 'HIGH',
  })(async () => {
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

      const claimId = params.id;
      const body: UpdateClaimRequest = await request.json();

      // Get existing claim
      const existingClaim = await prisma.claim.findFirst({
        where: {
          id: claimId,
          userId: user.id,
        },
      });

      if (!existingClaim) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CLAIM_NOT_FOUND',
            message: 'Claim not found',
          },
        }, { status: 404 });
      }

      // Only allow updates for draft claims
      if (existingClaim.status !== 'DRAFT') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CLAIM_NOT_EDITABLE',
            message: 'Only draft claims can be edited',
          },
        }, { status: 400 });
      }

      // Validate updates
      const updates: any = {};
      
      if (body.providerName !== undefined) {
        if (!body.providerName.trim()) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Provider name cannot be empty',
            },
          }, { status: 400 });
        }
        updates.providerName = body.providerName.trim();
      }

      if (body.dateOfService !== undefined) {
        const serviceDate = new Date(body.dateOfService);
        if (isNaN(serviceDate.getTime()) || serviceDate > new Date()) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid date of service',
            },
          }, { status: 400 });
        }
        updates.dateOfService = serviceDate;
      }

      if (body.amountCents !== undefined) {
        if (body.amountCents <= 0 || body.amountCents > 10000000) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid amount',
            },
          }, { status: 400 });
        }
        updates.amountCents = body.amountCents;
      }

      if (body.cptCodes !== undefined) {
        const cptRegex = /^\d{5}$/;
        const invalidCodes = body.cptCodes.filter(code => !cptRegex.test(code));
        if (invalidCodes.length > 0) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid CPT codes: ${invalidCodes.join(', ')}`,
            },
          }, { status: 400 });
        }
        updates.cptCodes = body.cptCodes;
      }

      if (body.icdCodes !== undefined) {
        const icdRegex = /^[A-Z]\d{2}(\.\d{1,2})?$/;
        const invalidCodes = body.icdCodes.filter(code => !icdRegex.test(code));
        if (invalidCodes.length > 0) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid ICD codes: ${invalidCodes.join(', ')}`,
            },
          }, { status: 400 });
        }
        updates.icdCodes = body.icdCodes;
      }

      if (body.insurerName !== undefined) {
        updates.insurerName = body.insurerName.trim() || null;
      }

      if (body.notes !== undefined) {
        updates.notes = body.notes.trim() || null;
      }

      // Update claim
      updates.updatedAt = new Date();
      
      const updatedClaim = await prisma.claim.update({
        where: { id: claimId },
        data: updates,
        include: {
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              uploadedAt: true,
              url: true,
            },
          },
        },
      });

      // Log update
      await auditLogger.log({
        eventType: 'CLAIM_UPDATED',
        severity: 'MEDIUM',
        userId: user.id,
        resourceType: 'CLAIM',
        resourceId: claimId,
        action: 'update_claim',
        details: {
          updatedFields: Object.keys(updates),
          source: 'mobile_app',
        },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
        success: true,
      });

      // Return updated claim (reuse GET logic)
      return GET(request, { params });
    } catch (error) {
      console.error('Mobile claim update error:', error);
      
      await errorHandler.handleError(
        error as Error,
        {
          component: 'MobileClaimDetailAPI',
          action: 'update_claim',
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
        }
      );

      return NextResponse.json({
        success: false,
        error: {
          code: 'CLAIM_UPDATE_FAILED',
          message: 'Failed to update claim. Please try again.',
        },
      }, { status: 500 });
    }
  })(request);
}

// DELETE - Delete claim (only if status is DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<{ success: boolean; error?: { code: string; message: string } }>> {
  return withSecurity({
    requireAuth: true,
    rateLimitKey: 'mobile_claim_delete',
    rateLimitMax: 20,
    rateLimitWindow: 3600,
    auditLevel: 'HIGH',
  })(async () => {
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

      const claimId = params.id;

      // Get existing claim
      const existingClaim = await prisma.claim.findFirst({
        where: {
          id: claimId,
          userId: user.id,
        },
      });

      if (!existingClaim) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CLAIM_NOT_FOUND',
            message: 'Claim not found',
          },
        }, { status: 404 });
      }

      // Only allow deletion for draft claims
      if (existingClaim.status !== 'DRAFT') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CLAIM_NOT_DELETABLE',
            message: 'Only draft claims can be deleted',
          },
        }, { status: 400 });
      }

      // Delete claim and related documents
      await prisma.$transaction([
        prisma.document.deleteMany({
          where: { claimId },
        }),
        prisma.claim.delete({
          where: { id: claimId },
        }),
      ]);

      // Log deletion
      await auditLogger.log({
        eventType: 'PHI_DELETED',
        severity: 'HIGH',
        userId: user.id,
        resourceType: 'CLAIM',
        resourceId: claimId,
        action: 'delete_claim',
        details: {
          deletedStatus: existingClaim.status,
          source: 'mobile_app',
        },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
        success: true,
      });

      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error('Mobile claim delete error:', error);
      
      await errorHandler.handleError(
        error as Error,
        {
          component: 'MobileClaimDetailAPI',
          action: 'delete_claim',
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
        }
      );

      return NextResponse.json({
        success: false,
        error: {
          code: 'CLAIM_DELETE_FAILED',
          message: 'Failed to delete claim. Please try again.',
        },
      }, { status: 500 });
    }
  })(request);
}