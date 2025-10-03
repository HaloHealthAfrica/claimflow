// Enhanced claim form with receipt processing integration
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, FileText, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';
import { ReceiptData } from '@/lib/ocr';
import ReceiptUpload from './ReceiptUpload';
import { ValidatedInput } from './ValidatedInput';
import { ValidationPanel } from './ValidationPanel';

interface ClaimFormData {
  dateOfService: string;
  providerName: string;
  providerNPI?: string;
  providerAddress?: string;
  amountCents: number;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
  notes?: string;
  insuranceProfileId?: string;
}

interface ReceiptClaimFormProps {
  initialData?: Partial<ClaimFormData>;
  onSubmit?: (data: ClaimFormData) => void;
  onCancel?: () => void;
  className?: string;
}

export default function ReceiptClaimForm({
  initialData,
  onSubmit,
  onCancel,
  className = '',
}: ReceiptClaimFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'form'>('upload');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [formData, setFormData] = useState<ClaimFormData>({
    dateOfService: '',
    providerName: '',
    amountCents: 0,
    cptCodes: [],
    icdCodes: [],
    ...initialData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<any>(null);

  // Auto-populate form when receipt data is available
  useEffect(() => {
    if (receiptData) {
      setFormData(prev => ({
        ...prev,
        dateOfService: receiptData.dateOfService 
          ? new Date(receiptData.dateOfService).toISOString().split('T')[0]
          : prev.dateOfService,
        providerName: receiptData.providerName || prev.providerName,
        amountCents: receiptData.amount 
          ? Math.round(receiptData.amount * 100)
          : prev.amountCents,
        description: receiptData.providerName 
          ? `Medical services from ${receiptData.providerName}`
          : prev.description,
      }));
      setCurrentStep('review');
    }
  }, [receiptData]);

  const handleReceiptProcessed = (data: ReceiptData & { receiptKey: string }) => {
    setReceiptData(data);
  };

  const handleReceiptError = (error: string) => {
    setErrors(prev => ({ ...prev, receipt: error }));
  };

  const handleInputChange = (field: keyof ClaimFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dateOfService) {
      newErrors.dateOfService = 'Date of service is required';
    }

    if (!formData.providerName.trim()) {
      newErrors.providerName = 'Provider name is required';
    }

    if (formData.amountCents <= 0) {
      newErrors.amountCents = 'Amount must be greater than 0';
    }

    if (formData.cptCodes.length === 0) {
      newErrors.cptCodes = 'At least one CPT code is required';
    }

    if (formData.icdCodes.length === 0) {
      newErrors.icdCodes = 'At least one ICD code is required';
    }

    // Validate CPT codes format
    const invalidCptCodes = formData.cptCodes.filter(code => 
      !code.match(/^\d{5}$/)
    );
    if (invalidCptCodes.length > 0) {
      newErrors.cptCodes = `Invalid CPT codes: ${invalidCptCodes.join(', ')}`;
    }

    // Validate ICD codes format
    const invalidIcdCodes = formData.icdCodes.filter(code => 
      !code.match(/^[A-Z]\d{2}(\.\d{1,2})?$/)
    );
    if (invalidIcdCodes.length > 0) {
      newErrors.icdCodes = `Invalid ICD codes: ${invalidIcdCodes.join(', ')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          receiptData: receiptData ? {
            documentId: (receiptData as any).documentId,
            confidence: receiptData.confidence,
            extractedFields: receiptData.extractedFields,
          } : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (onSubmit) {
          onSubmit(formData);
        } else {
          router.push(`/claims/${result.data.claim.id}`);
        }
      } else {
        setErrors({ submit: result.error?.message || 'Failed to create claim' });
      }
    } catch (error) {
      console.error('Claim submission error:', error);
      setErrors({ submit: 'An error occurred while creating the claim' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipReceipt = () => {
    setCurrentStep('form');
  };

  const handleEditForm = () => {
    setCurrentStep('form');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Step 1: Upload */}
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'upload' ? 'border-blue-600 bg-blue-50' : 
            receiptData ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-300'
          }`}>
            {receiptData ? <CheckCircle className="w-4 h-4" /> : '1'}
          </div>
          <span className="ml-2 text-sm font-medium">Upload Receipt</span>
        </div>

        <div className="w-8 h-px bg-gray-300"></div>

        {/* Step 2: Review */}
        <div className={`flex items-center ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'review' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Review Data</span>
        </div>

        <div className="w-8 h-px bg-gray-300"></div>

        {/* Step 3: Form */}
        <div className={`flex items-center ${currentStep === 'form' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'form' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Complete Claim</span>
        </div>
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Your Medical Receipt
        </h2>
        <p className="text-gray-600">
          Upload a receipt to automatically extract claim information, or skip to enter manually
        </p>
      </div>

      <ReceiptUpload
        onReceiptProcessed={handleReceiptProcessed}
        onError={handleReceiptError}
      />

      <div className="text-center">
        <button
          onClick={handleSkipReceipt}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Skip and enter claim information manually
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review Extracted Information
        </h2>
        <p className="text-gray-600">
          Verify the information extracted from your receipt before proceeding
        </p>
      </div>

      {receiptData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Extracted Data</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                (receiptData.confidence || 0) >= 0.9 
                  ? 'bg-green-100 text-green-800'
                  : (receiptData.confidence || 0) >= 0.7
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {((receiptData.confidence || 0) * 100).toFixed(1)}% confidence
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider Name
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                {receiptData.providerName || 'Not detected'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                {receiptData.amount ? `$${receiptData.amount.toFixed(2)}` : 'Not detected'}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Service
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                {receiptData.dateOfService 
                  ? new Date(receiptData.dateOfService).toLocaleDateString()
                  : 'Not detected'
                }
              </div>
            </div>
          </div>

          {/* Validation Issues */}
          {(receiptData as any).validation?.issues && (receiptData as any).validation.issues.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Detection Issues
                  </h4>
                  <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                    {(receiptData as any).validation.issues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('upload')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Upload Different Receipt
        </button>
        
        <div className="space-x-3">
          <button
            onClick={handleEditForm}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4 inline mr-2" />
            Edit & Complete
          </button>
        </div>
      </div>
    </div>
  );

  const renderFormStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complete Claim Information
        </h2>
        <p className="text-gray-600">
          {receiptData 
            ? 'Review and complete the claim details'
            : 'Enter your claim information manually'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedInput
              label="Date of Service"
              type="date"
              value={formData.dateOfService}
              onChange={(value) => handleInputChange('dateOfService', value)}
              error={errors.dateOfService}
              required
            />

            <ValidatedInput
              label="Provider Name"
              type="text"
              value={formData.providerName}
              onChange={(value) => handleInputChange('providerName', value)}
              error={errors.providerName}
              placeholder="Enter provider name"
              required
            />

            <ValidatedInput
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amountCents / 100}
              onChange={(value) => handleInputChange('amountCents', Math.round(parseFloat(value) * 100))}
              error={errors.amountCents}
              placeholder="Enter amount"
              required
            />

            <ValidatedInput
              label="Provider NPI (Optional)"
              type="text"
              value={formData.providerNPI || ''}
              onChange={(value) => handleInputChange('providerNPI', value)}
              placeholder="Enter NPI number"
            />
          </div>

          <div className="mt-4">
            <ValidatedInput
              label="Provider Address (Optional)"
              type="text"
              value={formData.providerAddress || ''}
              onChange={(value) => handleInputChange('providerAddress', value)}
              placeholder="Enter provider address"
            />
          </div>
        </div>

        {/* Medical Codes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Codes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedInput
              label="CPT Codes"
              type="text"
              value={formData.cptCodes.join(', ')}
              onChange={(value) => handleInputChange('cptCodes', 
                value.split(',').map(code => code.trim()).filter(code => code)
              )}
              error={errors.cptCodes}
              placeholder="Enter CPT codes (comma separated)"
              required
            />

            <ValidatedInput
              label="ICD Codes"
              type="text"
              value={formData.icdCodes.join(', ')}
              onChange={(value) => handleInputChange('icdCodes',
                value.split(',').map(code => code.trim()).filter(code => code)
              )}
              error={errors.icdCodes}
              placeholder="Enter ICD codes (comma separated)"
              required
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
          
          <div className="space-y-4">
            <ValidatedInput
              label="Description (Optional)"
              type="text"
              value={formData.description || ''}
              onChange={(value) => handleInputChange('description', value)}
              placeholder="Brief description of services"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or comments"
              />
            </div>
          </div>
        </div>

        {/* Validation Panel */}
        {validationResults && (
          <ValidationPanel
            results={validationResults}
            onValidationComplete={(results) => setValidationResults(results)}
          />
        )}

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onCancel || (() => router.back())}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="space-x-3">
            {receiptData && (
              <button
                type="button"
                onClick={() => setCurrentStep('review')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back to Review
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Claim...
                </div>
              ) : (
                'Create Claim'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {renderStepIndicator()}
      
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'form' && renderFormStep()}
    </div>
  );
}