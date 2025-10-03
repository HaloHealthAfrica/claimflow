// Authentication utilities and session management
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { userUtils } from './db-utils';
import { auditLogger } from './audit-logger';

// Re-export auth options for consistency
export { authOptions };

// Server-side session helper
export async function getSession() {
  return await getServerSession(authOptions);
}

// Get current user from session
export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        emailVerified: true,
        isActive: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Session validation
export const validateSession = (session: any): boolean => {
  return !!(session?.user?.id && session?.user?.email && session?.user?.isActive);
};

// Check if user has permission for resource
export async function checkUserPermission(
  userId: string,
  resource: string,
  action: string = 'read'
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return false;
    }

    // For now, all active users have basic permissions
    // This can be extended with role-based access control
    return true;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// Require authentication wrapper
export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  if (!session.user.isActive) {
    throw new Error('Account inactive');
  }

  return session;
}

// User registration helper
export async function registerUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
}) {
  try {
    // Check if user already exists
    const existingUser = await userUtils.findByEmail(userData.email);
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const user = await userUtils.createUser({
      ...userData,
      password: hashedPassword,
    });

    return user;
  } catch (error) {
    console.error('User registration error:', error);
    throw error;
  }
}

// Password reset utilities
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    const user = await userUtils.findByEmail(email);
    
    if (!user || !user.isActive) {
      return null;
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    await auditLogger.log({
      userId: user.id,
      action: 'PASSWORD_RESET_TOKEN_GENERATED',
      entityType: 'User',
      entityId: user.id,
      success: true,
    });

    return token;
  } catch (error) {
    console.error('Password reset token generation error:', error);
    return null;
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
        isActive: true,
      },
    });

    if (!user) {
      return false;
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    await auditLogger.log({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      success: true,
    });

    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    return false;
  }
}

// Account security utilities
export async function lockUserAccount(userId: string, reason: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    await auditLogger.log({
      userId,
      action: 'ACCOUNT_LOCKED',
      entityType: 'User',
      entityId: userId,
      success: true,
      errorMessage: reason,
    });
  } catch (error) {
    console.error('Account lock error:', error);
    throw error;
  }
}

export async function unlockUserAccount(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        lockedUntil: null,
        loginAttempts: 0,
      },
    });

    await auditLogger.log({
      userId,
      action: 'ACCOUNT_UNLOCKED',
      entityType: 'User',
      entityId: userId,
      success: true,
    });
  } catch (error) {
    console.error('Account unlock error:', error);
    throw error;
  }
}