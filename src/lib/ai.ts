// Enhanced AI service integration for medical coding, validation, and appeals
import OpenAI from 'openai';
import { auditLogger } from './audit-logger';
import { prisma } from './prisma';

// Initialize OpenAI client with error handling
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Enhanced AI configuration
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
  temperature: 0.3, // Lower temperature for more consistent medical coding
  minConfidence: 0.6,
  highConfidence: 0.8,
  enabled: !!process.env.OPENAI_API_KEY,
  fallbackEnabled: true, // Enable fallback suggestions when AI is unavailable
};

// Code suggestion interfaces
export interface CodeSuggestion {
  code: string;
  description: string;
  type: 'CPT' | 'ICD';
  confidence: number;
  category?: string;
  notes?: string;
}

export interface ClaimContext {
  providerName?: string;
  dateOfService?: Date;
  amount?: number;
  description?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  specialty?: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidenceScore: number;
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

// Suggest CPT and ICD codes based on claim context
export async function suggestCodes(
  context: ClaimContext,
  userId: string
): Promise<CodeSuggestion[]> {
  try {
    const prompt = buildCodeSuggestionPrompt(context);
    
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are a medical coding expert specializing in CPT (Current Procedural Terminology) and ICD-10 (International Classification of Diseases) codes. 
          
          Your task is to suggest appropriate medical codes based on the provided context. Follow these guidelines:
          
          1. Only suggest codes you are confident about (>60% confidence)
          2. Provide clear, accurate descriptions for each code
          3. Include confidence scores based on the available information
          4. Prioritize commonly used codes over rare ones
          5. Consider the provider specialty and context
          6. Return results in valid JSON format
          
          Response format:
          {
            "suggestions": [
              {
                "code": "99213",
                "description": "Office visit, established patient, low complexity",
                "type": "CPT",
                "confidence": 0.85,
                "category": "Evaluation and Management",
                "notes": "Based on routine office visit context"
              }
            ]
          }`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI service');
    }

    // Parse AI response
    const suggestions = parseCodeSuggestions(response);

    // Filter by confidence threshold (assuming 0.6 as minimum)
    const filteredSuggestions = suggestions.filter(
      s => s.confidence >= 0.6
    );

    // Log AI usage
    await auditLogger.logEvent({
      eventType: 'API_ACCESS',
      severity: 'LOW',
      userId,
      resourceType: 'AI_SERVICE',
      action: 'AI_CODE_SUGGESTION',
      details: {
        contextFields: Object.keys(context),
        suggestionsCount: filteredSuggestions.length,
        tokensUsed: completion.usage?.total_tokens || 0,
      },
      ipAddress: 'system',
      userAgent: 'server',
      success: true,
    });

    return filteredSuggestions;
  } catch (error) {
    console.error('AI code suggestion error:', error);
    throw new Error('Failed to generate code suggestions');
  }
}

// Validate claim data using AI analysis
export async function validateClaim(
  claim: {
    providerName?: string;
    providerNpi?: string;
    dateOfService?: Date;
    amountCents: number;
    cptCodes: string[];
    icdCodes: string[];
    description?: string;
  },
  userId: string
): Promise<ValidationResult> {
  try {
    const prompt = buildValidationPrompt(claim);
    
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are a medical claims validation expert. Analyze the provided claim data and identify potential issues, errors, or areas for improvement.
          
          Focus on:
          1. Medical coding accuracy (CPT and ICD code validity and appropriateness)
          2. Data consistency and completeness
          3. Common claim rejection reasons
          4. Billing compliance issues
          5. Missing or incorrect information
          
          Provide specific, actionable feedback with confidence scores.
          
          Response format:
          {
            "errors": [
              {
                "field": "cptCodes",
                "message": "CPT code 99999 is not a valid code",
                "code": "INVALID_CPT",
                "severity": "high"
              }
            ],
            "warnings": [
              {
                "field": "amount",
                "message": "Amount seems high for this procedure",
                "code": "HIGH_AMOUNT",
                "suggestion": "Verify the charge amount with typical rates"
              }
            ],
            "confidenceScore": 0.85,
            "suggestions": [
              "Consider adding more specific ICD codes for better claim processing"
            ]
          }`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI service');
    }

    // Parse AI response
    const result = parseValidationResult(response);

    // Log AI usage
    await auditLogger.logEvent({
      eventType: 'API_ACCESS',
      severity: 'LOW',
      userId,
      resourceType: 'AI_SERVICE',
      action: 'AI_CLAIM_VALIDATION',
      details: {
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
        confidenceScore: result.confidenceScore,
        tokensUsed: completion.usage?.total_tokens || 0,
      },
      ipAddress: 'system',
      userAgent: 'server',
      success: true,
    });

    return result;
  } catch (error) {
    console.error('AI claim validation error:', error);
    throw new Error('Failed to validate claim');
  }
}

