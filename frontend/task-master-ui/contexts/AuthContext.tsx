'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { fullName?: string }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabase client singleton
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  }
  return supabaseClient;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseClient();

  // Fetch user organizations
  const fetchOrganizations = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/v1/organizations', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        
        // Set current organization from localStorage or first org
        const savedOrgId = localStorage.getItem('currentOrganizationId');
        const savedOrg = data.find((org: Organization) => org.id === savedOrgId);
        setCurrentOrganization(savedOrg || data[0] || null);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  }, [session?.access_token]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchOrganizations(initialSession.user.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchOrganizations(session.user.id);
      } else {
        setOrganizations([]);
        setCurrentOrganization(null);
      }
      
      if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, fetchOrganizations]);

  // Auth methods
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      
      if (error) throw error;
      
      // Redirect to confirmation page
      router.push('/auth/confirm-email');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Organizations will be fetched via onAuthStateChange
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      localStorage.removeItem('currentOrganizationId');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateProfile = async (data: { fullName?: string }) => {
    try {
      setError(null);
      const response = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      setError(null);
      const response = await fetch('/api/v1/auth/user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete account');
      
      await signOut();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const refreshOrganizations = async () => {
    if (user) {
      await fetchOrganizations(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    organizations,
    currentOrganization,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    deleteAccount,
    setCurrentOrganization: handleSetCurrentOrganization,
    refreshOrganizations,
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