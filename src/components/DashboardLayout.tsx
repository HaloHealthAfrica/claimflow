'use client';

// Dashboard layout wrapper with navigation
import ProtectedRoute from './ProtectedRoute';
import Navigation from './Navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <Navigation>
        {children}
      </Navigation>
    </ProtectedRoute>
  );
}