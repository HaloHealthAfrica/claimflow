'use client';

// Comprehensive claims dashboard with filtering and sorting
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useClaims } from '@/hooks/useClaims';
import ClaimCard, { ClaimData } from '@/components/ClaimCard';
import ClaimDetails from '@/components/ClaimDetails';

type SortField = 'createdAt' | 'updatedAt' | 'amountCents' | 'dateOfService' | 'status';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'DENIED' | 'PAID';

export default function ClaimsPage() {
  const { status } = useSession();
  const { claims, loading: claimsLoading, getClaims } = useClaims();
  
  const [selectedClaim, setSelectedClaim] = useState<ClaimData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');

  useEffect(() => {
    if (status === 'authenticated') {
      getClaims();
    }
  }, [status, getClaims]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  // Filter and sort claims
  const filteredAndSortedClaims = React.useMemo(() => {
    let filtered = [...claims];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(claim => claim.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(claim => 
        claim.id.toLowerCase().includes(query) ||
        claim.providerName?.toLowerCase().includes(query) ||
        claim.insurerName?.toLowerCase().includes(query) ||
        claim.claimNumber?.toLowerCase().includes(query) ||
        claim.cptCodes.some(code => code.toLowerCase().includes(query)) ||
        claim.icdCodes.some(code => code.toLowerCase().includes(query))
      );
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateRange) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }
      
      if (dateRange !== 'custom') {
        filtered = filtered.filter(claim => 
          new Date(claim.createdAt) >= cutoffDate
        );
      }
    }

    // Sort claims
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date fields
      if (sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'dateOfService') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle numeric fields
      if (sortField === 'amountCents') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      // Handle string fields
      if (sortField === 'status') {
        aValue = aValue || '';
        bValue = bValue || '';
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [claims, filterStatus, searchQuery, dateRange, sortField, sortDirection]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = claims.length;
    const draft = claims.filter(c => c.status === 'DRAFT').length;
    const submitted = claims.filter(c => c.status === 'SUBMITTED' || c.status === 'PROCESSING').length;
    const approved = claims.filter(c => c.status === 'APPROVED' || c.status === 'PAID').length;
    const denied = claims.filter(c => c.status === 'DENIED').length;
    
    const totalAmount = claims.reduce((sum, claim) => sum + claim.amountCents, 0);
    const paidAmount = claims
      .filter(c => c.status === 'PAID')
      .reduce((sum, claim) => sum + (claim.paymentAmount || claim.amountCents), 0);

    return {
      total,
      draft,
      submitted,
      approved,
      denied,
      totalAmount,
      paidAmount,
    };
  }, [claims]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleClaimClick = (claim: ClaimData) => {
    setSelectedClaim(claim);
  };

  const handleCloseDetails = () => {
    setSelectedClaim(null);
  };

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    // In a real app, this would make an API call
    console.log('Update claim status:', claimId, newStatus);
    // Refresh claims after update
    getClaims();
  };

  const handleAppeal = (claimId: string) => {
    // Navigate to appeal page
    window.location.href = `/appeals/${claimId}`;
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claims Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Track and manage your insurance claims
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/claims/new'}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                New Claim
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Claims</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.submitted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Paid</p>
                <p className="text-2xl font-semibold text-gray-900">{formatAmount(stats.paidAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DENIED">Denied</option>
                  <option value="PAID">Paid</option>
                </select>
                
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortField(field as SortField);
                    setSortDirection(direction as SortDirection);
                  }}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="updatedAt-desc">Recently Updated</option>
                  <option value="createdAt-desc">Recently Created</option>
                  <option value="amountCents-desc">Amount (High to Low)</option>
                  <option value="amountCents-asc">Amount (Low to High)</option>
                  <option value="dateOfService-desc">Service Date (Recent)</option>
                  <option value="status-asc">Status (A-Z)</option>
                </select>
              </div>
              
              <div className="flex rounded-md border border-gray-300">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'grid'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'list'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Claims List */}
        {claimsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAndSortedClaims.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No claims found</h3>
            <p className="mt-2 text-gray-500">
              {claims.length === 0 
                ? "You haven't created any claims yet. Get started by creating your first claim."
                : "No claims match your current filters. Try adjusting your search criteria."
              }
            </p>
            {claims.length === 0 && (
              <button
                onClick={() => window.location.href = '/claims/new'}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Create Your First Claim
              </button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredAndSortedClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onClick={handleClaimClick}
                onStatusUpdate={handleStatusUpdate}
                compact={viewMode === 'list'}
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* Results Summary */}
        {filteredAndSortedClaims.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Showing {filteredAndSortedClaims.length} of {claims.length} claims
          </div>
        )}
      </div>

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseDetails}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <ClaimDetails
                claim={selectedClaim}
                onClose={handleCloseDetails}
                onStatusUpdate={handleStatusUpdate}
                onAppeal={handleAppeal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}