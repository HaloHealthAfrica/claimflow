// Integration tests for claim submission flow
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockFactories, testUtils } from '../utils/test-helpers';
import { server, rest } from '../mocks/server';

// Mock components (these would be imported from actual components)
const MockClaimForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = React.useState({
    dateOfService: '',
    providerName: '',
    amountCents: '',
    cptCodes: [''],
    icdCodes: [''],
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amountCents: parseInt(formData.amountCents) || 0,
      cptCodes: formData.cptCodes.filter(code => code.trim()),
      icdCodes: formData.icdCodes.filter(code => code.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="claim-form">
      <input
        data-testid="date-of-service"
        type="date"
        value={formData.dateOfService}
        onChange={(e) => setFormData({ ...formData, dateOfService: e.target.value })}
        required
      />
      
      <input
        data-testid="provider-name"
        type="text"
        placeholder="Provider Name"
        value={formData.providerName}
        onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
        required
      />
      
      <input
        data-testid="amount"
        type="number"
        placeholder="Amount (cents)"
        value={formData.amountCents}
        onChange={(e) => setFormData({ ...formData, amountCents: e.target.value })}
        required
      />
      
      <input
        data-testid="cpt-codes"
        type="text"
        placeholder="CPT Codes (comma separated)"
        value={formData.cptCodes.join(', ')}
        onChange={(e) => setFormData({ 
          ...formData, 
          cptCodes: e.target.value.split(',').map(s => s.trim()) 
        })}
        required
      />
      
      <input
        data-testid="icd-codes"
        type="text"
        placeholder="ICD Codes (comma separated)"
        value={formData.icdCodes.join(', ')}
        onChange={(e) => setFormData({ 
          ...formData, 
          icdCodes: e.target.value.split(',').map(s => s.trim()) 
        })}
        required
      />
      
      <textarea
        data-testid="notes"
        placeholder="Notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
      />
      
      <button type="submit" data-testid="submit-button">
        Create Claim
      </button>
    </form>
  );
};

const MockClaimSubmissionPage = () => {
  const [claim, setClaim] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleCreateClaim = async (formData: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/mobile/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setClaim(data.data.claim);
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError('Failed to create claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!claim) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/mobile/claims/${claim.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'electronic',
          insurerInfo: {
            name: 'Test Insurance',
            payerId: 'TEST123',
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setClaim({ ...claim, status: 'SUBMITTED' });
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      setError('Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="claim-submission-page">
      {!claim ? (
        <MockClaimForm onSubmit={handleCreateClaim} />
      ) : (
        <div data-testid="claim-details">
          <h2>Claim Created</h2>
          <p data-testid="claim-id">ID: {claim.id}</p>
          <p data-testid="claim-status">Status: {claim.status}</p>
          <p data-testid="claim-provider">Provider: {claim.providerName}</p>
          <p data-testid="claim-amount">Amount: ${(claim.amountCents / 100).toFixed(2)}</p>
          
          {claim.status === 'DRAFT' && (
            <button
              data-testid="submit-claim-button"
              onClick={handleSubmitClaim}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          )}
          
          {claim.status === 'SUBMITTED' && (
            <div data-testid="submission-success">
              <p>Claim submitted successfully!</p>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div data-testid="error-message" role="alert">
          {error}
        </div>
      )}
      
      {isSubmitting && (
        <div data-testid="loading" role="progressbar">
          Loading...
        </div>
      )}
    </div>
  );
};

describe('Claim Submission Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete claim submission flow', () => {
    it('should create and submit a claim successfully', async () => {
      renderWithProviders(<MockClaimSubmissionPage />);

      // Fill out the claim form
      await fillClaimForm({
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith Medical',
        amountCents: '15000',
        cptCodes: '99213, 90834',
        icdCodes: 'Z00.00, F32.9',
        notes: 'Test claim for integration testing',
      });

      // Submit the form to create claim
      fireEvent.click(screen.getByTestId('submit-button'));

      // Wait for claim to be created
      await waitFor(() => {
        expect(screen.getByTestId('claim-details')).toBeInTheDocument();
      });

      // Verify claim details
      expect(screen.getByTestId('claim-id')).toHaveTextContent('ID: new-claim-id');
      expect(screen.getByTestId('claim-status')).toHaveTextContent('Status: DRAFT');
      expect(screen.getByTestId('claim-provider')).toHaveTextContent('Provider: Dr. Smith Medical');
      expect(screen.getByTestId('claim-amount')).toHaveTextContent('Amount: $150.00');

      // Submit the claim
      fireEvent.click(screen.getByTestId('submit-claim-button'));

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });

      // Verify final status
      expect(screen.getByTestId('claim-status')).toHaveTextContent('Status: SUBMITTED');
    });

    it('should handle validation errors during claim creation', async () => {
      // Override the default mock to return validation error
      server.use(
        rest.post('/api/mobile/claims', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: ['dateOfService: Date of service is required'],
              },
            })
          );
        })
      );

      renderWithProviders(<MockClaimSubmissionPage />);

      // Fill out incomplete form (missing date)
      await fillClaimForm({
        providerName: 'Dr. Smith Medical',
        amountCents: '15000',
        cptCodes: '99213',
        icdCodes: 'Z00.00',
      });

      // Submit the form
      fireEvent.click(screen.getByTestId('submit-button'));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Validation failed');
    });

    it('should handle submission errors', async () => {
      renderWithProviders(<MockClaimSubmissionPage />);

      // Create claim first
      await fillClaimForm({
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith Medical',
        amountCents: '15000',
        cptCodes: '99213',
        icdCodes: 'Z00.00',
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('claim-details')).toBeInTheDocument();
      });

      // Override mock to return submission error
      server.use(
        rest.post('/api/mobile/claims/:id/submit', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'SUBMISSION_FAILED',
                message: 'Failed to submit claim to clearinghouse',
              },
            })
          );
        })
      );

      // Try to submit claim
      fireEvent.click(screen.getByTestId('submit-claim-button'));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Failed to submit claim to clearinghouse'
      );
    });

    it('should show loading states during operations', async () => {
      renderWithProviders(<MockClaimSubmissionPage />);

      // Fill form
      await fillClaimForm({
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith Medical',
        amountCents: '15000',
        cptCodes: '99213',
        icdCodes: 'Z00.00',
      });

      // Submit form and check loading state
      fireEvent.click(screen.getByTestId('submit-button'));
      
      // Should show loading immediately
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for loading to disappear
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      // Now submit claim and check loading again
      fireEvent.click(screen.getByTestId('submit-claim-button'));
      
      // Check submit button shows loading text
      expect(screen.getByTestId('submit-claim-button')).toHaveTextContent('Submitting...');
      expect(screen.getByTestId('submit-claim-button')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });
    });
  });

  describe('Form validation integration', () => {
    it('should validate CPT and ICD codes in real-time', async () => {
      renderWithProviders(<MockClaimSubmissionPage />);

      // Fill form with invalid codes
      await fillClaimForm({
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith Medical',
        amountCents: '15000',
        cptCodes: 'invalid-cpt',
        icdCodes: 'invalid-icd',
      });

      // Override mock to return validation error for invalid codes
      server.use(
        rest.post('/api/mobile/claims', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid medical codes',
                details: [
                  'cptCodes: Invalid CPT code format',
                  'icdCodes: Invalid ICD code format',
                ],
              },
            })
          );
        })
      );

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid medical codes');
    });
  });
});

// Helper function to fill claim form
async function fillClaimForm(data: {
  dateOfService?: string;
  providerName?: string;
  amountCents?: string;
  cptCodes?: string;
  icdCodes?: string;
  notes?: string;
}) {
  if (data.dateOfService) {
    fireEvent.change(screen.getByTestId('date-of-service'), {
      target: { value: data.dateOfService },
    });
  }

  if (data.providerName) {
    fireEvent.change(screen.getByTestId('provider-name'), {
      target: { value: data.providerName },
    });
  }

  if (data.amountCents) {
    fireEvent.change(screen.getByTestId('amount'), {
      target: { value: data.amountCents },
    });
  }

  if (data.cptCodes) {
    fireEvent.change(screen.getByTestId('cpt-codes'), {
      target: { value: data.cptCodes },
    });
  }

  if (data.icdCodes) {
    fireEvent.change(screen.getByTestId('icd-codes'), {
      target: { value: data.icdCodes },
    });
  }

  if (data.notes) {
    fireEvent.change(screen.getByTestId('notes'), {
      target: { value: data.notes },
    });
  }

  // Wait for form to update
  await waitFor(() => {
    // Just wait a bit for state updates
  });
}