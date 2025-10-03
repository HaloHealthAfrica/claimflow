// Prisma client configuration with connection pooling and error handling
import { PrismaClient } from '@prisma/client';

// Extend PrismaClient with custom methods and middleware
class ExtendedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'pretty',
    });

    // Add middleware for audit logging
    this.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      // Log slow queries in development
      if (process.env.NODE_ENV === 'development' && after - before > 1000) {
        console.warn(`Slow query detected: ${params.model}.${params.action} took ${after - before}ms`);
      }

      return result;
    });

    // Add middleware for soft deletes (if needed)
    this.$use(async (params, next) => {
      // Handle soft deletes for specific models
      if (params.action === 'delete' && params.model === 'User') {
        // Convert delete to update with isActive = false
        params.action = 'update';
        params.args['data'] = { isActive: false };
      }

      if (params.action === 'findMany' && params.model === 'User') {
        // Filter out inactive users by default
        if (params.args.where) {
          if (params.args.where.isActive === undefined) {
            params.args.where['isActive'] = true;
          }
        } else {
          params.args['where'] = { isActive: true };
        }
      }

      return next(params);
    });
  }

  // Custom method for health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Custom method for getting database stats
  async getDatabaseStats() {
    try {
      const [
        userCount,
        claimCount,
        insuranceProfileCount,
        documentCount,
      ] = await Promise.all([
        this.user.count({ where: { isActive: true } }),
        this.claim.count(),
        this.insuranceProfile.count({ where: { isActive: true } }),
        this.document.count(),
      ]);

      return {
        users: userCount,
        claims: claimCount,
        insuranceProfiles: insuranceProfileCount,
        documents: documentCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  // Custom method for cleaning up old audit logs
  async cleanupAuditLogs(retentionDays: number = 2555) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`Cleaned up ${result.count} old audit log entries`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  // Custom method for user statistics
  async getUserStats(userId: string) {
    try {
      const [
        claimCount,
        submittedClaimCount,
        approvedClaimCount,
        totalAmountCents,
        insuranceProfileCount,
        documentCount,
      ] = await Promise.all([
        this.claim.count({ where: { userId } }),
        this.claim.count({ where: { userId, status: 'SUBMITTED' } }),
        this.claim.count({ where: { userId, status: 'APPROVED' } }),
        this.claim.aggregate({
          where: { userId },
          _sum: { amountCents: true },
        }),
        this.insuranceProfile.count({ where: { userId, isActive: true } }),
        this.document.count({ where: { userId } }),
      ]);

      return {
        totalClaims: claimCount,
        submittedClaims: submittedClaimCount,
        approvedClaims: approvedClaimCount,
        totalAmountCents: totalAmountCents._sum.amountCents || 0,
        insuranceProfiles: insuranceProfileCount,
        documents: documentCount,
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      throw error;
    }
  }
}

// Global instance management for Next.js hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new ExtendedPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection management
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: ExtendedPrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback);
}

// Error handling helper
export function handlePrismaError(error: any) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    return {
      type: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: 'A record with this information already exists',
      field: error.meta?.target?.[0] || 'unknown',
    };
  }

  if (error.code === 'P2025') {
    // Record not found
    return {
      type: 'RECORD_NOT_FOUND',
      message: 'The requested record was not found',
    };
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return {
      type: 'FOREIGN_KEY_VIOLATION',
      message: 'Cannot delete record due to related data',
    };
  }

  // Generic database error
  return {
    type: 'DATABASE_ERROR',
    message: 'A database error occurred',
    originalError: error.message,
  };
}

// Type exports for convenience
export type {
  User,
  Claim,
  InsuranceProfile,
  Document,
  ClaimTimeline,
  Appeal,
  Notification,
  AuditLog,
  CPTCode,
  ICDCode,
  SystemConfig,
  ClaimStatus,
  SubmissionMethod,
  DocumentType,
  NotificationType,
} from '@prisma/client';

export default prisma;