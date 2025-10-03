'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, FileText, AlertCircle, Zap } from 'lucide-react';
import ReceiptClaimForm from '@/components/ReceiptClaimForm';

export default function NewSubmitPage() {
  const router = useRouter();
  const [submissionMethod, setSubmissionMethod] = useState<'receipt' | 'manual' | null>(null);

  const handleClaimSubmitted = (claimData: any) => {
    // Navigate to the claim details page or claims list
    router.push('/claims');
  };

  const handleCancel = () => {
    setSubmissionMethod(null);
  };

  if (submissionMethod) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ReceiptClaimForm
          onSubmit={handleClaimSubmitted}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Submit a New Claim
          </h1>
          <p className="text-lg text-gray-600">
            Choose how you'd like to create your medical claim
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Receipt Upload Option - Recommended */}
          <div 
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 p-8 text-center cursor-pointer group relative overflow-hidden"
            onClick={() => setSubmissionMethod('receipt')}
          >
            {/* Recommended Badge */}
            <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Recommended
            </div>
            
            <div className="mb-4">
              <Camera className="h-16 w-16 text-blue-500 group-hover:text-blue-600 mx-auto transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload Receipt
            </h3>
            <p className="text-gray-600 mb-4">
              Take a photo or upload your medical receipt. Our AI will automatically extract claim information to save you time.
            </p>
            
            {/* Features */}
            <div className="text-left space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Auto-fills provider, date, and amount
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Reduces data entry errors
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Supports images and PDFs
              </div>
            </div>
            
            <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
              <Camera className="h-4 w-4 mr-2" />
              Start with Receipt
            </button>
          </div>

          {/* Manual Entry Option */}
          <div 
            className="bg-white rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-all duration-200 p-8 text-center cursor-pointer group"
            onClick={() => setSubmissionMethod('manual')}
          >
            <div className="mb-4">
              <FileText className="h-16 w-16 text-gray-400 group-hover:text-gray-600 mx-auto transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Manual Entry
            </h3>
            <p className="text-gray-600 mb-4">
              Enter your claim information manually using our guided form. Perfect when you don't have a receipt or prefer manual entry.
            </p>
            
            {/* Features */}
            <div className="text-left space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Step-by-step guidance
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Built-in validation
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Medical code assistance
              </div>
            </div>
            
            <button className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium">
              <FileText className="h-4 w-4 mr-2" />
              Enter Manually
            </button>
          </div>
        </div>

        {/* Process Overview */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                1
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Upload or Enter</h4>
              <p className="text-sm text-gray-600">Upload your receipt or enter claim details manually</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                2
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Review & Complete</h4>
              <p className="text-sm text-gray-600">Review extracted data and add medical codes</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                3
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Submit</h4>
              <p className="text-sm text-gray-600">Submit your claim and track its progress</p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">
                Tips for Better Results
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Receipt Upload:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure receipt is clearly visible and well-lit</li>
                    <li>• Include the entire receipt from top to bottom</li>
                    <li>• Make sure provider name, date, and amount are readable</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Manual Entry:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Have your receipt or medical records ready</li>
                    <li>• Know your CPT and ICD codes if available</li>
                    <li>• Use our code lookup tools for assistance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}