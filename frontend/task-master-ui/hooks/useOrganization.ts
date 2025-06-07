'use client';

import { useAuth } from './useAuth';

export function useOrganization() {
  const { 
    organizations, 
    currentOrganization, 
    setCurrentOrganization,
    refreshOrganizations 
  } = useAuth();

  const isAdmin = currentOrganization?.role === 'admin';
  const isMember = currentOrganization?.role === 'member';

  return {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    refreshOrganizations,
    isAdmin,
    isMember,
  };
}