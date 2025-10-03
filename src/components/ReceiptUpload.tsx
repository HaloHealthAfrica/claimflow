'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Receipt upload component with OCR processing
import { useState } from 'react';
import { ReceiptData } from '@/lib/ocr';
import { useOCR } from '@/hooks/useOCR';
import FileUpload from './FileUpload';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';

interface ReceiptUploadProps {
  onReceiptProcessed?: (data: ReceiptData & { receiptKey: string }) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function ReceiptUpload({
  onReceiptProcessed,
  onError,
  className = '',
}: ReceiptUploadProps) {
  const [receiptData, setReceiptData] = useState<(ReceiptData & { receiptKey: string }) | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ReceiptData>({
    rawText: '',
  });
  const { processing, error, clearError } = useOCR();

  const handleFileUpload = async (file: File) => {
    try {
      clearError();
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/claims/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to process receipt');
      }

      const processedData = result.data;
      setReceiptData(processedData);
      setEditedData(processedData);
      onReceiptProcessed?.(processedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process receipt';
      onError?.(errorMessage);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (receiptData) {
      const updatedData = { ...receiptData, ...editedData };
      setReceiptData(updatedData);
      setIsEditing(false);
      onReceiptProcessed?.(updatedData);
    }
  };

  const handleCancel = () => {
    setEditedData(receiptData || { rawText: '' });
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof ReceiptData, value: string | number | Date) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toFixed(2)}` : '';
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  if (processing) {
    return (
      <div className={className}>
        <Card
          title="Processing Receipt"
          description="Extracting information from your receipt..."
        >
          <div className="text-center py-8">
            <LoadingSpinner size="lg" text="Analyzing receipt with OCR..." />
          </div>
        </Card>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className={className}>
        <Card
          title="Upload Receipt"
          description="Upload a receipt to automatically extract claim information"
        >
          <FileUpload
            onUpload={handleFileUpload}
            onError={onError}
            accept="image/*,.pdf"
          >
            <div>
              <div className="text-4xl mb-4">🧾</div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Upload Medical Receipt
              </p>
              <p className="text-sm text-gray-600">
                Take a photo or upload an image of your medical receipt to extract claim information
              </p>
            </div>
          </FileUpload>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </Card>

        <div className="mt-6">
          <Card
            title="Receipt Processing Tips"
            description="Get the best results from OCR processing"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-xl">📱</span>
                <div>
                  <h4 className="font-medium text-gray-900">Clear Image</h4>
                  <p className="text-sm text-gray-600">
                    Ensure the receipt is well-lit and all text is clearly visible
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-xl">📐</span>
                <div>
                  <h4 className="font-medium text-gray-900">Full Receipt</h4>
                  <p className="text-sm text-gray-600">
                    Include the entire receipt from top to bottom in the image
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-xl">🔍</span>
                <div>
                  <h4 className="font-medium text-gray-900">Focus on Text</h4>
                  <p className="text-sm text-gray-600">
                    Make sure provider name, date, and amount are clearly readable
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-xl">📄</span>
                <div>
                  <h4 className="font-medium text-gray-900">PDF Support</h4>
                  <p className="text-sm text-gray-600">
                    Digital receipts in PDF format are also supported
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card
        title="Extracted Receipt Information"
        description="Review and edit the information extracted from your receipt"
        action={
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.providerName || ''}
                onChange={(e) => handleInputChange('providerName', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter provider name"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {receiptData.providerName || 'Not detected'}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                min="0"
                value={editedData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {formatCurrency(receiptData.amount) || 'Not detected'}
              </div>
            )}
          </div>

          {/* Date of Service */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Service *
            </label>
            {isEditing ? (
              <input
                type="date"
                value={editedData.dateOfService ? new Date(editedData.dateOfService).toISOString().split('T')[0] : ''}
                onChange={(e) => handleInputChange('dateOfService', new Date(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {formatDate(receiptData.dateOfService) || 'Not detected'}
              </div>
            )}
          </div>
        </div>

        {/* Confidence and Validation */}
        {receiptData.confidence && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                OCR Confidence: {(receiptData.confidence * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-blue-600">
                {receiptData.confidence >= 0.9 ? 'High confidence' :
                 receiptData.confidence >= 0.7 ? 'Medium confidence' : 'Low confidence'}
              </span>
            </div>
            
            {/* Validation Issues */}
            {(receiptData as any).validation?.issues && (receiptData as any).validation.issues.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-blue-800 mb-1">Detection Issues:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  {(receiptData as any).validation.issues.map((issue: string, index: number) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => {
            setReceiptData(null);
            setEditedData({ rawText: '' });
            setIsEditing(false);
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Upload Another Receipt
        </button>
        
        <button
          onClick={() => onReceiptProcessed?.(isEditing ? { ...receiptData, ...editedData } : receiptData)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Use This Information
        </button>
      </div>
    </div>
  );
}