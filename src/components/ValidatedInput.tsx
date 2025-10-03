'use client';

// Input component with real-time validation feedback
import React, { useState, useEffect } from 'react';
import { ValidationError, ValidationWarning } from '@/lib/ai';
import { validateClaimData, ClaimValidationData } from '@/lib/validation';

interface ValidatedInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  claimData?: ClaimValidationData;
  className?: string;
  rows?: number;
  step?: string;
  min?: string;
  max?: string;
}

export default function ValidatedInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  claimData,
  className = '',
  rows = 3,
  step,
  min,
  max,
}: ValidatedInputProps) {
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);
  const [fieldWarnings, setFieldWarnings] = useState<ValidationWarning[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Validate field when value or claimData changes
  useEffect(() => {
    if (hasBeenTouched && claimData) {
      setIsValidating(true);
      
      // Debounce validation
      const timeoutId = setTimeout(() => {
        const validation = validateClaimData(claimData);
        
        // Filter errors and warnings for this field
        const errors = validation.errors.filter(error => error.field === name);
        const warnings = validation.warnings.filter(warning => warning.field === name);
        
        setFieldErrors(errors);
        setFieldWarnings(warnings);
        setIsValidating(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [value, claimData, name, hasBeenTouched]);

  const handleChange = (newValue: string) => {
    setHasBeenTouched(true);
    onChange(newValue);
  };

  const handleBlur = () => {
    setHasBeenTouched(true);
  };

  const getInputClassName = () => {
    let baseClass = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors';
    
    if (fieldErrors.length > 0) {
      baseClass += ' border-red-300 focus:ring-red-500 focus:border-red-500';
    } else if (fieldWarnings.length > 0) {
      baseClass += ' border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500';
    } else if (hasBeenTouched && value) {
      baseClass += ' border-green-300 focus:ring-green-500 focus:border-green-500';
    } else {
      baseClass += ' border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    }
    
    return baseClass;
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return (
        <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    if (fieldErrors.length > 0) {
      return (
        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    if (fieldWarnings.length > 0) {
      return (
        <svg className="h-4 w-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    
    if (hasBeenTouched && value) {
      return (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    return null;
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={rows}
            className={getInputClassName()}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            step={step}
            min={min}
            max={max}
            className={getInputClassName()}
          />
        )}
        
        {/* Validation icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {getValidationIcon()}
        </div>
      </div>
      
      {/* Error messages */}
      {fieldErrors.length > 0 && (
        <div className="mt-1 space-y-1">
          {fieldErrors.map((error, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-red-600">
              <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Warning messages */}
      {fieldWarnings.length > 0 && fieldErrors.length === 0 && (
        <div className="mt-1 space-y-1">
          {fieldWarnings.map((warning, index) => (
            <div key={index} className="text-sm text-yellow-600">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <span>{warning.message}</span>
                  {warning.suggestion && (
                    <div className="mt-1 text-xs text-yellow-700">
                      💡 {warning.suggestion}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Success message */}
      {hasBeenTouched && value && fieldErrors.length === 0 && fieldWarnings.length === 0 && (
        <div className="mt-1 flex items-center gap-2 text-sm text-green-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Valid</span>
        </div>
      )}
    </div>
  );
}