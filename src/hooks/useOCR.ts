'use client';

// Custom hook for OCR operations
import { useState, useCallback } from 'react';
import { InsuranceProfilePartial, ReceiptData } from '@/lib/ocr';

interface OCRValidation {
  isValid: boolean;
  confidence: number;
  issues: string[];
}

interface OCRResponse {
  data: (InsuranceProfilePartial | ReceiptData) & {
    validation: OCRValidation;
    processedAt: string;
  };
}

interface UseOCRReturn {
  processing: boolean;
  error: string | null;
  processDocument: (file: File, type: 'insurance' | 'receipt') => Promise<OCRResponse>;
  clearError: () => void;
}

export function useOCR(): UseOCRReturn {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processDocument = useCallback(async (
    file: File, 
    type: 'insurance' | 'receipt'
  ): Promise<OCRResponse> => {
    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'OCR processing failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      setError(errorMessage);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processing,
    error,
    processDocument,
    clearError,
  };
}