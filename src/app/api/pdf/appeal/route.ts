// API route for generating appeal letter PDFs
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateAppealPDF, validateAppealPDFData, AppealPDFData } from '@/lib/pdf-simple';
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
    const { claimId, denialReason, appealLetter, customData } = body;

    let appealData: AppealPDFData;

    if (claimId && denialReason && appealLetter) {
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

      // Convert database claim to appeal PDF data format
      appealData = {
        claimId: claim.id,
        denialReason,
        appealLetter,
        providerName: claim.providerName || 'Unknown Provider',
        dateOfService: claim.dateOfService || new Date(),
        amountCents: claim.amountCents,
        appealDate: new Date(),
      };
    } else if (customData) {
      // Use provided custom data
      appealData = {
        claimId: customData.claimId || 'custom',
        denialReason: customData.denialReason,
        appealLetter: customData.appealLetter,
        providerName: customData.providerName,
        dateOfService: new Date(customData.dateOfService),
        amountCents: Math.round(parseFloat(customData.amount) * 100),
        appealDate: new Date(),
      };
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'MISSING_DATA', 
            message: 'Either (claimId, denialReason, appealLetter) or customData is required' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate appeal data
    const validationErrors = validateAppealPDFData(appealData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid appeal data', 
            details: validationErrors 
          } 
        },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateAppealPDF(appealData, user.id);

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="appeal-${appealData.claimId}-${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Appeal PDF generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate appeal PDF',
        },
      },
      { status: 500 }
    );
  }
}

// GET endpoint for appeal PDF preview
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
    const denialReason = searchParams.get('denialReason');
    const appealLetter = searchParams.get('appealLetter');

    if (!claimId || !denialReason || !appealLetter) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'MISSING_PARAMETERS', 
            message: 'claimId, denialReason, and appealLetter are required' 
          } 
        },
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

    // Convert database claim to appeal PDF data format
    const appealData: AppealPDFData = {
      claimId: claim.id,
      denialReason: decodeURIComponent(denialReason),
      appealLetter: decodeURIComponent(appealLetter),
      providerName: claim.providerName || 'Unknown Provider',
      dateOfService: claim.dateOfService || new Date(),
      amountCents: claim.amountCents,
      appealDate: new Date(),
    };

    // Generate PDF
    const pdfBuffer = await generateAppealPDF(appealData, user.id);

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
    console.error('Appeal PDF preview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PDF_PREVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate appeal PDF preview',
        },
      },
      { status: 500 }
    );
  }
}