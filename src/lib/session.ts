/* eslint-disable @typescript-eslint/no-explicit-any */
// Session management utilities
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { prisma, createAuditLog } from './db';

// Get current user session on server side
export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

// Get current user with full profile data
export async function getCurrentUserProfile() {
  const session = await getCurrentSession();
  
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        insurance: true,
        claims: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Latest 10 claims
        },
        notifications: {
          where: { read: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Middleware to require authentication
export async function requireAuthentication() {
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  return session.user;
}

// Log user activity for audit trail
export async function logUserActivity(
  action: string,
  resource: string,
  details: any,
  request?: Request
) {
  const session = await getCurrentSession();
  
  if (!session?.user?.id) {
    return;
  }

  const ipAddress = request?.headers.get('x-forwarded-for') || 
                   request?.headers.get('x-real-ip') || 
                   'unknown';
  
  const userAgent = request?.headers.get('user-agent') || 'unknown';

  await createAuditLog(
    session.user.id,
    action,
    resource,
    details,
    ipAddress,
    userAgent
  );
}

// Check if user has access to resource
export async function checkResourceAccess(
  resourceType: 'claim' | 'insurance' | 'notification',
  resourceId: string
) {
  const session = await getCurrentSession();
  
  if (!session?.user?.id) {
    return false;
  }

  try {
    switch (resourceType) {
      case 'claim':
        const claim = await prisma.claim.findFirst({
          where: {
            id: resourceId,
            userId: session.user.id,
          },
        });
        return !!claim;

      case 'insurance':
        const insurance = await prisma.insuranceProfile.findFirst({
          where: {
            id: resourceId,
            userId: session.user.id,
          },
        });
        return !!insurance;

      case 'notification':
        const notification = await prisma.notification.findFirst({
          where: {
            id: resourceId,
            userId: session.user.id,
          },
        });
        return !!notification;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking resource access:', error);
    return false;
  }
}

// Update user's last activity timestamp
export async function updateLastActivity() {
  const session = await getCurrentSession();
  
  if (!session?.user?.id) {
    return;
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
}