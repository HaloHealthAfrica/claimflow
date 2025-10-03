'use client';

// Claim submission component with electronic and PDF options
import React, { useState, useEffect } from 'react';
import { useClaimSubmission } from '@/hooks/useClaimSubmission';

interface ClaimSubmissionProps {
  claimId: string;
  claimData?: {
    providerName?: string;
    dateOfService?: string;
    amount?: number;
    cptCodes?: string[];
    icdCodes?: string[];
    status?: string;
  };
  onSubmissionComplete?: (result: any) => void;
  className?: string;
}

export default function ClaimSubmission({
  claimId,
  claimData,
  onSubmissionComplete,
  className = '',
}: ClaimSubmissionProps) {
  const { loading, error, submitClaim, getSubmissionStatus, clearError } = useClaimSubmission();
  
  const [submissionMethod, setSubmissionMethod] = useState<'electronic' | 'pdf'>('electronic');
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Load submission status on component mount
  useEffect(() => {
    if (claimId) {
      loadSubmissionStatus();
    }
  }, [claimId]);

  const loadSubmissionStatus = async () => {
    try {
      const status = await getSubmissionStatus(claimId);
      setSubmissionStatus(status);
    } catch (err) {
      console.error('Failed to load submission status:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      clearError();
      const result = await submitClaim(claimId, submissionMethod);
      setSubmissionResult(result);
      setShowConfirmation(false);
      
      // Reload status after submission
      await loadSubmissionStatus();
      
      onSubmissionComplete?.(result);
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  const canSubmit = () => {
    return submissionStatus?.canResubmit !== false && !loading;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'submitted':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="animate-spin h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'approved':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(submissionStatus?.status || 'draft')}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Claim Submission</h3>
              <p className="text-sm text-gray-600">
                Submit your claim electronically or generate a PDF for manual submission
              </p>
            </div>
          </div>
          
          {submissionStatus && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submissionStatus.status)}`}>
              {submissionStatus.status}
            </span>
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
        {submissionResult ? (
          /* Submission Success */
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Claim Submitted Successfully!
              </h4>
              <p className="text-gray-600 mb-6">
                {submissionResult.data?.message}
              </p>
            </div>

            {/* Submission Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h5 className="font-medium text-gray-900 mb-3">Submission Details</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium capitalize">
                    {submissionResult.data?.submission.method.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Submission ID:</span>
                  <span className="font-mono text-xs">
                    {submissionResult.data?.submission.submissionId}
                  </span>
                </div>
                {submissionResult.data?.submission.confirmationNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmation:</span>
                    <span className="font-mono text-xs">
                      {submissionResult.data.submission.confirmationNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Submitted:</span>
                  <span>{new Date(submissionResult.data?.submission.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* PDF Download */}
            {submissionResult.pdfAvailable && (
              <div className="mb-6">
                <a
                  href={submissionResult.pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </a>
              </div>
            )}

            <button
              onClick={() => setSubmissionResult(null)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Submit Another Claim
            </button>
          </div>
        ) : showConfirmation ? (
          /* Confirmation Dialog */
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Confirm Submission
              </h4>
              <p className="text-gray-600 mb-6">
                Are you sure you want to submit this claim using {submissionMethod} method?
              </p>
            </div>

            {/* Claim Summary */}
            {claimData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h5 className="font-medium text-gray-900 mb-3">Claim Summary</h5>
                <div className="space-y-2 text-sm">
                  {claimData.providerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <span>{claimData.providerName}</span>
                    </div>
                  )}
                  {claimData.amount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span>${claimData.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {claimData.dateOfService && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{claimData.dateOfService}</span>
                    </div>
                  )}
                  {claimData.cptCodes && claimData.cptCodes.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">CPT Codes:</span>
                      <span>{claimData.cptCodes.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        ) : (
          /* Submission Options */
          <div>
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Choose Submission Method</h4>
              
              <div className="space-y-4">
                {/* Electronic Submission Option */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    submissionMethod === 'electronic'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSubmissionMethod('electronic')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={submissionMethod === 'electronic'}
                      onChange={() => setSubmissionMethod('electronic')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h5 className="font-medium text-gray-900">Electronic Submission (Recommended)</h5>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Submit directly to insurance clearinghouse for faster processing
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Faster processing (24-48 hours)</li>
                        <li>• Automatic status updates</li>
                        <li>• PDF fallback if electronic fails</li>
                        <li>• Real-time validation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* PDF Submission Option */}
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    submissionMethod === 'pdf'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSubmissionMethod('pdf')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={submissionMethod === 'pdf'}
                      onChange={() => setSubmissionMethod('pdf')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <h5 className="font-medium text-gray-900">PDF Submission</h5>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Generate a PDF form for manual submission to your insurance provider
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Professional PDF format</li>
                        <li>• Print or email to insurer</li>
                        <li>• Manual tracking required</li>
                        <li>• Longer processing time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Status */}
            {submissionStatus && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Current Status</h5>
                <div className="text-sm text-gray-600">
                  <p>Status: <span className="font-medium">{submissionStatus.status}</span></p>
                  {submissionStatus.submittedAt && (
                    <p>Submitted: {new Date(submissionStatus.submittedAt).toLocaleString()}</p>
                  )}
                  {submissionStatus.timeline.submissionMethod && (
                    <p>Method: <span className="capitalize">{submissionStatus.timeline.submissionMethod.replace('_', ' ')}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={!canSubmit()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Processing...' : `Submit Claim ${submissionMethod === 'electronic' ? 'Electronically' : 'as PDF'}`}
            </button>

            {!canSubmit() && submissionStatus && !submissionStatus.canResubmit && (
              <p className="mt-2 text-sm text-gray-500 text-center">
                This claim has already been submitted and cannot be resubmitted.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}