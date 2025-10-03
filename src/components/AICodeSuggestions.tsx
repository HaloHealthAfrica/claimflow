// AI-powered medical code suggestions component
'use client';

import { useState, useEffect } from 'react';
import { Brain, Search, CheckCircle, AlertCircle, Lightbulb, Loader2 } from 'lucide-react';

interface CodeSuggestion {
  code: string;
  description: string;
  type: 'CPT' | 'ICD';
  confidence: number;
  category?: string;
  notes?: string;
  source: 'ai' | 'database' | 'default';
  verified?: boolean;
  dbInfo?: {
    averagePrice?: number;
    medicarePrice?: number;
    isActive?: boolean;
    icdVersion?: string;
  };
}

interface AICodeSuggestionsProps {
  context: {
    providerName?: string;
    dateOfService?: string;
    amount?: number;
    description?: string;
    symptoms?: string;
    diagnosis?: string;
    treatment?: string;
    specialty?: string;
  };
  onCodeSelect: (code: string, type: 'CPT' | 'ICD') => void;
  selectedCodes?: {
    cpt: string[];
    icd: string[];
  };
  className?: string;
}

export default function AICodeSuggestions({
  context,
  onCodeSelect,
  selectedCodes = { cpt: [], icd: [] },
  className = '',
}: AICodeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Fetch suggestions when context changes
  useEffect(() => {
    if (hasValidContext(context)) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setSource(null);
    }
  }, [context]);

  const hasValidContext = (ctx: any): boolean => {
    return !!(ctx.description || ctx.symptoms || ctx.diagnosis || ctx.treatment);
  };

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/suggest-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data.suggestions);
        setSource(data.data.source);
        setConfidence(data.data.confidence || 0);
      } else {
        setError(data.error?.message || 'Failed to get suggestions');
      }
    } catch (error) {
      console.error('Code suggestion error:', error);
      setError('Failed to fetch code suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSelect = (suggestion: CodeSuggestion) => {
    onCodeSelect(suggestion.code, suggestion.type);
  };

  const isCodeSelected = (code: string, type: 'CPT' | 'ICD'): boolean => {
    return type === 'CPT' 
      ? selectedCodes.cpt.includes(code)
      : selectedCodes.icd.includes(code);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSourceIcon = () => {
    switch (source) {
      case 'ai':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'fallback':
        return <Search className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  if (!hasValidContext(context)) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">
          Enter a description, symptoms, diagnosis, or treatment to get AI-powered code suggestions
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getSourceIcon()}
            <h3 className="text-lg font-medium text-gray-900">
              AI Code Suggestions
            </h3>
            {source === 'fallback' && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Fallback Mode
              </span>
            )}
          </div>
          
          {confidence > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Confidence:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                getConfidenceColor(confidence)
              }`}>
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        
        {source === 'fallback' && (
          <p className="text-sm text-yellow-700 mt-2">
            AI service is currently unavailable. Showing database suggestions.
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Getting suggestions...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2" />
            <p>No suggestions found for the provided context</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* CPT Codes */}
            {suggestions.filter(s => s.type === 'CPT').length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                    CPT
                  </span>
                  Procedure Codes
                </h4>
                <div className="space-y-2">
                  {suggestions
                    .filter(s => s.type === 'CPT')
                    .map((suggestion) => (
                      <SuggestionCard
                        key={`${suggestion.type}-${suggestion.code}`}
                        suggestion={suggestion}
                        isSelected={isCodeSelected(suggestion.code, suggestion.type)}
                        onSelect={() => handleCodeSelect(suggestion)}
                        isExpanded={expandedSuggestion === `${suggestion.type}-${suggestion.code}`}
                        onToggleExpand={() => setExpandedSuggestion(
                          expandedSuggestion === `${suggestion.type}-${suggestion.code}` 
                            ? null 
                            : `${suggestion.type}-${suggestion.code}`
                        )}
                      />
                    ))
                  }
                </div>
              </div>
            )}

            {/* ICD Codes */}
            {suggestions.filter(s => s.type === 'ICD').length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                    ICD
                  </span>
                  Diagnosis Codes
                </h4>
                <div className="space-y-2">
                  {suggestions
                    .filter(s => s.type === 'ICD')
                    .map((suggestion) => (
                      <SuggestionCard
                        key={`${suggestion.type}-${suggestion.code}`}
                        suggestion={suggestion}
                        isSelected={isCodeSelected(suggestion.code, suggestion.type)}
                        onSelect={() => handleCodeSelect(suggestion)}
                        isExpanded={expandedSuggestion === `${suggestion.type}-${suggestion.code}`}
                        onToggleExpand={() => setExpandedSuggestion(
                          expandedSuggestion === `${suggestion.type}-${suggestion.code}` 
                            ? null 
                            : `${suggestion.type}-${suggestion.code}`
                        )}
                      />
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {suggestions.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600">
            💡 These are AI-generated suggestions. Always verify codes with official medical coding resources.
          </p>
        </div>
      )}
    </div>
  );
}

// Individual suggestion card component
interface SuggestionCardProps {
  suggestion: CodeSuggestion;
  isSelected: boolean;
  onSelect: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function SuggestionCard({
  suggestion,
  isSelected,
  onSelect,
  isExpanded,
  onToggleExpand,
}: SuggestionCardProps) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'border-green-200 bg-green-50';
    if (confidence >= 0.6) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  return (
    <div className={`border rounded-lg p-3 transition-all ${
      isSelected 
        ? 'border-blue-500 bg-blue-50' 
        : `border-gray-200 hover:border-gray-300 ${getConfidenceColor(suggestion.confidence)}`
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <code className="text-sm font-mono font-medium text-gray-900">
              {suggestion.code}
            </code>
            <span className={`text-xs px-2 py-1 rounded-full ${
              suggestion.confidence >= 0.8 
                ? 'bg-green-100 text-green-800'
                : suggestion.confidence >= 0.6
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {(suggestion.confidence * 100).toFixed(0)}%
            </span>
            {suggestion.verified && (
              <CheckCircle className="h-4 w-4 text-green-500" title="Verified in database" />
            )}
          </div>
          
          <p className="text-sm text-gray-700 mb-2">
            {suggestion.description}
          </p>
          
          {suggestion.category && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {suggestion.category}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-3">
          <button
            onClick={onToggleExpand}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
          
          <button
            onClick={onSelect}
            disabled={isSelected}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white cursor-default'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {suggestion.notes && (
            <p className="text-xs text-gray-600">
              <strong>Notes:</strong> {suggestion.notes}
            </p>
          )}
          
          {suggestion.dbInfo && (
            <div className="text-xs text-gray-600 space-y-1">
              {suggestion.dbInfo.averagePrice && (
                <p><strong>Average Price:</strong> ${suggestion.dbInfo.averagePrice}</p>
              )}
              {suggestion.dbInfo.medicarePrice && (
                <p><strong>Medicare Price:</strong> ${suggestion.dbInfo.medicarePrice}</p>
              )}
              {suggestion.dbInfo.icdVersion && (
                <p><strong>Version:</strong> {suggestion.dbInfo.icdVersion}</p>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Source: {suggestion.source}</span>
            {suggestion.verified && (
              <span className="text-green-600">• Verified</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}