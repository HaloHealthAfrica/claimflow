'use client';

// Notification banner component for displaying system-wide notifications
import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface SystemNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'maintenance';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  dismissible?: boolean;
  persistent?: boolean;
  expiresAt?: Date;
}

interface NotificationBannerProps {
  className?: string;
}

export default function NotificationBanner({ className = '' }: NotificationBannerProps) {
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const { notifications, unreadCount } = useNotifications();

  useEffect(() => {
    // Load system notifications (in real app, fetch from API)
    loadSystemNotifications();
    
    // Load dismissed notifications from localStorage
    const dismissed = localStorage.getItem('dismissed_notifications');
    if (dismissed) {
      setDismissedNotifications(new Set(JSON.parse(dismissed)));
    }
  }, []);

  const loadSystemNotifications = async () => {
    try {
      // Mock system notifications - in real app, fetch from API
      const mockNotifications: SystemNotification[] = [
        // Example maintenance notification
        // {
        //   id: 'maintenance-2024-01',
        //   type: 'warning',
        //   title: 'Scheduled Maintenance',
        //   message: 'We will be performing system maintenance on January 15th from 2:00 AM to 4:00 AM EST. Some features may be temporarily unavailable.',
        //   dismissible: true,
        //   expiresAt: new Date('2024-01-16'),
        // },
      ];

      // Filter out expired notifications
      const activeNotifications = mockNotifications.filter(notification => 
        !notification.expiresAt || notification.expiresAt > new Date()
      );

      setSystemNotifications(activeNotifications);
    } catch (error) {
      console.error('Failed to load system notifications:', error);
    }
  };

  const handleDismiss = (notificationId: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(notificationId);
    setDismissedNotifications(newDismissed);
    
    // Persist to localStorage
    localStorage.setItem('dismissed_notifications', JSON.stringify(Array.from(newDismissed)));
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-400',
          title: 'text-green-800',
          message: 'text-green-700',
          button: 'text-green-800 hover:bg-green-100',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-400',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'text-yellow-800 hover:bg-yellow-100',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'text-red-800 hover:bg-red-100',
        };
      case 'maintenance':
        return {
          container: 'bg-purple-50 border-purple-200',
          icon: 'text-purple-400',
          title: 'text-purple-800',
          message: 'text-purple-700',
          button: 'text-purple-800 hover:bg-purple-100',
        };
      default: // info
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-400',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'text-blue-800 hover:bg-blue-100',
        };
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default: // info
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Filter notifications to show
  const visibleNotifications = systemNotifications.filter(notification => 
    !dismissedNotifications.has(notification.id) && 
    (!notification.expiresAt || notification.expiresAt > new Date())
  );

  // Show unread count banner if there are unread notifications
  const showUnreadBanner = unreadCount > 0 && unreadCount <= 5; // Only show for reasonable numbers

  if (visibleNotifications.length === 0 && !showUnreadBanner) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Unread notifications banner */}
      {showUnreadBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 4h7l5 5v7H4V4z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-blue-700">
                  Check your notifications for important updates about your claims.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => window.location.href = '/notifications'}
                className="text-sm font-medium text-blue-800 hover:bg-blue-100 px-3 py-1 rounded-md"
              >
                View All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System notifications */}
      {visibleNotifications.map((notification) => {
        const styles = getNotificationStyles(notification.type);
        
        return (
          <div key={notification.id} className={`border rounded-lg p-4 ${styles.container}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className={styles.icon}>
                  {getNotificationIcon(notification.type)}
                </div>
              </div>
              
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${styles.title}`}>
                  {notification.title}
                </h3>
                <p className={`mt-1 text-sm ${styles.message}`}>
                  {notification.message}
                </p>
                
                {notification.actionText && notification.actionUrl && (
                  <div className="mt-3">
                    <a
                      href={notification.actionUrl}
                      className={`text-sm font-medium ${styles.button} underline`}
                    >
                      {notification.actionText}
                    </a>
                  </div>
                )}
              </div>
              
              {notification.dismissible && (
                <div className="flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className={`text-sm ${styles.button} p-1 rounded-md`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}