'use client';

// Comprehensive claim submission page with electronic and PDF options
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useClaims } from '@/hooks/useClaims';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationHelpers } from '@/lib/notifications';
import ClaimSubmission from '@/components/ClaimSubmission';
import SubmissionTracker from '@/components/SubmissionTracker';
import NotificationBell from '@/components/NotificationBell';

export default function SubmitPage() {
  const { data: session, status } = useSession();
  const { claims, loading: claimsLoading, getClaims } = useClaims();
  const { notifications, unreadCount, fetchNotifications } = useNotifications();

  const [selectedClaim, setSelectedClaim] = useState<string>('');
  const [activeView, setActiveView] = useState<'select' | 'submit' | 'track'>('select');
  const [submissionStatus, setSubmissionStatus] = useState<{
    isSubmitting: boolean;
    progress: number;
    currentStep: string;
    error?: string;
  }>({
    isSubmitting: false,
    progress: 0,
    currentStep: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      getClaims();
      fetchNotifications({ refresh: true });
    }
  }, [status, getClaims, fetchNotifications]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  const selectedClaimData = claims.find(claim => claim.id === selectedClaim);
  const draftClaims = claims.filter(claim => claim.status === 'DRAFT');
  const submittedClaims = claims.filter(claim =>
    claim.status === 'SUBMITTED' || claim.status === 'PROCESSING' || claim.status === 'APPROVED'
  );

  const handleSubmissionStart = () => {
    setSubmissionStatus({
      isSubmitting: true,
      progress: 0,
      currentStep: 'Preparing submission...',
    });
  };

  const handleSubmissionProgress = (progress: number, step: string) => {
    setSubmissionStatus(prev => ({
      ...prev,
      progress,
      currentStep: step,
    }));
  };

  const handleSubmissionComplete = async (result: any) => {
    console.log('Submission completed:', result);

    // Create notification for successful submission
    if (session?.user?.id && selectedClaimData) {
      try {
        await NotificationHelpers.claimSubmitted(
          session.user.id,
          selectedClaim,
          selectedClaimData.amountCents / 100,
          result.insurer || 'your insurance company'
        );
      } catch (error) {
        console.error('Failed to create submission notification:', error);
      }
    }

    // Reset submission status
    setSubmissionStatus({
      isSubmitting: false,
      progress: 100,
      currentStep: 'Submission complete!',
    });

    // Refresh claims list and notifications
    getClaims();
    fetchNotifications({ refresh: true });

    // Switch to tracking view after a brief delay
    setTimeout(() => {
      setActiveView('track');
    }, 2000);
  };

  const handleSubmissionError = (error: string) => {
    setSubmissionStatus({
      isSubmitting: false,
      progress: 0,
      currentStep: '',
      error,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submit Claims</h1>
              <p className="mt-2 text-gray-600">
                Submit your claims electronically or generate PDFs for manual submission
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <NotificationBell />

              {/* Quick Stats */}
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{draftClaims.length}</div>
                    <div className="text-gray-500">Ready</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{submittedClaims.length}</div>
                    <div className="text-gray-500">Submitted</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{unreadCount}</div>
                    <div className="text-gray-500">Updates</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Progress */}
        {submissionStatus.isSubmitting && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Submitting Claim</h3>
              <span className="text-sm text-gray-500">{submissionStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${submissionStatus.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{submissionStatus.currentStep}</p>
          </div>
        )}

        {/* Submission Error */}
        {submissionStatus.error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{submissionStatus.error}</p>
            </div>
          </div>
        )}

        {/* View Navigation */}
        <div className="mb-8">
          <div className="flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setActiveView('select')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'select'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
                }`}
            >
              Select Claim
            </button>
            <button
              onClick={() => setActiveView('submit')}
              disabled={!selectedClaim || submissionStatus.isSubmitting}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeView === 'submit'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
                }`}
            >
              Submit
            </button>
            <button
              onClick={() => setActiveView('track')}
              disabled={!selectedClaim}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeView === 'track'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
                }`}
            >
              Track
            </button>
          </div>
        </div>

        {/* Content */}
        {activeView === 'select' && (
          <div className="space-y-6">
            {/* Draft Claims */}
            {draftClaims.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Ready to Submit</h3>
                  <p className="text-sm text-gray-600">Claims that are ready for submission</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {draftClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedClaim === claim.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => setSelectedClaim(claim.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="radio"
                                checked={selectedClaim === claim.id}
                                onChange={() => setSelectedClaim(claim.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="font-medium text-gray-900">
                                Claim {claim.id.substring(0, 8)}
                              </span>
                            </div>
                            <div className="ml-6 space-y-1">
                              <p className="text-sm text-gray-600">
                                ${(claim.amountCents / 100).toFixed(2)} • {claim.dateOfService ? new Date(claim.dateOfService).toLocaleDateString() : 'No date'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {claim.cptCodes.length} CPT codes, {claim.icdCodes.length} ICD codes
                              </p>
                              <p className="text-xs text-gray-400">
                                Created: {new Date(claim.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedClaim && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setActiveView('submit')}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Proceed to Submission
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submitted Claims */}
            {submittedClaims.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Previously Submitted</h3>
                  <p className="text-sm text-gray-600">Claims that have been submitted for processing</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {submittedClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedClaim === claim.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => setSelectedClaim(claim.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="radio"
                                checked={selectedClaim === claim.id}
                                onChange={() => setSelectedClaim(claim.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="font-medium text-gray-900">
                                Claim {claim.id.substring(0, 8)}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${claim.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                  claim.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {claim.status}
                              </span>
                            </div>
                            <div className="ml-6 space-y-1">
                              <p className="text-sm text-gray-600">
                                ${(claim.amountCents / 100).toFixed(2)} • {claim.dateOfService ? new Date(claim.dateOfService).toLocaleDateString() : 'No date'}
                              </p>
                              <p className="text-xs text-gray-400">
                                Submitted: {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedClaim && submittedClaims.find(c => c.id === selectedClaim) && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setActiveView('track')}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Track Submission
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Claims */}
            {claims.length === 0 && !claimsLoading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Found</h3>
                <p className="text-gray-600 mb-6">
                  You need to create a claim before you can submit it.
                </p>
                <a
                  href="/claims"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Create Your First Claim
                </a>
              </div>
            )}
          </div>
        )}

        {activeView === 'submit' && selectedClaim && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Submission Form */}
            <div className="lg:col-span-2">
              <ClaimSubmission
                claimId={selectedClaim}
                claimData={selectedClaimData ? {
                  providerName: `Claim ${selectedClaimData.id.substring(0, 8)}`,
                  dateOfService: selectedClaimData.dateOfService ? new Date(selectedClaimData.dateOfService).toLocaleDateString() : undefined,
                  amount: selectedClaimData.amountCents / 100,
                  cptCodes: selectedClaimData.cptCodes,
                  icdCodes: selectedClaimData.icdCodes,
                  status: selectedClaimData.status,
                } : undefined}
                onSubmissionStart={handleSubmissionStart}
                onSubmissionProgress={handleSubmissionProgress}
                onSubmissionComplete={handleSubmissionComplete}
                onSubmissionError={handleSubmissionError}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Notifications */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h3>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${notification.priority === 'HIGH' || notification.priority === 'URGENT'
                            ? 'bg-red-500'
                            : notification.priority === 'MEDIUM'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.createdAt && new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {/* Open notification center */ }}
                      className="w-full text-sm text-blue-600 hover:text-blue-800 py-2"
                    >
                      View all notifications
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent notifications</p>
                )}
              </div>

              {/* Submission Tips */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Submission Tips</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Electronic submission is faster and more reliable
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    PDF backup is automatically generated
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    You'll receive notifications about status updates
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Track progress in real-time
                  </li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveView('select')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    ← Back to claim selection
                  </button>
                  <button
                    onClick={() => window.open('/claims', '_blank')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Create new claim
                  </button>
                  <button
                    onClick={() => window.open('/validation', '_blank')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Validate claim data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'track' && selectedClaim && (
          <SubmissionTracker
            claimId={selectedClaim}
            autoRefresh={true}
            refreshInterval={30000}
          />
        )}
      </div>
    </div>
  );
}