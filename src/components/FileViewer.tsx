'use client';

// File viewer component for displaying uploaded files
import { useState, useEffect } from 'react';

interface FileInfo {
  key: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface FileViewerProps {
  files: FileInfo[];
  onDelete?: (key: string) => Promise<void>;
  onView?: (key: string) => Promise<string>;
  className?: string;
}

export default function FileViewer({ files, onDelete, onView, className = '' }: FileViewerProps) {
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  const handleView = async (key: string) => {
    if (!onView) return;

    setLoading(key);
    setError(null);

    try {
      const url = await onView(key);
      setFileUrl(url);
      setViewingFile(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (key: string) => {
    if (!onDelete) return;

    if (confirm('Are you sure you want to delete this file?')) {
      setLoading(key);
      setError(null);

      try {
        await onDelete(key);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete file');
      } finally {
        setLoading(null);
      }
    }
  };

  const closeViewer = () => {
    setViewingFile(null);
    setFileUrl(null);
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <span className="text-4xl mb-4 block">📁</span>
        <p className="text-gray-600">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* File list */}
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.key}
            className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            {/* File icon */}
            <div className="flex-shrink-0 mr-4">
              <span className="text-2xl">{getFileIcon(file.type)}</span>
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {file.originalName}
              </h4>
              <div className="flex items-center mt-1 text-xs text-gray-500 space-x-4">
                <span>{formatFileSize(file.size)}</span>
                <span>{formatDate(file.uploadedAt)}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
              {onView && (
                <button
                  onClick={() => handleView(file.key)}
                  disabled={loading === file.key}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                  title="View file"
                >
                  {loading === file.key ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                  ) : (
                    <span>👁️</span>
                  )}
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => handleDelete(file.key)}
                  disabled={loading === file.key}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="Delete file"
                >
                  <span>🗑️</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File viewer modal */}
      {viewingFile && fileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-full m-4 bg-white rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {files.find(f => f.key === viewingFile)?.originalName}
              </h3>
              <button
                onClick={closeViewer}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-auto">
              {files.find(f => f.key === viewingFile)?.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl}
                  alt="File preview"
                  className="max-w-full h-auto"
                />
              ) : (
                <iframe
                  src={fileUrl}
                  className="w-full h-96 border-0"
                  title="File preview"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t space-x-3">
              <a
                href={fileUrl}
                download={files.find(f => f.key === viewingFile)?.originalName}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Download
              </a>
              <button
                onClick={closeViewer}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}