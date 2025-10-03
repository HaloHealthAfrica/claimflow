'use client';

// Insurance form component for manual entry and editing
import { useState, useEffect } from 'react';
import { InsuranceProfilePartial } from '@/lib/ocr';
import Card from './Card';

interface InsuranceFormProps {
  initialData?: InsuranceProfilePartial;
  onSave?: (data: InsuranceProfilePartial) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  className?: string;
}

export default function InsuranceForm({
  initialData,
  onSave,
  onCancel,
  saving = false,
  className = '',
}: InsuranceFormProps) {
  const [formData, setFormData] = useState<InsuranceProfilePartial>({
    insurer: '',
    plan: '',
    memberId: '',
    groupId: '',
    payerId: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        insurer: initialData.insurer || '',
        plan: initialData.plan || '',
        memberId: initialData.memberId || '',
        groupId: initialData.groupId || '',
        payerId: initialData.payerId || '',
        address: initialData.address || '',
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof InsuranceProfilePartial, value: string) => {
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
    if (!formData.insurer?.trim()) {
      newErrors.insurer = 'Insurance company is required';
    }

    if (!formData.memberId?.trim()) {
      newErrors.memberId = 'Member ID is required';
    } else if (formData.memberId.length < 6) {
      newErrors.memberId = 'Member ID must be at least 6 characters';
    }

    // Optional validation for other fields
    if (formData.groupId && formData.groupId.length < 3) {
      newErrors.groupId = 'Group ID must be at least 3 characters';
    }

    if (formData.payerId && formData.payerId.length < 3) {
      newErrors.payerId = 'Payer ID must be at least 3 characters';
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

  const commonInsurers = [
    'Blue Cross Blue Shield',
    'Aetna',
    'Cigna',
    'Humana',
    'Kaiser Permanente',
    'UnitedHealthcare',
    'Anthem',
    'Medicare',
    'Medicaid',
    'Tricare',
  ];

  return (
    <div className={className}>
      <Card
        title="Insurance Information"
        description="Enter your insurance details manually or scan your insurance card"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Insurance Company */}
          <div>
            <label htmlFor="insurer" className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Company *
            </label>
            <div className="relative">
              <input
                type="text"
                id="insurer"
                value={formData.insurer}
                onChange={(e) => handleInputChange('insurer', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.insurer ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter insurance company name"
                list="insurers"
              />
              <datalist id="insurers">
                {commonInsurers.map((insurer) => (
                  <option key={insurer} value={insurer} />
                ))}
              </datalist>
            </div>
            {errors.insurer && (
              <p className="mt-1 text-sm text-red-600">{errors.insurer}</p>
            )}
          </div>

          {/* Plan Name */}
          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name
            </label>
            <input
              type="text"
              id="plan"
              value={formData.plan}
              onChange={(e) => handleInputChange('plan', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter plan name (e.g., Premium PPO, Basic HMO)"
            />
          </div>

          {/* Member ID */}
          <div>
            <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-1">
              Member ID *
            </label>
            <input
              type="text"
              id="memberId"
              value={formData.memberId}
              onChange={(e) => handleInputChange('memberId', e.target.value)}
              className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.memberId ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter member ID"
            />
            {errors.memberId && (
              <p className="mt-1 text-sm text-red-600">{errors.memberId}</p>
            )}
          </div>

          {/* Group ID and Payer ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-1">
                Group ID
              </label>
              <input
                type="text"
                id="groupId"
                value={formData.groupId}
                onChange={(e) => handleInputChange('groupId', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.groupId ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter group ID"
              />
              {errors.groupId && (
                <p className="mt-1 text-sm text-red-600">{errors.groupId}</p>
              )}
            </div>

            <div>
              <label htmlFor="payerId" className="block text-sm font-medium text-gray-700 mb-1">
                Payer ID
              </label>
              <input
                type="text"
                id="payerId"
                value={formData.payerId}
                onChange={(e) => handleInputChange('payerId', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.payerId ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter payer ID"
              />
              {errors.payerId && (
                <p className="mt-1 text-sm text-red-600">{errors.payerId}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Company Address
            </label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter insurance company address (optional)"
            />
          </div>

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
                  Saving...
                </>
              ) : (
                'Save Insurance Information'
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Help Text */}
      <div className="mt-6">
        <Card
          title="Where to Find This Information"
          description="Locate these details on your insurance card"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Front of Card</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Insurance company name (usually at the top)</li>
                <li>• Member name and ID number</li>
                <li>• Plan name or type</li>
                <li>• Group number (if applicable)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Back of Card</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Payer ID or Plan ID</li>
                <li>• Insurance company address</li>
                <li>• Customer service phone number</li>
                <li>• Claims submission address</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}