'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireOrganization = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasOrganization } = useRequireAuth({ requireOrganization });

  // Show loading while checking auth
  if (!isAuthenticated || (requireOrganization && !hasOrganization)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}