// Validation utilities for ClaimFlow

import { z } from 'zod';

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  dob: z.date().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Insurance validation schemas
export const insuranceProfileSchema = z.object({
  insurer: z.string().min(1, 'Insurance company is required'),
  plan: z.string().optional(),
  memberId: z.string().min(1, 'Member ID is required'),
  groupId: z.string().optional(),
  payerId: z.string().optional(),
  address: z.string().optional(),
});

// Claim validation schemas
export const claimSchema = z.object({
  providerName: z.string().min(1, 'Provider name is required'),
  providerNpi: z.string().optional(),
  dateOfService: z.date(),
  amountCents: z
    .number()
    .int()
    .min(1, 'Amount must be greater than $0')
    .max(10000000, 'Amount too large'), // $100,000 max
  cptCodes: z.array(z.string()).optional().default([]),
  icdCodes: z.array(z.string()).optional().default([]),
});

// File validation
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Medical code validation
export const isValidCPTCode = (code: string): boolean => {
  // CPT codes are 5 digits
  const cptRegex = /^\d{5}$/;
  return cptRegex.test(code);
};

export const isValidICDCode = (code: string): boolean => {
  // ICD-10 codes format: A00.0 to Z99.9
  const icdRegex = /^[A-Z]\d{2}(\.\d{1,2})?$/;
  return icdRegex.test(code);
};

// NPI validation
export const isValidNPI = (npi: string): boolean => {
  // NPI is 10 digits
  const npiRegex = /^\d{10}$/;
  return npiRegex.test(npi);
};

// Sanitization utilities
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeFileName = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Type exports
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type InsuranceProfileInput = z.infer<typeof insuranceProfileSchema>;
export type ClaimInput = z.infer<typeof claimSchema>;