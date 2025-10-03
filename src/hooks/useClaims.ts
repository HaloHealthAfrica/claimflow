'use client';

// Custom hook for claim management operations
import { useState, useCallback, useEffect } from 'react';

interface Claim {
  id: string;
  status: string;
  amountCents: number;
  dateOfService?: string;
  cptCodes: string[];
  icdCodes: string[];
  submissionMethod: string;
  denialReason?: string;
  paidAmountCents?: number;
  confidenceScore?: number;
  timeline: Record<string, unknown>;
  receiptUrls: string[];
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ClaimFormData {
  providerName: string;
  providerNpi?: string;
  dateOfService: string;
  amount: string;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
}

interface UseClaimsReturn {
  claims: Claim[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  createClaim: (data: ClaimFormData) => Promise<Claim>;
  getClaims: (page?: number, status?: string) => Promise<void>;
  clearError: () => void;
}

export function useClaims(): UseClaimsReturn {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  const getClaims = useCallback(async (page = 1, status?: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`/api/claims/create?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get claims');
      }

      setClaims(result.data.claims);
      setPagination(result.data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get claims';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClaim = useCallback(async (data: ClaimFormData): Promise<Claim> => {
    setCreating(true);
    setError(null);

    try {
      // Convert form data to API format
      const claimData = {
        providerName: data.providerName,
        providerNpi: data.providerNpi,
        dateOfService: new Date(data.dateOfService).toISOString(),
        amountCents: Math.round(parseFloat(data.amount) * 100),
        cptCodes: data.cptCodes,
        icdCodes: data.icdCodes,
      };

      const response = await fetch('/api/claims/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create claim');
      }

      // Refresh claims list
      await getClaims();

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create claim';
      setError(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, [getClaims]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load claims on mount
  useEffect(() => {
    getClaims();
  }, [getClaims]);

  return {
    claims,
    loading,
    creating,
    error,
    pagination,
    createClaim,
    getClaims,
    clearError,
  };
}