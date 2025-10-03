'use client';

// Enhanced notification hook with Firebase integration
import { useState, useCallback, useEffect } from 'react';
import {
  NotificationData,
  NotificationPreferences,
  NotificationType,
} from '@/lib/notifications';

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
  fetchNotifications: (options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
    refresh?: boolean;
  }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  bulkDelete: (notificationIds: string[]) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  sendNotification: (notificationData: {
    userId?: string;
    userIds?: string[];
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels: ('push' | 'email' | 'in_app')[];
    priority?: 'low' | 'normal' | 'high';
  }) => Promise<any>;
  initializePushNotifications: () => Promise<() => void>;
  clearError: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  const fetchNotifications = useCallback(async (options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
    refresh?: boolean;
  } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.unreadOnly) params.append('unreadOnly', 'true');
      if (options.type) params.append('type', options.type);

      const response = await fetch(`/api/notifications?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch notifications');
      }

      if (options.refresh || options.offset === 0) {
        setNotifications(result.data.notifications);
      } else {
        setNotifications(prev => [...prev, ...result.data.notifications]);
      }

      setHasMore(result.data.hasMore);
      setUnreadCount(result.data.unreadCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to mark notification as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, readAt: new Date() }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMessage);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllAsRead',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          readAt: notification.readAt || new Date(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      setError(errorMessage);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          notificationId,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete notification');
      }

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      // Update unread count if deleted notification was unread
      if (deletedNotification && !deletedNotification.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification';
      setError(errorMessage);
    }
  }, [notifications]);

  const bulkDelete = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'bulkDelete',
          notificationIds,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete notifications');
      }

      // Count unread notifications being deleted
      const unreadBeingDeleted = notifications.filter(
        n => notificationIds.includes(n.id!) && !n.readAt
      ).length;

      // Update local state
      setNotifications(prev => prev.filter(notification => !notificationIds.includes(notification.id!)));
      setUnreadCount(prev => Math.max(0, prev - unreadBeingDeleted));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notifications';
      setError(errorMessage);
    }
  }, [notifications]);

  const fetchPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/preferences');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch preferences');
      }

      setPreferences(result.data.preferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    setPreferencesLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: newPreferences,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update preferences');
      }

      setPreferences(result.data.preferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?countOnly=true');
      const result = await response.json();

      if (result.success) {
        setUnreadCount(result.data.count);
      }
    } catch (err) {
      console.error('Failed to refresh unread count:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize push notifications
  const initializePushNotifications = useCallback(async () => {
    try {
      const { firebaseMessaging } = await import('@/lib/firebase-messaging');
      const success = await firebaseMessaging.initializePushNotifications('current-user-id'); // Replace with actual user ID
      
      if (success) {
        // Set up foreground message listener
        const unsubscribe = firebaseMessaging.onForegroundMessage((payload) => {
          // Show notification
          firebaseMessaging.showNotification({
            title: payload.notification?.title || 'New Notification',
            body: payload.notification?.body || '',
            data: payload.data,
          });
          
          // Refresh notifications list
          refreshUnreadCount();
        });
        
        return unsubscribe;
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
    
    return () => {};
  }, [refreshUnreadCount]);

  // Send notification via API
  const sendNotification = useCallback(async (notificationData: {
    userId?: string;
    userIds?: string[];
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels: ('push' | 'email' | 'in_app')[];
    priority?: 'low' | 'normal' | 'high';
  }) => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to send notification');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Auto-refresh unread count periodically
  useEffect(() => {
    const interval = setInterval(refreshUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // Initialize push notifications on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    initializePushNotifications().then((unsub) => {
      unsubscribe = unsub;
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initializePushNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    preferences,
    preferencesLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkDelete,
    fetchPreferences,
    updatePreferences,
    refreshUnreadCount,
    sendNotification,
    initializePushNotifications,
    clearError,
  };
}