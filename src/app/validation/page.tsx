'use client';

// Claim validation system demonstration page
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import ValidatedClaimForm from '@/components/ValidatedClaimForm';
import { ClaimValidationData } from '@/lib/validation';
import { useClaims } from '@/hooks/useClaims';

export default function ValidationPage() {
  const { status } = useSession();
  const { createClaim, loading: claimLoading } = useClaims();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedClaim, setSavedClaim] = useState<any>(null);

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

  const handleSaveClaim = async (formData: ClaimValidationData) => {
    try {
      const claim = await createClaim(formData);
      setSavedClaim(claim);
    } catch (error) {
      console.error('Failed to save claim:', error);
      throw error;
    }
  };

  if (savedClaim) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-900">Claim Submitted Successfully!</h2>
                <p className="text-green-700 mt-1">
                  Your claim has been validated and submitted. You can track its progress in your claims dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Claim Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Claim Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Provider:</span>
                <p className="text-gray-900">{savedClaim.providerName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Amount:</span>
                <p className="text-gray-900">${(savedClaim.amountCents / 100).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Date of Service:</span>
                <p className="text-gray-900">{new Date(savedClaim.dateOfService).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <p className="text-gray-900">{savedClaim.status}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setSavedClaim(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Another Claim
            </button>
            <a
              href="/claims"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View All Claims
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smart Claim Validation</h1>
          <p className="mt-2 text-gray-600">
            Submit claims with confidence using our real-time validation system
          </p>
        </div>

        {/* Features Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Real-time Validation</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Get instant feedback as you type with field-level validation and error correction guidance.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Medical Code Accuracy</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Validate CPT and ICD-10 codes for format accuracy and medical coding best practices.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Approval Likelihood</h3>
            </div>
            <p className="text-gray-600 text-sm">
              See your claim&apos;s approval likelihood score and get recommendations to improve it.
            </p>
          </div>
        </div>

        {/* Validation Form */}
        <ValidatedClaimForm
          onSave={handleSaveClaim}
          saving={claimLoading}
        />

        {/* Validation Rules Info */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Required Fields</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Provider name and contact information</li>
                <li>• Valid date of service (not in future)</li>
                <li>• Claim amount (reasonable range)</li>
                <li>• At least one CPT or ICD code</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Medical Code Validation</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• CPT codes: 5-digit format validation</li>
                <li>• ICD-10 codes: Proper format and structure</li>
                <li>• Code quantity reasonableness checks</li>
                <li>• Format compliance with industry standards</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Business Rules</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Amount reasonableness validation</li>
                <li>• Date range and timing checks</li>
                <li>• Provider information completeness</li>
                <li>• Service description quality</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Compliance Checks</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• NPI format validation (if provided)</li>
                <li>• Field length and content validation</li>
                <li>• Industry standard compliance</li>
                <li>• Data completeness scoring</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}