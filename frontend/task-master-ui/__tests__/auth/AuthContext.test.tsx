import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthContext', () => {
  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  };

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should provide auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.signUp).toBeDefined();
    expect(result.current.signIn).toBeDefined();
    expect(result.current.signOut).toBeDefined();
    expect(result.current.updateProfile).toBeDefined();
    expect(result.current.changePassword).toBeDefined();
    expect(result.current.deleteAccount).toBeDefined();
  });

  it('should initialize with no user', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.organizations).toEqual([]);
  });

  it('should initialize with existing session', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      },
      access_token: 'access-token',
    };

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'org-123', name: 'Test Org', role: 'admin' },
      ],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.organizations).toHaveLength(1);
    expect(result.current.currentOrganization).toEqual({
      id: 'org-123',
      name: 'Test Org',
      role: 'admin',
    });
  });

  it('should handle sign up', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'new@example.com',
    };

    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signUp('new@example.com', 'password123', 'New User');
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        data: { full_name: 'New User' },
      },
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/confirm-email');
  });

  it('should handle sign up error', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { message: 'Email already exists' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signUp('existing@example.com', 'password123', 'User');
      })
    ).rejects.toThrow('Email already exists');

    expect(result.current.error).toBe('Email already exists');
  });

  it('should handle sign in', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
      access_token: 'access-token',
    };

    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: mockSession.user, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(localStorage.removeItem).toHaveBeenCalledWith('currentOrganizationId');
  });

  it('should handle auth state changes', async () => {
    const authStateCallback = jest.fn();
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback.mockImplementation(callback);
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });

    renderHook(() => useAuth(), { wrapper });

    const newSession = {
      user: {
        id: 'user-456',
        email: 'changed@example.com',
      },
      access_token: 'new-token',
    };

    await act(async () => {
      authStateCallback('SIGNED_IN', newSession);
    });

    await act(async () => {
      authStateCallback('SIGNED_OUT', null);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
  });

  it('should update profile', async () => {
    const mockSession = {
      access_token: 'access-token',
    };

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfile({ fullName: 'Updated Name' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/auth/profile',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Authorization': 'Bearer access-token',
        }),
        body: JSON.stringify({ fullName: 'Updated Name' }),
      })
    );
  });

  it('should change password', async () => {
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: {} },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.changePassword('newPassword123');
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'newPassword123',
    });
  });

  it('should handle organization switching', async () => {
    const orgs = [
      { id: 'org-1', name: 'Org 1', role: 'admin' as const },
      { id: 'org-2', name: 'Org 2', role: 'member' as const },
    ];

    const mockSession = {
      user: { id: 'user-123' },
      access_token: 'token',
    };

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => orgs,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentOrganization).toEqual(orgs[0]);

    act(() => {
      result.current.setCurrentOrganization(orgs[1]);
    });

    expect(result.current.currentOrganization).toEqual(orgs[1]);
    expect(localStorage.setItem).toHaveBeenCalledWith('currentOrganizationId', 'org-2');
  });
});