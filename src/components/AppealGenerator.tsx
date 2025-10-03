'use client';

// AI-powered appeal letter generator
import React, { useState } from 'react';
import { useAI } from '@/hooks/useAI';

interface AppealGeneratorProps {
  claimId?: string;
  initialData?: {
    providerName?: string;
    dateOfService?: string;
    amount?: string;
    cptCodes?: string[];
    icdCodes?: string[];
    description?: string;
  };
}

export default function AppealGenerator({ claimId, initialData }: AppealGeneratorProps) {
  const { loading, error, generateAppeal, clearError } = useAI();
  
  const [denialReason, setDenialReason] = useState('');
  const [customContext, setCustomContext] = useState({
    providerName: initialData?.providerName || '',
    dateOfService: initialData?.dateOfService || '',
    amount: initialData?.amount || '',
    cptCodes: initialData?.cptCodes?.join(', ') || '',
    icdCodes: initialData?.icdCodes?.join(', ') || '',
    description: initialData?.description || '',
  });

  const [appealLetter, setAppealLetter] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const commonDenialReasons = [
    'Medical necessity not established',
    'Procedure not covered under plan',
    'Prior authorization required',
    'Duplicate claim submission',
    'Incorrect coding or billing',
    'Services not rendered by qualified provider',
    'Experimental or investigational treatment',
    'Lack of supporting documentation',
    'Service exceeds plan limitations',
    'Pre-existing condition exclusion',
  ];

  const handleGenerateAppeal = async () => {
    try {
      clearError();
      
      if (!denialReason.trim()) {
        return;
      }

      const contextData = claimId ? undefined : {
        ...customContext,
        cptCodes: customContext.cptCodes.split(',').map(code => code.trim()).filter(Boolean),
        icdCodes: customContext.icdCodes.split(',').map(code => code.trim()).filter(Boolean),
      };

      const result = await generateAppeal(claimId, denialReason, contextData);
      setAppealLetter(result.appealLetter);
      setWordCount(result.wordCount);
      setShowPreview(true);
    } catch (err) {
      console.error('Failed to generate appeal:', err);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(appealLetter);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([appealLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appeal-letter-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Appeal Generator</h2>
        <p className="text-gray-600">Generate professional appeal letters for denied claims</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
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

      {!showPreview ? (
        <div className="space-y-6">
          {/* Denial Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Denial Reason *
            </label>
            <div className="space-y-2">
              <select
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a common denial reason...</option>
                {commonDenialReasons.map((reason, index) => (
                  <option key={index} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <div className="text-sm text-gray-500 mb-2">Or enter a custom reason:</div>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the specific reason for claim denial..."
              />
            </div>
          </div>

          {/* Custom Context (only if no claimId) */}
          {!claimId && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Claim Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={customContext.providerName}
                    onChange={(e) => setCustomContext({ ...customContext, providerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dr. Smith, ABC Medical Center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Service
                  </label>
                  <input
                    type="date"
                    value={customContext.dateOfService}
                    onChange={(e) => setCustomContext({ ...customContext, dateOfService: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customContext.amount}
                  onChange={(e) => setCustomContext({ ...customContext, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="150.00"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPT Codes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={customContext.cptCodes}
                    onChange={(e) => setCustomContext({ ...customContext, cptCodes: e.target.value })}
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
                    value={customContext.icdCodes}
                    onChange={(e) => setCustomContext({ ...customContext, icdCodes: e.target.value })}
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
                  value={customContext.description}
                  onChange={(e) => setCustomContext({ ...customContext, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description of services provided..."
                />
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateAppeal}
            disabled={loading || !denialReason.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Appeal Letter...' : 'Generate Appeal Letter'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Appeal Letter Preview */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Generated Appeal Letter</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{wordCount} words</span>
              <button
                onClick={() => setShowPreview(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans leading-relaxed">
              {appealLetter}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyToClipboard}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Review the letter for accuracy and completeness</li>
              <li>• Add any additional supporting documentation</li>
              <li>• Submit the appeal within your insurance plan&apos;s deadline</li>
              <li>• Keep copies of all correspondence for your records</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}