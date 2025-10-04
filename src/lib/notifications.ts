// Notification system types and utilities
export type NotificationType = 
  | 'claim_submitted'
  | 'claim_approved'
  | 'claim_denied'
  | 'claim_processing'
  | 'payment_received'
  | 'document_required'
  | 'appeal_submitted'
  | 'appeal_approved'
  | 'appeal_denied'
  | 'system_maintenance'
  | 'security_alert';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: {
    [K in NotificationType]: {
      email: boolean;
      push: boolean;
      sms: boolean;
      inApp: boolean;
    };
  };
}

export class NotificationHelpers {
  static getDefaultPreferences(): NotificationPreferences {
    const defaultTypePrefs = {
      email: true,
      push: true,
      sms: false,
      inApp: true,
    };

    return {
      email: true,
      push: true,
      sms: false,
      inApp: true,
      types: {
        claim_submitted: defaultTypePrefs,
        claim_approved: { ...defaultTypePrefs, sms: true },
        claim_denied: { ...defaultTypePrefs, sms: true },
        claim_processing: defaultTypePrefs,
        payment_received: { ...defaultTypePrefs, sms: true },
        document_required: { ...defaultTypePrefs, sms: true },
        appeal_submitted: defaultTypePrefs,
        appeal_approved: { ...defaultTypePrefs, sms: true },
        appeal_denied: { ...defaultTypePrefs, sms: true },
        system_maintenance: { ...defaultTypePrefs, sms: false },
        security_alert: { ...defaultTypePrefs, sms: true },
      },
    };
  }

  static formatNotificationMessage(type: NotificationType, data: any): { title: string; message: string } {
    switch (type) {
      case 'claim_submitted':
        return {
          title: 'Claim Submitted',
          message: `Your claim #${data.claimId} has been submitted successfully.`,
        };
      case 'claim_approved':
        return {
          title: 'Claim Approved',
          message: `Great news! Your claim #${data.claimId} has been approved for $${data.amount}.`,
        };
      case 'claim_denied':
        return {
          title: 'Claim Denied',
          message: `Your claim #${data.claimId} has been denied. Reason: ${data.reason}`,
        };
      case 'claim_processing':
        return {
          title: 'Claim Processing',
          message: `Your claim #${data.claimId} is currently being processed.`,
        };
      case 'payment_received':
        return {
          title: 'Payment Received',
          message: `Payment of $${data.amount} for claim #${data.claimId} has been processed.`,
        };
      case 'document_required':
        return {
          title: 'Documents Required',
          message: `Additional documents are required for claim #${data.claimId}.`,
        };
      case 'appeal_submitted':
        return {
          title: 'Appeal Submitted',
          message: `Your appeal for claim #${data.claimId} has been submitted.`,
        };
      case 'appeal_approved':
        return {
          title: 'Appeal Approved',
          message: `Your appeal for claim #${data.claimId} has been approved.`,
        };
      case 'appeal_denied':
        return {
          title: 'Appeal Denied',
          message: `Your appeal for claim #${data.claimId} has been denied.`,
        };
      case 'system_maintenance':
        return {
          title: 'System Maintenance',
          message: 'The system will be under maintenance from ${data.startTime} to ${data.endTime}.',
        };
      case 'security_alert':
        return {
          title: 'Security Alert',
          message: data.message || 'A security event has been detected on your account.',
        };
      default:
        return {
          title: 'Notification',
          message: 'You have a new notification.',
        };
    }
  }

  static getPriorityLevel(type: NotificationType): 'low' | 'medium' | 'high' | 'urgent' {
    switch (type) {
      case 'security_alert':
        return 'urgent';
      case 'claim_approved':
      case 'claim_denied':
      case 'payment_received':
      case 'document_required':
        return 'high';
      case 'claim_submitted':
      case 'appeal_submitted':
      case 'appeal_approved':
      case 'appeal_denied':
        return 'medium';
      case 'claim_processing':
      case 'system_maintenance':
        return 'low';
      default:
        return 'medium';
    }
  }

  static shouldSendNotification(
    type: NotificationType,
    preferences: NotificationPreferences,
    channel: 'email' | 'push' | 'sms' | 'inApp'
  ): boolean {
    return preferences.types[type]?.[channel] ?? false;
  }
}

export default NotificationHelpers;