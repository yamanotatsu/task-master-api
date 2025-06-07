'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, AuthUser, Profile, Organization, OrganizationMember } from './supabase';
import { User, Session } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load user profile
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    }
  }, []);

  // Load user organizations
  const loadOrganizations = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            description,
            created_at,
            updated_at
          )
        `)
        .eq('profile_id', userId);

      if (error) throw error;

      const orgs = data?.map(item => ({
        ...item.organizations,
        role: item.role
      })) || [];

      setOrganizations(orgs as Organization[]);

      // Set current organization from cookie or default to first
      const savedOrgId = Cookies.get('current_organization');
      if (savedOrgId) {
        const savedOrg = orgs.find(org => org.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrganization(savedOrg as Organization);
        } else if (orgs.length > 0) {
          setCurrentOrganization(orgs[0] as Organization);
          Cookies.set('current_organization', orgs[0].id);
        }
      } else if (orgs.length > 0) {
        setCurrentOrganization(orgs[0] as Organization);
        Cookies.set('current_organization', orgs[0].id);
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
          await loadOrganizations(session.user.id);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
        await loadOrganizations(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setOrganizations([]);
        setCurrentOrganization(null);
        Cookies.remove('current_organization');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, loadOrganizations]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadProfile(data.user.id);
        await loadOrganizations(data.user.id);
        router.push('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    }
  };

  // Signup function
  const signup = async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create default organization for new user
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${fullName}'s Workspace`,
            description: 'Personal workspace',
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Add user as admin of their organization
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            profile_id: data.user.id,
            role: 'admin',
          });

        if (memberError) throw memberError;

        router.push('/');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Signup failed');
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      Cookies.remove('current_organization');
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      throw err;
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Update password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
      throw err;
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      setError(null);
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  };

  // Set current organization
  const handleSetCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganization(org);
    if (org) {
      Cookies.set('current_organization', org.id);
    } else {
      Cookies.remove('current_organization');
    }
  };

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (session?.user) {
        setUser(session.user);
      }
    } catch (err) {
      console.error('Refresh session error:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh session');
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    organizations,
    currentOrganization,
    loading,
    error,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}