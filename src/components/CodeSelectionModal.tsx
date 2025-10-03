'use client';

// Modal for selecting and confirming medical codes
import React, { useState } from 'react';
import { CodeSuggestion } from '@/lib/ai';

interface CodeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: CodeSuggestion[];
  onConfirm: (selectedCodes: CodeSuggestion[]) => void;
  title?: string;
}

export default function CodeSelectionModal({ 
  isOpen, 
  onClose, 
  suggestions, 
  onConfirm, 
  title = "Select Medical Codes" 
}: CodeSelectionModalProps) {
  const [selectedCodes, setSelectedCodes] = useState<CodeSuggestion[]>([]);

  if (!isOpen) return null;

  const handleCodeToggle = (code: CodeSuggestion) => {
    setSelectedCodes(prev => {
      const exists = prev.find(c => c.code === code.code);
      if (exists) {
        return prev.filter(c => c.code !== code.code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedCodes);
    setSelectedCodes([]);
    onClose();
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const cptCodes = suggestions.filter(s => s.type === 'CPT');
  const icdCodes = suggestions.filter(s => s.type === 'ICD');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Selection Summary */}
                {selectedCodes.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Selected Codes ({selectedCodes.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCodes.map((code, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {code.code} ({code.type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Sections */}
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {/* CPT Codes */}
                  {cptCodes.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        CPT Codes (Procedures)
                      </h4>
                      <div className="space-y-3">
                        {cptCodes.map((suggestion, index) => {
                          const isSelected = selectedCodes.some(c => c.code === suggestion.code);
                          return (
                            <div
                              key={index}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleCodeToggle(suggestion)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleCodeToggle(suggestion)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="font-mono text-lg font-semibold text-blue-600">
                                      {suggestion.code}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(suggestion.confidence)}`}>
                                      {Math.round(suggestion.confidence * 100)}% confidence
                                    </span>
                                  </div>
                                  <p className="text-gray-900 mb-1 ml-7">{suggestion.description}</p>
                                  {suggestion.category && (
                                    <p className="text-sm text-gray-600 ml-7">
                                      <span className="font-medium">Category:</span> {suggestion.category}
                                    </p>
                                  )}
                                  {suggestion.notes && (
                                    <p className="text-sm text-gray-600 ml-7">
                                      <span className="font-medium">Notes:</span> {suggestion.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ICD Codes */}
                  {icdCodes.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        ICD-10 Codes (Diagnoses)
                      </h4>
                      <div className="space-y-3">
                        {icdCodes.map((suggestion, index) => {
                          const isSelected = selectedCodes.some(c => c.code === suggestion.code);
                          return (
                            <div
                              key={index}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleCodeToggle(suggestion)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleCodeToggle(suggestion)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="font-mono text-lg font-semibold text-green-600">
                                      {suggestion.code}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(suggestion.confidence)}`}>
                                      {Math.round(suggestion.confidence * 100)}% confidence
                                    </span>
                                  </div>
                                  <p className="text-gray-900 mb-1 ml-7">{suggestion.description}</p>
                                  {suggestion.category && (
                                    <p className="text-sm text-gray-600 ml-7">
                                      <span className="font-medium">Category:</span> {suggestion.category}
                                    </p>
                                  )}
                                  {suggestion.notes && (
                                    <p className="text-sm text-gray-600 ml-7">
                                      <span className="font-medium">Notes:</span> {suggestion.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No suggestions fallback */}
                  {suggestions.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Code Suggestions Available</h3>
                      <p className="text-gray-600 mb-4">
                        The AI system could not generate code suggestions based on the provided information.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                        <h4 className="font-medium text-yellow-800 mb-2">What you can do:</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• Contact your healthcare provider for the correct codes</li>
                          <li>• Provide more detailed service descriptions</li>
                          <li>• Check your receipt or medical documentation</li>
                          <li>• Try entering codes manually if you have them</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCodes.length === 0}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Selection ({selectedCodes.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}