// AI-powered appeal generation system
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ClaimDenialInfo {
  claimId: string;
  denialReason: string;
  denialCode?: string;
  originalAmount: number;
  serviceDate: string;
  providerName: string;
  cptCodes: string[];
  icdCodes: string[];
  patientInfo: {
    name: string;
    dateOfBirth: string;
    memberId: string;
  };
  insurerInfo: {
    name: string;
    policyNumber: string;
  };
  additionalContext?: string;
}

export interface AppealLetter {
  id: string;
  claimId: string;
  content: string;
  arguments: string[];
  medicalJustification: string;
  legalReferences: string[];
  recommendedActions: string[];
  generatedAt: Date;
  status: 'draft' | 'reviewed' | 'submitted';
}

export interface AppealAnalysis {
  denialCategory: 'medical_necessity' | 'coverage' | 'coding' | 'documentation' | 'authorization' | 'other';
  appealStrength: 'strong' | 'moderate' | 'weak';
  keyArguments: string[];
  requiredDocumentation: string[];
  successProbability: number;
  timelineRecommendation: string;
  strategicApproach: string;
}

export class AIAppealGenerator {
  // Analyze denial reason and determine appeal strategy
  async analyzeDenial(denialInfo: ClaimDenialInfo): Promise<AppealAnalysis> {
    try {
      const prompt = `
        Analyze this insurance claim denial and provide a strategic appeal assessment:

        Claim Details:
        - Denial Reason: ${denialInfo.denialReason}
        - Denial Code: ${denialInfo.denialCode || 'Not provided'}
        - Service Date: ${denialInfo.serviceDate}
        - CPT Codes: ${denialInfo.cptCodes.join(', ')}
        - ICD Codes: ${denialInfo.icdCodes.join(', ')}
        - Provider: ${denialInfo.providerName}
        - Amount: $${(denialInfo.originalAmount / 100).toFixed(2)}

        Please provide a JSON response with the following structure:
        {
          "denialCategory": "medical_necessity|coverage|coding|documentation|authorization|other",
          "appealStrength": "strong|moderate|weak",
          "keyArguments": ["argument1", "argument2", "argument3"],
          "requiredDocumentation": ["doc1", "doc2", "doc3"],
          "successProbability": 0.75,
          "timelineRecommendation": "Submit within 30 days for best results",
          "strategicApproach": "Focus on medical necessity and provider qualifications"
        }

        Base your analysis on common insurance appeal strategies and medical coding standards.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert insurance appeals specialist with deep knowledge of medical coding, insurance regulations, and successful appeal strategies. Provide accurate, actionable analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis generated');
      }

      // Parse JSON response
      const analysis = JSON.parse(analysisText) as AppealAnalysis;
      return analysis;
    } catch (error) {
      console.error('Error analyzing denial:', error);
      
      // Return fallback analysis
      return {
        denialCategory: 'other',
        appealStrength: 'moderate',
        keyArguments: [
          'Request detailed review of medical necessity',
          'Verify proper coding and documentation',
          'Challenge denial based on policy coverage',
        ],
        requiredDocumentation: [
          'Medical records supporting treatment',
          'Provider notes and justification',
          'Insurance policy documentation',
        ],
        successProbability: 0.6,
        timelineRecommendation: 'Submit within 30 days',
        strategicApproach: 'Comprehensive review of denial reasons with supporting documentation',
      };
    }
  }

  // Generate comprehensive appeal letter
  async generateAppealLetter(denialInfo: ClaimDenialInfo, analysis: AppealAnalysis): Promise<AppealLetter> {
    try {
      const prompt = `
        Generate a professional insurance claim appeal letter based on the following information:

        CLAIM INFORMATION:
        - Claim ID: ${denialInfo.claimId}
        - Patient: ${denialInfo.patientInfo.name}
        - DOB: ${denialInfo.patientInfo.dateOfBirth}
        - Member ID: ${denialInfo.patientInfo.memberId}
        - Policy Number: ${denialInfo.insurerInfo.policyNumber}
        - Insurer: ${denialInfo.insurerInfo.name}
        - Service Date: ${denialInfo.serviceDate}
        - Provider: ${denialInfo.providerName}
        - Amount: $${(denialInfo.originalAmount / 100).toFixed(2)}
        - CPT Codes: ${denialInfo.cptCodes.join(', ')}
        - ICD Codes: ${denialInfo.icdCodes.join(', ')}

        DENIAL INFORMATION:
        - Reason: ${denialInfo.denialReason}
        - Code: ${denialInfo.denialCode || 'Not specified'}

        APPEAL STRATEGY:
        - Category: ${analysis.denialCategory}
        - Strength: ${analysis.appealStrength}
        - Key Arguments: ${analysis.keyArguments.join('; ')}
        - Strategic Approach: ${analysis.strategicApproach}

        Generate a formal, professional appeal letter that includes:
        1. Proper business letter format with date and addresses
        2. Clear identification of the claim and denial
        3. Strong arguments based on the analysis
        4. Medical necessity justification where applicable
        5. Policy coverage references
        6. Request for specific action (claim reversal and payment)
        7. Professional closing with next steps

        The letter should be persuasive, factual, and follow insurance industry standards.
        Use formal business language and maintain a respectful but assertive tone.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert medical appeals writer with extensive experience in insurance claim appeals. Write professional, persuasive letters that follow industry standards and maximize success probability.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const letterContent = response.choices[0]?.message?.content;
      if (!letterContent) {
        throw new Error('No appeal letter generated');
      }

      // Create appeal letter object
      const appealLetter: AppealLetter = {
        id: `appeal_${Date.now()}`,
        claimId: denialInfo.claimId,
        content: letterContent,
        arguments: analysis.keyArguments,
        medicalJustification: this.extractMedicalJustification(letterContent),
        legalReferences: this.extractLegalReferences(letterContent),
        recommendedActions: [
          'Review and edit the generated letter',
          'Attach supporting medical documentation',
          'Submit within the appeal deadline',
          'Follow up with insurance company',
        ],
        generatedAt: new Date(),
        status: 'draft',
      };

      return appealLetter;
    } catch (error) {
      console.error('Error generating appeal letter:', error);
      throw new Error('Failed to generate appeal letter');
    }
  }

  // Generate appeal letter with custom arguments
  async generateCustomAppeal(
    denialInfo: ClaimDenialInfo,
    customArguments: string[],
    additionalContext?: string
  ): Promise<AppealLetter> {
    try {
      const prompt = `
        Generate a custom insurance claim appeal letter with specific arguments:

        CLAIM INFORMATION:
        - Claim ID: ${denialInfo.claimId}
        - Patient: ${denialInfo.patientInfo.name}
        - Service Date: ${denialInfo.serviceDate}
        - Provider: ${denialInfo.providerName}
        - Amount: $${(denialInfo.originalAmount / 100).toFixed(2)}
        - Denial Reason: ${denialInfo.denialReason}

        CUSTOM ARGUMENTS TO INCLUDE:
        ${customArguments.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

        ${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

        Generate a professional appeal letter incorporating these specific arguments.
        Maintain formal business letter format and persuasive tone.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert insurance appeals writer. Create professional appeal letters that incorporate specific user arguments while maintaining industry standards.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      const letterContent = response.choices[0]?.message?.content;
      if (!letterContent) {
        throw new Error('No custom appeal letter generated');
      }

      return {
        id: `custom_appeal_${Date.now()}`,
        claimId: denialInfo.claimId,
        content: letterContent,
        arguments: customArguments,
        medicalJustification: this.extractMedicalJustification(letterContent),
        legalReferences: [],
        recommendedActions: [
          'Review the custom appeal letter',
          'Verify all arguments are accurate',
          'Add supporting documentation',
          'Submit before deadline',
        ],
        generatedAt: new Date(),
        status: 'draft',
      };
    } catch (error) {
      console.error('Error generating custom appeal:', error);
      throw new Error('Failed to generate custom appeal letter');
    }
  }

  // Extract medical justification from letter content
  private extractMedicalJustification(content: string): string {
    // Simple extraction - in production, use more sophisticated NLP
    const lines = content.split('\n');
    const medicalLines = lines.filter(line => 
      line.toLowerCase().includes('medical') ||
      line.toLowerCase().includes('treatment') ||
      line.toLowerCase().includes('diagnosis') ||
      line.toLowerCase().includes('necessary')
    );
    
    return medicalLines.slice(0, 3).join(' ').trim() || 'Medical necessity based on provider documentation and patient condition.';
  }

  // Extract legal references from letter content
  private extractLegalReferences(content: string): string[] {
    // Simple extraction - in production, use more sophisticated pattern matching
    const references: string[] = [];
    
    if (content.includes('ERISA')) references.push('ERISA regulations');
    if (content.includes('state insurance')) references.push('State insurance regulations');
    if (content.includes('policy')) references.push('Insurance policy terms');
    if (content.includes('medical necessity')) references.push('Medical necessity standards');
    
    return references.length > 0 ? references : ['Insurance policy coverage terms'];
  }

  // Improve appeal letter based on feedback
  async improveAppealLetter(
    originalLetter: AppealLetter,
    feedback: string,
    denialInfo: ClaimDenialInfo
  ): Promise<AppealLetter> {
    try {
      const prompt = `
        Improve this insurance appeal letter based on the provided feedback:

        ORIGINAL LETTER:
        ${originalLetter.content}

        FEEDBACK FOR IMPROVEMENT:
        ${feedback}

        CLAIM CONTEXT:
        - Claim ID: ${denialInfo.claimId}
        - Denial Reason: ${denialInfo.denialReason}

        Please revise the letter to address the feedback while maintaining professional standards.
        Keep the same structure but improve content, arguments, and persuasiveness.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert appeals writer. Improve appeal letters based on feedback while maintaining professional quality and persuasive arguments.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const improvedContent = response.choices[0]?.message?.content;
      if (!improvedContent) {
        throw new Error('No improved letter generated');
      }

      return {
        ...originalLetter,
        id: `improved_${originalLetter.id}`,
        content: improvedContent,
        generatedAt: new Date(),
        status: 'draft',
      };
    } catch (error) {
      console.error('Error improving appeal letter:', error);
      throw new Error('Failed to improve appeal letter');
    }
  }

  // Get appeal templates for different denial types
  getAppealTemplates(): Record<string, string[]> {
    return {
      medical_necessity: [
        'Challenge the medical necessity determination',
        'Provide additional clinical documentation',
        'Reference established treatment guidelines',
        'Include provider medical opinion',
      ],
      coverage: [
        'Review policy coverage terms',
        'Challenge coverage interpretation',
        'Provide policy language analysis',
        'Request coverage clarification',
      ],
      coding: [
        'Verify correct CPT/ICD coding',
        'Provide coding documentation',
        'Challenge coding denial',
        'Request coding review',
      ],
      documentation: [
        'Provide missing documentation',
        'Clarify documentation requirements',
        'Submit additional records',
        'Request documentation review',
      ],
      authorization: [
        'Challenge authorization requirement',
        'Provide retroactive authorization',
        'Document emergency circumstances',
        'Request authorization waiver',
      ],
    };
  }
}

// Singleton instance
export const aiAppealGenerator = new AIAppealGenerator();