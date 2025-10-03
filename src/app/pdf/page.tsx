'use client';

// PDF generation and management page
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import PDFPreview from '@/components/PDFPreview';
import { useClaims } from '@/hooks/useClaims';

export default function PDFPage() {
  const { status } = useSession();
  const { claims, loading: claimsLoading, getClaims } = useClaims();
  
  const [activeTab, setActiveTab] = useState<'claim' | 'appeal' | 'custom'>('claim');
  const [selectedClaim, setSelectedClaim] = useState<string>('');
  const [appealData, setAppealData] = useState({
    denialReason: '',
    appealLetter: '',
  });
  const [customClaimData, setCustomClaimData] = useState({
    providerName: '',
    providerNpi: '',
    providerAddress: '',
    providerPhone: '',
    dateOfService: '',
    amount: '',
    cptCodes: '',
    icdCodes: '',
    description: '',
    patientName: '',
    patientDob: '',
    patientAddress: '',
    insuranceInfo: {
      insurerName: '',
      memberId: '',
      groupId: '',
      payerId: '',
    },
  });

  React.useEffect(() => {
    if (status === 'authenticated') {
      getClaims();
    }
  }, [status, getClaims]);

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

  const tabs = [
    {
      id: 'claim' as const,
      name: 'Claim Forms',
      description: 'Generate professional claim form PDFs',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'appeal' as const,
      name: 'Appeal Letters',
      description: 'Generate formal appeal letter PDFs',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'custom' as const,
      name: 'Custom Forms',
      description: 'Create PDFs with custom data',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
    },
  ];

  const getCustomClaimDataForPDF = () => {
    return {
      ...customClaimData,
      cptCodes: customClaimData.cptCodes.split(',').map(code => code.trim()).filter(Boolean),
      icdCodes: customClaimData.icdCodes.split(',').map(code => code.trim()).filter(Boolean),
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PDF Generation</h1>
          <p className="mt-2 text-gray-600">
            Generate professional PDFs for claims and appeals following industry standards
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {activeTab === 'claim' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Claim</h3>
                
                {claimsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : claims.length > 0 ? (
                  <div className="space-y-3">
                    {claims.map((claim) => (
                      <div
                        key={claim.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedClaim === claim.id
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
                              <span className="font-medium text-gray-900">Claim {claim.id.substring(0, 8)}</span>
                            </div>
                            <p className="text-sm text-gray-600 ml-6">
                              ${(claim.amountCents / 100).toFixed(2)} • {claim.dateOfService ? new Date(claim.dateOfService).toLocaleDateString() : 'No date'}
                            </p>
                            <p className="text-sm text-gray-500 ml-6">
                              Status: {claim.status} • {claim.cptCodes.length} CPT, {claim.icdCodes.length} ICD codes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Found</h3>
                    <p className="text-gray-600 mb-4">
                      You need to create a claim before generating a PDF.
                    </p>
                    <a
                      href="/claims"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      Create Claim
                    </a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'appeal' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Claim for Appeal</h3>
                  
                  {claimsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : claims.length > 0 ? (
                    <div className="space-y-3">
                      {claims.map((claim) => (
                        <div
                          key={claim.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedClaim === claim.id
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
                                <span className="font-medium text-gray-900">Claim {claim.id.substring(0, 8)}</span>
                              </div>
                              <p className="text-sm text-gray-600 ml-6">
                                ${(claim.amountCents / 100).toFixed(2)} • {claim.dateOfService ? new Date(claim.dateOfService).toLocaleDateString() : 'No date'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No claims available for appeal.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Appeal Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Denial Reason *
                      </label>
                      <textarea
                        value={appealData.denialReason}
                        onChange={(e) => setAppealData({ ...appealData, denialReason: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter the reason provided by the insurance company for denying this claim..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Appeal Letter Content *
                      </label>
                      <textarea
                        value={appealData.appealLetter}
                        onChange={(e) => setAppealData({ ...appealData, appealLetter: e.target.value })}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your appeal letter content here. This will be formatted as a professional business letter..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Claim Data</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider Name *
                      </label>
                      <input
                        type="text"
                        value={customClaimData.providerName}
                        onChange={(e) => setCustomClaimData({ ...customClaimData, providerName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Dr. Smith, ABC Medical Center"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider NPI
                      </label>
                      <input
                        type="text"
                        value={customClaimData.providerNpi}
                        onChange={(e) => setCustomClaimData({ ...customClaimData, providerNpi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Service *
                      </label>
                      <input
                        type="date"
                        value={customClaimData.dateOfService}
                        onChange={(e) => setCustomClaimData({ ...customClaimData, dateOfService: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customClaimData.amount}
                        onChange={(e) => setCustomClaimData({ ...customClaimData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="150.00"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CPT Codes (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={customClaimData.cptCodes}
                        onChange={(e) => setCustomClaimData({ ...customClaimData, cptCodes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="99213, 90834"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ICD-10 Codes (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={customClaimData.icdCodes}
                        onChange={(e) => setCustomClaimData({ ...customClaimData, icdCodes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="I10, E11.9"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Description
                    </label>
                    <textarea
                      value={customClaimData.description}
                      onChange={(e) => setCustomClaimData({ ...customClaimData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the medical services provided..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PDF Preview Panel */}
          <div>
            {activeTab === 'claim' && (
              <PDFPreview
                type="claim"
                claimId={selectedClaim}
              />
            )}
            
            {activeTab === 'appeal' && (
              <PDFPreview
                type="appeal"
                claimId={selectedClaim}
                denialReason={appealData.denialReason}
                appealLetter={appealData.appealLetter}
              />
            )}
            
            {activeTab === 'custom' && (
              <PDFPreview
                type="claim"
                customData={getCustomClaimDataForPDF()}
              />
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">PDF Generation Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Industry Standards</h4>
                <p className="text-sm text-gray-600">Follows CMS-1500 and insurance industry formatting standards</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Secure Generation</h4>
                <p className="text-sm text-gray-600">HIPAA-compliant PDF generation with audit logging</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Preview & Download</h4>
                <p className="text-sm text-gray-600">Preview PDFs before downloading with secure access</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}