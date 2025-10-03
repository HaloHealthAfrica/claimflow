// AI-powered medical code suggestion API route
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suggestCodes, ClaimContext, AI_CONFIG } from '@/lib/ai';
import { searchUtils } from '@/lib/db-utils';
import { auditLogger } from '@/lib/audit-logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for code suggestion request
const suggestCodesSchema = z.object({
  providerName: z.string().optional(),
  dateOfService: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  specialty: z.string().optional(),
  // Additional context for better suggestions
  patientAge: z.number().optional(),
  patientGender: z.enum(['male', 'female', 'other']).optional(),
  visitType: z.enum(['new', 'established', 'consultation', 'emergency']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = session.user?.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = suggestCodesSchema.parse(body);

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Check if AI service is available
    if (!AI_CONFIG.enabled) {
      // Provide fallback suggestions from database
      const fallbackSuggestions = await getFallbackSuggestions(validatedData);
      
      await auditLogger.logEvent({
        eventType: 'API_ACCESS',
        severity: 'LOW',
        userId,
        resourceType: 'AI_SERVICE',
        action: 'AI_CODE_SUGGESTION_FALLBACK',
        details: { suggestionsCount: fallbackSuggestions.length },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          suggestions: fallbackSuggestions,
          source: 'fallback',
          message: 'AI service unavailable, showing common codes',
        },
      });
    }

    // Build context for AI
    const context: ClaimContext = {
      providerName: validatedData.providerName,
      dateOfService: validatedData.dateOfService ? new Date(validatedData.dateOfService) : undefined,
      amount: validatedData.amount,
      description: validatedData.description,
      symptoms: validatedData.symptoms,
      diagnosis: validatedData.diagnosis,
      treatment: validatedData.treatment,
      specialty: validatedData.specialty,
    };

    // Get AI suggestions
    const suggestions = await suggestCodes(context, userId);

    // Enhance suggestions with database information
    const enhancedSuggestions = await enhanceSuggestionsWithDbInfo(suggestions);

    return NextResponse.json({
      success: true,
      data: {
        suggestions: enhancedSuggestions,
        source: 'ai',
        confidence: calculateOverallConfidence(enhancedSuggestions),
        context: {
          hasDescription: !!validatedData.description,
          hasSymptoms: !!validatedData.symptoms,
          hasDiagnosis: !!validatedData.diagnosis,
          hasTreatment: !!validatedData.treatment,
        },
      },
    });

  } catch (error) {
    console.error('AI code suggestion error:', error);

    // Log error
    try {
      const session = await requireAuth();
      await auditLogger.logEvent({
        eventType: 'API_ACCESS',
        severity: 'HIGH',
        userId: session.user?.id,
        resourceType: 'AI_SERVICE',
        action: 'AI_CODE_SUGGESTION_ERROR',
        details: {},
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
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
            message: 'Invalid request data',
            details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'Failed to generate code suggestions',
        },
      },
      { status: 500 }
    );
  }
}

// Get fallback suggestions from database when AI is unavailable
async function getFallbackSuggestions(context: any) {
  const suggestions = [];

  // Common CPT codes based on context
  if (context.description) {
    try {
      const cptResults = await searchUtils.searchCPTCodes(context.description);
      suggestions.push(...cptResults.slice(0, 3).map((code: any) => ({
        code: code.code,
        description: code.description,
        type: 'CPT' as const,
        confidence: 0.7,
        category: code.category,
        notes: 'Common code from database',
        source: 'database',
      })));
    } catch (error) {
      console.warn('Failed to search CPT codes:', error);
    }
  }

  // Common ICD codes based on context
  if (context.symptoms || context.diagnosis) {
    try {
      const searchTerm = context.diagnosis || context.symptoms;
      const icdResults = await searchUtils.searchICDCodes(searchTerm);
      suggestions.push(...icdResults.slice(0, 3).map((code: any) => ({
        code: code.code,
        description: code.description,
        type: 'ICD' as const,
        confidence: 0.7,
        category: code.category,
        notes: 'Common code from database',
        source: 'database',
      })));
    } catch (error) {
      console.warn('Failed to search ICD codes:', error);
    }
  }

  // Default common codes if no specific matches
  if (suggestions.length === 0) {
    suggestions.push(
      {
        code: '99213',
        description: 'Office or other outpatient visit for the evaluation and management of an established patient',
        type: 'CPT' as const,
        confidence: 0.6,
        category: 'Evaluation and Management',
        notes: 'Most common office visit code',
        source: 'default',
      },
      {
        code: 'Z00.00',
        description: 'Encounter for general adult medical examination without abnormal findings',
        type: 'ICD' as const,
        confidence: 0.6,
        category: 'Factors influencing health status',
        notes: 'Common general examination code',
        source: 'default',
      }
    );
  }

  return suggestions;
}

// Enhance AI suggestions with database information
async function enhanceSuggestionsWithDbInfo(suggestions: any[]) {
  const enhanced = [];

  for (const suggestion of suggestions) {
    let dbInfo = null;

    try {
      if (suggestion.type === 'CPT') {
        const cptCode = await prisma.cPTCode.findUnique({
          where: { code: suggestion.code },
        });
        if (cptCode) {
          dbInfo = {
            averagePrice: cptCode.averagePrice,
            medicarePrice: cptCode.medicarePrice,
            isActive: cptCode.isActive,
          };
        }
      } else if (suggestion.type === 'ICD') {
        const icdCode = await prisma.iCDCode.findUnique({
          where: { code: suggestion.code },
        });
        if (icdCode) {
          dbInfo = {
            icdVersion: icdCode.icdVersion,
            isActive: icdCode.isActive,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to fetch database info for code:', suggestion.code, error);
    }

    enhanced.push({
      ...suggestion,
      dbInfo,
      verified: !!dbInfo,
    });
  }

  return enhanced;
}

// Calculate overall confidence score
function calculateOverallConfidence(suggestions: any[]): number {
  if (suggestions.length === 0) return 0;
  
  const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
  return totalConfidence / suggestions.length;
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}