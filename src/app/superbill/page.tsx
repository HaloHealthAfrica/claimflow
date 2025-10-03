'use client';

// Smart Superbill page with integrated AI workflow
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import EnhancedClaimForm from '@/components/EnhancedClaimForm';
import SuperbillAssistant from '@/components/SuperbillAssistant';
import { CodeSuggestion } from '@/lib/ai';
import { useClaims } from '@/hooks/useClaims';

export default function SuperbillPage() {
  const { status } = useSession();
  const { createClaim, loading: claimLoading } = useClaims();
  const [activeView, setActiveView] = useState<'assistant' | 'form'>('assistant');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [claimData, setClaimData] = useState<any>(null);
  const [selectedCodes, setSelectedCodes] = useState<CodeSuggestion[]>([]);

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

  const handleCodeSelect = (code: CodeSuggestion) => {
    setSelectedCodes(prev => {
      const exists = prev.find(c => c.code === code.code);
      if (exists) {
        return prev.filter(c => c.code !== code.code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleProceedToClaim = () => {
    const cptCodes = selectedCodes.filter(c => c.type === 'CPT').map(c => c.code);
    const icdCodes = selectedCodes.filter(c => c.type === 'ICD').map(c => c.code);
    
    setClaimData({
      cptCodes,
      icdCodes,
    });
    setActiveView('form');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveClaim = async (formData: any) => {
    try {
      await createClaim({
        ...formData,
        amountCents: Math.round(parseFloat(formData.amount) * 100),
      });
      
      // Redirect to claims page or show success message
      window.location.href = '/claims';
    } catch (error) {
      console.error('Failed to save claim:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Superbill Assistant</h1>
              <p className="mt-2 text-gray-600">
                Get AI-powered medical code suggestions and create claims with confidence
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300 bg-white">
              <button
                onClick={() => setActiveView('assistant')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  activeView === 'assistant'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                AI Assistant
              </button>
              <button
                onClick={() => setActiveView('form')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  activeView === 'form'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Claim Form
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${activeView === 'assistant' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                activeView === 'assistant' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
              }`}>
                {activeView === 'assistant' ? '1' : '✓'}
              </div>
              <span className="ml-2 text-sm font-medium">Get Code Suggestions</span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-4 ${selectedCodes.length > 0 ? 'bg-green-600' : 'bg-gray-300'}`} />
            
            <div className={`flex items-center ${
              activeView === 'form' ? 'text-blue-600' : selectedCodes.length > 0 ? 'text-gray-900' : 'text-gray-400'
            }`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                activeView === 'form' 
                  ? 'bg-blue-600 text-white' 
                  : selectedCodes.length > 0 
                    ? 'bg-gray-300 text-gray-700' 
                    : 'bg-gray-200 text-gray-400'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Create Claim</span>
            </div>
          </div>
        </div>

        {/* Selected Codes Summary */}
        {selectedCodes.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Selected Codes ({selectedCodes.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedCodes.map((code, index) => (
                <span 
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    code.type === 'CPT' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {code.code} - {code.description.substring(0, 50)}
                  {code.description.length > 50 ? '...' : ''}
                </span>
              ))}
            </div>
            {activeView === 'assistant' && (
              <div className="mt-3">
                <button
                  onClick={handleProceedToClaim}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Proceed to Claim Form
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeView === 'assistant' ? (
            <div className="p-6">
              <SuperbillAssistant onCodeSelect={handleCodeSelect} />
              
              {/* Workflow Tips */}
              <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">1. Provide Context</h4>
                    <p className="text-sm text-gray-600">
                      Enter basic claim information or detailed medical context for better suggestions
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">2. Get AI Suggestions</h4>
                    <p className="text-sm text-gray-600">
                      Our AI analyzes your information and suggests appropriate CPT and ICD codes
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">3. Create Claim</h4>
                    <p className="text-sm text-gray-600">
                      Select the codes you want and proceed to create your insurance claim
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <EnhancedClaimForm
                initialData={claimData}
                onSave={handleSaveClaim}
                onCancel={() => setActiveView('assistant')}
                saving={claimLoading}
              />
            </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Use Smart Superbill?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Faster Processing</h4>
                <p className="text-sm text-gray-600">Accurate codes reduce claim rejections</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Higher Accuracy</h4>
                <p className="text-sm text-gray-600">AI-powered code suggestions</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Save Time</h4>
                <p className="text-sm text-gray-600">No manual code lookup needed</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Learn & Improve</h4>
                <p className="text-sm text-gray-600">Understand medical coding better</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}