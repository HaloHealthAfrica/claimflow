'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// OCR processor component for document analysis
import { useState } from 'react';
import { useOCR } from '@/hooks/useOCR';
import { InsuranceProfilePartial, ReceiptData } from '@/lib/ocr';
import FileUpload from './FileUpload';
import LoadingSpinner from './LoadingSpinner';

interface OCRProcessorProps {
  type: 'insurance' | 'receipt';
  onResult?: (result: InsuranceProfilePartial | ReceiptData) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function OCRProcessor({ 
  type, 
  onResult, 
  onError, 
  className = '' 
}: OCRProcessorProps) {
  const [result, setResult] = useState<(InsuranceProfilePartial | ReceiptData) | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const { processing, error, processDocument, clearError } = useOCR();

  const handleFileUpload = async (file: File) => {
    try {
      clearError();
      const response = await processDocument(file, type);
      
      setResult(response.data);
      onResult?.(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      onError?.(errorMessage);
    }
  };

  const handleRetry = () => {
    setResult(null);
    clearError();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const renderInsuranceResult = (data: InsuranceProfilePartial) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Insurance Card Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Insurance Company</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.insurer || 'Not detected'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Plan Name</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.plan || 'Not detected'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Member ID</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.memberId || 'Not detected'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Group ID</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.groupId || 'Not detected'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Payer ID</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.payerId || 'Not detected'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.address || 'Not detected'}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReceiptResult = (data: ReceiptData) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Receipt Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Provider Name</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.providerName || 'Not detected'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.amount ? `$${data.amount.toFixed(2)}` : 'Not detected'}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Date of Service</label>
          <div className="mt-1 p-2 bg-gray-50 rounded-md">
            {data.dateOfService 
              ? new Date(data.dateOfService).toLocaleDateString()
              : 'Not detected'
            }
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {!result && !processing && (
        <FileUpload
          onUpload={handleFileUpload}
          onError={onError}
          accept="image/*,.pdf"
          disabled={processing}
        >
          <div>
            <div className="text-4xl mb-4">
              {type === 'insurance' ? '🏥' : '🧾'}
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload {type === 'insurance' ? 'Insurance Card' : 'Receipt'}
            </p>
            <p className="text-sm text-gray-600">
              {type === 'insurance' 
                ? 'Take a photo or upload an image of your insurance card'
                : 'Upload a receipt to extract provider and payment information'
              }
            </p>
          </div>
        </FileUpload>
      )}

      {processing && (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" text="Processing document with OCR..." />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-800">Processing Failed</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Confidence indicator */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Detection Confidence:</span>
              <span className={`font-semibold ${getConfidenceColor(result.confidence || 0)}`}>
                {getConfidenceLabel(result.confidence || 0)} ({((result.confidence || 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <button
              onClick={handleRetry}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Process Another
            </button>
          </div>

          {/* Validation issues */}
          {(result as any).validation && (result as any).validation.issues && (result as any).validation.issues.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Detection Issues:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {(result as any).validation.issues.map((issue: string, index: number) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted data */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {type === 'insurance' 
              ? renderInsuranceResult(result as InsuranceProfilePartial)
              : renderReceiptResult(result as ReceiptData)
            }
          </div>

          {/* Raw text toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showRawText ? 'Hide' : 'Show'} Raw Extracted Text
            </button>
            
            {showRawText && result.rawText && (
              <div className="mt-2 p-3 bg-gray-100 rounded-md">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {result.rawText}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}