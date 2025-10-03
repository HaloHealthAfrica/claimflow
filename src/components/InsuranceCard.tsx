'use client';

// Insurance card display component
import { useState } from 'react';
import { InsuranceProfilePartial } from '@/lib/ocr';
import Card from './Card';

interface InsuranceCardProps {
  profile: InsuranceProfilePartial;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function InsuranceCard({
  profile,
  onEdit,
  onDelete,
  className = '',
}: InsuranceCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatField = (value?: string) => {
    return value || 'Not provided';
  };

  const getInsuranceIcon = (insurer?: string) => {
    if (!insurer) return '🏥';
    
    const insurerLower = insurer.toLowerCase();
    if (insurerLower.includes('blue cross') || insurerLower.includes('bcbs')) return '🔵';
    if (insurerLower.includes('aetna')) return '🅰️';
    if (insurerLower.includes('cigna')) return '🔶';
    if (insurerLower.includes('humana')) return '🟢';
    if (insurerLower.includes('kaiser')) return '⚕️';
    if (insurerLower.includes('united')) return '🇺';
    if (insurerLower.includes('anthem')) return '🎵';
    if (insurerLower.includes('medicare')) return '🏛️';
    if (insurerLower.includes('medicaid')) return '🏥';
    
    return '🏥';
  };

  return (
    <div className={className}>
      <Card className="hover:shadow-lg transition-shadow">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getInsuranceIcon(profile.insurer)}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formatField(profile.insurer)}
              </h3>
              {profile.plan && (
                <p className="text-sm text-gray-600">{profile.plan}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                title="Edit insurance information"
              >
                <span className="text-sm">✏️</span>
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                title="Delete insurance profile"
              >
                <span className="text-sm">🗑️</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Member ID
            </p>
            <p className="text-sm font-mono text-gray-900">
              {formatField(profile.memberId)}
            </p>
          </div>
          
          {profile.groupId && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Group ID
              </p>
              <p className="text-sm font-mono text-gray-900">
                {formatField(profile.groupId)}
              </p>
            </div>
          )}
        </div>

        {/* Detailed Information */}
        {showDetails && (
          <div className="border-t pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.payerId && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Payer ID
                  </p>
                  <p className="text-sm text-gray-900">{profile.payerId}</p>
                </div>
              )}
              
              {profile.plan && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Plan Name
                  </p>
                  <p className="text-sm text-gray-900">{profile.plan}</p>
                </div>
              )}
            </div>
            
            {profile.address && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Insurance Company Address
                </p>
                <p className="text-sm text-gray-900">{profile.address}</p>
              </div>
            )}

            {/* Confidence Score */}
            {profile.confidence && (
              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    OCR Confidence
                  </span>
                  <span className={`text-sm font-medium ${
                    profile.confidence >= 0.9 ? 'text-green-600' :
                    profile.confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(profile.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      profile.confidence >= 0.9 ? 'bg-green-500' :
                      profile.confidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(profile.confidence * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-600">Active Coverage</span>
          </div>
          
          <div className="text-xs text-gray-500">
            Ready for claims submission
          </div>
        </div>
      </Card>
    </div>
  );
}