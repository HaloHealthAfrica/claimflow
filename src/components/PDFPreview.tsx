'use client';

// PDF preview component with download functionality
import React, { useState } from 'react';
import { usePDF } from '@/hooks/usePDF';

interface PDFPreviewProps {
  type: 'claim' | 'appeal';
  claimId?: string;
  denialReason?: string;
  appealLetter?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customData?: any;
  onClose?: () => void;
  className?: string;
}

export default function PDFPreview({
  type,
  claimId,
  denialReason,
  appealLetter,
  customData,
  onClose,
  className = '',
}: PDFPreviewProps) {
  const { loading, error, generateClaimPDF, generateAppealPDF, previewClaimPDF, previewAppealPDF, clearError } = usePDF();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = () => {
    try {
      clearError();
      let url = '';
      
      if (type === 'claim' && claimId) {
        url = previewClaimPDF(claimId);
      } else if (type === 'appeal' && claimId && denialReason && appealLetter) {
        url = previewAppealPDF(claimId, denialReason, appealLetter);
      } else {
        throw new Error('Missing required parameters for PDF preview');
      }
      
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  const handleDownload = async () => {
    try {
      clearError();
      
      if (type === 'claim') {
        await generateClaimPDF(claimId, customData);
      } else if (type === 'appeal') {
        await generateAppealPDF(claimId, denialReason, appealLetter, customData);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const canPreview = () => {
    if (type === 'claim') {
      return Boolean(claimId);
    } else if (type === 'appeal') {
      return Boolean(claimId && denialReason && appealLetter);
    }
    return false;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'claim' ? 'Claim Form PDF' : 'Appeal Letter PDF'}
              </h3>
              <p className="text-sm text-gray-600">
                {type === 'claim' 
                  ? 'Generate a professional insurance claim form'
                  : 'Generate a formal appeal letter for denied claims'
                }
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6">
        {!showPreview ? (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Generate PDF
              </h4>
              <p className="text-gray-600 mb-6">
                {type === 'claim' 
                  ? 'Create a professional claim form that follows insurance industry standards.'
                  : 'Generate a formal appeal letter with proper formatting and structure.'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handlePreview}
                disabled={loading || !canPreview()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview PDF
              </button>
              
              <button
                onClick={handleDownload}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>

            {!canPreview() && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  {type === 'claim' 
                    ? 'Claim ID is required for preview'
                    : 'Claim ID, denial reason, and appeal letter are required for preview'
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* PDF Preview */}
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">PDF Preview</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
            
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-96"
                title="PDF Preview"
                onError={() => {
                  setShowPreview(false);
                  console.error('Failed to load PDF preview');
                }}
              />
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>
                💡 If the preview doesn&apos;t load, your browser may not support PDF viewing. 
                You can still download the PDF using the button above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Features Info */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <h5 className="font-medium text-gray-900 mb-2">PDF Features</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          {type === 'claim' ? (
            <>
              <li>• Follows CMS-1500 industry standards</li>
              <li>• Includes all required claim information</li>
              <li>• Professional formatting for insurance submission</li>
              <li>• Secure generation with audit logging</li>
            </>
          ) : (
            <>
              <li>• Professional business letter format</li>
              <li>• Includes claim details and denial reason</li>
              <li>• Proper appeal structure and formatting</li>
              <li>• Ready for insurance company submission</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}