// API route for sending notifications via multiple channels
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendGridEmail } from '@/lib/sendgrid-email';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  type: 'CLAIM_SUBMITTED' | 'CLAIM_APPROVED' | 'CLAIM_DENIED' | 'PAYMENT_RECEIVED' | 'CUSTOM';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('push' | 'email' | 'in_app')[];
  priority?: 'low' | 'normal' | 'high';
  emailTemplate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body: NotificationRequest = await request.json();
    const { userId, userIds, type, title, message, data, channels, priority = 'normal', emailTemplate } = body;

    // Determine target users
    const targetUserIds = userId ? [userId] : userIds || [user.id];
    
    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_RECIPIENTS', message: 'No recipients specified' } },
        { status: 400 }
      );
    }

    const results = {
      push: { success: 0, failed: 0 },
      email: { success: 0, failed: 0 },
      inApp: { success: 0, failed: 0 },
    };

    // Process each user
    for (const targetUserId of targetUserIds) {
      // Get user details and preferences
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          notificationPreferences: true,
          fcmTokens: {
            where: { isActive: true },
          },
        },
      });

      if (!targetUser) {
        console.warn(`User ${targetUserId} not found`);
        continue;
      }

      const preferences = targetUser.notificationPreferences;

      // Send push notifications
      if (channels.includes('push') && preferences?.pushEnabled && targetUser.fcmTokens.length > 0) {
        try {
          const pushPayload = {
            notification: {
              title,
              body: message,
            },
            data: {
              type,
              ...data,
            },
            android: {
              priority: priority === 'high' ? 'high' : 'normal',
              notification: {
                icon: 'notification_icon',
                color: '#007bff',
                sound: 'default',
              },
            },
            apns: {
              payload: {
                aps: {
                  badge: 1,
                  sound: 'default',
                },
              },
            },
            webpush: {
              notification: {
                icon: '/icons/notification-icon.png',
                badge: '/icons/notification-badge.png',
                requireInteraction: priority === 'high',
              },
            },
          };

          const tokens = targetUser.fcmTokens.map(t => t.token);
          const response = await admin.messaging().sendMulticast({
            tokens,
            ...pushPayload,
          });

          results.push.success += response.successCount;
          results.push.failed += response.failureCount;

          // Clean up invalid tokens
          if (response.responses.some(r => !r.success)) {
            const invalidTokens = response.responses
              .map((r, i) => r.success ? null : tokens[i])
              .filter(Boolean);

            if (invalidTokens.length > 0) {
              await prisma.fcmToken.updateMany({
                where: {
                  token: { in: invalidTokens },
                },
                data: { isActive: false },
              });
            }
          }
        } catch (error) {
          console.error('Push notification error:', error);
          results.push.failed += targetUser.fcmTokens.length;
        }
      }

      // Send email notifications
      if (channels.includes('email') && preferences?.emailEnabled && targetUser.email) {
        try {
          let emailNotification;

          // Use predefined templates for specific types
          switch (type) {
            case 'CLAIM_SUBMITTED':
              emailNotification = sendGridEmail.generateClaimSubmittedEmail(targetUser.email, data);
              break;
            case 'CLAIM_APPROVED':
              emailNotification = sendGridEmail.generateClaimApprovedEmail(targetUser.email, data);
              break;
            case 'CLAIM_DENIED':
              emailNotification = sendGridEmail.generateClaimDeniedEmail(targetUser.email, data);
              break;
            case 'PAYMENT_RECEIVED':
              emailNotification = sendGridEmail.generatePaymentReceivedEmail(targetUser.email, data);
              break;
            default:
              // Custom notification
              emailNotification = {
                to: targetUser.email,
                subject: title,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                      <h2 style="color: #007bff; margin-bottom: 20px;">${title}</h2>
                      <div style="background-color: white; padding: 20px; border-radius: 8px;">
                        <p style="margin: 0; line-height: 1.6;">${message}</p>
                      </div>
                    </div>
                  </div>
                `,
                text: `${title}\n\n${message}`,
              };
          }

          const emailSent = await sendGridEmail.sendEmail(emailNotification);
          if (emailSent) {
            results.email.success++;
          } else {
            results.email.failed++;
          }
        } catch (error) {
          console.error('Email notification error:', error);
          results.email.failed++;
        }
      }

      // Create in-app notification
      if (channels.includes('in_app')) {
        try {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              type,
              title,
              message,
              priority: priority.toUpperCase(),
              channels: channels,
              metadata: data || {},
              actionUrl: data?.actionUrl,
              actionText: data?.actionText,
            },
          });

          results.inApp.success++;
        } catch (error) {
          console.error('In-app notification error:', error);
          results.inApp.failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Notifications sent',
        results,
        recipients: targetUserIds.length,
      },
    });
  } catch (error) {
    console.error('Failed to send notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Failed to send notifications',
        },
      },
      { status: 500 }
    );
  }
}