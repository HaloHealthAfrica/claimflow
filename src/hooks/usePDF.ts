'use client';

// Custom hook for PDF operations
import { useState, useCallback } from 'react';

interface UsePDFReturn {
  loading: boolean;
  error: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateClaimPDF: (claimId?: string, customData?: any) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateAppealPDF: (claimId?: string, denialReason?: string, appealLetter?: string, customData?: any) => Promise<void>;
  previewClaimPDF: (claimId: string) => string;
  previewAppealPDF: (claimId: string, denialReason: string, appealLetter: string) => string;
  clearError: () => void;
}

export function usePDF(): UsePDFReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateClaimPDF = useCallback(async (claimId?: string, customData?: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pdf/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId,
          customData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate claim PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `claim-${claimId || 'draft'}-${Date.now()}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate claim PDF';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateAppealPDF = useCallback(async (
    claimId?: string, 
    denialReason?: string, 
    appealLetter?: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customData?: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pdf/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId,
          denialReason,
          appealLetter,
          customData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate appeal PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `appeal-${claimId || 'custom'}-${Date.now()}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate appeal PDF';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const previewClaimPDF = useCallback((claimId: string): string => {
    return `/api/pdf/claim?claimId=${encodeURIComponent(claimId)}`;
  }, []);

  const previewAppealPDF = useCallback((
    claimId: string, 
    denialReason: string, 
    appealLetter: string
  ): string => {
    return `/api/pdf/appeal?claimId=${encodeURIComponent(claimId)}&denialReason=${encodeURIComponent(denialReason)}&appealLetter=${encodeURIComponent(appealLetter)}`;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    generateClaimPDF,
    generateAppealPDF,
    previewClaimPDF,
    previewAppealPDF,
    clearError,
  };
}