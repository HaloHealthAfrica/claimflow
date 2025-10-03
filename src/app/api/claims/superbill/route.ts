// Smart Superbill Assistant API route for medical code suggestions
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { suggestCodes, ClaimContext } from '@/lib/ai';

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
    
    // Build claim context from request data
    const context: ClaimContext = {
      providerName: body.providerName,
      dateOfService: body.dateOfService ? new Date(body.dateOfService) : undefined,
      amount: body.amount,
      description: body.description,
      symptoms: body.symptoms,
      diagnosis: body.diagnosis,
      treatment: body.treatment,
      specialty: body.specialty,
    };

    // Validate that we have enough context for suggestions
    if (!context.providerName && !context.description && !context.symptoms && !context.diagnosis) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INSUFFICIENT_CONTEXT', 
            message: 'Please provide more information about the medical service to get code suggestions' 
          } 
        },
        { status: 400 }
      );
    }

    // Get AI code suggestions
    const suggestions = await suggestCodes(context, user.id);

    // Separate CPT and ICD suggestions
    const cptSuggestions = suggestions.filter(s => s.type === 'CPT');
    const icdSuggestions = suggestions.filter(s => s.type === 'ICD');

    return NextResponse.json({
      success: true,
      data: {
        cptSuggestions,
        icdSuggestions,
        totalSuggestions: suggestions.length,
        context: {
          hasProvider: !!context.providerName,
          hasDescription: !!context.description,
          hasSymptoms: !!context.symptoms,
          hasDiagnosis: !!context.diagnosis,
        },
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Superbill AI error:', error);

    // Handle specific AI service errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_SERVICE_UNAVAILABLE',
              message: 'AI service is currently unavailable',
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
              message: 'Too many requests. Please try again in a moment.',
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
          code: 'AI_FAILED',
          message: 'Failed to generate code suggestions',
        },
      },
      { status: 500 }
    );
  }
}