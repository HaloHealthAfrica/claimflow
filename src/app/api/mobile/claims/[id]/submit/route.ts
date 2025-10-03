// Mobile API - Claim submission endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security-middleware';
import { getCurrentUser } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { errorHandler } from '@/lib/error-handler';
import { NotificationHelpers } from '@/lib/notifications';
import { prisma } from '@/lib/db';

interface SubmitClaimRequest {
  submissionMethod?: 'electronic' | 'pdf';
  insurerInfo?: {
    name: string;
    payerCode?: string;
    address?: string;
  };
  notes?: string;
}

interface SubmitClaimResponse {
  success: boolean;
  data?: {
    claimId: string;
    submissionId: string;
    method: 'electronic' | 'pdf';
    status: string;
    submittedAt: string;
    estimatedProcessingTime: string;
    trackingInfo?: {
      confirmationNumber?: string;
      submissionUrl?: string;
    };
    fallbackPdf?: {
      url: string;
      downloadUrl: string;
    };
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<SubmitClaimResponse>> {
  return withSecurity({
    requireAuth: true,
    rateLimitKey: 'mobile_claim_submit',
    rateLimitMax: 10,
    rateLimitWindow: 3600,
    auditLevel: 'CRITICAL',
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
      const body: SubmitClaimRequest = await request.json();
      const { submissionMethod = 'electronic', insurerInfo, notes } = body;

      // Get claim with validation
      const claim = await prisma.claim.findFirst({
        where: {
          id: claimId,
          userId: user.id,
        },
        include: {
          documents: true,
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

      // Validate claim status
      if (claim.status !== 'DRAFT') {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CLAIM_ALREADY_SUBMITTED',
            message: 'This claim has already been submitted',
          },
        }, { status: 400 });
      }

      // Validate claim completeness
      const validationErrors: string[] = [];
      
      if (!claim.providerName) validationErrors.push('Provider name is required');
      if (!claim.dateOfService) validationErrors.push('Date of service is required');
      if (!claim.amountCents || claim.amountCents <= 0) validationErrors.push('Valid amount is required');
      if (!claim.cptCodes || (claim.cptCodes as string[]).length === 0) validationErrors.push('CPT codes are required');
      if (!claim.icdCodes || (claim.icdCodes as string[]).length === 0) validationErrors.push('ICD codes are required');

      // Check for required documents (at least one receipt or medical record)
      const hasRequiredDocs = claim.documents.some(doc => 
        ['RECEIPT', 'MEDICAL_RECORD', 'INSURANCE_CARD'].includes(doc.type)
      );
      if (!hasRequiredDocs) {
        validationErrors.push('At least one supporting document (receipt, medical record, or insurance card) is required');
      }

      if (validationErrors.length > 0) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please fix the following issues before submitting:',
            details: validationErrors,
          },
        }, { status: 400 });
      }

      // Generate submission ID
      const submissionId = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const submittedAt = new Date();

      let submissionResult: any = {};
      let actualMethod = submissionMethod;
      let fallbackPdf: any = null;

      try {
        if (submissionMethod === 'electronic') {
          // Attempt electronic submission
          submissionResult = await submitElectronically(claim, insurerInfo, submissionId);
          
          // If electronic submission fails, fall back to PDF
          if (!submissionResult.success) {
            console.log('Electronic submission failed, falling back to PDF');
            actualMethod = 'pdf';
            submissionResult = await generatePdfSubmission(claim, submissionId);
            fallbackPdf = submissionResult.pdf;
          }
        } else {
          // Direct PDF submission
          submissionResult = await generatePdfSubmission(claim, submissionId);
          fallbackPdf = submissionResult.pdf;
        }
      } catch (submissionError) {
        console.error('Submission error:', submissionError);
        
        // Always fall back to PDF if anything fails
        actualMethod = 'pdf';
        submissionResult = await generatePdfSubmission(claim, submissionId);
        fallbackPdf = submissionResult.pdf;
      }

      // Update claim status
      const updatedClaim = await prisma.claim.update({
        where: { id: claimId },
        data: {
          status: 'SUBMITTED',
          submittedAt,
          submissionId,
          submissionMethod: actualMethod,
          insurerName: insurerInfo?.name || claim.insurerName,
          claimNumber: submissionResult.confirmationNumber || submissionId,
          notes: notes ? `${claim.notes || ''}\n\nSubmission Notes: ${notes}`.trim() : claim.notes,
          updatedAt: new Date(),
        },
      });