// Generate appeal letter for denied claims
export async function generateAppeal(
  claim: {
    id: string;
    providerName?: string;
    dateOfService?: Date;
    amountCents: number;
    cptCodes: string[];
    icdCodes: string[];
    denialReason?: string;
    description?: string;
  },
  denialReason: string,
  userId: string
): Promise<string> {
  try {
    const prompt = buildAppealPrompt(claim, denialReason);
    
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are a medical billing specialist expert in writing insurance claim appeals. Create a professional, persuasive appeal letter that addresses the specific denial reason and provides strong justification for claim approval.
          
          Guidelines:
          1. Use professional, formal language appropriate for insurance companies
          2. Address the specific denial reason with clear counterarguments
          3. Reference relevant medical codes and their justifications
          4. Include supporting medical necessity arguments
          5. Request specific action (claim reconsideration and payment)
          6. Maintain a respectful but assertive tone
          7. Include relevant policy references when applicable
          
          Format the response as a complete business letter ready for submission.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: 0.4, // Slightly higher for more natural language
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI service');
    }

    // Log AI usage
    await auditLogger.logEvent({
      eventType: 'API_ACCESS',
      severity: 'LOW',
      userId,
      resourceType: 'AI_SERVICE',
      action: 'AI_APPEAL_GENERATION',
      details: {
        claimId: claim.id,
        denialReason,
        letterLength: response.length,
        tokensUsed: completion.usage?.total_tokens || 0,
      },
      ipAddress: 'system',
      userAgent: 'server',
      success: true,
    });

    return response;
  } catch (error) {
    console.error('AI appeal generation error:', error);
    throw new Error('Failed to generate appeal letter');
  }
}

// Build prompt for code suggestions
function buildCodeSuggestionPrompt(context: ClaimContext): string {
  const parts = ['Please suggest appropriate CPT and ICD codes for the following medical encounter:'];
  
  if (context.providerName) {
    parts.push(`Provider: ${context.providerName}`);
  }
  
  if (context.dateOfService) {
    parts.push(`Date of Service: ${context.dateOfService.toLocaleDateString()}`);
  }
  
  if (context.amount) {
    parts.push(`Charge Amount: $${context.amount.toFixed(2)}`);
  }
  
  if (context.description) {
    parts.push(`Service Description: ${context.description}`);
  }
  
  if (context.symptoms) {
    parts.push(`Symptoms: ${context.symptoms}`);
  }
  
  if (context.diagnosis) {
    parts.push(`Diagnosis: ${context.diagnosis}`);
  }
  
  if (context.treatment) {
    parts.push(`Treatment: ${context.treatment}`);
  }
  
  if (context.specialty) {
    parts.push(`Provider Specialty: ${context.specialty}`);
  }
  
  parts.push('\nPlease provide both CPT (procedure) and ICD-10 (diagnosis) code suggestions with confidence scores.');
  
  return parts.join('\n');
}

