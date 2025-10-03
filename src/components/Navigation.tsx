'use client';

// Main navigation component with responsive sidebar
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useCurrentUser } from './ProtectedRoute';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '🏠',
    description: 'Overview and quick actions',
  },
  {
    name: 'Insurance',
    href: '/insurance',
    icon: '🏥',
    description: 'Manage insurance information',
  },
  {
    name: 'Claims',
    href: '/claims',
    icon: '📋',
    description: 'Submit and track claims',
  },
  {
    name: 'Smart Superbill',
    href: '/superbill',
    icon: '🧠',
    description: 'AI-powered code suggestions and claim creation',
  },
  {
    name: 'AI Tools',
    href: '/ai-tools',
    icon: '🤖',
    description: 'AI-powered medical coding and validation',
  },
  {
    name: 'Claim Validation',
    href: '/validation',
    icon: '✅',
    description: 'Real-time claim validation and error checking',
  },
  {
    name: 'PDF Generation',
    href: '/pdf',
    icon: '📄',
    description: 'Generate professional claim and appeal PDFs',
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: '📄',
    description: 'View uploaded documents',
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: '🔔',
    description: 'View alerts and updates',
  },
];

interface NavigationProps {
  children: React.ReactNode;
}

export default function Navigation({ children }: NavigationProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const user = useCurrentUser();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and brand */}
          <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white">
            <div className="flex items-center">
              <span className="text-xl font-bold">ClaimFlow</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-gray-200"
            >
              <span className="sr-only">Close sidebar</span>
              ✕
            </button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User profile and logout */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="mr-3">🚪</span>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Top navigation bar */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  {navigationItems.find((item) => item.href === pathname)?.name || 'ClaimFlow'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications badge */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <span className="sr-only">View notifications</span>
                <span className="text-lg">🔔</span>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
              </button>

              {/* User menu for mobile */}
              <div className="lg:hidden">
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Sign out</span>
                  <span className="text-lg">🚪</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}