// AI-powered claim validation API route
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validateClaim, AI_CONFIG } from '@/lib/ai';
import { auditLogger } from '@/lib/audit-logger';
import { z } from 'zod';

// Validation schema for claim validation request
const validateClaimSchema = z.object({
  providerName: z.string().optional(),
  providerNPI: z.string().optional(),
  dateOfService: z.string().transform((str) => new Date(str)),
  amountCents: z.number().min(1, 'Amount must be greater than 0'),
  cptCodes: z.array(z.string()).min(1, 'At least one CPT code is required'),
  icdCodes: z.array(z.string()).min(1, 'At least one ICD code is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
  // Additional validation context
  insuranceType: z.enum(['commercial', 'medicare', 'medicaid', 'other']).optional(),
  patientAge: z.number().optional(),
  specialty: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = session.user?.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateClaimSchema.parse(body);

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Perform basic validation first
    const basicValidation = performBasicValidation(validatedData);

    // Check if AI service is available for enhanced validation
    let aiValidation = null;
    if (AI_CONFIG.enabled) {
      try {
        aiValidation = await validateClaim(validatedData, userId);
      } catch (aiError) {
        console.warn('AI validation failed, using basic validation only:', aiError);
        
        await auditLogger.logEvent({
          eventType: 'API_ACCESS',
          severity: 'MEDIUM',
          userId,
          resourceType: 'AI_SERVICE',
          action: 'AI_VALIDATION_FALLBACK',
          details: {},
          ipAddress: ip,
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: false,
          errorMessage: aiError instanceof Error ? aiError.message : 'AI validation failed',
        });
      }
    }

    // Combine basic and AI validation results
    const combinedResult = combineValidationResults(basicValidation, aiValidation);

    // Calculate approval likelihood
    const approvalLikelihood = calculateApprovalLikelihood(combinedResult);

    // Log validation request
    await auditLogger.logEvent({
      eventType: 'API_ACCESS',
      severity: 'LOW',
      userId,
      resourceType: 'CLAIM',
      action: 'CLAIM_VALIDATION_REQUESTED',
      details: {
        errorsCount: combinedResult.errors.length,
        warningsCount: combinedResult.warnings.length,
        confidenceScore: combinedResult.confidenceScore,
        approvalLikelihood,
        aiUsed: !!aiValidation,
      },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        validation: combinedResult,
        approvalLikelihood,
        recommendations: generateRecommendations(combinedResult),
        metadata: {
          aiValidationUsed: !!aiValidation,
          validationTimestamp: new Date().toISOString(),
          cptCodesValidated: validatedData.cptCodes.length,
          icdCodesValidated: validatedData.icdCodes.length,
        },
      },
    });

  } catch (error) {
    console.error('Claim validation error:', error);

    // Log error
    try {
      const session = await requireAuth();
      await auditLogger.logEvent({
        eventType: 'API_ACCESS',
        severity: 'HIGH',
        userId: session.user?.id,
        resourceType: 'CLAIM',
        action: 'CLAIM_VALIDATION_ERROR',
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
            message: 'Invalid claim data',
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
          code: 'VALIDATION_SERVICE_ERROR',
          message: 'Failed to validate claim',
        },
      },
      { status: 500 }
    );
  }
}