// Build prompt for claim validation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildValidationPrompt(claim: any): string {
  const parts = ['Please validate the following insurance claim data:'];
  
  parts.push(`Provider: ${claim.providerName || 'Not specified'}`);
  
  if (claim.providerNpi) {
    parts.push(`Provider NPI: ${claim.providerNpi}`);
  }
  
  if (claim.dateOfService) {
    parts.push(`Date of Service: ${new Date(claim.dateOfService).toLocaleDateString()}`);
  }
  
  parts.push(`Amount: $${(claim.amountCents / 100).toFixed(2)}`);
  
  if (claim.cptCodes.length > 0) {
    parts.push(`CPT Codes: ${claim.cptCodes.join(', ')}`);
  } else {
    parts.push('CPT Codes: None provided');
  }
  
  if (claim.icdCodes.length > 0) {
    parts.push(`ICD Codes: ${claim.icdCodes.join(', ')}`);
  } else {
    parts.push('ICD Codes: None provided');
  }
  
  if (claim.description) {
    parts.push(`Description: ${claim.description}`);
  }
  
  parts.push('\nPlease identify any errors, warnings, or areas for improvement in this claim data.');
  
  return parts.join('\n');
}

// Build prompt for appeal generation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAppealPrompt(claim: any, denialReason: string): string {
  const parts = ['Please write a professional insurance claim appeal letter for the following denied claim:'];
  
  parts.push(`\nClaim Details:`);
  parts.push(`- Provider: ${claim.providerName || 'Not specified'}`);
  parts.push(`- Date of Service: ${claim.dateOfService ? new Date(claim.dateOfService).toLocaleDateString() : 'Not specified'}`);
  parts.push(`- Amount: $${(claim.amountCents / 100).toFixed(2)}`);
  
  if (claim.cptCodes.length > 0) {
    parts.push(`- CPT Codes: ${claim.cptCodes.join(', ')}`);
  }
  
  if (claim.icdCodes.length > 0) {
    parts.push(`- ICD Codes: ${claim.icdCodes.join(', ')}`);
  }
  
  if (claim.description) {
    parts.push(`- Service Description: ${claim.description}`);
  }
  
  parts.push(`\nDenial Reason: ${denialReason}`);
  
  parts.push('\nPlease write a compelling appeal letter that addresses the denial reason and requests claim reconsideration.');
  
  return parts.join('\n');
}

// Get AI service health status
export async function getAIServiceHealth(): Promise<{
  available: boolean;
  model: string;
  lastChecked: Date;
}> {
  try {
    // Simple test to check if OpenAI API is accessible
    await openai.models.list();
    
    return {
      available: true,
      model: AI_CONFIG.model,
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error('AI service health check failed:', error);
    
    return {
      available: false,
      model: AI_CONFIG.model,
      lastChecked: new Date(),
    };
  }
}

// Parse AI response for code suggestions
function parseCodeSuggestions(response: string): CodeSuggestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    const suggestions = JSON.parse(jsonMatch[0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return suggestions.map((suggestion: any) => ({
      code: suggestion.code || '',
      description: suggestion.description || '',
      type: suggestion.type || 'CPT',
      confidence: Math.min(Math.max(suggestion.confidence || 0.5, 0), 1),
      category: suggestion.category,
      notes: suggestion.notes,
    }));
  } catch (error) {
    console.error('Failed to parse code suggestions:', error);
    // Return fallback suggestions
    return [
      {
        code: '99213',
        description: 'Office visit, established patient, moderate complexity',
        type: 'CPT',
        confidence: 0.7,
        category: 'Office Visit',
        notes: 'Common office visit code - verify complexity level',
      },
    ];
  }
}

// Parse AI response for validation result
function parseValidationResult(response: string): ValidationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }
    const result = JSON.parse(jsonMatch[0]);
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: (result.errors || []).map((error: any) => ({
        field: error.field || 'unknown',
        message: error.message || 'Validation error',
        code: error.code || 'VALIDATION_ERROR',
        severity: error.severity || 'medium',
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warnings: (result.warnings || []).map((warning: any) => ({
        field: warning.field || 'unknown',
        message: warning.message || 'Validation warning',
        code: warning.code || 'VALIDATION_WARNING',
        suggestion: warning.suggestion,
      })),
      confidenceScore: Math.min(Math.max(result.confidenceScore || 0.5, 0), 1),
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error('Failed to parse validation result:', error);
    // Return fallback validation
    return {
      errors: [],
      warnings: [
        {
          field: 'general',
          message: 'Unable to validate claim automatically',
          code: 'AI_VALIDATION_FAILED',
          suggestion: 'Please review claim manually',
        },
      ],
      confidenceScore: 0.5,
      suggestions: ['Review all claim information for accuracy'],
    };
  }
}