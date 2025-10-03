// API route for claim submission with electronic and PDF fallback
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { submitClaimElectronically, formatClaimForSubmission } from '@/lib/clearinghouse';
import { generateClaimPDF } from '@/lib/pdf-simple';
import { createAuditLog } from '@/lib/db';

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
    const { claimId, submissionMethod = 'electronic' } = body;

    if (!claimId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_CLAIM_ID', message: 'Claim ID is required' } },
        { status: 400 }
      );
    }

    // Get claim from database
    const claim = await prisma.claim.findFirst({
      where: {
        id: claimId,
        userId: user.id, // Ensure user owns the claim
      },
    });

    if (!claim) {
      return NextResponse.json(
        { success: false, error: { code: 'CLAIM_NOT_FOUND', message: 'Claim not found or access denied' } },
        { status: 404 }
      );
    }

    // Check if claim is already submitted
    if (claim.status === 'SUBMITTED' || claim.status === 'PROCESSING' || claim.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_SUBMITTED', message: 'Claim has already been submitted' } },
        { status: 400 }
      );
    }

    let submissionResult;
    let pdfGenerated = false;
    let pdfBuffer: Buffer | null = null;

    try {
      if (submissionMethod === 'electronic') {
        // Attempt electronic submission first
        const claimData = formatClaimForSubmission(claim);
        submissionResult = await submitClaimElectronically(claimData, user.id);

        if (!submissionResult.success) {
          // Electronic submission failed, fall back to PDF
          console.log('Electronic submission failed, generating PDF fallback...');
          
          try {
            pdfBuffer = await generateClaimPDF({
              id: claim.id,
              providerName: claim.providerName || 'Unknown Provider',
              dateOfService: claim.dateOfService || new Date(),
              amountCents: claim.amountCents,
              cptCodes: claim.cptCodes,
              icdCodes: claim.icdCodes,
            }, user.id);
            
            pdfGenerated = true;
            
            // Update submission result to indicate PDF fallback
            submissionResult = {
              success: true,
              method: 'pdf_fallback',
              timestamp: new Date(),
              submissionId: `PDF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
          } catch (pdfError) {
            console.error('PDF fallback failed:', pdfError);
            throw new Error('Both electronic submission and PDF fallback failed');
          }
        }
      } else if (submissionMethod === 'pdf') {
        // Direct PDF submission
        pdfBuffer = await generateClaimPDF({
          id: claim.id,
          providerName: claim.providerName || 'Unknown Provider',
          dateOfService: claim.dateOfService || new Date(),
          amountCents: claim.amountCents,
          cptCodes: claim.cptCodes,
          icdCodes: claim.icdCodes,
        }, user.id);
        
        pdfGenerated = true;
        
        submissionResult = {
          success: true,
          method: 'pdf_fallback',
          timestamp: new Date(),
          submissionId: `PDF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
      } else {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_METHOD', message: 'Invalid submission method' } },
          { status: 400 }
        );
      }

      // Update claim status in database
      const updatedClaim = await prisma.claim.update({
        where: { id: claimId },
        data: {
          status: submissionResult.success ? 'SUBMITTED' : 'DRAFT',
          submissionMethod: submissionResult.method === 'electronic' ? 'ELECTRONIC' : 'PDF',
          submittedAt: submissionResult.success ? new Date() : null,
          timeline: {
            ...(claim.timeline as object || {}),
            submitted: submissionResult.success ? new Date().toISOString() : null,
            submissionId: submissionResult.submissionId,
            submissionMethod: submissionResult.method,
          },
        },
      });

      // Log submission
      await createAuditLog(
        user.id,
        'CLAIM_SUBMISSION',
        'submission_service',
        {
          claimId,
          method: submissionResult.method,
          success: submissionResult.success,
          submissionId: submissionResult.submissionId,
          pdfGenerated,
        },
        'unknown',
        'unknown'
      );

      // Prepare response
      const response = {
        success: true,
        data: {
          claim: {
            id: updatedClaim.id,
            status: updatedClaim.status,
            submissionMethod: updatedClaim.submissionMethod,
            submittedAt: updatedClaim.submittedAt,
          },
          submission: {
            method: submissionResult.method,
            submissionId: submissionResult.submissionId,
            confirmationNumber: submissionResult.confirmationNumber,
            timestamp: submissionResult.timestamp,
            pdfGenerated,
          },
          message: getSubmissionMessage(submissionResult.method, submissionResult.success),
        },
      };

      // If PDF was generated, include it in the response
      if (pdfGenerated && pdfBuffer) {
        return new NextResponse(JSON.stringify({
          ...response,
          pdfAvailable: true,
          pdfDownloadUrl: `/api/pdf/claim?claimId=${claimId}`,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      return NextResponse.json(response);
    } catch (submissionError) {
      console.error('Submission error:', submissionError);
      
      // Log failed submission
      await createAuditLog(
        user.id,
        'CLAIM_SUBMISSION_FAILED',
        'submission_service',
        {
          claimId,
          error: submissionError instanceof Error ? submissionError.message : 'Unknown error',
        },
        'unknown',
        'unknown'
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUBMISSION_FAILED',
            message: submissionError instanceof Error ? submissionError.message : 'Claim submission failed',
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Claim submission API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

// Get submission status
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
    const claimId = searchParams.get('claimId');

    if (!claimId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_CLAIM_ID', message: 'Claim ID is required' } },
        { status: 400 }
      );
    }

    // Get claim from database
    const claim = await prisma.claim.findFirst({
      where: {
        id: claimId,
        userId: user.id, // Ensure user owns the claim
      },
    });

    if (!claim) {
      return NextResponse.json(
        { success: false, error: { code: 'CLAIM_NOT_FOUND', message: 'Claim not found or access denied' } },
        { status: 404 }
      );
    }

    // Get submission timeline from claim
    const timeline = claim.timeline as any || {};
    
    return NextResponse.json({
      success: true,
      data: {
        claimId: claim.id,
        status: claim.status,
        submissionMethod: claim.submissionMethod,
        submittedAt: claim.submittedAt,
        timeline: {
          created: claim.createdAt,
          submitted: timeline.submitted,
          submissionId: timeline.submissionId,
          submissionMethod: timeline.submissionMethod,
        },
        canResubmit: claim.status === 'DRAFT' || claim.status === 'REJECTED',
      },
    });
  } catch (error) {
    console.error('Submission status API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

// Helper function to get submission message
function getSubmissionMessage(method: string, success: boolean): string {
  if (!success) {
    return 'Submission failed. Please try again or contact support.';
  }

  switch (method) {
    case 'electronic':
      return 'Claim submitted electronically to clearinghouse. You will receive updates on processing status.';
    case 'pdf_fallback':
      return 'Electronic submission failed, but a PDF has been generated for manual submission to your insurance provider.';
    default:
      return 'Claim submitted successfully.';
  }
}