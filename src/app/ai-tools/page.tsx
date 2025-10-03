'use client';

// AI Tools page showcasing all AI-powered features
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SuperbillAssistant from '@/components/SuperbillAssistant';
import ClaimValidator from '@/components/ClaimValidator';
import AppealGenerator from '@/components/AppealGenerator';

export default function AIToolsPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<'superbill' | 'validator' | 'appeals'>('superbill');

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  const tabs = [
    {
      id: 'superbill' as const,
      name: 'Smart Superbill',
      description: 'AI-powered medical code suggestions',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'validator' as const,
      name: 'Claim Validator',
      description: 'Validate claims for accuracy and completeness',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'appeals' as const,
      name: 'Appeal Generator',
      description: 'Generate professional appeal letters',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Tools</h1>
          <p className="mt-2 text-gray-600">
            Leverage artificial intelligence to streamline your medical billing and claims management
          </p>
        </div>

        {/* Features Overview */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{tab.name}</h3>
              </div>
              <p className="text-gray-600 text-sm">{tab.description}</p>
            </div>
          ))}
        </div>

        {/* AI Service Status */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">AI Services Active</span>
          </div>
          <p className="text-sm text-blue-800 mt-1">
            All AI-powered features are operational and ready to assist with your medical billing needs.
          </p>
        </div>

        {/* Active Tool */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'superbill' && (
            <div className="p-6">
              <SuperbillAssistant />
            </div>
          )}
          
          {activeTab === 'validator' && (
            <div className="p-6">
              <ClaimValidator />
            </div>
          )}
          
          {activeTab === 'appeals' && (
            <div className="p-6">
              <AppealGenerator />
            </div>
          )}
        </div>

        {/* AI Usage Tips */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Usage Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Provide detailed, accurate information for better AI suggestions</li>
                <li>• Review all AI-generated content before submission</li>
                <li>• Use medical terminology when describing symptoms and treatments</li>
                <li>• Validate suggested codes against your specific use case</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Privacy</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All data is encrypted and HIPAA-compliant</li>
                <li>• AI processing is logged for audit purposes</li>
                <li>• No personal health information is stored by AI services</li>
                <li>• All communications are secure and private</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Comparison</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Smart Superbill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claim Validator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appeal Generator
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Code Suggestions
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Data Validation
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Error Detection
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Letter Generation
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Medical Context
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}