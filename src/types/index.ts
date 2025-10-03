// Core type definitions for ClaimFlow application

export interface User {
  id: string;
  email: string;
  name?: string;
  dob?: Date;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceProfile {
  id: string;
  userId: string;
  insurer: string;
  plan?: string;
  memberId: string;
  groupId?: string;
  payerId?: string;
  address?: string;
  cardImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Claim {
  id: string;
  userId: string;
  providerName?: string;
  providerNpi?: string;
  dateOfService?: Date;
  amountCents: number;
  cptCodes: string[];
  icdCodes: string[];
  status: ClaimStatus;
  submissionMethod: SubmissionMethod;
  denialReason?: string;
  paidAmountCents?: number;
  confidenceScore?: number;
  timeline: Record<string, unknown>;
  receiptUrls: string[];
  validationResults?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ClaimStatus {
  DRAFT = 'draft',
  VALIDATING = 'validating',
  READY = 'ready',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  PAID = 'paid',
  DENIED = 'denied',
  APPEALED = 'appealed',
}

export enum SubmissionMethod {
  ELECTRONIC = 'electronic',
  PDF = 'pdf',
}

export enum DocumentType {
  RECEIPT = 'receipt',
  INSURANCE_CARD = 'insurance_card',
  CLAIM_FORM = 'claim_form',
  APPEAL_LETTER = 'appeal_letter',
}

export enum NotificationType {
  CLAIM_STATUS_CHANGE = 'claim_status_change',
  VALIDATION_COMPLETE = 'validation_complete',
  SUBMISSION_COMPLETE = 'submission_complete',
  PAYMENT_RECEIVED = 'payment_received',
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  type: DocumentType;
  url: string;
  filename: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

// API Response types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
}

// OCR and AI service types
export interface InsuranceProfilePartial {
  insurer?: string;
  plan?: string;
  memberId?: string;
  groupId?: string;
  payerId?: string;
  address?: string;
}

export interface ReceiptData {
  providerName?: string;
  dateOfService?: Date;
  amount?: number;
  rawText: string;
}

export interface CodeSuggestion {
  code: string;
  description: string;
  type: 'CPT' | 'ICD';
  confidence: number;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidenceScore: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ClaimContext {
  providerName?: string;
  dateOfService?: Date;
  amount?: number;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
}