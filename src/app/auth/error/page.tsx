// Authentication error page
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
  AccountInactive: 'Your account has been deactivated. Please contact support.',
  AccountLocked: 'Your account has been locked due to too many failed login attempts.',
  InvalidCredentials: 'Invalid email or password.',
  EmailNotVerified: 'Please verify your email address before signing in.',
  TwoFactorRequired: 'Two-factor authentication is required.',
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') as keyof typeof errorMessages;
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const errorMessage = errorMessages[error] || errorMessages.Default;

  const getErrorIcon = () => {
    switch (error) {
      case 'AccountInactive':
      case 'AccountLocked':
        return <AlertCircle className="h-16 w-16 text-red-500" />;
      default:
        return <AlertCircle className="h-16 w-16 text-yellow-500" />;
    }
  };

  const getErrorColor = () => {
    switch (error) {
      case 'AccountInactive':
      case 'AccountLocked':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const showRetryButton = () => {
    return !['AccountInactive', 'AccountLocked'].includes(error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {getErrorIcon()}
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          
          <p className={`mt-2 text-sm ${getErrorColor()}`}>
            {errorMessage}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {/* Error-specific actions */}
          {error === 'AccountInactive' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Account Deactivated
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Your account has been deactivated. This may be due to:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Violation of terms of service</li>
                      <li>Security concerns</li>
                      <li>Administrative action</li>
                    </ul>
                    <p className="mt-2">
                      Please contact our support team for assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error === 'AccountLocked' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Account Temporarily Locked
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your account has been temporarily locked due to multiple failed login attempts.
                    </p>
                    <p className="mt-2">
                      Please wait 15 minutes before trying again, or use the "Forgot Password" option to reset your password.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error === 'EmailNotVerified' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Email Verification Required
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Please check your email and click the verification link before signing in.
                    </p>
                    <p className="mt-2">
                      Didn't receive the email? Check your spam folder or contact support.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col space-y-3">
            {showRetryButton() && (
              <Link
                href="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Link>
            )}

            {(error === 'AccountLocked' || error === 'InvalidCredentials') && (
              <Link
                href="/auth/forgot-password"
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Reset Password
              </Link>
            )}

            <Link
              href="/"
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Support contact */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a
                href="mailto:support@claimflow.com"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>

        {/* Debug information (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Debug Information
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Error:</strong> {error || 'None'}</p>
              <p><strong>Callback URL:</strong> {callbackUrl}</p>
              <p><strong>All Params:</strong> {searchParams.toString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}