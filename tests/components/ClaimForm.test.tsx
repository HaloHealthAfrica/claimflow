// Component tests for ClaimForm
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, testUtils } from '../utils/test-helpers';

// Mock ClaimForm component
interface ClaimFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

const ClaimForm: React.FC<ClaimFormProps> = ({
  onSubmit,
  initialData = {},
  isLoading = false,
  errors = {},
}) => {
  const [formData, setFormData] = React.useState({
    dateOfService: initialData.dateOfService || '',
    providerName: initialData.providerName || '',
    amountCents: initialData.amountCents || '',
    cptCodes: initialData.cptCodes || [''],
    icdCodes: initialData.icdCodes || [''],
    notes: initialData.notes || '',
    ...initialData,
  });

  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allTouched);

    // Validate and submit
    const processedData = {
      ...formData,
      amountCents: parseInt(formData.amountCents) || 0,
      cptCodes: Array.isArray(formData.cptCodes) 
        ? formData.cptCodes.filter(code => code.trim())
        : formData.cptCodes.split(',').map(s => s.trim()).filter(Boolean),
      icdCodes: Array.isArray(formData.icdCodes)
        ? formData.icdCodes.filter(code => code.trim())
        : formData.icdCodes.split(',').map(s => s.trim()).filter(Boolean),
    };

    onSubmit(processedData);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string) => {
    return touched[field] && errors[field] ? errors[field] : '';
  };

  return (
    <form onSubmit={handleSubmit} data-testid="claim-form" className="space-y-4">
      <div>
        <label htmlFor="dateOfService" className="block text-sm font-medium">
          Date of Service *
        </label>
        <input
          id="dateOfService"
          data-testid="date-of-service"
          type="date"
          value={formData.dateOfService}
          onChange={(e) => handleFieldChange('dateOfService', e.target.value)}
          onBlur={() => handleFieldBlur('dateOfService')}
          className={`mt-1 block w-full rounded-md border ${
            getFieldError('dateOfService') ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2`}
          required
        />
        {getFieldError('dateOfService') && (
          <p data-testid="date-of-service-error" className="mt-1 text-sm text-red-600">
            {getFieldError('dateOfService')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="providerName" className="block text-sm font-medium">
          Provider Name *
        </label>
        <input
          id="providerName"
          data-testid="provider-name"
          type="text"
          value={formData.providerName}
          onChange={(e) => handleFieldChange('providerName', e.target.value)}
          onBlur={() => handleFieldBlur('providerName')}
          className={`mt-1 block w-full rounded-md border ${
            getFieldError('providerName') ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2`}
          placeholder="Enter provider name"
          required
        />
        {getFieldError('providerName') && (
          <p data-testid="provider-name-error" className="mt-1 text-sm text-red-600">
            {getFieldError('providerName')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium">
          Amount (in cents) *
        </label>
        <input
          id="amount"
          data-testid="amount"
          type="number"
          min="1"
          value={formData.amountCents}
          onChange={(e) => handleFieldChange('amountCents', e.target.value)}
          onBlur={() => handleFieldBlur('amountCents')}
          className={`mt-1 block w-full rounded-md border ${
            getFieldError('amountCents') ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2`}
          placeholder="Enter amount in cents (e.g., 15000 for $150.00)"
          required
        />
        {getFieldError('amountCents') && (
          <p data-testid="amount-error" className="mt-1 text-sm text-red-600">
            {getFieldError('amountCents')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="cptCodes" className="block text-sm font-medium">
          CPT Codes *
        </label>
        <input
          id="cptCodes"
          data-testid="cpt-codes"
          type="text"
          value={Array.isArray(formData.cptCodes) ? formData.cptCodes.join(', ') : formData.cptCodes}
          onChange={(e) => handleFieldChange('cptCodes', e.target.value)}
          onBlur={() => handleFieldBlur('cptCodes')}
          className={`mt-1 block w-full rounded-md border ${
            getFieldError('cptCodes') ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2`}
          placeholder="Enter CPT codes (comma separated, e.g., 99213, 90834)"
          required
        />
        {getFieldError('cptCodes') && (
          <p data-testid="cpt-codes-error" className="mt-1 text-sm text-red-600">
            {getFieldError('cptCodes')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="icdCodes" className="block text-sm font-medium">
          ICD Codes *
        </label>
        <input
          id="icdCodes"
          data-testid="icd-codes"
          type="text"
          value={Array.isArray(formData.icdCodes) ? formData.icdCodes.join(', ') : formData.icdCodes}
          onChange={(e) => handleFieldChange('icdCodes', e.target.value)}
          onBlur={() => handleFieldBlur('icdCodes')}
          className={`mt-1 block w-full rounded-md border ${
            getFieldError('icdCodes') ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2`}
          placeholder="Enter ICD codes (comma separated, e.g., Z00.00, F32.9)"
          required
        />
        {getFieldError('icdCodes') && (
          <p data-testid="icd-codes-error" className="mt-1 text-sm text-red-600">
            {getFieldError('icdCodes')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          data-testid="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          onBlur={() => handleFieldBlur('notes')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter any additional notes"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          data-testid="cancel-button"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="submit-button"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Claim'
          )}
        </button>
      </div>
    </form>
  );
};

describe('ClaimForm Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('date-of-service')).toBeInTheDocument();
      expect(screen.getByTestId('provider-name')).toBeInTheDocument();
      expect(screen.getByTestId('amount')).toBeInTheDocument();
      expect(screen.getByTestId('cpt-codes')).toBeInTheDocument();
      expect(screen.getByTestId('icd-codes')).toBeInTheDocument();
      expect(screen.getByTestId('notes')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should render with initial data', () => {
      const initialData = {
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith',
        amountCents: '15000',
        cptCodes: ['99213', '90834'],
        icdCodes: ['Z00.00'],
        notes: 'Test notes',
      };

      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} initialData={initialData} />);

      expect(screen.getByTestId('date-of-service')).toHaveValue('2024-01-15');
      expect(screen.getByTestId('provider-name')).toHaveValue('Dr. Smith');
      expect(screen.getByTestId('amount')).toHaveValue(15000);
      expect(screen.getByTestId('cpt-codes')).toHaveValue('99213, 90834');
      expect(screen.getByTestId('icd-codes')).toHaveValue('Z00.00');
      expect(screen.getByTestId('notes')).toHaveValue('Test notes');
    });

    it('should show loading state', () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} isLoading={true} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Submitting...');
    });

    it('should display validation errors', () => {
      const errors = {
        dateOfService: 'Date of service is required',
        providerName: 'Provider name is required',
        amountCents: 'Amount must be greater than 0',
      };

      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} errors={errors} />);

      // Trigger blur events to show errors
      fireEvent.blur(screen.getByTestId('date-of-service'));
      fireEvent.blur(screen.getByTestId('provider-name'));
      fireEvent.blur(screen.getByTestId('amount'));

      expect(screen.getByTestId('date-of-service-error')).toHaveTextContent('Date of service is required');
      expect(screen.getByTestId('provider-name-error')).toHaveTextContent('Provider name is required');
      expect(screen.getByTestId('amount-error')).toHaveTextContent('Amount must be greater than 0');
    });
  });

  describe('User Interactions', () => {
    it('should handle form input changes', async () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} />);

      // Fill out form
      fireEvent.change(screen.getByTestId('date-of-service'), {
        target: { value: '2024-01-15' },
      });
      fireEvent.change(screen.getByTestId('provider-name'), {
        target: { value: 'Dr. Smith Medical' },
      });
      fireEvent.change(screen.getByTestId('amount'), {
        target: { value: '15000' },
      });
      fireEvent.change(screen.getByTestId('cpt-codes'), {
        target: { value: '99213, 90834' },
      });
      fireEvent.change(screen.getByTestId('icd-codes'), {
        target: { value: 'Z00.00, F32.9' },
      });
      fireEvent.change(screen.getByTestId('notes'), {
        target: { value: 'Test claim notes' },
      });

      // Verify values
      expect(screen.getByTestId('date-of-service')).toHaveValue('2024-01-15');
      expect(screen.getByTestId('provider-name')).toHaveValue('Dr. Smith Medical');
      expect(screen.getByTestId('amount')).toHaveValue(15000);
      expect(screen.getByTestId('cpt-codes')).toHaveValue('99213, 90834');
      expect(screen.getByTestId('icd-codes')).toHaveValue('Z00.00, F32.9');
      expect(screen.getByTestId('notes')).toHaveValue('Test claim notes');
    });

    it('should submit form with correct data', async () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} />);

      // Fill out form
      fireEvent.change(screen.getByTestId('date-of-service'), {
        target: { value: '2024-01-15' },
      });
      fireEvent.change(screen.getByTestId('provider-name'), {
        target: { value: 'Dr. Smith Medical' },
      });
      fireEvent.change(screen.getByTestId('amount'), {
        target: { value: '15000' },
      });
      fireEvent.change(screen.getByTestId('cpt-codes'), {
        target: { value: '99213, 90834' },
      });
      fireEvent.change(screen.getByTestId('icd-codes'), {
        target: { value: 'Z00.00, F32.9' },
      });
      fireEvent.change(screen.getByTestId('notes'), {
        target: { value: 'Test notes' },
      });

      // Submit form
      fireEvent.click(screen.getByTestId('submit-button'));

      // Verify onSubmit was called with correct data
      expect(mockOnSubmit).toHaveBeenCalledWith({
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith Medical',
        amountCents: 15000,
        cptCodes: ['99213', '90834'],
        icdCodes: ['Z00.00', 'F32.9'],
        notes: 'Test notes',
      });
    });

    it('should handle empty CPT and ICD codes', async () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} />);

      // Fill required fields only
      fireEvent.change(screen.getByTestId('date-of-service'), {
        target: { value: '2024-01-15' },
      });
      fireEvent.change(screen.getByTestId('provider-name'), {
        target: { value: 'Dr. Smith' },
      });
      fireEvent.change(screen.getByTestId('amount'), {
        target: { value: '15000' },
      });
      fireEvent.change(screen.getByTestId('cpt-codes'), {
        target: { value: '99213, , 90834, ' },
      });
      fireEvent.change(screen.getByTestId('icd-codes'), {
        target: { value: 'Z00.00, , ' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith',
        amountCents: 15000,
        cptCodes: ['99213', '90834'],
        icdCodes: ['Z00.00'],
        notes: '',
      });
    });

    it('should prevent submission when loading', () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} isLoading={true} />);

      fireEvent.click(screen.getByTestId('submit-button'));

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show field errors on blur', async () => {
      const errors = {
        providerName: 'Provider name is required',
      };

      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} errors={errors} />);

      // Field should not show error initially
      expect(screen.queryByTestId('provider-name-error')).not.toBeInTheDocument();

      // Blur the field
      fireEvent.blur(screen.getByTestId('provider-name'));

      // Error should now be visible
      expect(screen.getByTestId('provider-name-error')).toBeInTheDocument();
      expect(screen.getByTestId('provider-name-error')).toHaveTextContent('Provider name is required');
    });

    it('should apply error styling to fields with errors', () => {
      const errors = {
        providerName: 'Provider name is required',
      };

      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} errors={errors} />);

      fireEvent.blur(screen.getByTestId('provider-name'));

      expect(screen.getByTestId('provider-name')).toHaveClass('border-red-300');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and form associations', () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText('Date of Service *')).toBeInTheDocument();
      expect(screen.getByLabelText('Provider Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount (in cents) *')).toBeInTheDocument();
      expect(screen.getByLabelText('CPT Codes *')).toBeInTheDocument();
      expect(screen.getByLabelText('ICD Codes *')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    });

    it('should have required field indicators', () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Date of Service *')).toBeInTheDocument();
      expect(screen.getByText('Provider Name *')).toBeInTheDocument();
      expect(screen.getByText('Amount (in cents) *')).toBeInTheDocument();
      expect(screen.getByText('CPT Codes *')).toBeInTheDocument();
      expect(screen.getByText('ICD Codes *')).toBeInTheDocument();
    });

    it('should have proper button states', () => {
      renderWithProviders(<ClaimForm onSubmit={mockOnSubmit} isLoading={true} />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveAttribute('disabled');
      expect(submitButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });
});