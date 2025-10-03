'use client';

// Custom hook for file upload operations
import { useState, useCallback } from 'react';

interface UploadResponse {
  key: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface UseFileUploadReturn {
  uploading: boolean;
  error: string | null;
  uploadFile: (file: File, type: string) => Promise<UploadResponse>;
  getFileUrl: (key: string) => Promise<string>;
  deleteFile: (key: string) => Promise<void>;
  clearError: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, type: string): Promise<UploadResponse> => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const getFileUrl = useCallback(async (key: string): Promise<string> => {
    setError(null);

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(key)}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get file URL');
      }

      return result.data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get file URL';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteFile = useCallback(async (key: string): Promise<void> => {
    setError(null);

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploading,
    error,
    uploadFile,
    getFileUrl,
    deleteFile,
    clearError,
  };
}