// Perform basic validation without AI
function performBasicValidation(claim: any) {
  const errors = [];
  const warnings = [];

  // Validate CPT codes format
  const invalidCptCodes = claim.cptCodes.filter((code: string) => 
    !code.match(/^\d{5}$/)
  );
  if (invalidCptCodes.length > 0) {
    errors.push({
      field: 'cptCodes',
      message: `Invalid CPT code format: ${invalidCptCodes.join(', ')}`,
      code: 'INVALID_CPT_FORMAT',
      severity: 'high' as const,
    });
  }

  // Validate ICD codes format
  const invalidIcdCodes = claim.icdCodes.filter((code: string) => 
    !code.match(/^[A-Z]\d{2}(\.\d{1,2})?$/)
  );
  if (invalidIcdCodes.length > 0) {
    errors.push({
      field: 'icdCodes',
      message: `Invalid ICD code format: ${invalidIcdCodes.join(', ')}`,
      code: 'INVALID_ICD_FORMAT',
      severity: 'high' as const,
    });
  }

  // Validate date of service
  const serviceDate = new Date(claim.dateOfService);
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  if (serviceDate > today) {
    errors.push({
      field: 'dateOfService',
      message: 'Date of service cannot be in the future',
      code: 'FUTURE_DATE',
      severity: 'high' as const,
    });
  }

  if (serviceDate < oneYearAgo) {
    warnings.push({
      field: 'dateOfService',
      message: 'Date of service is more than one year old',
      code: 'OLD_DATE',
      suggestion: 'Claims older than one year may have different filing requirements',
    });
  }

  // Validate amount reasonableness
  const amount = claim.amountCents / 100;
  if (amount > 10000) {
    warnings.push({
      field: 'amountCents',
      message: 'Amount is unusually high',
      code: 'HIGH_AMOUNT',
      suggestion: 'Verify the charge amount is correct',
    });
  }

  if (amount < 10) {
    warnings.push({
      field: 'amountCents',
      message: 'Amount is unusually low',
      code: 'LOW_AMOUNT',
      suggestion: 'Verify the charge amount is correct',
    });
  }

  // Check for missing provider information
  if (!claim.providerName) {
    warnings.push({
      field: 'providerName',
      message: 'Provider name is missing',
      code: 'MISSING_PROVIDER',
      suggestion: 'Provider name is required for claim processing',
    });
  }

  if (!claim.providerNPI) {
    warnings.push({
      field: 'providerNPI',
      message: 'Provider NPI is missing',
      code: 'MISSING_NPI',
      suggestion: 'NPI number helps ensure accurate provider identification',
    });
  }

  return {
    errors,
    warnings,
    confidenceScore: errors.length === 0 ? 0.8 : 0.4,
    suggestions: [
      'Ensure all medical codes are current and accurate',
      'Verify provider information is complete',
      'Double-check service date and amount',
    ],
  };
}

// Combine basic and AI validation results
function combineValidationResults(basicResult: any, aiResult: any) {
  if (!aiResult) {
    return basicResult;
  }

  return {
    errors: [...basicResult.errors, ...aiResult.errors],
    warnings: [...basicResult.warnings, ...aiResult.warnings],
    confidenceScore: Math.min(basicResult.confidenceScore, aiResult.confidenceScore),
    suggestions: [...new Set([...basicResult.suggestions, ...aiResult.suggestions])],
  };
}

// Calculate approval likelihood based on validation results
function calculateApprovalLikelihood(validationResult: any): number {
  let likelihood = 0.9; // Start with high likelihood

  // Reduce likelihood for each error
  likelihood -= validationResult.errors.length * 0.2;

  // Reduce likelihood for each warning
  likelihood -= validationResult.warnings.length * 0.1;

  // Factor in confidence score
  likelihood *= validationResult.confidenceScore;

  // Ensure likelihood is between 0 and 1
  return Math.max(0, Math.min(1, likelihood));
}

// Generate recommendations based on validation results
function generateRecommendations(validationResult: any): string[] {
  const recommendations = [];

  if (validationResult.errors.length > 0) {
    recommendations.push('Fix all validation errors before submitting the claim');
  }

  if (validationResult.warnings.length > 0) {
    recommendations.push('Review and address validation warnings to improve approval chances');
  }

  if (validationResult.confidenceScore < 0.7) {
    recommendations.push('Consider reviewing claim details for accuracy and completeness');
  }

  // Add specific recommendations based on error types
  const errorCodes = validationResult.errors.map((e: any) => e.code);
  
  if (errorCodes.includes('INVALID_CPT_FORMAT')) {
    recommendations.push('Verify CPT codes are 5-digit numeric codes');
  }

  if (errorCodes.includes('INVALID_ICD_FORMAT')) {
    recommendations.push('Ensure ICD codes follow ICD-10 format (e.g., A00.0)');
  }

  if (errorCodes.includes('FUTURE_DATE')) {
    recommendations.push('Correct the date of service to a valid past date');
  }

  // Default recommendations
  if (recommendations.length === 0) {
    recommendations.push('Claim appears to be well-formatted and ready for submission');
  }

  return recommendations;
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