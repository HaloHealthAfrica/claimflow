'use client';

// Enhanced claim form with integrated AI code suggestions
import { useState, useEffect } from 'react';
import { ReceiptData } from '@/lib/ocr';
import { CodeSuggestion } from '@/lib/ai';
import { useAI } from '@/hooks/useAI';
import SuperbillAssistant from './SuperbillAssistant';
import CodeSelectionModal from './CodeSelectionModal';
import Card from './Card';

interface ClaimFormData {
    providerName: string;
    providerNpi?: string;
    dateOfService: string;
    amount: string;
    cptCodes: string[];
    icdCodes: string[];
    description?: string;
}

interface EnhancedClaimFormProps {
    initialData?: Partial<ClaimFormData>;
    receiptData?: ReceiptData;
    onSave?: (data: ClaimFormData) => Promise<void>;
    onCancel?: () => void;
    saving?: boolean;
    className?: string;
}

export default function EnhancedClaimForm({
    initialData,
    receiptData,
    onSave,
    onCancel,
    saving = false,
    className = '',
}: EnhancedClaimFormProps) {
    const { loading: aiLoading, error: aiError, suggestCodes, clearError } = useAI();

    const [formData, setFormData] = useState<ClaimFormData>({
        providerName: '',
        providerNpi: '',
        dateOfService: '',
        amount: '',
        cptCodes: [],
        icdCodes: [],
        description: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newCptCode, setNewCptCode] = useState('');
    const [newIcdCode, setNewIcdCode] = useState('');
    const [showSuperbill, setShowSuperbill] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [codeSuggestions, setCodeSuggestions] = useState<CodeSuggestion[]>([]);
    const [needsCodeSuggestion, setNeedsCodeSuggestion] = useState(false);

    // Update form data when initialData or receiptData changes
    useEffect(() => {
        const updatedData: ClaimFormData = {
            providerName: initialData?.providerName || receiptData?.providerName || '',
            providerNpi: initialData?.providerNpi || '',
            dateOfService: initialData?.dateOfService || (receiptData?.dateOfService ? receiptData.dateOfService.toISOString().split('T')[0] : '') || '',
            amount: initialData?.amount || receiptData?.amount?.toString() || '',
            cptCodes: initialData?.cptCodes || [],
            icdCodes: initialData?.icdCodes || [],
            description: initialData?.description || '',
        };
        setFormData(updatedData);

        // Check if we need code suggestions
        const hasCodes = updatedData.cptCodes.length > 0 || updatedData.icdCodes.length > 0;
        const hasContext = Boolean(updatedData.providerName || updatedData.description);
        setNeedsCodeSuggestion(!hasCodes && hasContext);
    }, [initialData, receiptData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.providerName.trim()) {
            newErrors.providerName = 'Provider name is required';
        }

        if (!formData.dateOfService) {
            newErrors.dateOfService = 'Date of service is required';
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'Valid amount is required';
        }

        if (formData.cptCodes.length === 0) {
            newErrors.cptCodes = 'At least one CPT code is required';
        }

        if (formData.icdCodes.length === 0) {
            newErrors.icdCodes = 'At least one ICD code is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await onSave?.(formData);
        } catch (error) {
            console.error('Failed to save claim:', error);
        }
    };

    const handleInputChange = (field: keyof ClaimFormData, value: string | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const addCptCode = () => {
        if (newCptCode.trim() && !formData.cptCodes.includes(newCptCode.trim())) {
            handleInputChange('cptCodes', [...formData.cptCodes, newCptCode.trim()]);
            setNewCptCode('');
        }
    };

    const removeCptCode = (code: string) => {
        handleInputChange('cptCodes', formData.cptCodes.filter(c => c !== code));
    };

    const addIcdCode = () => {
        if (newIcdCode.trim() && !formData.icdCodes.includes(newIcdCode.trim())) {
            handleInputChange('icdCodes', [...formData.icdCodes, newIcdCode.trim()]);
            setNewIcdCode('');
        }
    };

    const removeIcdCode = (code: string) => {
        handleInputChange('icdCodes', formData.icdCodes.filter(c => c !== code));
    };

    const handleGetCodeSuggestions = async () => {
        try {
            clearError();
            const suggestions = await suggestCodes({
                providerName: formData.providerName,
                dateOfService: formData.dateOfService,
                amount: formData.amount,
                description: formData.description,
            });

            setCodeSuggestions(suggestions);
            setShowCodeModal(true);
        } catch (error) {
            console.error('Failed to get code suggestions:', error);
        }
    };

    const handleCodeSelection = (selectedCodes: CodeSuggestion[]) => {
        const cptCodes = selectedCodes.filter(c => c.type === 'CPT').map(c => c.code);
        const icdCodes = selectedCodes.filter(c => c.type === 'ICD').map(c => c.code);

        // Add new codes to existing ones (avoid duplicates)
        const newCptCodes = [...new Set([...formData.cptCodes, ...cptCodes])];
        const newIcdCodes = [...new Set([...formData.icdCodes, ...icdCodes])];

        handleInputChange('cptCodes', newCptCodes);
        handleInputChange('icdCodes', newIcdCodes);

        setNeedsCodeSuggestion(false);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* AI Code Suggestion Banner */}
            {needsCodeSuggestion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-800">Missing Medical Codes</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Your claim is missing CPT and ICD codes. Let our AI suggest appropriate codes based on your claim information.
                            </p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleGetCodeSuggestions}
                                    disabled={aiLoading}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {aiLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Getting Suggestions...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                            Get AI Code Suggestions
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowSuperbill(true)}
                                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Open Superbill Assistant
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNeedsCodeSuggestion(false)}
                            className="flex-shrink-0 text-blue-400 hover:text-blue-600"
                        >
                            <span className="sr-only">Dismiss</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* AI Error Display */}
            {aiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800">{aiError}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={clearError}
                                className="text-red-400 hover:text-red-600"
                            >
                                <span className="sr-only">Dismiss</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Claim Information</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Enter the details for your insurance claim. Required fields are marked with an asterisk.
                        </p>
                    </div>

                    {/* Provider Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Provider Name *
                            </label>
                            <input
                                type="text"
                                value={formData.providerName}
                                onChange={(e) => handleInputChange('providerName', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.providerName ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                placeholder="Dr. Smith, ABC Medical Center"
                            />
                            {errors.providerName && (
                                <p className="text-sm text-red-600 mt-1">{errors.providerName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Provider NPI
                            </label>
                            <input
                                type="text"
                                value={formData.providerNpi}
                                onChange={(e) => handleInputChange('providerNpi', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1234567890"
                            />
                        </div>
                    </div>

                    {/* Service Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date of Service *
                            </label>
                            <input
                                type="date"
                                value={formData.dateOfService}
                                onChange={(e) => handleInputChange('dateOfService', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dateOfService ? 'border-red-300' : 'border-gray-300'
                                    }`}
                            />
                            {errors.dateOfService && (
                                <p className="text-sm text-red-600 mt-1">{errors.dateOfService}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="150.00"
                                />
                            </div>
                            {errors.amount && (
                                <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Service Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe the medical services provided..."
                        />
                    </div>

                    {/* CPT Codes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CPT Codes (Procedures) *
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCptCode}
                                    onChange={(e) => setNewCptCode(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCptCode())}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter CPT code (e.g., 99213)"
                                />
                                <button
                                    type="button"
                                    onClick={addCptCode}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Add
                                </button>
                            </div>

                            {formData.cptCodes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.cptCodes.map((code, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                        >
                                            {code}
                                            <button
                                                type="button"
                                                onClick={() => removeCptCode(code)}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {errors.cptCodes && (
                                <p className="text-sm text-red-600">{errors.cptCodes}</p>
                            )}
                        </div>
                    </div>

                    {/* ICD Codes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ICD-10 Codes (Diagnoses) *
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newIcdCode}
                                    onChange={(e) => setNewIcdCode(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIcdCode())}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter ICD-10 code (e.g., I10)"
                                />
                                <button
                                    type="button"
                                    onClick={addIcdCode}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    Add
                                </button>
                            </div>

                            {formData.icdCodes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.icdCodes.map((code, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                                        >
                                            {code}
                                            <button
                                                type="button"
                                                onClick={() => removeIcdCode(code)}
                                                className="ml-2 text-green-600 hover:text-green-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {errors.icdCodes && (
                                <p className="text-sm text-red-600">{errors.icdCodes}</p>
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-between pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => setShowSuperbill(true)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Assistant
                        </button>

                        <div className="flex gap-3">
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Claim'}
                            </button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Superbill Assistant Modal */}
            {showSuperbill && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">AI Superbill Assistant</h3>
                                    <button
                                        onClick={() => setShowSuperbill(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <span className="sr-only">Close</span>
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <SuperbillAssistant
                                    initialContext={{
                                        providerName: formData.providerName,
                                        dateOfService: formData.dateOfService,
                                        amount: formData.amount,
                                        description: formData.description,
                                    }}
                                    onCodeSelect={(code) => {
                                        if (code.type === 'CPT') {
                                            if (!formData.cptCodes.includes(code.code)) {
                                                handleInputChange('cptCodes', [...formData.cptCodes, code.code]);
                                            }
                                        } else if (code.type === 'ICD') {
                                            if (!formData.icdCodes.includes(code.code)) {
                                                handleInputChange('icdCodes', [...formData.icdCodes, code.code]);
                                            }
                                        }
                                        setShowSuperbill(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Code Selection Modal */}
            <CodeSelectionModal
                isOpen={showCodeModal}
                onClose={() => setShowCodeModal(false)}
                suggestions={codeSuggestions}
                onConfirm={handleCodeSelection}
                title="Select Medical Codes for Your Claim"
            />
        </div>
    );
}