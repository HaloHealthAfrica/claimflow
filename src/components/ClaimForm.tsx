'use client';

// Comprehensive claim form component
import { useState, useEffect } from 'react';
import { ReceiptData } from '@/lib/ocr';
import Card from './Card';

interface ClaimFormData {
  providerName: string;
  providerNpi?: string;
  dateOfService: string;
  amount: string;
  cptCodes: string[];
  icdCodes: string[];
  description?: string;
}

interface ClaimFormProps {
  initialData?: Partial<ClaimFormData>;
  receiptData?: ReceiptData;
  onSave?: (data: ClaimFormData) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  className?: string;
}

export default function ClaimForm({
  initialData,
  receiptData,
  onSave,
  onCancel,
  saving = false,
  className = '',
}: ClaimFormProps) {
  const [formData, setFormData] = useState<ClaimFormData>({
    providerName: '',
    providerNpi: '',
    dateOfService: '',
    amount: '',
    cptCodes: [],
    icdCodes: [],
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCptCode, setNewCptCode] = useState('');
  const [newIcdCode, setNewIcdCode] = useState('');

  // Update form data when initialData or receiptData changes
  useEffect(() => {
    const updatedData: ClaimFormData = {
      providerName: '',
      providerNpi: '',
      dateOfService: '',
      amount: '',
      cptCodes: [],
      icdCodes: [],
      description: '',
    };

    // Apply initial data
    if (initialData) {
      Object.assign(updatedData, initialData);
    }

    // Apply receipt data (overrides initial data)
    if (receiptData) {
      if (receiptData.providerName) {
        updatedData.providerName = receiptData.providerName;
      }
      if (receiptData.amount) {
        updatedData.amount = receiptData.amount.toString();
      }
      if (receiptData.dateOfService) {
        updatedData.dateOfService = new Date(receiptData.dateOfService).toISOString().split('T')[0];
      }
    }

    setFormData(updatedData);
  }, [initialData, receiptData]);

  const handleInputChange = (field: keyof ClaimFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.providerName.trim()) {
      newErrors.providerName = 'Provider name is required';
    }

    if (!formData.dateOfService) {
      newErrors.dateOfService = 'Date of service is required';
    } else {
      const serviceDate = new Date(formData.dateOfService);
      const today = new Date();
      if (serviceDate > today) {
        newErrors.dateOfService = 'Date of service cannot be in the future';
      }
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a valid positive number';
      } else if (amount > 100000) {
        newErrors.amount = 'Amount cannot exceed $100,000';
      }
    }

    // Optional validation for NPI
    if (formData.providerNpi && !/^\d{10}$/.test(formData.providerNpi)) {
      newErrors.providerNpi = 'NPI must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSave?.(formData);
    } catch {
      // Error handling is done in the parent component
    }
  };

  const addCptCode = () => {
    if (newCptCode.trim() && /^\d{5}$/.test(newCptCode.trim())) {
      const code = newCptCode.trim();
      if (!formData.cptCodes.includes(code)) {
        handleInputChange('cptCodes', [...formData.cptCodes, code]);
      }
      setNewCptCode('');
    }
  };

  const removeCptCode = (code: string) => {
    handleInputChange('cptCodes', formData.cptCodes.filter(c => c !== code));
  };

  const addIcdCode = () => {
    if (newIcdCode.trim() && /^[A-Z]\d{2}(\.\d{1,2})?$/.test(newIcdCode.trim().toUpperCase())) {
      const code = newIcdCode.trim().toUpperCase();
      if (!formData.icdCodes.includes(code)) {
        handleInputChange('icdCodes', [...formData.icdCodes, code]);
      }
      setNewIcdCode('');
    }
  };

  const removeIcdCode = (code: string) => {
    handleInputChange('icdCodes', formData.icdCodes.filter(c => c !== code));
  };

  return (
    <div className={className}>
      <Card
        title="Claim Information"
        description="Enter the details for your insurance claim"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="providerName" className="block text-sm font-medium text-gray-700 mb-1">
                Provider Name *
              </label>
              <input
                type="text"
                id="providerName"
                value={formData.providerName}
                onChange={(e) => handleInputChange('providerName', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.providerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter healthcare provider name"
              />
              {errors.providerName && (
                <p className="mt-1 text-sm text-red-600">{errors.providerName}</p>
              )}
            </div>

            <div>
              <label htmlFor="providerNpi" className="block text-sm font-medium text-gray-700 mb-1">
                Provider NPI (Optional)
              </label>
              <input
                type="text"
                id="providerNpi"
                value={formData.providerNpi}
                onChange={(e) => handleInputChange('providerNpi', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.providerNpi ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="10-digit NPI number"
                maxLength={10}
              />
              {errors.providerNpi && (
                <p className="mt-1 text-sm text-red-600">{errors.providerNpi}</p>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dateOfService" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Service *
              </label>
              <input
                type="date"
                id="dateOfService"
                value={formData.dateOfService}
                onChange={(e) => handleInputChange('dateOfService', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dateOfService ? 'border-red-500' : 'border-gray-300'
                }`}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.dateOfService && (
                <p className="mt-1 text-sm text-red-600">{errors.dateOfService}</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0"
                  max="100000"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className={`w-full pl-8 pr-3 py-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the service or treatment"
            />
          </div>

          {/* Medical Codes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPT Codes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPT Codes (Procedure Codes)
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newCptCode}
                  onChange={(e) => setNewCptCode(e.target.value)}
                  placeholder="Enter 5-digit CPT code"
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  maxLength={5}
                />
                <button
                  type="button"
                  onClick={addCptCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {formData.cptCodes.map((code) => (
                  <div key={code} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="font-mono text-sm">{code}</span>
                    <button
                      type="button"
                      onClick={() => removeCptCode(code)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                CPT codes describe medical procedures (e.g., 99213 for office visit)
              </p>
            </div>

            {/* ICD Codes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ICD Codes (Diagnosis Codes)
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newIcdCode}
                  onChange={(e) => setNewIcdCode(e.target.value)}
                  placeholder="Enter ICD-10 code (e.g., Z00.0)"
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addIcdCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {formData.icdCodes.map((code) => (
                  <div key={code} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="font-mono text-sm">{code}</span>
                    <button
                      type="button"
                      onClick={() => removeIcdCode(code)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ICD codes describe medical diagnoses (e.g., Z00.0 for routine checkup)
              </p>
            </div>
          </div>

          {/* Missing Codes Notice */}
          {(formData.cptCodes.length === 0 || formData.icdCodes.length === 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start">
                <span className="text-yellow-600 text-xl mr-3">⚠️</span>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Medical Codes Missing</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    CPT and ICD codes are often required for claim processing. You can add them now or use our 
                    AI assistant to suggest appropriate codes based on your claim information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Creating Claim...
                </>
              ) : (
                'Create Claim'
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Help Information */}
      <div className="mt-6">
        <Card
          title="Claim Information Help"
          description="Tips for completing your claim accurately"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Required Information</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Provider name (doctor, clinic, hospital)</li>
                <li>• Date when service was provided</li>
                <li>• Total amount charged</li>
                <li>• Medical codes (CPT and ICD) if available</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Where to Find Information</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Medical receipts and bills</li>
                <li>• Explanation of Benefits (EOB)</li>
                <li>• Provider statements</li>
                <li>• Insurance claim forms</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}