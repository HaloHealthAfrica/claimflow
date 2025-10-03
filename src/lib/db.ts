// Database client with HIPAA-compliant encryption
import { Prisma } from '@prisma/client';
import CryptoJS from 'crypto-js';
import { prisma } from './prisma'; // Use the centralized Prisma client

// Re-export the Prisma client for backward compatibility
export { prisma };

// Encryption utilities for PHI data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-32-chars-long-placeholder';

export const encrypt = (text: string): string => {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return encryptedText;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return original if decryption fails
  }
};

// Helper functions for encrypted user data
export const encryptUserData = (data: {
  name?: string;
  phone?: string;
  address?: string;
}) => ({
  ...data,
  name: data.name ? encrypt(data.name) : data.name,
  phone: data.phone ? encrypt(data.phone) : data.phone,
  address: data.address ? encrypt(data.address) : data.address,
});

export const decryptUserData = (data: {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}) => ({
  ...data,
  name: data.name ? decrypt(data.name) : data.name,
  phone: data.phone ? decrypt(data.phone) : data.phone,
  address: data.address ? decrypt(data.address) : data.address,
});

// Helper functions for encrypted insurance data
export const encryptInsuranceData = (data: {
  insurer?: string;
  plan?: string;
  memberId?: string;
  groupId?: string;
  payerId?: string;
  address?: string;
}) => ({
  ...data,
  insurer: data.insurer ? encrypt(data.insurer) : data.insurer,
  plan: data.plan ? encrypt(data.plan) : data.plan,
  memberId: data.memberId ? encrypt(data.memberId) : data.memberId,
  groupId: data.groupId ? encrypt(data.groupId) : data.groupId,
  payerId: data.payerId ? encrypt(data.payerId) : data.payerId,
  address: data.address ? encrypt(data.address) : data.address,
});

export const decryptInsuranceData = (data: {
  insurer?: string | null;
  plan?: string | null;
  memberId?: string | null;
  groupId?: string | null;
  payerId?: string | null;
  address?: string | null;
}) => ({
  ...data,
  insurer: data.insurer ? decrypt(data.insurer) : data.insurer,
  plan: data.plan ? decrypt(data.plan) : data.plan,
  memberId: data.memberId ? decrypt(data.memberId) : data.memberId,
  groupId: data.groupId ? decrypt(data.groupId) : data.groupId,
  payerId: data.payerId ? decrypt(data.payerId) : data.payerId,
  address: data.address ? decrypt(data.address) : data.address,
});

// Helper functions for encrypted claim data
export const encryptClaimData = (data: {
  providerName?: string;
}) => ({
  ...data,
  providerName: data.providerName ? encrypt(data.providerName) : data.providerName,
});

export const decryptClaimData = (data: {
  providerName?: string | null;
}) => ({
  ...data,
  providerName: data.providerName ? decrypt(data.providerName) : data.providerName,
});

// Audit logging function (updated for new schema)
export const createAuditLog = async (
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  ipAddress?: string,
  userAgent?: string,
  oldValues?: Prisma.JsonObject,
  newValues?: Prisma.JsonObject,
  success: boolean = true,
  errorMessage?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        oldValues,
        newValues,
        success,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// Database health check (use the enhanced method from prisma.ts)
export const checkDatabaseConnection = async (): Promise<boolean> => {
  return await prisma.healthCheck();
};

// Graceful shutdown (use the centralized method)
export const disconnectDatabase = async () => {
  const { disconnectDatabase } = await import('./prisma');
  return await disconnectDatabase();
};

// Get database statistics
export const getDatabaseStats = async () => {
  return await prisma.getDatabaseStats();
};

// Get user statistics
export const getUserStats = async (userId: string) => {
  return await prisma.getUserStats(userId);
};