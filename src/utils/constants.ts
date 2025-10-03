// Application constants

export const APP_NAME = 'ClaimFlow';
export const APP_DESCRIPTION = 'HIPAA-compliant insurance claims management';

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  ...ALLOWED_IMAGE_TYPES,
];

// Claim validation rules
export const MIN_CLAIM_AMOUNT = 1; // $0.01
export const MAX_CLAIM_AMOUNT = 100000 * 100; // $100,000 in cents

// OCR confidence thresholds
export const MIN_OCR_CONFIDENCE = 0.7;
export const HIGH_OCR_CONFIDENCE = 0.9;

// AI confidence thresholds
export const MIN_AI_CONFIDENCE = 0.6;
export const HIGH_AI_CONFIDENCE = 0.8;

// Session and security
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
export const JWT_EXPIRY = '24h';

// API rate limits
export const API_RATE_LIMIT = 100; // requests per minute
export const FILE_UPLOAD_RATE_LIMIT = 10; // uploads per minute

// Notification settings
export const NOTIFICATION_BATCH_SIZE = 50;
export const EMAIL_RETRY_ATTEMPTS = 3;

// Database pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;