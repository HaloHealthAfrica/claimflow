'use client';

// Notification preferences management component
import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPreferences } from '@/lib/notifications';

interface NotificationPreferencesProps {
  className?: string;
}

export default function NotificationPreferencesComponent({ className = '' }: NotificationPreferencesProps) {
  const {
    preferences,
    preferencesLoading,
    fetchPreferences,
    updatePreferences,
    error,
    clearError,
  } = useNotifications();

  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    if (!localPreferences) return;

    const updated = { ...localPreferences, [key]: value };
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleQuietHoursChange = (key: 'enabled' | 'startTime' | 'endTime', value: any) => {
    if (!localPreferences) return;

    const updated = {
      ...localPreferences,
      quietHours: {
        ...localPreferences.quietHours,
        [key]: value,
      },
    };
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localPreferences || !hasChanges) return;

    setSaving(true);
    try {
      await updatePreferences(localPreferences);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  };

  if (preferencesLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!localPreferences) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Unable to load notification preferences</p>
          <button
            onClick={fetchPreferences}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences</h2>
          <p className="text-sm text-gray-600">
            Customize how and when you receive notifications about your claims and account activity.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Delivery Methods */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-4">Delivery Methods</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                  <p className="text-xs text-gray-500">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.emailEnabled}
                  onChange={(e) => handlePreferenceChange('emailEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                  <p className="text-xs text-gray-500">Receive browser push notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.pushEnabled}
                  onChange={(e) => handlePreferenceChange('pushEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                  <p className="text-xs text-gray-500">Receive notifications via text message</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.smsEnabled}
                  onChange={(e) => handlePreferenceChange('smsEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-4">Notification Types</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Claim Updates</label>
                  <p className="text-xs text-gray-500">Status changes, approvals, and denials</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.claimUpdates}
                  onChange={(e) => handlePreferenceChange('claimUpdates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Alerts</label>
                  <p className="text-xs text-gray-500">Payment processing and receipt confirmations</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.paymentAlerts}
                  onChange={(e) => handlePreferenceChange('paymentAlerts', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Document Reminders</label>
                  <p className="text-xs text-gray-500">Upload reminders and document processing updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.documentReminders}
                  onChange={(e) => handlePreferenceChange('documentReminders', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Security Alerts</label>
                  <p className="text-xs text-gray-500">Account security and login notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.securityAlerts}
                  onChange={(e) => handlePreferenceChange('securityAlerts', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Marketing Emails</label>
                  <p className="text-xs text-gray-500">Product updates and promotional content</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.marketingEmails}
                  onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Weekly Digest</label>
                  <p className="text-xs text-gray-500">Weekly summary of account activity</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.weeklyDigest}
                  onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-4">Quiet Hours</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Quiet Hours</label>
                  <p className="text-xs text-gray-500">Pause non-urgent notifications during specified hours</p>
                </div>
                <input
                  type="checkbox"
                  checked={localPreferences.quietHours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {localPreferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={localPreferences.quietHours.startTime}
                      onChange={(e) => handleQuietHoursChange('startTime', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={localPreferences.quietHours.endTime}
                      onChange={(e) => handleQuietHoursChange('endTime', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {hasChanges && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Changes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}