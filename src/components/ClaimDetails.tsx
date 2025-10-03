'use client';

// Comprehensive claim details component with timeline and document access
import React, { useState, useEffect } from 'react';
import { ClaimData } from './ClaimCard';
import { formatDistanceToNow, format } from 'date-fns';

interface ClaimTimelineEvent {
  id: string;
  type: 'CREATED' | 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'DENIED' | 'PAID' | 'DOCUMENT_UPLOADED' | 'STATUS_UPDATED';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
  user?: string;
}

interface ClaimDocument {
  id: string;
  name: string;
  type: 'RECEIPT' | 'INSURANCE_CARD' | 'MEDICAL_RECORD' | 'APPEAL_LETTER' | 'PAYMENT_RECEIPT' | 'OTHER';
  size: number;
  uploadedAt: string;
  url?: string;
}

interface ClaimDetailsProps {
  claim: ClaimData;
  onClose?: () => void;
  onStatusUpdate?: (claimId: string, newStatus: string) => void;
  onAppeal?: (claimId: string) => void;
  className?: string;
}

export default function ClaimDetails({ 
  claim, 
  onClose, 
  onStatusUpdate, 
  onAppeal,
  className = '' 
}: ClaimDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents' | 'codes'>('overview');
  const [timeline, setTimeline] = useState<ClaimTimelineEvent[]>([]);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load timeline and documents
    loadClaimTimeline();
    loadClaimDocuments();
  }, [claim.id]);

  const loadClaimTimeline = async () => {
    setLoading(true);
    try {
      // Mock timeline data - in real app, fetch from API
      const mockTimeline: ClaimTimelineEvent[] = [
        {
          id: '1',
          type: 'CREATED',
          title: 'Claim Created',
          description: 'Claim was created and saved as draft',
          timestamp: claim.createdAt,
          user: 'You',
        },
        ...(claim.submittedAt ? [{
          id: '2',
          type: 'SUBMITTED' as const,
          title: 'Claim Submitted',
          description: 'Claim was submitted to insurance company',
          timestamp: claim.submittedAt,
          user: 'System',
        }] : []),
        ...(claim.status === 'PROCESSING' ? [{
          id: '3',
          type: 'PROCESSING' as const,
          title: 'Processing Started',
          description: 'Insurance company began processing your claim',
          timestamp: claim.updatedAt,
          user: 'Insurance Company',
        }] : []),
        ...(claim.status === 'APPROVED' && claim.processedAt ? [{
          id: '4',
          type: 'APPROVED' as const,
          title: 'Claim Approved',
          description: 'Your claim has been approved for payment',
          timestamp: claim.processedAt,
          user: 'Insurance Company',
        }] : []),
        ...(claim.status === 'DENIED' && claim.processedAt ? [{
          id: '4',
          type: 'DENIED' as const,
          title: 'Claim Denied',
          description: claim.denialReason || 'Claim was denied by insurance company',
          timestamp: claim.processedAt,
          user: 'Insurance Company',
        }] : []),
        ...(claim.status === 'PAID' && claim.paidAt ? [{
          id: '5',
          type: 'PAID' as const,
          title: 'Payment Processed',
          description: `Payment of ${formatAmount(claim.paymentAmount || claim.amountCents)} was processed`,
          timestamp: claim.paidAt,
          user: 'Insurance Company',
        }] : []),
      ];
      
      setTimeline(mockTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClaimDocuments = async () => {
    try {
      // Mock documents data - in real app, fetch from API
      const mockDocuments: ClaimDocument[] = [
        {
          id: '1',
          name: 'Medical Receipt.pdf',
          type: 'RECEIPT',
          size: 245760,
          uploadedAt: claim.createdAt,
          url: '/api/documents/1',
        },
        {
          id: '2',
          name: 'Insurance Card.jpg',
          type: 'INSURANCE_CARD',
          size: 156432,
          uploadedAt: claim.createdAt,
          url: '/api/documents/2',
        },
      ];
      
      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'CREATED':
        return (
          <div className="bg-gray-100 rounded-full p-2">
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'SUBMITTED':
        return (
          <div className="bg-blue-100 rounded-full p-2">
            <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case 'PROCESSING':
        return (
          <div className="bg-yellow-100 rounded-full p-2">
            <svg className="h-4 w-4 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="bg-green-100 rounded-full p-2">
            <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'DENIED':
        return (
          <div className="bg-red-100 rounded-full p-2">
            <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'PAID':
        return (
          <div className="bg-emerald-100 rounded-full p-2">
            <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 rounded-full p-2">
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return (
          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'INSURANCE_CARD':
        return (
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Claim {claim.id.substring(0, 8)}
            </h2>
            <p className="text-sm text-gray-500">
              {claim.claimNumber && `#${claim.claimNumber} • `}
              {formatAmount(claim.amountCents)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {claim.status === 'DENIED' && (
              <button
                onClick={() => onAppeal?.(claim.id)}
                className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100"
              >
                File Appeal
              </button>
            )}
            
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'documents', label: 'Documents' },
            { id: 'codes', label: 'Medical Codes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status and Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Claim Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      claim.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      claim.status === 'DENIED' ? 'bg-red-100 text-red-800' :
                      claim.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {claim.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Submitted</span>
                    <span className="text-sm text-gray-900">
                      {claim.submittedAt ? format(new Date(claim.submittedAt), 'MMM d, yyyy') : 'Not submitted'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="text-sm text-gray-900">
                      {formatDistanceToNow(new Date(claim.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Claim Amount</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatAmount(claim.amountCents)}
                    </span>
                  </div>
                  
                  {claim.paymentAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Payment Amount</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatAmount(claim.paymentAmount)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Service Date</span>
                    <span className="text-sm text-gray-900">
                      {claim.dateOfService ? format(new Date(claim.dateOfService), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider and Insurance Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Provider Information</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{claim.providerName || 'Unknown Provider'}</p>
                  <p className="text-sm text-gray-500">Healthcare Provider</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Insurance Information</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{claim.insurerName || 'Insurance Company'}</p>
                  <p className="text-sm text-gray-500">Primary Insurance</p>
                </div>
              </div>
            </div>

            {/* Denial Information */}
            {claim.status === 'DENIED' && claim.denialReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-900 mb-2">Denial Information</h3>
                <p className="text-sm text-red-700">{claim.denialReason}</p>
                <div className="mt-3">
                  <button
                    onClick={() => onAppeal?.(claim.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    File an Appeal →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Claim Timeline</h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {timeline.map((event, eventIdx) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {eventIdx !== timeline.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>{getTimelineIcon(event.type)}</div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{event.title}</p>
                              <p className="text-sm text-gray-500">{event.description}</p>
                              {event.user && (
                                <p className="text-xs text-gray-400 mt-1">by {event.user}</p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={event.timestamp}>
                                {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
                Upload Document
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((document) => (
                <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{document.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{document.type.replace('_', ' ').toLowerCase()}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(document.size)}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <button className="text-xs text-blue-600 hover:text-blue-800">View</button>
                    <button className="text-xs text-blue-600 hover:text-blue-800">Download</button>
                    <button className="text-xs text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              ))}
              
              {documents.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">CPT Codes</h3>
                <div className="space-y-2">
                  {claim.cptCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="font-mono text-sm font-medium text-blue-900">{code}</span>
                      <span className="text-xs text-blue-600">Procedure Code</span>
                    </div>
                  ))}
                  {claim.cptCodes.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No CPT codes assigned</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">ICD Codes</h3>
                <div className="space-y-2">
                  {claim.icdCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="font-mono text-sm font-medium text-green-900">{code}</span>
                      <span className="text-xs text-green-600">Diagnosis Code</span>
                    </div>
                  ))}
                  {claim.icdCodes.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No ICD codes assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}