      // Create submission record
      await prisma.claimSubmission.create({
        data: {
          claimId,
          submissionId,
          method: actualMethod,
          status: 'SUBMITTED',
          submittedAt,
          confirmationNumber: submissionResult.confirmationNumber,
          submissionUrl: submissionResult.submissionUrl,
          pdfUrl: fallbackPdf?.url,
          metadata: {
            insurerInfo,
            notes,
            originalMethod: submissionMethod,
            fallbackUsed: actualMethod !== submissionMethod,
          },
        },
      });

      // Log submission
      await auditLogger.log({
        eventType: 'CLAIM_SUBMITTED',
        severity: 'HIGH',
        userId: user.id,
        resourceType: 'CLAIM',
        resourceId: claimId,
        action: 'submit_claim',
        details: {
          submissionId,
          method: actualMethod,
          originalMethod: submissionMethod,
          fallbackUsed: actualMethod !== submissionMethod,
          insurerName: insurerInfo?.name,
          source: 'mobile_app',
        },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'mobile-app',
        success: true,
      });

      // Send notification
      try {
        await NotificationHelpers.claimSubmitted(
          user.id,
          claimId,
          claim.amountCents / 100,
          insurerInfo?.name || claim.insurerName || 'your insurance company'
        );
      } catch (notificationError) {
        console.error('Failed to send submission notification:', notificationError);
      }

      // Determine estimated processing time
      const estimatedProcessingTime = actualMethod === 'electronic' 
        ? '3-5 business days'
        : '7-14 business days';

      return NextResponse.json({
        success: true,
        data: {
          claimId,
          submissionId,
          method: actualMethod,
          status: 'SUBMITTED',
          submittedAt: submittedAt.toISOString(),
          estimatedProcessingTime,
          trackingInfo: {
            confirmationNumber: submissionResult.confirmationNumber || submissionId,
            submissionUrl: submissionResult.submissionUrl,
          },
          fallbackPdf: fallbackPdf ? {
            url: fallbackPdf.url,
            downloadUrl: `/api/mobile/claims/${claimId}/pdf`,
          } : undefined,
          message: actualMethod === 'electronic' 
            ? 'Claim submitted electronically successfully'
            : submissionMethod === 'electronic'
            ? 'Electronic submission failed, but PDF was generated successfully'
            : 'Claim PDF generated successfully',
        },
      }, { status: 200 });
    } catch (error) {
      console.error('Mobile claim submission error:', error);
      
      await errorHandler.handleError(
        error as Error,
        {
          component: 'MobileClaimSubmissionAPI',
          action: 'submit_claim',
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'mobile-app',
        }
      );

      return NextResponse.json({
        success: false,
        error: {
          code: 'SUBMISSION_FAILED',
          message: 'Failed to submit claim. Please try again.',
        },
      }, { status: 500 });
    }
  })(request);
}

// Helper function for electronic submission
async function submitElectronically(
  claim: any,
  insurerInfo: any,
  submissionId: string
): Promise<any> {
  // Mock electronic submission - in real implementation, this would:
  // 1. Format claim data according to EDI standards (837P)
  // 2. Submit to clearinghouse or directly to payer
  // 3. Handle real-time acknowledgments
  
  // Simulate success/failure
  const success = Math.random() > 0.2; // 80% success rate for demo
  
  if (success) {
    return {
      success: true,
      confirmationNumber: `ECN_${submissionId}`,
      submissionUrl: `https://clearinghouse.example.com/track/${submissionId}`,
      estimatedProcessingTime: '3-5 business days',
    };
  } else {
    throw new Error('Electronic submission failed - clearinghouse unavailable');
  }
}

// Helper function for PDF generation
async function generatePdfSubmission(
  claim: any,
  submissionId: string
): Promise<any> {
  // Mock PDF generation - in real implementation, this would:
  // 1. Generate CMS-1500 or UB-04 form
  // 2. Populate with claim data
  // 3. Store in secure location
  // 4. Return download URL
  
  const pdfUrl = `/api/claims/${claim.id}/pdf?submission=${submissionId}`;
  
  return {
    success: true,
    confirmationNumber: `PDF_${submissionId}`,
    pdf: {
      url: pdfUrl,
      filename: `claim_${claim.id}_${submissionId}.pdf`,
    },
    estimatedProcessingTime: '7-14 business days',
  };
}