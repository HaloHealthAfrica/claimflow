// AI-powered claim validation component
'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Lightbulb, Loader2, TrendingUp } from 'lucide-react';

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'high' | 'medium' | 'low';
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion: string;
}

interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidenceScore: number;
  suggestions: string[];
}

interface ClaimData {
  providerName?: string;
  providerNPI?: string;
  dateOfService: string;
  amountCents: number;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
  notes?: string;
  insuranceType?: 'commercial' | 'medicare' | 'medicaid' | 'other';
  patientAge?: number;
  specialty?: string;
}

interface AIClaimValidatorProps {
  claimData: ClaimData;
  onValidationComplete?: (result: ValidationResult & { approvalLikelihood: number }) => void;
  autoValidate?: boolean;
  className?: string;
}

export default function AIClaimValidator({
  claimData,
  onValidationComplete,
  autoValidate = true,
  className = '',
}: AIClaimValidatorProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [approvalLikelihood, setApprovalLikelihood] = useState<number>(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiValidationUsed, setAiValidationUsed] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  // Auto-validate when claim data changes
  useEffect(() => {
    if (autoValidate && hasRequiredData(claimData)) {
      validateClaim();
    }
  }, [claimData, autoValidate]);

  const hasRequiredData = (data: ClaimData): boolean => {
    return !!(data.dateOfService && data.amountCents > 0 && data.cptCodes.length > 0 && data.icdCodes.length > 0);
  };

  const validateClaim = async () => {
    if (!hasRequiredData(claimData)) {
      setError('Missing required claim data for validation');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/validate-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData),
      });

      const data = await response.json();

      if (data.success) {
        setValidationResult(data.data.validation);
        setApprovalLikelihood(data.data.approvalLikelihood);
        setAiValidationUsed(data.data.metadata.aiValidationUsed);
        setLastValidated(new Date());

        if (onValidationComplete) {
          onValidationComplete({
            ...data.data.validation,
            approvalLikelihood: data.data.approvalLikelihood,
          });
        }
      } else {
        setError(data.error?.message || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError('Failed to validate claim');
    } finally {
      setIsValidating(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getApprovalLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 0.8) return 'text-green-600 bg-green-100';
    if (likelihood >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getApprovalLikelihoodText = (likelihood: number) => {
    if (likelihood >= 0.8) return 'High';
    if (likelihood >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!hasRequiredData(claimData)) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">
          Complete the required claim fields to validate your claim
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Required: Date of service, amount, CPT codes, and ICD codes
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Claim Validation
            </h3>
            {aiValidationUsed && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                AI Enhanced
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {lastValidated && (
              <span className="text-xs text-gray-500">
                Last validated: {lastValidated.toLocaleTimeString()}
              </span>
            )}
            
            <button
              onClick={validateClaim}
              disabled={isValidating}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isValidating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Validating claim...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        ) : validationResult ? (
          <div className="space-y-6">
            {/* Approval Likelihood */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Approval Likelihood
                </h4>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  getApprovalLikelihoodColor(approvalLikelihood)
                }`}>
                  {getApprovalLikelihoodText(approvalLikelihood)} ({(approvalLikelihood * 100).toFixed(0)}%)
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    approvalLikelihood >= 0.8 ? 'bg-green-500' :
                    approvalLikelihood >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${approvalLikelihood * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-900 mb-3 flex items-center">
                  <XCircle className="h-4 w-4 mr-2" />
                  Validation Errors ({validationResult.errors.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className={`border rounded-lg p-3 ${getSeverityColor(error.severity)}`}>
                      <div className="flex items-start space-x-2">
                        {getSeverityIcon(error.severity)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {error.field}: {error.message}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Error Code: {error.code}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          error.severity === 'high' ? 'bg-red-100 text-red-800' :
                          error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {error.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {validationResult.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Warnings ({validationResult.warnings.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {warning.field}: {warning.message}
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            💡 {warning.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success State */}
            {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Validation Passed
                    </p>
                    <p className="text-xs text-green-700">
                      Your claim appears to be well-formatted and ready for submission
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {validationResult.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Recommendations
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <ul className="text-sm text-blue-800 space-y-1">
                    {validationResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Confidence Score */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Validation Confidence:</span>
                <span className={`font-medium px-2 py-1 rounded ${
                  validationResult.confidenceScore >= 0.8 ? 'bg-green-100 text-green-800' :
                  validationResult.confidenceScore >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {(validationResult.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-8 w-8 mx-auto mb-2" />
            <p>Click "Validate" to check your claim</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {validationResult && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600">
            🤖 {aiValidationUsed ? 'AI-enhanced validation' : 'Basic validation'} • 
            Always review claims before submission
          </p>
        </div>
      )}
    </div>
  );
}