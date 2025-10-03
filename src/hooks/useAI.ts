'use client';

// Custom hook for AI operations
import { useState, useCallback } from 'react';
import { CodeSuggestion, ValidationResult } from '@/lib/ai';

interface UseAIReturn {
  loading: boolean;
  error: string | null;
  suggestCodes: (context: {
    providerName?: string;
    dateOfService?: string;
    amount?: number;
    description?: string;
    symptoms?: string;
    diagnosis?: string;
    treatment?: string;
    specialty?: string;
  }) => Promise<CodeSuggestion[]>;
  suggestCodesWithContext: (context: {
    symptoms?: string;
    diagnosis?: string;
    treatment?: string;
    specialty?: string;
  }) => Promise<CodeSuggestion[]>;
  validateCodes: (cptCodes: string[], icdCodes: string[]) => Promise<{
    validCptCodes: string[];
    validIcdCodes: string[];
    invalidCodes: string[];
    suggestions: CodeSuggestion[];
  }>;
  validateClaim: (claimData: {
    providerName?: string;
    providerNPI?: string;
    dateOfService: string;
    amountCents: number;
    cptCodes: string[];
    icdCodes: string[];
    description?: string;
    notes?: string;
    insuranceType?: 'commercial' | 'medicare' | 'medicaid' | 'other';
    patientAge?: number;
    specialty?: string;
  }) => Promise<ValidationResult & { approvalLikelihood: number }>;
  generateAppeal: (
    claimId: string,
    denialReason: string,
    context?: {
      additionalContext?: string;
      appealType?: 'first_level' | 'second_level' | 'external_review';
      urgency?: 'routine' | 'urgent' | 'expedited';
      patientName?: string;
      patientAge?: number;
      medicalHistory?: string;
    }
  ) => Promise<{
    id: string;
    appealLetter: string;
    denialReason: string;
    status: string;
    aiGenerated: boolean;
    confidence: number;
  }>;
  clearError: () => void;
}

export function useAI(): UseAIReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestCodes = useCallback(async (context: {
    providerName?: string;
    dateOfService?: string;
    amount?: number;
    description?: string;
    symptoms?: string;
    diagnosis?: string;
    treatment?: string;
    specialty?: string;
  }): Promise<CodeSuggestion[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/suggest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to suggest codes');
      }

      return result.data.suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to suggest codes';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const suggestCodesWithContext = useCallback(async (context: {
    symptoms?: string;
    diagnosis?: string;
    treatment?: string;
    specialty?: string;
  }): Promise<CodeSuggestion[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/suggest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to suggest codes');
      }

      return result.data.suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to suggest codes';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateCodes = useCallback(async (
    cptCodes: string[],
    icdCodes: string[]
  ): Promise<{
    validCptCodes: string[];
    validIcdCodes: string[];
    invalidCodes: string[];
    suggestions: CodeSuggestion[];
  }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claims/superbill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate_codes',
          cptCodes,
          icdCodes,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to validate codes');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate codes';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateClaim = useCallback(async (claimData: {
    providerName?: string;
    providerNPI?: string;
    dateOfService: string;
    amountCents: number;
    cptCodes: string[];
    icdCodes: string[];
    description?: string;
    notes?: string;
    insuranceType?: 'commercial' | 'medicare' | 'medicaid' | 'other';
    patientAge?: number;
    specialty?: string;
  }): Promise<ValidationResult & { approvalLikelihood: number }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/validate-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to validate claim');
      }

      return {
        ...result.data.validation,
        approvalLikelihood: result.data.approvalLikelihood,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate claim';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateAppeal = useCallback(async (
    claimId: string,
    denialReason: string,
    context?: {
      additionalContext?: string;
      appealType?: 'first_level' | 'second_level' | 'external_review';
      urgency?: 'routine' | 'urgent' | 'expedited';
      patientName?: string;
      patientAge?: number;
      medicalHistory?: string;
    }
  ): Promise<{
    id: string;
    appealLetter: string;
    denialReason: string;
    status: string;
    aiGenerated: boolean;
    confidence: number;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId,
          denialReason,
          ...context,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate appeal');
      }

      return result.data.appeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate appeal';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    suggestCodes,
    suggestCodesWithContext,
    validateCodes,
    validateClaim,
    generateAppeal,
    clearError,
  };
}