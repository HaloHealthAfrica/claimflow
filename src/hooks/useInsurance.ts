'use client';

// Custom hook for insurance management operations
import { useState, useCallback, useEffect } from 'react';
import { InsuranceProfilePartial } from '@/lib/ocr';

interface InsuranceProfile {
  id: string;
  hasProfile: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseInsuranceReturn {
  profile: InsuranceProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  processInsuranceCard: (file: File) => Promise<InsuranceProfilePartial & { cardImageKey: string }>;
  saveInsuranceProfile: (data: InsuranceProfilePartial) => Promise<void>;
  getInsuranceProfile: () => Promise<void>;
  clearError: () => void;
}

export function useInsurance(): UseInsuranceReturn {
  const [profile, setProfile] = useState<InsuranceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processInsuranceCard = useCallback(async (file: File): Promise<InsuranceProfilePartial & { cardImageKey: string }> => {
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/insurance/ocr', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to process insurance card');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process insurance card';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getInsuranceProfile = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/insurance/save');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get insurance profile');
      }

      setProfile(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get insurance profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInsuranceProfile = useCallback(async (data: InsuranceProfilePartial): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/insurance/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save insurance profile');
      }

      // Refresh profile data
      await getInsuranceProfile();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save insurance profile';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [getInsuranceProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load profile on mount
  useEffect(() => {
    getInsuranceProfile();
  }, [getInsuranceProfile]);

  return {
    profile,
    loading,
    saving,
    error,
    processInsuranceCard,
    saveInsuranceProfile,
    getInsuranceProfile,
    clearError,
  };
}