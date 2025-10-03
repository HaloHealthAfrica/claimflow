'use client';

// Fallback component when AI cannot suggest codes
import React from 'react';

interface CodeSuggestionFallbackProps {
  reason?: 'insufficient_data' | 'ai_error' | 'no_suggestions' | 'service_unavailable';
  context?: {
    providerName?: string;
    description?: string;
    symptoms?: string;
    diagnosis?: string;
  };
  onRetry?: () => void;
  onManualEntry?: () => void;
}

export default function CodeSuggestionFallback({ 
  reason = 'no_suggestions', 
  context,
  onRetry,
  onManualEntry 
}: CodeSuggestionFallbackProps) {
  const getFallbackContent = () => {
    switch (reason) {
      case 'insufficient_data':
        return {
          icon: (
            <svg className="h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          title: 'Need More Information',
          message: 'To provide accurate code suggestions, we need more details about the medical service.',
          suggestions: [
            'Add a detailed service description',
            'Include symptoms or diagnosis information',
            'Specify the provider specialty',
            'Provide the treatment or procedure details',
          ],
          actionText: 'Try Again with More Details',
        };
      
      case 'ai_error':
        return {
          icon: (
            <svg className="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'AI Service Error',
          message: 'Our AI service encountered an error while processing your request.',
          suggestions: [
            'Check your internet connection',
            'Try again in a few moments',
            'Contact support if the problem persists',
            'Use manual code entry as an alternative',
          ],
          actionText: 'Retry AI Suggestions',
        };
      
      case 'service_unavailable':
        return {
          icon: (
            <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v2m0 16v2m10-10h-2M4 12H2" />
            </svg>
          ),
          title: 'AI Service Unavailable',
          message: 'The AI code suggestion service is temporarily unavailable.',
          suggestions: [
            'Try again later when the service is restored',
            'Use manual code entry for now',
            'Contact your healthcare provider for codes',
            'Check our status page for updates',
          ],
          actionText: 'Check Service Status',
        };
      
      default: // no_suggestions
        return {
          icon: (
            <svg className="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          title: 'No Code Suggestions Available',
          message: 'Our AI couldn\'t generate specific code suggestions based on the provided information.',
          suggestions: [
            'Contact your healthcare provider for the correct codes',
            'Check your medical documentation or receipt',
            'Try providing more specific medical details',
            'Use manual code entry if you have the codes',
          ],
          actionText: 'Try Different Information',
        };
    }
  };

  const content = getFallbackContent();

  return (
    <div className="text-center py-12 px-6">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        {content.icon}
      </div>

      {/* Title and Message */}
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {content.title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {content.message}
      </p>

      {/* Context Information */}
      {context && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
          <h4 className="font-medium text-gray-900 mb-2">Information Provided:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {context.providerName && (
              <li>• Provider: {context.providerName}</li>
            )}
            {context.description && (
              <li>• Description: {context.description.substring(0, 100)}{context.description.length > 100 ? '...' : ''}</li>
            )}
            {context.symptoms && (
              <li>• Symptoms: {context.symptoms.substring(0, 100)}{context.symptoms.length > 100 ? '...' : ''}</li>
            )}
            {context.diagnosis && (
              <li>• Diagnosis: {context.diagnosis.substring(0, 100)}{context.diagnosis.length > 100 ? '...' : ''}</li>
            )}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto text-left">
        <h4 className="font-medium text-blue-900 mb-3">What you can do:</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          {content.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {content.actionText}
          </button>
        )}
        
        {onManualEntry && (
          <button
            onClick={onManualEntry}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Enter Codes Manually
          </button>
        )}
      </div>

      {/* Help Resources */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Need Help?</h4>
        <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
          <a
            href="/help/medical-codes"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Medical Codes Guide
          </a>
          <a
            href="/help/contact"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
          <a
            href="/help/faq"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            FAQ
          </a>
        </div>
      </div>
    </div>
  );
}