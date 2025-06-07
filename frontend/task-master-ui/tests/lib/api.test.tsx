import { apiClient } from '@/lib/api'
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
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  })),
  rpc: jest.fn(),
}

mockCreateClient.mockReturnValue(mockSupabaseClient as any)

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('signs in user successfully', async () => {
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

      const result = await apiClient.auth.signIn({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.user).toEqual(mockUser)
    })

    it('handles sign in error', async () => {
      const signInError = { message: 'Invalid credentials' }
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      })

      await expect(
        apiClient.auth.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('signs up user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: null,
        },
        error: null,
      })

      const result = await apiClient.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
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
      expect(result.user).toEqual(mockUser)
    })

    it('signs out user successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      await apiClient.auth.signOut()

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('resets password successfully', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      await apiClient.auth.resetPassword('test@example.com')

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: expect.stringContaining('/auth/reset-password') }
      )
    })

    it('updates user profile successfully', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Updated Name' },
      }

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: updatedUser },
        error: null,
      })

      const result = await apiClient.auth.updateProfile({
        fullName: 'Updated Name',
      })

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: { full_name: 'Updated Name' },
      })
      expect(result.user).toEqual(updatedUser)
    })

    it('gets current session', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await apiClient.auth.getSession()

      expect(result.session).toEqual(mockSession)
    })
  })

  describe('Organizations', () => {
    it('creates organization successfully', async () => {
      const newOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: newOrganization,
        error: null,
      })

      const result = await apiClient.organizations.create({
        name: 'Test Organization',
        slug: 'test-org',
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations')
      expect(result).toEqual(newOrganization)
    })

    it('lists user organizations', async () => {
      const mockOrganizations = [
        { id: 'org-1', name: 'Org One', slug: 'org-one', role: 'admin' },
        { id: 'org-2', name: 'Org Two', slug: 'org-two', role: 'member' },
      ]

      mockSupabaseClient.from().select().eq.mockResolvedValue({
        data: mockOrganizations,
        error: null,
      })

      const result = await apiClient.organizations.list('user-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members')
      expect(result).toEqual(mockOrganizations)
    })

    it('updates organization successfully', async () => {
      const updatedOrganization = {
        id: 'org-123',
        name: 'Updated Organization',
        slug: 'updated-org',
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedOrganization,
        error: null,
      })

      const result = await apiClient.organizations.update('org-123', {
        name: 'Updated Organization',
      })

      expect(result).toEqual(updatedOrganization)
    })

    it('deletes organization successfully', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: null,
      })

      await apiClient.organizations.delete('org-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations')
    })
  })

  describe('Members', () => {
    it('lists organization members', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
        },
        {
          id: 'member-2',
          email: 'member@example.com',
          role: 'member',
          status: 'active',
        },
      ]

      mockSupabaseClient.from().select().eq.mockResolvedValue({
        data: mockMembers,
        error: null,
      })

      const result = await apiClient.members.list('org-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members')
      expect(result).toEqual(mockMembers)
    })

    it('invites member successfully', async () => {
      const invitationData = {
        id: 'inv-123',
        email: 'newmember@example.com',
        role: 'member',
        status: 'pending',
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: invitationData,
        error: null,
      })

      const result = await apiClient.members.invite('org-123', {
        email: 'newmember@example.com',
        role: 'member',
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('invitations')
      expect(result).toEqual(invitationData)
    })

    it('removes member successfully', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: null,
      })

      await apiClient.members.remove('org-123', 'member-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members')
    })

    it('updates member role successfully', async () => {
      const updatedMember = {
        id: 'member-123',
        role: 'admin',
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedMember,
        error: null,
      })

      const result = await apiClient.members.updateRole('org-123', 'member-123', 'admin')

      expect(result).toEqual(updatedMember)
    })
  })

  describe('Invitations', () => {
    it('lists organization invitations', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'pending@example.com',
          role: 'member',
          status: 'pending',
          expires_at: '2023-01-08T00:00:00Z',
        },
      ]

      mockSupabaseClient.from().select().eq().order.mockResolvedValue({
        data: mockInvitations,
        error: null,
      })

      const result = await apiClient.invitations.list('org-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('invitations')
      expect(result).toEqual(mockInvitations)
    })

    it('accepts invitation successfully', async () => {
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: { status: 'accepted' },
        error: null,
      })

      const result = await apiClient.invitations.accept('inv-123')

      expect(result.status).toBe('accepted')
    })

    it('declines invitation successfully', async () => {
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: { status: 'declined' },
        error: null,
      })

      const result = await apiClient.invitations.decline('inv-123')

      expect(result.status).toBe('declined')
    })

    it('resends invitation successfully', async () => {
      const updatedInvitation = {
        id: 'inv-123',
        status: 'pending',
        expires_at: '2023-01-15T00:00:00Z',
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedInvitation,
        error: null,
      })

      const result = await apiClient.invitations.resend('inv-123')

      expect(result).toEqual(updatedInvitation)
    })

    it('cancels invitation successfully', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        data: null,
        error: null,
      })

      await apiClient.invitations.cancel('inv-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('invitations')
    })
  })

  describe('Error Handling', () => {
    it('handles database errors', async () => {
      const dbError = { message: 'Database connection failed' }
      mockSupabaseClient.from().select().eq.mockResolvedValue({
        data: null,
        error: dbError,
      })

      await expect(
        apiClient.organizations.list('user-123')
      ).rejects.toThrow('Database connection failed')
    })

    it('handles network errors', async () => {
      mockSupabaseClient.from().select().eq.mockRejectedValue(
        new Error('Network error')
      )

      await expect(
        apiClient.organizations.list('user-123')
      ).rejects.toThrow('Network error')
    })

    it('handles null data responses', async () => {
      mockSupabaseClient.from().select().eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await apiClient.organizations.list('user-123')

      expect(result).toEqual([])
    })
  })

  describe('Query Building', () => {
    it('builds complex queries with filters', async () => {
      const mockData = [{ id: 'member-1', role: 'admin' }]
      
      mockSupabaseClient.from().select().eq().neq().order().limit.mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await apiClient.members.list('org-123', {
        role: 'admin',
        status: { neq: 'inactive' },
        orderBy: 'created_at',
        limit: 10,
      })

      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('role', 'admin')
      expect(mockSupabaseClient.from().select().eq().neq).toHaveBeenCalledWith('status', 'inactive')
      expect(result).toEqual(mockData)
    })

    it('supports pagination', async () => {
      const mockData = [{ id: 'member-1' }, { id: 'member-2' }]
      
      mockSupabaseClient.from().select().range.mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await apiClient.members.list('org-123', {
        offset: 20,
        limit: 10,
      })

      expect(mockSupabaseClient.from().select().range).toHaveBeenCalledWith(20, 29)
      expect(result).toEqual(mockData)
    })

    it('supports text search', async () => {
      const mockData = [{ id: 'org-1', name: 'Test Organization' }]
      
      mockSupabaseClient.from().select().ilike.mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await apiClient.organizations.list('user-123', {
        search: 'test',
      })

      expect(mockSupabaseClient.from().select().ilike).toHaveBeenCalledWith('name', '%test%')
      expect(result).toEqual(mockData)
    })
  })

  describe('Real-time Subscriptions', () => {
    it('subscribes to organization changes', () => {
      const mockSubscription = {
        unsubscribe: jest.fn(),
      }

      mockSupabaseClient.from().on = jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue(mockSubscription),
      })

      const callback = jest.fn()
      const subscription = apiClient.organizations.subscribe('org-123', callback)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations')
      expect(subscription).toEqual(mockSubscription)
    })

    it('subscribes to member changes', () => {
      const mockSubscription = {
        unsubscribe: jest.fn(),
      }

      mockSupabaseClient.from().on = jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue(mockSubscription),
      })

      const callback = jest.fn()
      const subscription = apiClient.members.subscribe('org-123', callback)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members')
      expect(subscription).toEqual(mockSubscription)
    })
  })
})