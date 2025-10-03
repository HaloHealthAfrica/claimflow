'use client';

// Comprehensive claim card component with status indicators
import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface ClaimData {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'DENIED' | 'PAID';
  amountCents: number;
  dateOfService?: string;
  submittedAt?: string;
  processedAt?: string;
  paidAt?: string;
  denialReason?: string;
  paymentAmount?: number;
  cptCodes: string[];
  icdCodes: string[];
  providerName?: string;
  insurerName?: string;
  claimNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClaimCardProps {
  claim: ClaimData;
  onClick?: (claim: ClaimData) => void;
  onStatusUpdate?: (claimId: string, newStatus: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export default function ClaimCard({ 
  claim, 
  onClick, 
  onStatusUpdate, 
  showActions = true, 
  compact = false,
  className = '' 
}: ClaimCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DENIED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'SUBMITTED':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'PROCESSING':
        return (
          <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'APPROVED':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'DENIED':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'PAID':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'DRAFT': return 10;
      case 'SUBMITTED': return 30;
      case 'PROCESSING': return 60;
      case 'APPROVED': return 90;
      case 'PAID': return 100;
      case 'DENIED': return 100;
      default: return 0;
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(claim);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(claim.id, newStatus);
    }
  };

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      } ${compact ? 'p-4' : 'p-6'} ${className}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
              {getStatusIcon(claim.status)}
              {claim.status}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Claim {claim.id.substring(0, 8)}
            </h3>
            {claim.claimNumber && (
              <p className="text-sm text-gray-500">#{claim.claimNumber}</p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {formatAmount(claim.amountCents)}
          </div>
          {claim.paymentAmount && claim.paymentAmount !== claim.amountCents && (
            <div className="text-sm text-green-600">
              Paid: {formatAmount(claim.paymentAmount)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!compact && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{getProgressPercentage(claim.status)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                claim.status === 'DENIED' ? 'bg-red-500' : 
                claim.status === 'PAID' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${getProgressPercentage(claim.status)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-4 mb-4`}>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Service Date</p>
          <p className="text-sm font-medium text-gray-900">
            {claim.dateOfService ? new Date(claim.dateOfService).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Provider</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {claim.providerName || 'Unknown Provider'}
          </p>
        </div>
        
        {!compact && (
          <>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Insurer</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {claim.insurerName || 'N/A'}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(claim.updatedAt)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Medical Codes */}
      {!compact && (
        <div className="mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">CPT:</span>
              <div className="flex gap-1">
                {claim.cptCodes.slice(0, 3).map((code, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    {code}
                  </span>
                ))}
                {claim.cptCodes.length > 3 && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                    +{claim.cptCodes.length - 3}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-500">ICD:</span>
              <div className="flex gap-1">
                {claim.icdCodes.slice(0, 2).map((code, index) => (
                  <span key={index} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                    {code}
                  </span>
                ))}
                {claim.icdCodes.length > 2 && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                    +{claim.icdCodes.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status-specific Information */}
      {claim.status === 'DENIED' && claim.denialReason && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Denial Reason</p>
              <p className="text-sm text-red-700">{claim.denialReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Information */}
      {!compact && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Created: {formatDate(claim.createdAt)}</span>
              {claim.submittedAt && (
                <span>Submitted: {formatDate(claim.submittedAt)}</span>
              )}
              {claim.processedAt && (
                <span>Processed: {formatDate(claim.processedAt)}</span>
              )}
              {claim.paidAt && (
                <span>Paid: {formatDate(claim.paidAt)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {claim.status === 'DRAFT' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to edit claim
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit Claim
              </button>
            )}
            
            {claim.status === 'DENIED' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to appeal
                }}
                className="text-sm text-orange-600 hover:text-orange-800 font-medium"
              >
                File Appeal
              </button>
            )}
            
            {(claim.status === 'SUBMITTED' || claim.status === 'PROCESSING') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to tracking
                }}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Track Status
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // View details
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              View Details
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Download PDF
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}