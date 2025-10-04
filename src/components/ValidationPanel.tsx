'use client';

// Comprehensive validation panel for claims
import React, { useState, useEffect, useCallback } from 'react';
import { useAI } from '@/hooks/useAI';
import { ValidationResult, ValidationError, ValidationWarning } from '@/lib/ai';

interface ClaimData {
  providerName: string;
  providerNpi?: string;
  dateOfService: string;
  amount: string;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
}

interface ValidationPanelProps {
  claimData: ClaimData;
  onValidationChange?: (isValid: boolean, result?: ValidationResult & { overallScore: number; isValid: boolean; needsReview: boolean }) => void;
  autoValidate?: boolean;
  className?: string;
}

export function ValidationPanel({ 
  claimData, 
  onValidationChange, 
  autoValidate = true,
  className = '' 
}: ValidationPanelProps) {
  const { loading, error, validateClaim, clearError } = useAI();
  
  const [validationResult, setValidationResult] = useState<ValidationResult & { approvalLikelihood: number; overallScore: number; isValid: boolean; needsReview: boolean } | null>(null);
  const [lastValidatedData, setLastValidatedData] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'error'>('idle');

  // Check if we have minimum data for validation
  const hasMinimumData = (data: ClaimData): boolean => {
    return Boolean(
      data.providerName?.trim() &&
      data.dateOfService &&
      data.amount &&
      (data.cptCodes.length > 0 || data.icdCodes.length > 0)
    );
  };

  const handleValidation = useCallback(async () => {
    if (!hasMinimumData(claimData)) {
      setValidationStatus('idle');
      setValidationResult(null);
      onValidationChange?.(false);
      return;
    }

    try {
      setValidationStatus('validating');
      clearError();

      const result = await validateClaim({
        providerName: claimData.providerName,
        dateOfService: claimData.dateOfService,
        amountCents: Math.round(parseFloat(claimData.amount) * 100),
        cptCodes: claimData.cptCodes,
        icdCodes: claimData.icdCodes,
        description: claimData.description,
      });

      const extendedResult = {
        ...result,
        overallScore: result.approvalLikelihood,
        isValid: result.errors.length === 0,
        needsReview: result.warnings.length > 0 || result.approvalLikelihood < 0.8,
      };
      setValidationResult(extendedResult);
      setLastValidatedData(JSON.stringify(claimData));
      setValidationStatus(extendedResult.isValid ? 'valid' : 'invalid');
      onValidationChange?.(extendedResult.isValid, extendedResult);
    } catch (err) {
      console.error('Validation failed:', err);
      setValidationStatus('error');
      onValidationChange?.(false);
    }
  }, [claimData, validateClaim, clearError, onValidationChange]);

  // Auto-validate when claim data changes
  useEffect(() => {
    if (autoValidate && claimData) {
      const dataString = JSON.stringify(claimData);
      if (dataString !== lastValidatedData && hasMinimumData(claimData)) {
        const timeoutId = setTimeout(() => {
          handleValidation();
        }, 1000); // Debounce validation calls

        return () => clearTimeout(timeoutId);
      }
    }
  }, [claimData, autoValidate, lastValidatedData, handleValidation]);

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'valid':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'invalid':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusMessage = () => {
    switch (validationStatus) {
      case 'validating':
        return 'Validating claim data...';
      case 'valid':
        return `Claim validation passed (${Math.round((validationResult?.overallScore || 0) * 100)}% confidence)`;
      case 'invalid':
        return `Claim has ${validationResult?.errors.length || 0} errors and ${validationResult?.warnings.length || 0} warnings`;
      case 'error':
        return 'Validation failed - please try again';
      default:
        return hasMinimumData(claimData) ? 'Ready for validation' : 'Enter claim data to validate';
    }
  };

  const getStatusColor = () => {
    switch (validationStatus) {
      case 'validating': return 'text-blue-600';
      case 'valid': return 'text-green-600';
      case 'invalid': return 'text-red-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Claim Validation</h3>
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusMessage()}
              </p>
            </div>
          </div>
          
          {!autoValidate && (
            <button
              onClick={handleValidation}
              disabled={loading || !hasMinimumData(claimData)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validating...' : 'Validate Claim'}
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

      {/* Validation Results */}
      {validationResult && (
        <div className="px-6 py-4 space-y-6">
          {/* Overall Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Overall Validation Score</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                validationResult.overallScore >= 0.8 ? 'bg-green-100 text-green-800' :
                validationResult.overallScore >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {Math.round(validationResult.overallScore * 100)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full ${
                  validationResult.overallScore >= 0.8 ? 'bg-green-500' :
                  validationResult.overallScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${validationResult.overallScore * 100}%` }}
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <span className={`font-medium ${validationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validationResult.isValid ? '✓ Ready for Submission' : '✗ Needs Attention'}
              </span>
              {validationResult.needsReview && (
                <span className="text-yellow-600 font-medium">⚠ Requires Review</span>
              )}
            </div>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-red-800 mb-3 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Errors ({validationResult.errors.length})
              </h4>
              <div className="space-y-3">
                {validationResult.errors.map((error: ValidationError, index: number) => (
                  <div key={index} className={`p-3 border rounded-md ${getSeverityColor(error.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm capitalize">{error.field.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs uppercase font-medium">
                            {error.severity}
                          </span>
                        </div>
                        <p className="text-sm">{error.message}</p>
                        <p className="text-xs opacity-75 mt-1">Error Code: {error.code}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Warnings ({validationResult.warnings.length})
              </h4>
              <div className="space-y-3">
                {validationResult.warnings.map((warning: ValidationWarning, index: number) => (
                  <div key={index} className="p-3 border rounded-md text-yellow-600 bg-yellow-50 border-yellow-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm capitalize">{warning.field.replace(/([A-Z])/g, ' $1')}</span>
                        </div>
                        <p className="text-sm">{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-sm mt-1 font-medium">💡 Suggestion: {warning.suggestion}</p>
                        )}
                        <p className="text-xs opacity-75 mt-1">Warning Code: {warning.code}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {validationResult.suggestions.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Recommendations
              </h4>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <ul className="space-y-2">
                  {validationResult.suggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* AI Confidence */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">AI Analysis Confidence</span>
              <span className={`font-semibold ${
                validationResult.confidenceScore >= 0.8 ? 'text-green-600' :
                validationResult.confidenceScore >= 0.6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
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
      )}

      {/* No Data Message */}
      {!hasMinimumData(claimData) && validationStatus === 'idle' && (
        <div className="px-6 py-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Validate</h3>
          <p className="text-gray-600 mb-4">
            Enter claim information to get real-time validation feedback
          </p>
          <div className="text-sm text-gray-500">
            <p>Required fields: Provider name, date of service, amount, and at least one medical code</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValidationPanel;