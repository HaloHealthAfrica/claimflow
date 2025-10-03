// Database utility functions for common operations
import { prisma } from './prisma';
import { ClaimStatus, NotificationType, TimelineEventType } from '@prisma/client';
import { auditLogger } from './audit-logger';

// User utilities
export const userUtils = {
  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        insuranceProfiles: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
        },
      },
    });
  },

  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const user = await prisma.user.create({
      data: userData,
    });

    // Log user creation
    await auditLogger.log({
      userId: user.id,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: user.id,
      success: true,
    });

    return user;
  },

  async updateLastLogin(userId: string, ipAddress?: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0, // Reset failed attempts on successful login
      },
    });

    // Log successful login
    await auditLogger.log({
      userId,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      success: true,
    });
  },

  async incrementLoginAttempts(email: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const newAttempts = user.loginAttempts + 1;
    const shouldLock = newAttempts >= 5;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: newAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null, // 15 minutes
      },
    });

    // Log failed login attempt
    await auditLogger.log({
      userId: user.id,
      action: 'USER_LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      success: false,
      errorMessage: shouldLock ? 'Account locked due to too many failed attempts' : 'Invalid credentials',
    });

    return updatedUser;
  },
};

// Claim utilities
export const claimUtils = {
  async createClaim(userId: string, claimData: {
    dateOfService: Date;
    providerName: string;
    amountCents: number;
    cptCodes: string[];
    icdCodes: string[];
    description?: string;
    notes?: string;
    insuranceProfileId?: string;
  }) {
    const claim = await prisma.claim.create({
      data: {
        ...claimData,
        userId,
        status: 'DRAFT',
      },
      include: {
        insuranceProfile: true,
        user: true,
      },
    });

    // Create timeline entry
    await prisma.claimTimeline.create({
      data: {
        claimId: claim.id,
        type: 'CREATED',
        title: 'Claim Created',
        description: 'Claim was created and saved as draft',
        newStatus: 'DRAFT',
      },
    });

    // Log claim creation
    await auditLogger.log({
      userId,
      action: 'CLAIM_CREATE',
      entityType: 'Claim',
      entityId: claim.id,
      success: true,
    });

    return claim;
  },

  async updateClaimStatus(
    claimId: string, 
    newStatus: ClaimStatus, 
    userId?: string,
    metadata?: any
  ) {
    const claim = await prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('Claim not found');

    const previousStatus = claim.status;

    const updatedClaim = await prisma.claim.update({
      where: { id: claimId },
      data: { 
        status: newStatus,
        ...(newStatus === 'SUBMITTED' && { submittedAt: new Date() }),
        ...(newStatus === 'PROCESSING' && { processedAt: new Date() }),
      },
    });

    // Create timeline entry
    await prisma.claimTimeline.create({
      data: {
        claimId,
        type: newStatus as TimelineEventType,
        title: `Claim ${newStatus.charAt(0) + newStatus.slice(1).toLowerCase()}`,
        description: `Claim status changed from ${previousStatus} to ${newStatus}`,
        previousStatus,
        newStatus,
        metadata,
      },
    });

    // Create notification for status change
    if (claim.userId) {
      await notificationUtils.createNotification({
        userId: claim.userId,
        title: 'Claim Status Update',
        message: `Your claim status has been updated to ${newStatus.toLowerCase()}`,
        type: 'CLAIM_STATUS_UPDATE',
        channels: ['EMAIL', 'IN_APP'],
        relatedEntityType: 'Claim',
        relatedEntityId: claimId,
      });
    }

    // Log status change
    await auditLogger.log({
      userId: userId || claim.userId,
      action: 'CLAIM_STATUS_UPDATE',
      entityType: 'Claim',
      entityId: claimId,
      oldValues: { status: previousStatus },
      newValues: { status: newStatus },
      success: true,
    });

    return updatedClaim;
  },

  async getClaimsForUser(userId: string, filters?: {
    status?: ClaimStatus;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.dateOfService = {};
      if (filters.dateFrom) where.dateOfService.gte = filters.dateFrom;
      if (filters.dateTo) where.dateOfService.lte = filters.dateTo;
    }

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: {
          insuranceProfile: true,
          documents: true,
          timeline: {
            orderBy: { createdAt: 'desc' },
            take: 3, // Latest 3 timeline entries
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      prisma.claim.count({ where }),
    ]);

    return { claims, total };
  },

  async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.claim.count({
      where: {
        claimNumber: {
          startsWith: `CLM-${year}-`,
        },
      },
    });

    return `CLM-${year}-${String(count + 1).padStart(6, '0')}`;
  },
};

