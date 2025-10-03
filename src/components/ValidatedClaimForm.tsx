'use client';

// Enhanced claim form with integrated real-time validation
import { useState, useEffect } from 'react';
import { ReceiptData } from '@/lib/ocr';
import { validateClaimData, ClaimValidationData, calculateApprovalLikelihood } from '@/lib/validation';
import ValidatedInput from './ValidatedInput';
import ValidationPanel from './ValidationPanel';
import Card from './Card';

interface ValidatedClaimFormProps {
  initialData?: Partial<ClaimValidationData>;
  receiptData?: ReceiptData;
  onSave?: (data: ClaimValidationData) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  className?: string;
}

export default function ValidatedClaimForm({
  initialData,
  receiptData,
  onSave,
  onCancel,
  saving = false,
  className = '',
}: ValidatedClaimFormProps) {
  const [formData, setFormData] = useState<ClaimValidationData>({
    providerName: '',
    providerNpi: '',
    dateOfService: '',
    amount: '',
    cptCodes: [],
    icdCodes: [],
    description: '',
  });
  
  const [newCptCode, setNewCptCode] = useState('');
  const [newIcdCode, setNewIcdCode] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const [approvalLikelihood, setApprovalLikelihood] = useState(0);

  // Update form data when initialData or receiptData changes
  useEffect(() => {
    const updatedData: ClaimValidationData = {
      providerName: initialData?.providerName || receiptData?.providerName || '',
      providerNpi: initialData?.providerNpi || '',
      dateOfService: initialData?.dateOfService || (receiptData?.dateOfService ? receiptData.dateOfService.toISOString().split('T')[0] : '') || '',
      amount: initialData?.amount || receiptData?.amount?.toString() || '',
      cptCodes: initialData?.cptCodes || [],
      icdCodes: initialData?.icdCodes || [],
      description: initialData?.description || '',
    };
    setFormData(updatedData);
  }, [initialData, receiptData]);

  // Real-time validation
  useEffect(() => {
    const validation = validateClaimData(formData);
    const likelihood = calculateApprovalLikelihood(validation.errors, validation.warnings, 0.8);
    
    setCanSubmit(validation.isValid);
    setApprovalLikelihood(likelihood);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation check
    const validation = validateClaimData(formData);
    if (!validation.isValid) {
      alert('Please fix all validation errors before submitting.');
      return;
    }

    try {
      await onSave?.(formData);
    } catch (error) {
      console.error('Failed to save claim:', error);
    }
  };

  const handleInputChange = (field: keyof ClaimValidationData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCptCode = () => {
    if (newCptCode.trim() && !formData.cptCodes.includes(newCptCode.trim())) {
      handleInputChange('cptCodes', [...formData.cptCodes, newCptCode.trim()]);
      setNewCptCode('');
    }
  };

  const removeCptCode = (code: string) => {
    handleInputChange('cptCodes', formData.cptCodes.filter(c => c !== code));
  };

  const addIcdCode = () => {
    if (newIcdCode.trim() && !formData.icdCodes.includes(newIcdCode.trim())) {
      handleInputChange('icdCodes', [...formData.icdCodes, newIcdCode.trim()]);
      setNewIcdCode('');
    }
  };

  const removeIcdCode = (code: string) => {
    handleInputChange('icdCodes', formData.icdCodes.filter(c => c !== code));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleValidationChange = (isValid: boolean, result?: any) => {
    // Store validation result if needed for future use
    console.log('Validation result:', result);
    setCanSubmit(isValid);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Validation Status Banner */}
      <div className={`p-4 rounded-lg border ${
        canSubmit 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {canSubmit ? (
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${canSubmit ? 'text-green-800' : 'text-yellow-800'}`}>
              {canSubmit ? 'Claim Ready for Submission' : 'Claim Needs Attention'}
            </h3>
            <p className={`text-sm ${canSubmit ? 'text-green-700' : 'text-yellow-700'}`}>
              {canSubmit 
                ? `Approval likelihood: ${Math.round(approvalLikelihood * 100)}%`
                : 'Please fix validation issues before submitting'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claim Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">Claim Information</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enter your claim details. Fields are validated in real-time.
                </p>
              </div>

              {/* Provider Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Provider Name"
                  name="providerName"
                  value={formData.providerName}
                  onChange={(value) => handleInputChange('providerName', value)}
                  placeholder="Dr. Smith, ABC Medical Center"
                  required
                  claimData={formData}
                />

                <ValidatedInput
                  label="Provider NPI"
                  name="providerNpi"
                  value={formData.providerNpi || ''}
                  onChange={(value) => handleInputChange('providerNpi', value)}
                  placeholder="1234567890"
                  claimData={formData}
                />
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Date of Service"
                  name="dateOfService"
                  type="date"
                  value={formData.dateOfService}
                  onChange={(value) => handleInputChange('dateOfService', value)}
                  required
                  claimData={formData}
                />

                <ValidatedInput
                  label="Amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(value) => handleInputChange('amount', value)}
                  placeholder="150.00"
                  required
                  claimData={formData}
                />
              </div>

              {/* Description */}
              <ValidatedInput
                label="Service Description"
                name="description"
                type="textarea"
                value={formData.description || ''}
                onChange={(value) => handleInputChange('description', value)}
                placeholder="Describe the medical services provided..."
                rows={3}
                claimData={formData}
              />

              {/* CPT Codes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPT Codes (Procedures) *
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCptCode}
                      onChange={(e) => setNewCptCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCptCode())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter CPT code (e.g., 99213)"
                    />
                    <button
                      type="button"
                      onClick={addCptCode}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.cptCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.cptCodes.map((code, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {code}
                          <button
                            type="button"
                            onClick={() => removeCptCode(code)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ICD Codes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ICD-10 Codes (Diagnoses) *
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIcdCode}
                      onChange={(e) => setNewIcdCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIcdCode())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter ICD-10 code (e.g., I10)"
                    />
                    <button
                      type="button"
                      onClick={addIcdCode}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.icdCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.icdCodes.map((code, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                        >
                          {code}
                          <button
                            type="button"
                            onClick={() => removeIcdCode(code)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || !canSubmit}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : canSubmit ? 'Submit Claim' : 'Fix Errors to Submit'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Validation Panel */}
        <div className="lg:col-span-1">
          <ValidationPanel
            claimData={formData}
            onValidationChange={handleValidationChange}
            autoValidate={true}
          />
        </div>
      </div>
    </div>
  );
}