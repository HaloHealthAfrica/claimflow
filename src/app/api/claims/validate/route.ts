// Claim validation API route with AI analysis
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateClaim } from '@/lib/ai';

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
    
    // Validate required fields
    if (!body.amountCents || typeof body.amountCents !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_DATA', 
            message: 'Amount is required for validation' 
          } 
        },
        { status: 400 }
      );
    }

    // Build claim data for validation
    const claimData = {
      providerName: body.providerName,
      providerNpi: body.providerNpi,
      dateOfService: body.dateOfService ? new Date(body.dateOfService) : undefined,
      amountCents: body.amountCents,
      cptCodes: body.cptCodes || [],
      icdCodes: body.icdCodes || [],
      description: body.description,
    };

    // Validate claim with AI
    const validationResult = await validateClaim(claimData, user.id);

    // Determine overall validation status
    const hasErrors = validationResult.errors.length > 0;
    const hasHighSeverityErrors = validationResult.errors.some(e => e.severity === 'high');
    const isValid = !hasErrors || !hasHighSeverityErrors;

    return NextResponse.json({
      success: true,
      data: {
        ...validationResult,
        isValid,
        canSubmit: isValid && validationResult.confidenceScore >= 0.7,
        summary: {
          errorsCount: validationResult.errors.length,
          warningsCount: validationResult.warnings.length,
          highSeverityErrors: validationResult.errors.filter(e => e.severity === 'high').length,
          confidenceLevel: validationResult.confidenceScore >= 0.8 ? 'high' : 
                          validationResult.confidenceScore >= 0.6 ? 'medium' : 'low',
        },
        validatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Claim validation error:', error);

    // Handle specific AI service errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_SERVICE_UNAVAILABLE',
              message: 'Validation service is currently unavailable',
            },
          },
          { status: 503 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many validation requests. Please try again in a moment.',
            },
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Failed to validate claim',
        },
      },
      { status: 500 }
    );
  }
}