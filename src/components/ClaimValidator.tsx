'use client';

// AI-powered claim validation component
import React, { useState } from 'react';
import { useAI } from '@/hooks/useAI';
import { ValidationResult, ValidationError, ValidationWarning } from '@/lib/ai';

interface ClaimValidatorProps {
  initialData?: {
    providerName?: string;
    dateOfService?: string;
    amount?: string;
    cptCodes?: string[];
    icdCodes?: string[];
    description?: string;
  };
  onValidationComplete?: (result: ValidationResult & { overallScore: number; isValid: boolean; needsReview: boolean }) => void;
}

export default function ClaimValidator({ initialData, onValidationComplete }: ClaimValidatorProps) {
  const { loading, error, validateClaim, clearError } = useAI();
  
  const [claimData, setClaimData] = useState({
    providerName: initialData?.providerName || '',
    dateOfService: initialData?.dateOfService || '',
    amount: initialData?.amount || '',
    cptCodes: initialData?.cptCodes?.join(', ') || '',
    icdCodes: initialData?.icdCodes?.join(', ') || '',
    description: initialData?.description || '',
  });

  const [validationResult, setValidationResult] = useState<ValidationResult & { overallScore: number; isValid: boolean; needsReview: boolean } | null>(null);

  const handleValidation = async () => {
    try {
      clearError();
      
      const dataToValidate = {
        ...claimData,
        cptCodes: claimData.cptCodes.split(',').map(code => code.trim()).filter(Boolean),
        icdCodes: claimData.icdCodes.split(',').map(code => code.trim()).filter(Boolean),
      };

      const result = await validateClaim(dataToValidate);
      setValidationResult(result);
      onValidationComplete?.(result);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Claim Validator</h2>
        <p className="text-gray-600">Validate your claim data for accuracy and completeness</p>
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

      {/* Claim Data Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name
            </label>
            <input
              type="text"
              value={claimData.providerName}
              onChange={(e) => setClaimData({ ...claimData, providerName: e.target.value })}
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
              value={claimData.dateOfService}
              onChange={(e) => setClaimData({ ...claimData, dateOfService: e.target.value })}
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
            value={claimData.amount}
            onChange={(e) => setClaimData({ ...claimData, amount: e.target.value })}
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
              value={claimData.cptCodes}
              onChange={(e) => setClaimData({ ...claimData, cptCodes: e.target.value })}
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
              value={claimData.icdCodes}
              onChange={(e) => setClaimData({ ...claimData, icdCodes: e.target.value })}
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
            value={claimData.description}
            onChange={(e) => setClaimData({ ...claimData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detailed description of services provided..."
          />
        </div>

        <button
          onClick={handleValidation}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Validating Claim...' : 'Validate Claim'}
        </button>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-6">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Results</h3>
            
            {/* Overall Score */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Validation Score</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBadge(validationResult.overallScore)}`}>
                  {Math.round(validationResult.overallScore * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={`font-medium ${validationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.isValid ? '✓ Valid' : '✗ Issues Found'}
                </span>
                {validationResult.needsReview && (
                  <span className="text-yellow-600 font-medium">⚠ Needs Review</span>
                )}
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-red-800 mb-3">Errors ({validationResult.errors.length})</h4>
                <div className="space-y-3">
                  {validationResult.errors.map((error: ValidationError, index: number) => (
                    <div key={index} className={`p-3 border rounded-md ${getSeverityColor(error.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{error.field}</span>
                            <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs">
                              {error.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm">{error.message}</p>
                          <p className="text-xs opacity-75 mt-1">Code: {error.code}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-yellow-800 mb-3">Warnings ({validationResult.warnings.length})</h4>
                <div className="space-y-3">
                  {validationResult.warnings.map((warning: ValidationWarning, index: number) => (
                    <div key={index} className="p-3 border rounded-md text-yellow-600 bg-yellow-50 border-yellow-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{warning.field}</span>
                          </div>
                          <p className="text-sm">{warning.message}</p>
                          {warning.suggestion && (
                            <p className="text-sm mt-1 font-medium">Suggestion: {warning.suggestion}</p>
                          )}
                          <p className="text-xs opacity-75 mt-1">Code: {warning.code}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {validationResult.suggestions.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-blue-800 mb-3">Recommendations</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <ul className="space-y-2">
                    {validationResult.suggestions.map((recommendation: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Confidence Score */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">AI Confidence Score</span>
                <span className={`font-semibold ${getScoreColor(validationResult.confidenceScore)}`}>
                  {Math.round(validationResult.confidenceScore * 100)}%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    validationResult.confidenceScore >= 0.8 ? 'bg-green-500' :
                    validationResult.confidenceScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${validationResult.confidenceScore * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}