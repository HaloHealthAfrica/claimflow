// API route for generating claim PDFs
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateClaimPDF, validateClaimPDFData, ClaimPDFData } from '@/lib/pdf-simple';
import { prisma } from '@/lib/db';

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
    const { claimId, customData } = body;

    let claimData: ClaimPDFData;

    if (claimId) {
      // Get claim data from database
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

      // Convert database claim to PDF data format
      claimData = {
        id: claim.id,
        providerName: claim.providerName || 'Unknown Provider',
        dateOfService: claim.dateOfService || new Date(),
        amountCents: claim.amountCents,
        cptCodes: claim.cptCodes,
        icdCodes: claim.icdCodes,
      };
    } else if (customData) {
      // Use provided custom data
      claimData = {
        providerName: customData.providerName,
        dateOfService: new Date(customData.dateOfService),
        amountCents: Math.round(parseFloat(customData.amount) * 100),
        cptCodes: customData.cptCodes || [],
        icdCodes: customData.icdCodes || [],
      };
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_DATA', message: 'Either claimId or customData is required' } },
        { status: 400 }
      );
    }

    // Validate claim data
    const validationErrors = validateClaimPDFData(claimData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid claim data', 
            details: validationErrors 
          } 
        },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateClaimPDF(claimData, user.id);

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="claim-${claimData.id || 'draft'}-${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate PDF',
        },
      },
      { status: 500 }
    );
  }
}

// GET endpoint for PDF preview
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

    // Get claim data from database
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

    // Convert database claim to PDF data format
    const claimData: ClaimPDFData = {
      id: claim.id,
      providerName: claim.providerName || 'Unknown Provider',
      dateOfService: claim.dateOfService || new Date(),
      amountCents: claim.amountCents,
      cptCodes: claim.cptCodes,
      icdCodes: claim.icdCodes,
    };

    // Generate PDF
    const pdfBuffer = await generateClaimPDF(claimData, user.id);

    // Return PDF for preview (inline display)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('PDF preview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PDF_PREVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate PDF preview',
        },
      },
      { status: 500 }
    );
  }
}