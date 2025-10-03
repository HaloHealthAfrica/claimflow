'use client';

// Documents page with file upload functionality
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import FileUpload from '@/components/FileUpload';
import FileViewer from '@/components/FileViewer';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileInfo {
  key: string;
  originalName: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export default function DocumentsPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploading, error, uploadFile, getFileUrl, deleteFile, clearError } = useFileUpload();

  const handleFileUpload = async (file: File) => {
    try {
      setUploadError(null);
      const result = await uploadFile(file, 'document');
      
      // Add to files list
      setFiles(prev => [...prev, result]);
    } catch (uploadErr) {
      const errorMessage = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
      setUploadError(errorMessage);
      throw uploadErr;
    }
  };

  const handleFileView = async (key: string): Promise<string> => {
    return await getFileUrl(key);
  };

  const handleFileDelete = async (key: string) => {
    try {
      await deleteFile(key);
      
      // Remove from files list
      setFiles(prev => prev.filter(f => f.key !== key));
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Documents"
        description="Upload and manage your insurance documents, receipts, and files"
      />

      <div className="p-6 space-y-6">
        {/* Upload Section */}
        <Card
          title="Upload Documents"
          description="Upload insurance cards, receipts, medical records, and other documents"
        >
          <FileUpload
            onUpload={handleFileUpload}
            onError={setUploadError}
            accept="image/*,.pdf"
            disabled={uploading}
          />

          {/* Upload error */}
          {(uploadError || error) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{uploadError || error}</p>
                <button
                  onClick={() => {
                    setUploadError(null);
                    clearError();
                  }}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Document Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Insurance Cards" className="text-center">
            <div className="py-6">
              <span className="text-3xl block mb-2">🏥</span>
              <p className="text-lg font-semibold text-gray-900">2</p>
              <p className="text-sm text-gray-600">Insurance cards</p>
            </div>
          </Card>

          <Card title="Receipts" className="text-center">
            <div className="py-6">
              <span className="text-3xl block mb-2">🧾</span>
              <p className="text-lg font-semibold text-gray-900">8</p>
              <p className="text-sm text-gray-600">Medical receipts</p>
            </div>
          </Card>

          <Card title="Other Documents" className="text-center">
            <div className="py-6">
              <span className="text-3xl block mb-2">📄</span>
              <p className="text-lg font-semibold text-gray-900">{files.length}</p>
              <p className="text-sm text-gray-600">Other files</p>
            </div>
          </Card>
        </div>

        {/* File Library */}
        <Card
          title="Document Library"
          description="All your uploaded files and documents"
        >
          <FileViewer
            files={files}
            onView={handleFileView}
            onDelete={handleFileDelete}
          />
        </Card>

        {/* Tips */}
        <Card
          title="Upload Tips"
          description="Best practices for document uploads"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <span className="text-xl">📱</span>
              <div>
                <h4 className="font-medium text-gray-900">Use Your Phone</h4>
                <p className="text-sm text-gray-600">
                  Take clear photos of documents with good lighting
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-xl">📐</span>
              <div>
                <h4 className="font-medium text-gray-900">File Size</h4>
                <p className="text-sm text-gray-600">
                  Keep files under 10MB for faster uploads
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-xl">🔒</span>
              <div>
                <h4 className="font-medium text-gray-900">Secure Storage</h4>
                <p className="text-sm text-gray-600">
                  All files are encrypted and stored securely
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-xl">📋</span>
              <div>
                <h4 className="font-medium text-gray-900">Supported Formats</h4>
                <p className="text-sm text-gray-600">
                  JPG, PNG, WebP, and PDF files are supported
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}