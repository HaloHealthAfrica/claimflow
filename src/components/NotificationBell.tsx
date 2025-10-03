'use client';

// Notification bell component for header
import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Initial load
    refreshUnreadCount();
    
    // Set up periodic refresh
    const interval = setInterval(refreshUnreadCount, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md ${className}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM4 4h7l5 5v7H4V4z"
          />
        </svg>
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[1.25rem] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Pulse animation for new notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 translate-x-1/2 -translate-y-1/2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          </span>
        )}
      </button>

      <NotificationCenter
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  );
}