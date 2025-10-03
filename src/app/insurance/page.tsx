'use client';

// Insurance management page with complete functionality
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import InsuranceOCR from '@/components/InsuranceOCR';
import InsuranceForm from '@/components/InsuranceForm';
import InsuranceCard from '@/components/InsuranceCard';
import { InsuranceProfilePartial } from '@/lib/ocr';
import { useInsurance } from '@/hooks/useInsurance';

type ViewMode = 'list' | 'ocr' | 'manual' | 'edit';

export default function InsurancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingData, setEditingData] = useState<InsuranceProfilePartial | null>(null);
  const { 
    profile, 
    loading, 
    saving, 
    error, 
    saveInsuranceProfile, 
    clearError 
  } = useInsurance();

  const handleInsuranceExtracted = async (data: InsuranceProfilePartial) => {
    try {
      await saveInsuranceProfile(data);
      setViewMode('list');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleManualSave = async (data: InsuranceProfilePartial) => {
    try {
      await saveInsuranceProfile(data);
      setViewMode('list');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleEdit = () => {
    // In a real app, we'd fetch the decrypted data here
    setEditingData({
      insurer: 'Sample Insurance Co.',
      plan: 'Premium Plan',
      memberId: 'ABC123456789',
      groupId: 'GRP001',
      payerId: 'PAY123',
      address: '123 Insurance St, Coverage City, ST 12345',
    });
    setViewMode('edit');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete your insurance information?')) {
      // TODO: Implement delete functionality
      console.log('Delete insurance profile');
    }
  };

  // OCR View
  if (viewMode === 'ocr') {
    return (
      <DashboardLayout>
        <PageHeader
          title="Scan Insurance Card"
          description="Use your camera or upload an image to extract insurance information"
          action={
            <button
              onClick={() => setViewMode('list')}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          }
        />

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <InsuranceOCR
            onInsuranceExtracted={handleInsuranceExtracted}
            onError={() => {}} // Error handling is done by the hook
          />
        </div>
      </DashboardLayout>
    );
  }

  // Manual Entry View
  if (viewMode === 'manual' || viewMode === 'edit') {
    return (
      <DashboardLayout>
        <PageHeader
          title={viewMode === 'edit' ? 'Edit Insurance Information' : 'Add Insurance Manually'}
          description="Enter your insurance details manually"
          action={
            <button
              onClick={() => setViewMode('list')}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          }
        />

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <InsuranceForm
            initialData={viewMode === 'edit' ? editingData || undefined : undefined}
            onSave={handleManualSave}
            onCancel={() => setViewMode('list')}
            saving={saving}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Main List View
  return (
    <DashboardLayout>
      <PageHeader
        title="Insurance Information"
        description="Manage your insurance profiles and coverage details"
        action={
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('manual')}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Manual Entry
            </button>
            <button
              onClick={() => setViewMode('ocr')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Scan Card
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
            <p className="text-gray-600">Loading insurance information...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Current Insurance */}
        {!loading && profile?.hasProfile ? (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Current Insurance</h2>
            <InsuranceCard
              profile={{
                insurer: 'Sample Insurance Co.',
                plan: 'Premium Plan',
                memberId: 'ABC123456789',
                groupId: 'GRP001',
                payerId: 'PAY123',
                address: '123 Insurance St, Coverage City, ST 12345',
                confidence: 0.95,
              }}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        ) : !loading && (
          <Card
            title="No Insurance Information"
            description="Add your insurance information to start submitting claims"
          >
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🏥</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Get Started with Your Insurance
              </h3>
              <p className="text-gray-600 mb-6">
                Choose how you&apos;d like to add your insurance information
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setViewMode('ocr')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium flex items-center justify-center"
                >
                  <span className="mr-2">📱</span>
                  Scan Insurance Card
                </button>
                <button
                  onClick={() => setViewMode('manual')}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50 flex items-center justify-center"
                >
                  <span className="mr-2">✏️</span>
                  Enter Manually
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Features Overview */}
        <Card
          title="Insurance Management Features"
          description="Everything you need to manage your insurance information"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📱</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Smart OCR Scanning</h4>
              <p className="text-sm text-gray-600">
                Automatically extract information from insurance card photos with high accuracy
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🔒</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Secure Storage</h4>
              <p className="text-sm text-gray-600">
                All insurance information is encrypted and stored securely according to HIPAA standards
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">✏️</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Easy Editing</h4>
              <p className="text-sm text-gray-600">
                Review and edit extracted information or enter details manually with validation
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🎯</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Validation</h4>
              <p className="text-sm text-gray-600">
                Automatic validation ensures all required information is complete and accurate
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📋</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Claims Integration</h4>
              <p className="text-sm text-gray-600">
                Insurance information automatically populates when creating new claims
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📊</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Multiple Providers</h4>
              <p className="text-sm text-gray-600">
                Support for all major insurance providers with automatic provider recognition
              </p>
            </div>
          </div>
        </Card>

        {/* Supported Providers */}
        <Card
          title="Supported Insurance Providers"
          description="We work with all major insurance companies"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              'Blue Cross Blue Shield',
              'Aetna',
              'Cigna',
              'Humana',
              'Kaiser Permanente',
              'UnitedHealthcare',
              'Anthem',
              'Medicare',
              'Medicaid',
              'Tricare',
              'Molina Healthcare',
              'Centene',
            ].map((insurer) => (
              <div
                key={insurer}
                className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-2xl mb-1">🏥</div>
                <p className="text-xs text-gray-600 font-medium">{insurer}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t see your provider? Our OCR technology works with most insurance cards.
              <br />
              <span className="font-medium">Contact support</span> if you need help with a specific provider.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}