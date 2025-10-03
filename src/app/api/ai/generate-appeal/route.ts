// AI-powered appeal generation API route
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateAppeal, AI_CONFIG } from '@/lib/ai';
import { auditLogger } from '@/lib/audit-logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for appeal generation request
const generateAppealSchema = z.object({
  claimId: z.string().min(1, 'Claim ID is required'),
  denialReason: z.string().min(1, 'Denial reason is required'),
  additionalContext: z.string().optional(),
  appealType: z.enum(['first_level', 'second_level', 'external_review']).default('first_level'),
  urgency: z.enum(['routine', 'urgent', 'expedited']).default('routine'),
  // Patient information for personalization
  patientName: z.string().optional(),
  patientAge: z.number().optional(),
  medicalHistory: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = session.user?.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = generateAppealSchema.parse(body);

    // Get client IP for audit logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Fetch claim data
    const claim = await prisma.claim.findFirst({
      where: {
        id: validatedData.claimId,
        userId, // Ensure user owns the claim
      },
      include: {
        insuranceProfile: true,
        user: true,
      },
    });

    if (!claim) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CLAIM_NOT_FOUND',
            message: 'Claim not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    // Check if AI service is available
    if (!AI_CONFIG.enabled) {
      // Provide template-based appeal
      const templateAppeal = generateTemplateAppeal(claim, validatedData.denialReason);
      
      await auditLogger.logEvent({
        eventType: 'API_ACCESS',
        severity: 'LOW',
        userId,
        resourceType: 'APPEAL',
        resourceId: claim.id,
        action: 'APPEAL_GENERATION_TEMPLATE',
        details: { 
          denialReason: validatedData.denialReason,
          appealType: validatedData.appealType,
          source: 'template',
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          appealLetter: templateAppeal,
          source: 'template',
          confidence: 0.7,
          message: 'AI service unavailable, generated from template',
        },
      });
    }

    // Generate AI-powered appeal
    const appealLetter = await generateAppeal(
      {
        id: claim.id,
        providerName: claim.providerName,
        dateOfService: claim.dateOfService,
        amountCents: claim.amountCents,
        cptCodes: claim.cptCodes,
        icdCodes: claim.icdCodes,
        description: claim.description,
        denialReason: validatedData.denialReason,
      },
      validatedData.denialReason,
      userId
    );

    // Enhance appeal with additional context
    const enhancedAppeal = enhanceAppealLetter(
      appealLetter,
      claim,
      validatedData
    );

    // Create appeal record in database
    const appealRecord = await prisma.appeal.create({
      data: {
        claimId: claim.id,
        denialReason: validatedData.denialReason,
        appealReason: `Appeal for claim ${claim.claimNumber || claim.id}`,
        appealLetter: enhancedAppeal,
        status: 'DRAFT',
        aiGenerated: true,
        aiConfidence: 0.85, // This would come from AI response in real implementation
      },
    });

    // Create timeline entry
    await prisma.claimTimeline.create({
      data: {
        claimId: claim.id,
        type: 'APPEALED',
        title: 'Appeal Generated',
        description: 'AI-generated appeal letter created',
        metadata: {
          appealId: appealRecord.id,
          denialReason: validatedData.denialReason,
          aiGenerated: true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        appeal: {
          id: appealRecord.id,
          appealLetter: enhancedAppeal,
          denialReason: validatedData.denialReason,
          status: 'DRAFT',
          aiGenerated: true,
          confidence: 0.85,
        },
        source: 'ai',
        metadata: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          generatedAt: new Date().toISOString(),
          appealType: validatedData.appealType,
          urgency: validatedData.urgency,
        },
      },
    });

  } catch (error) {
    console.error('Appeal generation error:', error);

    // Log error
    try {
      const session = await requireAuth();
      await auditLogger.logEvent({
        eventType: 'API_ACCESS',
        severity: 'HIGH',
        userId: session.user?.id,
        resourceType: 'APPEAL',
        action: 'APPEAL_GENERATION_ERROR',
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
            message: 'Invalid appeal request data',
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
          code: 'APPEAL_GENERATION_ERROR',
          message: 'Failed to generate appeal letter',
        },
      },
      { status: 500 }
    );
  }
}

// Generate template-based appeal when AI is unavailable
function generateTemplateAppeal(claim: any, denialReason: string): string {
  const today = new Date().toLocaleDateString();
  const claimAmount = (claim.amountCents / 100).toFixed(2);
  const serviceDate = new Date(claim.dateOfService).toLocaleDateString();

  return `
[Date: ${today}]

[Insurance Company Name]
[Insurance Company Address]

Re: Appeal for Claim Denial
Claim Number: ${claim.claimNumber || claim.id}
Patient: [Patient Name]
Date of Service: ${serviceDate}
Provider: ${claim.providerName}
Amount: $${claimAmount}

Dear Claims Review Department,

I am writing to formally appeal the denial of the above-referenced claim. The claim was denied for the following reason: "${denialReason}"

I respectfully disagree with this denial and request that you reconsider this decision based on the following:

1. MEDICAL NECESSITY: The services provided were medically necessary and appropriate for the patient's condition as documented by the treating physician.

2. PROPER CODING: The claim was submitted with the correct CPT codes (${claim.cptCodes.join(', ')}) and ICD-10 diagnosis codes (${claim.icdCodes.join(', ')}) that accurately reflect the services provided and the patient's condition.

3. POLICY COMPLIANCE: The services rendered fall within the covered benefits of the patient's insurance policy and meet all requirements for reimbursement.

4. DOCUMENTATION: Complete medical documentation supporting the necessity and appropriateness of the services is available upon request.

The denial appears to be based on [specific reason for disagreement with denial]. However, [explanation of why the denial is incorrect].

I request that you:
- Reverse the denial decision
- Process payment for the full amount of $${claimAmount}
- Provide written confirmation of the claim approval

If additional information is needed to process this appeal, please contact me immediately. I look forward to your prompt reconsideration of this claim.

Thank you for your attention to this matter.

Sincerely,

[Patient Name or Authorized Representative]
[Contact Information]

Enclosures: [List any supporting documents]
`.trim();
}

// Enhance AI-generated appeal with additional context
function enhanceAppealLetter(
  aiAppeal: string,
  claim: any,
  requestData: any
): string {
  let enhanced = aiAppeal;

  // Add header information if missing
  if (!enhanced.includes('[Date:')) {
    const today = new Date().toLocaleDateString();
    enhanced = `[Date: ${today}]\n\n${enhanced}`;
  }

  // Add claim reference information
  const claimInfo = `
Claim Reference Information:
- Claim ID: ${claim.id}
- Claim Number: ${claim.claimNumber || 'Pending'}
- Date of Service: ${new Date(claim.dateOfService).toLocaleDateString()}
- Provider: ${claim.providerName}
- Amount: $${(claim.amountCents / 100).toFixed(2)}
- CPT Codes: ${claim.cptCodes.join(', ')}
- ICD Codes: ${claim.icdCodes.join(', ')}
`;

  // Insert claim info after the header
  const lines = enhanced.split('\n');
  const insertIndex = lines.findIndex(line => line.includes('Dear') || line.includes('To Whom')) || 3;
  lines.splice(insertIndex, 0, claimInfo);
  enhanced = lines.join('\n');

  // Add urgency notation if specified
  if (requestData.urgency === 'urgent' || requestData.urgency === 'expedited') {
    enhanced = `**${requestData.urgency.toUpperCase()} APPEAL**\n\n${enhanced}`;
  }

  return enhanced;
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