// Test utilities and helpers
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Mock session data
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  },
  expires: '2024-12-31',
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  session?: any;
  queryClient?: QueryClient;
}

function TestWrapper({ 
  children, 
  session = mockSession, 
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })
}: TestWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <ErrorBoundary level="component">
          {children}
        </ErrorBoundary>
      </SessionProvider>
    </QueryClientProvider>
  );
}

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any;
  queryClient?: QueryClient;
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { session, queryClient, ...renderOptions } = options;
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper session={session} queryClient={queryClient}>
      {children}
    </TestWrapper>
  );
  
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || new QueryClient(),
  };
}

// Mock data factories
export const mockFactories = {
  user: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    verified: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }),
  
  claim: (overrides = {}) => ({
    id: 'test-claim-id',
    status: 'DRAFT',
    amountCents: 10000,
    dateOfService: '2024-01-15',
    providerName: 'Test Provider',
    insurerName: 'Test Insurance',
    claimNumber: null,
    cptCodes: ['99213'],
    icdCodes: ['Z00.00'],
    notes: '',
    createdAt: '2024-01-15T14:20:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    documents: [],
    ...overrides,
  }),
  
  document: (overrides = {}) => ({
    id: 'test-doc-id',
    name: 'test-document.pdf',
    type: 'RECEIPT',
    size: 245760,
    url: 'https://storage.example.com/documents/test-document.pdf',
    uploadedAt: '2024-01-15T14:20:00Z',
    ...overrides,
  }),
  
  apiResponse: (data: any, success = true) => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : data,
  }),
};

// Test utilities
export const testUtils = {
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  createMockFile: (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
    return new File(['test content'], name, { type, lastModified: Date.now() });
  },
  
  mockApiCall: (url: string, response: any, status = 200) => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
      text: async () => JSON.stringify(response),
    } as Response);
  },
};

export * from '@testing-library/react';
export { TestWrapper };