'use client';

// Component for tracking claim submission status and progress
import React, { useState, useEffect } from 'react';
import { useClaimSubmission } from '@/hooks/useClaimSubmission';

interface SubmissionTrackerProps {
  claimId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export default function SubmissionTracker({
  claimId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  className = '',
}: SubmissionTrackerProps) {
  const { loading, error, getSubmissionStatus, clearError } = useClaimSubmission();
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (claimId) {
      loadSubmissionStatus();
    }
  }, [claimId]);

  useEffect(() => {
    if (autoRefresh && claimId && submissionStatus?.status === 'PROCESSING') {
      const interval = setInterval(() => {
        loadSubmissionStatus();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, claimId, submissionStatus?.status, refreshInterval]);

  const loadSubmissionStatus = async () => {
    try {
      clearError();
      const status = await getSubmissionStatus(claimId);
      setSubmissionStatus(status);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load submission status:', err);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { id: 'created', label: 'Created', description: 'Claim created and saved' },
      { id: 'submitted', label: 'Submitted', description: 'Claim submitted for processing' },
      { id: 'processing', label: 'Processing', description: 'Under review by insurance provider' },
      { id: 'completed', label: 'Completed', description: 'Processing completed' },
    ];

    const currentStatus = submissionStatus?.status?.toLowerCase();
    let currentStepIndex = 0;

    switch (currentStatus) {
      case 'draft':
        currentStepIndex = 0;
        break;
      case 'submitted':
        currentStepIndex = 1;
        break;
      case 'processing':
        currentStepIndex = 2;
        break;
      case 'approved':
      case 'rejected':
      case 'paid':
        currentStepIndex = 3;
        break;
      default:
        currentStepIndex = 0;
    }

    return steps.map((step, index) => ({
      ...step,
      status: index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'current' : 'pending',
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'text-gray-600';
      case 'submitted': return 'text-blue-600';
      case 'processing': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'paid': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'Claim is in draft status and has not been submitted yet.';
      case 'submitted':
        return 'Claim has been submitted and is waiting to be processed.';
      case 'processing':
        return 'Claim is currently being reviewed by the insurance provider.';
      case 'approved':
        return 'Claim has been approved and payment is being processed.';
      case 'rejected':
        return 'Claim has been rejected. You may need to submit an appeal.';
      case 'paid':
        return 'Claim has been processed and payment has been issued.';
      default:
        return 'Status information is not available.';
    }
  };

  if (!submissionStatus) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="px-6 py-8 text-center">
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading submission status...</span>
            </div>
          ) : (
            <div>
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Submission Data</h3>
              <p className="text-gray-600">Unable to load submission status for this claim.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const steps = getStatusSteps();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Submission Tracking</h3>
            <p className="text-sm text-gray-600">
              Track the progress of your claim submission
            </p>
          </div>
          <button
            onClick={loadSubmissionStatus}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh status"
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6">
        {/* Current Status */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              submissionStatus.status === 'APPROVED' || submissionStatus.status === 'PAID' 
                ? 'bg-green-100 text-green-800'
                : submissionStatus.status === 'REJECTED'
                ? 'bg-red-100 text-red-800'
                : submissionStatus.status === 'PROCESSING'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {submissionStatus.status}
            </span>
            {submissionStatus.timeline.submissionMethod && (
              <span className="text-sm text-gray-500">
                via {submissionStatus.timeline.submissionMethod.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className={`text-sm ${getStatusColor(submissionStatus.status)}`}>
            {getStatusMessage(submissionStatus.status)}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Progress</h4>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {step.status === 'completed' ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : step.status === 'current' ? (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h5 className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'current' ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </h5>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Timeline</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(submissionStatus.timeline.created).toLocaleString()}</span>
            </div>
            {submissionStatus.timeline.submitted && (
              <div className="flex justify-between">
                <span className="text-gray-600">Submitted:</span>
                <span>{new Date(submissionStatus.timeline.submitted).toLocaleString()}</span>
              </div>
            )}
            {submissionStatus.timeline.submissionId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Submission ID:</span>
                <span className="font-mono text-xs">{submissionStatus.timeline.submissionId}</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span>{lastUpdated.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh indicator */}
        {autoRefresh && submissionStatus.status === 'PROCESSING' && (
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Auto-refreshing every {refreshInterval / 1000} seconds</span>
          </div>
        )}
      </div>
    </div>
  );
}