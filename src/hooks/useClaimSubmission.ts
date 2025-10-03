'use client';

// Custom hook for claim submission operations
import { useState, useCallback } from 'react';

interface SubmissionResult {
  success: boolean;
  data?: {
    claim: {
      id: string;
      status: string;
      submissionMethod: string;
      submittedAt: string | null;
    };
    submission: {
      method: string;
      submissionId: string;
      confirmationNumber?: string;
      timestamp: string;
      pdfGenerated: boolean;
    };
    message: string;
  };
  pdfAvailable?: boolean;
  pdfDownloadUrl?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface SubmissionStatus {
  claimId: string;
  status: string;
  submissionMethod: string | null;
  submittedAt: string | null;
  timeline: {
    created: string;
    submitted?: string;
    submissionId?: string;
    submissionMethod?: string;
  };
  canResubmit: boolean;
}

interface UseClaimSubmissionReturn {
  loading: boolean;
  error: string | null;
  submitClaim: (claimId: string, method?: 'electronic' | 'pdf') => Promise<SubmissionResult>;
  getSubmissionStatus: (claimId: string) => Promise<SubmissionStatus>;
  clearError: () => void;
}

export function useClaimSubmission(): UseClaimSubmissionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitClaim = useCallback(async (
    claimId: string, 
    method: 'electronic' | 'pdf' = 'electronic'
  ): Promise<SubmissionResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId,
          submissionMethod: method,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Submission failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Claim submission failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSubmissionStatus = useCallback(async (claimId: string): Promise<SubmissionStatus> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/submit?claimId=${encodeURIComponent(claimId)}`, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to get submission status');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get submission status';
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
    submitClaim,
    getSubmissionStatus,
    clearError,
  };
}