// Insurance utilities
export const insuranceUtils = {
  async createInsuranceProfile(userId: string, profileData: {
    insurerName: string;
    memberNumber: string;
    memberName: string;
    planName?: string;
    groupNumber?: string;
    isPrimary?: boolean;
  }) {
    // If this is set as primary, unset other primary profiles
    if (profileData.isPrimary) {
      await prisma.insuranceProfile.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const profile = await prisma.insuranceProfile.create({
      data: {
        ...profileData,
        userId,
        verificationStatus: 'PENDING',
      },
    });

    // Log profile creation
    await auditLogger.log({
      userId,
      action: 'INSURANCE_PROFILE_CREATE',
      entityType: 'InsuranceProfile',
      entityId: profile.id,
      success: true,
    });

    return profile;
  },

  async getPrimaryInsurance(userId: string) {
    return await prisma.insuranceProfile.findFirst({
      where: {
        userId,
        isActive: true,
        isPrimary: true,
      },
    });
  },
};

// Notification utilities
export const notificationUtils = {
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    channels: string[];
    relatedEntityType?: string;
    relatedEntityId?: string;
    scheduledFor?: Date;
  }) {
    const notification = await prisma.notification.create({
      data: {
        ...data,
        channels: data.channels as any,
      },
    });

    // If not scheduled, mark as sent immediately
    if (!data.scheduledFor) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
    }

    return notification;
  },

  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.update({
      where: { 
        id: notificationId,
        userId, // Ensure user can only mark their own notifications
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  },
};

// Document utilities
export const documentUtils = {
  async createDocument(data: {
    userId: string;
    claimId?: string;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    s3Key: string;
    s3Bucket: string;
    documentType: string;
  }) {
    const document = await prisma.document.create({
      data: {
        ...data,
        documentType: data.documentType as any,
      },
    });

    // Log document creation
    await auditLogger.log({
      userId: data.userId,
      action: 'DOCUMENT_CREATE',
      entityType: 'Document',
      entityId: document.id,
      success: true,
    });

    // If associated with a claim, add timeline entry
    if (data.claimId) {
      await prisma.claimTimeline.create({
        data: {
          claimId: data.claimId,
          type: 'DOCUMENT_ADDED',
          title: 'Document Added',
          description: `Document "${data.originalFileName}" was uploaded`,
          metadata: { documentId: document.id, documentType: data.documentType },
        },
      });
    }

    return document;
  },

  async getDocumentsForClaim(claimId: string) {
    return await prisma.document.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
    });
  },
};

// System utilities
export const systemUtils = {
  async getConfig(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value || null;
  },

  async setConfig(key: string, value: string, description?: string) {
    return await prisma.systemConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  },

  async getDashboardStats(userId?: string) {
    if (userId) {
      // User-specific stats
      return await prisma.getUserStats(userId);
    } else {
      // System-wide stats
      return await prisma.getDatabaseStats();
    }
  },
};

// Search utilities
export const searchUtils = {
  async searchClaims(userId: string, query: string) {
    return await prisma.claim.findMany({
      where: {
        userId,
        OR: [
          { claimNumber: { contains: query, mode: 'insensitive' } },
          { providerName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        insuranceProfile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  },

  async searchCPTCodes(query: string) {
    return await prisma.cPTCode.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { code: 'asc' },
      take: 20,
    });
  },

  async searchICDCodes(query: string) {
    return await prisma.iCDCode.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { code: 'asc' },
      take: 20,
    });
  },
};

// Enhanced document utilities
export const enhancedDocumentUtils = {
  ...documentUtils,
  
  async linkDocumentToClaim(documentId: string, claimId: string) {
    return await prisma.document.update({
      where: { id: documentId },
      data: { claimId },
    });
  },
};

// Enhanced claim utilities
export const enhancedClaimUtils = {
  ...claimUtils,
  
  async getUserClaimsSummary(userId: string) {
    const [totalStats, statusCounts] = await Promise.all([
      prisma.claim.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: {
          amountCents: true,
          paidAmountCents: true,
        },
      }),
      prisma.claim.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
    ]);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalClaims: totalStats._count.id,
      pendingClaims: (statusMap.DRAFT || 0) + (statusMap.SUBMITTED || 0) + (statusMap.PROCESSING || 0),
      approvedClaims: statusMap.APPROVED || 0,
      deniedClaims: statusMap.DENIED || 0,
      totalAmount: totalStats._sum.amountCents || 0,
      paidAmount: totalStats._sum.paidAmountCents || 0,
    };
  },
};