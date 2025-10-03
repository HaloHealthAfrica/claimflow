'use client';

// Smart Superbill Assistant with AI-powered code suggestions
import React, { useState } from 'react';
import { useAI } from '@/hooks/useAI';
import { CodeSuggestion } from '@/lib/ai';
import CodeSuggestionFallback from './CodeSuggestionFallback';

interface SuperbillAssistantProps {
  onCodeSelect?: (code: CodeSuggestion) => void;
  initialContext?: {
    providerName?: string;
    dateOfService?: string;
    amount?: string;
    description?: string;
  };
}

export default function SuperbillAssistant({ onCodeSelect, initialContext }: SuperbillAssistantProps) {
  const { loading, error, suggestCodes, suggestCodesWithContext, validateCodes, clearError } = useAI();
  
  const [activeTab, setActiveTab] = useState<'basic' | 'contextual' | 'validate'>('basic');
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [validationResult, setValidationResult] = useState<any>(null);

  // Basic context form
  const [basicContext, setBasicContext] = useState({
    providerName: initialContext?.providerName || '',
    dateOfService: initialContext?.dateOfService || '',
    amount: initialContext?.amount || '',
    description: initialContext?.description || '',
  });

  // Contextual form
  const [contextualData, setContextualData] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    specialty: '',
  });

  // Validation form
  const [validationData, setValidationData] = useState({
    cptCodes: '',
    icdCodes: '',
  });

  const handleBasicSuggestion = async () => {
    try {
      clearError();
      const codes = await suggestCodes(basicContext);
      setSuggestions(codes);
    } catch (err) {
      console.error('Failed to get code suggestions:', err);
    }
  };

  const handleContextualSuggestion = async () => {
    try {
      clearError();
      const codes = await suggestCodesWithContext(contextualData);
      setSuggestions(codes);
    } catch (err) {
      console.error('Failed to get contextual suggestions:', err);
    }
  };

  const handleCodeValidation = async () => {
    try {
      clearError();
      const cptCodes = validationData.cptCodes.split(',').map(code => code.trim()).filter(Boolean);
      const icdCodes = validationData.icdCodes.split(',').map(code => code.trim()).filter(Boolean);
      
      const result = await validateCodes(cptCodes, icdCodes);
      setValidationResult(result);
    } catch (err) {
      console.error('Failed to validate codes:', err);
    }
  };



  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Superbill Assistant</h2>
        <p className="text-gray-600">AI-powered medical coding suggestions and validation</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Basic Context
          </button>
          <button
            onClick={() => setActiveTab('contextual')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contextual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Medical Context
          </button>
          <button
            onClick={() => setActiveTab('validate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'validate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Validate Codes
          </button>
        </nav>
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

      {/* Basic Context Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider Name
              </label>
              <input
                type="text"
                value={basicContext.providerName}
                onChange={(e) => setBasicContext({ ...basicContext, providerName: e.target.value })}
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
                value={basicContext.dateOfService}
                onChange={(e) => setBasicContext({ ...basicContext, dateOfService: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={basicContext.amount}
                onChange={(e) => setBasicContext({ ...basicContext, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="150.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Description
            </label>
            <textarea
              value={basicContext.description}
              onChange={(e) => setBasicContext({ ...basicContext, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Office visit for routine checkup..."
            />
          </div>
          <button
            onClick={handleBasicSuggestion}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Suggestions...' : 'Get Code Suggestions'}
          </button>
        </div>
      )}

      {/* Medical Context Tab */}
      {activeTab === 'contextual' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Symptoms
            </label>
            <textarea
              value={contextualData.symptoms}
              onChange={(e) => setContextualData({ ...contextualData, symptoms: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Patient reports chest pain, shortness of breath..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <textarea
              value={contextualData.diagnosis}
              onChange={(e) => setContextualData({ ...contextualData, diagnosis: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Hypertension, Type 2 diabetes..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treatment/Procedure
            </label>
            <textarea
              value={contextualData.treatment}
              onChange={(e) => setContextualData({ ...contextualData, treatment: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Blood pressure monitoring, medication adjustment..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Specialty
            </label>
            <select
              value={contextualData.specialty}
              onChange={(e) => setContextualData({ ...contextualData, specialty: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select specialty...</option>
              <option value="Family Medicine">Family Medicine</option>
              <option value="Internal Medicine">Internal Medicine</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Psychiatry">Psychiatry</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
            </select>
          </div>
          <button
            onClick={handleContextualSuggestion}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing Context...' : 'Get Contextual Suggestions'}
          </button>
        </div>
      )}

      {/* Code Validation Tab */}
      {activeTab === 'validate' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPT Codes (comma-separated)
            </label>
            <input
              type="text"
              value={validationData.cptCodes}
              onChange={(e) => setValidationData({ ...validationData, cptCodes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="99213, 90834, 36415"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ICD-10 Codes (comma-separated)
            </label>
            <input
              type="text"
              value={validationData.icdCodes}
              onChange={(e) => setValidationData({ ...validationData, icdCodes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="I10, E11.9, Z00.00"
            />
          </div>
          <button
            onClick={handleCodeValidation}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating Codes...' : 'Validate Codes'}
          </button>

          {/* Validation Results */}
          {validationResult && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Validation Results</h3>
              
              {validationResult.validCptCodes.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">Valid CPT Codes</h4>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.validCptCodes.map((code: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.validIcdCodes.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">Valid ICD-10 Codes</h4>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.validIcdCodes.map((code: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.invalidCodes.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="font-medium text-red-800 mb-2">Invalid Codes</h4>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.invalidCodes.map((code: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Code Suggestions Display */}
      {suggestions.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Code Suggestions</h3>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => onCodeSelect?.(suggestion)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-lg font-semibold text-blue-600">
                        {suggestion.code}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(suggestion.confidence)}`}>
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {suggestion.type}
                      </span>
                    </div>
                    <p className="text-gray-900 mb-1">{suggestion.description}</p>
                    {suggestion.category && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Category:</span> {suggestion.category}
                      </p>
                    )}
                    {suggestion.notes && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {suggestion.notes}
                      </p>
                    )}
                  </div>
                  {onCodeSelect && (
                    <button className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Select
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Show fallback when no suggestions and user has tried to get suggestions
        (activeTab === 'basic' && (basicContext.providerName || basicContext.description)) ||
        (activeTab === 'contextual' && (contextualData.symptoms || contextualData.diagnosis || contextualData.treatment)) ? (
          <div className="mt-6">
            <CodeSuggestionFallback
              reason="no_suggestions"
              context={{
                providerName: basicContext.providerName,
                description: basicContext.description,
                symptoms: contextualData.symptoms,
                diagnosis: contextualData.diagnosis,
              }}
              onRetry={() => {
                if (activeTab === 'basic') {
                  handleBasicSuggestion();
                } else {
                  handleContextualSuggestion();
                }
              }}
              onManualEntry={() => {
                // This could trigger a callback to parent component
                console.log('Manual entry requested');
              }}
            />
          </div>
        ) : null
      )}
    </div>
  );
}