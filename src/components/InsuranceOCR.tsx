'use client';

// Insurance card OCR component
import { useState } from 'react';
import { InsuranceProfilePartial } from '@/lib/ocr';
import OCRProcessor from './OCRProcessor';
import Card from './Card';

interface InsuranceOCRProps {
  onInsuranceExtracted?: (data: InsuranceProfilePartial) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function InsuranceOCR({ 
  onInsuranceExtracted, 
  onError, 
  className = '' 
}: InsuranceOCRProps) {
  const [extractedData, setExtractedData] = useState<InsuranceProfilePartial | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<InsuranceProfilePartial>({});

  const handleOCRResult = (result: InsuranceProfilePartial) => {
    setExtractedData(result);
    setEditedData(result);
    onInsuranceExtracted?.(result);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setExtractedData(editedData);
    setIsEditing(false);
    onInsuranceExtracted?.(editedData);
  };

  const handleCancel = () => {
    setEditedData(extractedData || {});
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof InsuranceProfilePartial, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!extractedData) {
    return (
      <div className={className}>
        <Card
          title="Insurance Card Scanner"
          description="Upload your insurance card to automatically extract information"
        >
          <OCRProcessor
            type="insurance"
            onResult={handleOCRResult}
            onError={onError}
          />
        </Card>

        <div className="mt-6">
          <Card
            title="Tips for Best Results"
            description="Follow these guidelines for accurate OCR processing"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-xl">📱</span>
                <div>
                  <h4 className="font-medium text-gray-900">Good Lighting</h4>
                  <p className="text-sm text-gray-600">
                    Ensure the card is well-lit and clearly visible
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-xl">📐</span>
                <div>
                  <h4 className="font-medium text-gray-900">Flat Surface</h4>
                  <p className="text-sm text-gray-600">
                    Place the card on a flat, contrasting background
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-xl">🔍</span>
                <div>
                  <h4 className="font-medium text-gray-900">Clear Focus</h4>
                  <p className="text-sm text-gray-600">
                    Make sure all text is sharp and in focus
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-xl">📏</span>
                <div>
                  <h4 className="font-medium text-gray-900">Full Card</h4>
                  <p className="text-sm text-gray-600">
                    Include the entire card in the image
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card
        title="Extracted Insurance Information"
        description="Review and edit the information extracted from your insurance card"
        action={
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Company *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.insurer || ''}
                onChange={(e) => handleInputChange('insurer', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter insurance company name"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {extractedData.insurer || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.plan || ''}
                onChange={(e) => handleInputChange('plan', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter plan name"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {extractedData.plan || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member ID *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.memberId || ''}
                onChange={(e) => handleInputChange('memberId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter member ID"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {extractedData.memberId || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group ID
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.groupId || ''}
                onChange={(e) => handleInputChange('groupId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter group ID"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {extractedData.groupId || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payer ID
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.payerId || ''}
                onChange={(e) => handleInputChange('payerId', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter payer ID"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {extractedData.payerId || 'Not provided'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            {isEditing ? (
              <textarea
                value={editedData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter insurance company address"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {extractedData.address || 'Not provided'}
              </div>
            )}
          </div>
        </div>

        {/* Confidence indicator */}
        {extractedData.confidence && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                OCR Confidence: {(extractedData.confidence * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-blue-600">
                {extractedData.confidence >= 0.9 ? 'High confidence' :
                 extractedData.confidence >= 0.7 ? 'Medium confidence' : 'Low confidence'}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Action buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => {
            setExtractedData(null);
            setEditedData({});
            setIsEditing(false);
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Scan Another Card
        </button>
        
        <button
          onClick={() => onInsuranceExtracted?.(isEditing ? editedData : extractedData)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Use This Information
        </button>
      </div>
    </div>
  );
}