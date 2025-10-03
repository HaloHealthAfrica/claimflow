// Firebase Cloud Messaging integration for push notifications
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

// Firebase configuration (in production, use environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class FirebaseMessagingService {
  private messaging: any = null;
  private vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  constructor() {
    if (typeof window !== 'undefined') {
      this.messaging = getMessaging(app);
    }
  }

  // Request notification permission and get FCM token
  async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        console.warn('Firebase messaging not available (server-side)');
        return null;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey,
      });

      if (token) {
        console.log('FCM Token:', token);
        // Store token in localStorage for persistence
        localStorage.setItem('fcm_token', token);
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Get stored FCM token
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fcm_token');
  }

  // Register FCM token with backend
  async registerToken(userId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token,
          platform: 'web',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  }

  // Listen for foreground messages
  onForegroundMessage(callback: (payload: any) => void) {
    if (!this.messaging) return () => {};

    return onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
    });
  }

  // Show notification using Notification API
  showNotification(payload: PushNotificationPayload) {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/notification-icon.png',
        badge: payload.badge || '/icons/notification-badge.png',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: true,
        tag: payload.data?.claimId || 'general',
      });

      notification.onclick = (event) => {
        event.preventDefault();
        
        // Handle notification click
        if (payload.data?.actionUrl) {
          window.open(payload.data.actionUrl, '_blank');
        }
        
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  }

  // Initialize push notifications for user
  async initializePushNotifications(userId: string): Promise<boolean> {
    try {
      // Check if already initialized
      const existingToken = this.getStoredToken();
      if (existingToken) {
        await this.registerToken(userId, existingToken);
        return true;
      }

      // Request new token
      const token = await this.requestPermissionAndGetToken();
      if (token) {
        await this.registerToken(userId, token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  // Unregister FCM token
  async unregisterToken(userId: string): Promise<boolean> {
    try {
      const token = this.getStoredToken();
      if (!token) return true;

      const response = await fetch('/api/notifications/unregister-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token,
        }),
      });

      if (response.ok) {
        localStorage.removeItem('fcm_token');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
      return false;
    }
  }
}

// Singleton instance
export const firebaseMessaging = new FirebaseMessagingService();