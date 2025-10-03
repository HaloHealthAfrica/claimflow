'use client';

// Reusable file upload component with drag-and-drop
import { useState, useRef, useCallback } from 'react';
import { validateFile } from '@/lib/s3';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface UploadedFile {
  file: File;
  preview?: string;
  uploading: boolean;
  error?: string;
  success?: boolean;
}

export default function FileUpload({
  onUpload,
  onError,
  accept = 'image/*,.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  disabled = false,
  className = '',
  children,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        onError?.(validation.error || 'Invalid file');
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        file,
        preview,
        uploading: false,
      });
    }

    if (!multiple) {
      setFiles(newFiles.slice(0, 1));
    } else {
      setFiles(prev => [...prev, ...newFiles]);
    }

    // Upload files
    for (const uploadFile of newFiles) {
      try {
        setFiles(prev => prev.map(f => 
          f.file === uploadFile.file 
            ? { ...f, uploading: true }
            : f
        ));

        await onUpload(uploadFile.file);

        setFiles(prev => prev.map(f => 
          f.file === uploadFile.file 
            ? { ...f, uploading: false, success: true }
            : f
        ));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        setFiles(prev => prev.map(f => 
          f.file === uploadFile.file 
            ? { ...f, uploading: false, error: errorMessage }
            : f
        ));

        onError?.(errorMessage);
      }
    }
  }, [onUpload, onError, multiple]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const removeFile = useCallback((fileToRemove: File) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.file !== fileToRemove);
      // Revoke object URL to prevent memory leaks
      const removedFile = prev.find(f => f.file === fileToRemove);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {children || (
          <div>
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-600">
              Supports JPG, PNG, WebP, and PDF files up to {formatFileSize(maxSize)}
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((uploadFile, index) => (
            <div
              key={index}
              className="flex items-center p-3 bg-gray-50 rounded-lg border"
            >
              {/* File preview */}
              <div className="flex-shrink-0 mr-3">
                {uploadFile.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadFile.preview}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs">📄</span>
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadFile.file.size)}
                </p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0 ml-3">
                {uploadFile.uploading && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                    <span className="text-xs">Uploading...</span>
                  </div>
                )}
                
                {uploadFile.success && (
                  <div className="flex items-center text-green-600">
                    <span className="text-sm mr-2">✓</span>
                    <span className="text-xs">Uploaded</span>
                  </div>
                )}
                
                {uploadFile.error && (
                  <div className="flex items-center text-red-600">
                    <span className="text-sm mr-2">✗</span>
                    <span className="text-xs">Failed</span>
                  </div>
                )}

                {!uploadFile.uploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadFile.file);
                    }}
                    className="text-gray-400 hover:text-red-600 ml-2"
                  >
                    <span className="text-sm">✕</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}