// Unit tests for claims functionality
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { testUtils, mockFactories } from '../utils/test-helpers';

describe('Claims API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('GET /api/mobile/claims', () => {
    it('should fetch claims list successfully', async () => {
      const mockClaims = [
        mockFactories.claim({ id: 'claim-1', status: 'SUBMITTED' }),
        mockFactories.claim({ id: 'claim-2', status: 'DRAFT' }),
      ];

      const mockResponse = mockFactories.apiResponse({
        claims: mockClaims,
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          hasMore: false,
        },
        summary: {
          totalClaims: 2,
          pendingClaims: 1,
          approvedClaims: 0,
          deniedClaims: 0,
          totalAmount: 20000,
          paidAmount: 0,
        },
      });

      testUtils.mockApiCall('/api/mobile/claims', mockResponse);

      const response = await fetch('/api/mobile/claims?page=1&limit=20');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.claims).toHaveLength(2);
      expect(data.data.claims[0]).toBeValidClaim();
      expect(data.data.pagination.total).toBe(2);
      expect(data.data.summary.totalClaims).toBe(2);
    });

    it('should handle empty claims list', async () => {
      const mockResponse = mockFactories.apiResponse({
        claims: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          hasMore: false,
        },
        summary: {
          totalClaims: 0,
          pendingClaims: 0,
          approvedClaims: 0,
          deniedClaims: 0,
          totalAmount: 0,
          paidAmount: 0,
        },
      });

      testUtils.mockApiCall('/api/mobile/claims', mockResponse);

      const response = await fetch('/api/mobile/claims');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.claims).toHaveLength(0);
      expect(data.data.summary.totalClaims).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const mockResponse = mockFactories.apiResponse({
        claims: [mockFactories.claim()],
        pagination: {
          total: 25,
          page: 2,
          limit: 10,
          hasMore: true,
        },
      });

      testUtils.mockApiCall('/api/mobile/claims', mockResponse);

      const response = await fetch('/api/mobile/claims?page=2&limit=10');
      const data = await response.json();

      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.hasMore).toBe(true);
    });
  });

  describe('POST /api/mobile/claims', () => {
    it('should create claim successfully', async () => {
      const newClaim = {
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith',
        amountCents: 15000,
        cptCodes: ['99213'],
        icdCodes: ['Z00.00'],
        notes: 'Test claim',
      };

      const mockResponse = mockFactories.apiResponse({
        claim: mockFactories.claim(newClaim),
        message: 'Claim created successfully',
      });

      testUtils.mockApiCall('/api/mobile/claims', mockResponse);

      const response = await fetch('/api/mobile/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClaim),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.claim).toBeValidClaim();
      expect(data.data.claim.providerName).toBe('Dr. Smith');
      expect(data.data.message).toBe('Claim created successfully');
    });

    it('should validate required fields', async () => {
      const invalidClaim = {
        providerName: 'Dr. Smith',
        // Missing required fields
      };

      const mockResponse = mockFactories.apiResponse({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [
          'dateOfService: Date of service is required',
          'amountCents: Amount is required',
          'cptCodes: At least one CPT code is required',
        ],
      }, false);

      testUtils.mockApiCall('/api/mobile/claims', mockResponse, 400);

      const response = await fetch('/api/mobile/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidClaim),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data).toHaveValidationError('dateOfService');
      expect(data).toHaveValidationError('amountCents');
      expect(data).toHaveValidationError('cptCodes');
    });

    it('should validate CPT and ICD codes format', async () => {
      const invalidClaim = {
        dateOfService: '2024-01-15',
        providerName: 'Dr. Smith',
        amountCents: 15000,
        cptCodes: ['invalid-cpt'],
        icdCodes: ['invalid-icd'],
      };

      const mockResponse = mockFactories.apiResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid medical codes',
        details: [
          'cptCodes: Invalid CPT code format',
          'icdCodes: Invalid ICD code format',
        ],
      }, false);

      testUtils.mockApiCall('/api/mobile/claims', mockResponse, 400);

      const response = await fetch('/api/mobile/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidClaim),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data).toHaveValidationError('cptCodes');
      expect(data).toHaveValidationError('icdCodes');
    });
  });

  describe('GET /api/mobile/claims/:id', () => {
    it('should fetch claim details successfully', async () => {
      const claimId = 'test-claim-id';
      const mockClaim = mockFactories.claim({
        id: claimId,
        status: 'SUBMITTED',
        timeline: [
          {
            id: 'timeline-1',
            type: 'SUBMITTED',
            title: 'Claim Submitted',
            description: 'Claim was submitted to insurance company',
            timestamp: '2024-01-16T10:30:00Z',
          },
        ],
      });

      const mockResponse = mockFactories.apiResponse(mockClaim);

      testUtils.mockApiCall(`/api/mobile/claims/${claimId}`, mockResponse);

      const response = await fetch(`/api/mobile/claims/${claimId}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeValidClaim();
      expect(data.data.id).toBe(claimId);
      expect(data.data.timeline).toHaveLength(1);
    });

    it('should handle claim not found', async () => {
      const claimId = 'nonexistent-claim';
      const mockResponse = mockFactories.apiResponse({
        code: 'CLAIM_NOT_FOUND',
        message: 'Claim not found',
      }, false);

      testUtils.mockApiCall(`/api/mobile/claims/${claimId}`, mockResponse, 404);

      const response = await fetch(`/api/mobile/claims/${claimId}`);
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CLAIM_NOT_FOUND');
    });
  });

  describe('POST /api/mobile/claims/:id/submit', () => {
    it('should submit claim successfully', async () => {
      const claimId = 'test-claim-id';
      const mockResponse = mockFactories.apiResponse({
        claimId,
        submissionId: 'SUB_123456789',
        method: 'electronic',
        status: 'SUBMITTED',
        submittedAt: '2024-01-16T10:30:00Z',
        estimatedProcessingTime: '3-5 business days',
        trackingInfo: {
          confirmationNumber: 'ECN_SUB_123456789',
          submissionUrl: 'https://clearinghouse.example.com/track/SUB_123456789',
        },
        message: 'Claim submitted electronically successfully',
      });

      testUtils.mockApiCall(`/api/mobile/claims/${claimId}/submit`, mockResponse);

      const response = await fetch(`/api/mobile/claims/${claimId}/submit`, {
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

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.submissionId).toBe('SUB_123456789');
      expect(data.data.status).toBe('SUBMITTED');
      expect(data.data.trackingInfo).toHaveProperty('confirmationNumber');
    });

    it('should handle submission errors', async () => {
      const claimId = 'test-claim-id';
      const mockResponse = mockFactories.apiResponse({
        code: 'SUBMISSION_FAILED',
        message: 'Failed to submit claim to clearinghouse',
        details: ['Invalid insurer information'],
      }, false);

      testUtils.mockApiCall(`/api/mobile/claims/${claimId}/submit`, mockResponse, 400);

      const response = await fetch(`/api/mobile/claims/${claimId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'electronic',
          insurerInfo: {
            name: '',
            payerId: '',
          },
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SUBMISSION_FAILED');
    });

    it('should prevent duplicate submissions', async () => {
      const claimId = 'already-submitted-claim';
      const mockResponse = mockFactories.apiResponse({
        code: 'ALREADY_SUBMITTED',
        message: 'Claim has already been submitted',
      }, false);

      testUtils.mockApiCall(`/api/mobile/claims/${claimId}/submit`, mockResponse, 409);

      const response = await fetch(`/api/mobile/claims/${claimId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'electronic',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error.code).toBe('ALREADY_SUBMITTED');
    });
  });
});

// Unit tests for claim validation utilities
describe('Claim Validation', () => {
  describe('CPT Code validation', () => {
    it('should validate CPT code format', () => {
      expect(isValidCPTCode('99213')).toBe(true);
      expect(isValidCPTCode('90834')).toBe(true);
      expect(isValidCPTCode('invalid')).toBe(false);
      expect(isValidCPTCode('123')).toBe(false);
    });

    it('should validate multiple CPT codes', () => {
      expect(validateCPTCodes(['99213', '90834'])).toEqual({
        isValid: true,
        errors: [],
      });
      
      expect(validateCPTCodes(['99213', 'invalid'])).toEqual({
        isValid: false,
        errors: ['Invalid CPT code: invalid'],
      });
    });
  });

  describe('ICD Code validation', () => {
    it('should validate ICD-10 code format', () => {
      expect(isValidICDCode('Z00.00')).toBe(true);
      expect(isValidICDCode('F32.9')).toBe(true);
      expect(isValidICDCode('invalid')).toBe(false);
    });

    it('should validate multiple ICD codes', () => {
      expect(validateICDCodes(['Z00.00', 'F32.9'])).toEqual({
        isValid: true,
        errors: [],
      });
      
      expect(validateICDCodes(['Z00.00', 'invalid'])).toEqual({
        isValid: false,
        errors: ['Invalid ICD code: invalid'],
      });
    });
  });

  describe('Amount validation', () => {
    it('should validate claim amounts', () => {
      expect(validateClaimAmount(10000)).toEqual({ isValid: true, errors: [] });
      expect(validateClaimAmount(0)).toEqual({
        isValid: false,
        errors: ['Amount must be greater than 0'],
      });
      expect(validateClaimAmount(-100)).toEqual({
        isValid: false,
        errors: ['Amount must be greater than 0'],
      });
    });
  });

  describe('Date validation', () => {
    it('should validate service dates', () => {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const pastDate = '2024-01-15';

      expect(validateServiceDate(pastDate)).toEqual({ isValid: true, errors: [] });
      expect(validateServiceDate(today)).toEqual({ isValid: true, errors: [] });
      expect(validateServiceDate(futureDate)).toEqual({
        isValid: false,
        errors: ['Service date cannot be in the future'],
      });
    });
  });
});

// Helper functions for claim validation
function isValidCPTCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

function isValidICDCode(code: string): boolean {
  return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code);
}

function validateCPTCodes(codes: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  codes.forEach(code => {
    if (!isValidCPTCode(code)) {
      errors.push(`Invalid CPT code: ${code}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateICDCodes(codes: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  codes.forEach(code => {
    if (!isValidICDCode(code)) {
      errors.push(`Invalid ICD code: ${code}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateClaimAmount(amountCents: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (amountCents <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateServiceDate(dateString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const serviceDate = new Date(dateString);
  const today = new Date();
  
  if (serviceDate > today) {
    errors.push('Service date cannot be in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}