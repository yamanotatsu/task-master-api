import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
}

mockCreateClient.mockReturnValue(mockSupabaseClient as any)

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('useAuth hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
  })

  it('initializes with loading state', () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.organization).toBe(null)
  })

  it('loads user session on mount', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    }

    const mockSession = {
      user: mockUser,
      access_token: 'mock-token',
    }

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toEqual(mockUser)
    })
  })

  it('handles sign in successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    }

    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: mockUser,
        session: { user: mockUser, access_token: 'token' },
      },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('handles sign in error', async () => {
    const signInError = new Error('Invalid credentials')
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: signInError,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await expect(async () => {
      await act(async () => {
        await result.current.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      })
    }).rejects.toThrow('Invalid credentials')
  })

  it('handles sign up successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    }

    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: {
        user: mockUser,
        session: null, // Usually null for email confirmation
      },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.signUp({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      })
    })

    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'Test User',
        },
      },
    })
  })

  it('handles sign up error', async () => {
    const signUpError = new Error('Email already registered')
    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: signUpError,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await expect(async () => {
      await act(async () => {
        await result.current.signUp({
          email: 'existing@example.com',
          password: 'password123',
          fullName: 'Test User',
        })
      })
    }).rejects.toThrow('Email already registered')
  })

  it('handles sign out successfully', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValue({
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
  })

  it('handles reset password successfully', async () => {
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.resetPassword('test@example.com')
    })

    expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: expect.stringContaining('/auth/reset-password') }
    )
  })

  it('handles reset password error', async () => {
    const resetError = new Error('Email not found')
    mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: resetError,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await expect(async () => {
      await act(async () => {
        await result.current.resetPassword('nonexistent@example.com')
      })
    }).rejects.toThrow('Email not found')
  })

  it('handles update profile successfully', async () => {
    const updatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Updated Name' },
    }

    mockSupabaseClient.auth.updateUser.mockResolvedValue({
      data: { user: updatedUser },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.updateProfile({ fullName: 'Updated Name' })
    })

    expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Updated Name' },
    })
  })

  it('loads organizations for authenticated user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    }

    const mockOrganizations = [
      {
        id: 'org-1',
        name: 'Organization One',
        slug: 'org-one',
        role: 'admin',
      },
      {
        id: 'org-2',
        name: 'Organization Two',
        slug: 'org-two',
        role: 'member',
      },
    ]

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: mockOrganizations,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.organizations).toEqual(mockOrganizations)
      expect(result.current.organization).toEqual(mockOrganizations[0]) // First org as current
    })
  })

  it('creates organization successfully', async () => {
    const newOrganization = {
      id: 'org-new',
      name: 'New Organization',
      slug: 'new-org',
    }

    mockSupabaseClient.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: newOrganization,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      const created = await result.current.createOrganization({
        name: 'New Organization',
        slug: 'new-org',
      })
      expect(created).toEqual(newOrganization)
    })
  })

  it('switches organization successfully', async () => {
    const mockOrganizations = [
      { id: 'org-1', name: 'Org One', slug: 'org-one' },
      { id: 'org-2', name: 'Org Two', slug: 'org-two' },
    ]

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    // Set initial organizations
    act(() => {
      result.current.organizations = mockOrganizations
      result.current.organization = mockOrganizations[0]
    })

    await act(async () => {
      await result.current.switchOrganization('org-2')
    })

    expect(result.current.organization).toEqual(mockOrganizations[1])
  })

  it('invites member successfully', async () => {
    const invitationData = {
      id: 'inv-123',
      email: 'newmember@example.com',
      role: 'member',
      status: 'pending',
    }

    mockSupabaseClient.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: invitationData,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      const invitation = await result.current.inviteMember({
        email: 'newmember@example.com',
        role: 'member',
      })
      expect(invitation).toEqual(invitationData)
    })
  })

  it('removes member successfully', async () => {
    mockSupabaseClient.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.removeMember('member-123')
    })

    expect(mockSupabaseClient.from().delete).toHaveBeenCalled()
  })

  it('updates member role successfully', async () => {
    const updatedMember = {
      id: 'member-123',
      role: 'admin',
    }

    mockSupabaseClient.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: updatedMember,
        error: null,
      }),
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      const updated = await result.current.updateMemberRole('member-123', 'admin')
      expect(updated).toEqual(updatedMember)
    })
  })

  it('handles auth state changes', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    }

    let authStateCallback: (event: string, session: any) => void

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    // Simulate sign in event
    act(() => {
      authStateCallback('SIGNED_IN', { user: mockUser })
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })

    // Simulate sign out event
    act(() => {
      authStateCallback('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(result.current.user).toBe(null)
    })
  })

  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('handles network errors gracefully', async () => {
    const networkError = new Error('Network error')
    mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(networkError)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await expect(async () => {
      await act(async () => {
        await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    }).rejects.toThrow('Network error')
  })

  it('persists organization selection in localStorage', async () => {
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.switchOrganization('org-2')
    })

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'currentOrganization',
      'org-2'
    )
  })
})