// AWS S3 client configuration for secure file storage
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createAuditLog } from './db';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'claimflow-files';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
};

// Generate unique file key with user isolation
export function generateFileKey(userId: string, originalName: string, type: 'insurance' | 'receipt' | 'document' | 'claim' | 'appeal'): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `users/${userId}/${type}/${timestamp}-${randomId}-${sanitizedName}`;
}

// Upload file to S3
export async function uploadFileToS3(
  file: Buffer,
  key: string,
  contentType: string,
  userId: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Log file upload for audit trail
    await createAuditLog(
      userId,
      'FILE_UPLOADED',
      'file',
      { key, contentType, size: file.length },
      'unknown',
      'unknown'
    );

    return key;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

// Generate signed URL for secure file access
export async function generateSignedUrl(key: string, userId: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: SIGNED_URL_EXPIRY,
    });

    // Log file access for audit trail
    await createAuditLog(
      userId,
      'FILE_ACCESSED',
      'file',
      { key },
      'unknown',
      'unknown'
    );

    return signedUrl;
  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw new Error('Failed to generate signed URL');
  }
}

// Delete file from S3
export async function deleteFileFromS3(key: string, userId: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    // Log file deletion for audit trail
    await createAuditLog(
      userId,
      'FILE_DELETED',
      'file',
      { key },
      'unknown',
      'unknown'
    );
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
}

// Validate file type and size
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    return {
      isValid: false,
      error: `File size must be less than ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`,
    };
  }

  // Check MIME type
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not supported. Please upload JPG, PNG, WebP, or PDF files.',
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'File extension not supported.',
    };
  }

  return { isValid: true };
}

// Get file info from S3 key
export function parseFileKey(key: string): {
  userId: string;
  type: string;
  timestamp: number;
  originalName: string;
} | null {
  try {
    const parts = key.split('/');
    if (parts.length < 4 || parts[0] !== 'users') {
      return null;
    }

    const userId = parts[1];
    const type = parts[2];
    const filename = parts[3];
    
    const filenameParts = filename.split('-');
    const timestamp = parseInt(filenameParts[0]);
    const originalName = filenameParts.slice(2).join('-');

    return { userId, type, timestamp, originalName };
  } catch {
    return null;
  }
}

// Check if user owns the file
export function validateFileOwnership(key: string, userId: string): boolean {
  const fileInfo = parseFileKey(key);
  return fileInfo?.userId === userId;
}

// Generate presigned URL for direct upload (for large files)
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  userId: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes for upload
    });

    return signedUrl;
  } catch (error) {
    console.error('S3 presigned upload URL error:', error);
    throw new Error('Failed to generate presigned upload URL');
  }
}