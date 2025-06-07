'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requireOrganization?: boolean;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { 
    redirectTo = '/auth/login',
    requireOrganization = true 
  } = options;
  
  const { user, organizations, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(redirectTo);
      return;
    }

    if (requireOrganization && organizations.length === 0) {
      router.push('/setup-organization');
    }
  }, [user, organizations, loading, redirectTo, requireOrganization, router]);

  return { isAuthenticated: !!user, hasOrganization: organizations.length > 0 };
}