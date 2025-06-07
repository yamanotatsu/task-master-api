// Mock API client for testing
export const mockApiClient = {
  auth: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updateProfile: jest.fn(),
    getSession: jest.fn(),
  },
  organizations: {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    switch: jest.fn(),
  },
  members: {
    list: jest.fn(),
    invite: jest.fn(),
    remove: jest.fn(),
    updateRole: jest.fn(),
  },
  invitations: {
    list: jest.fn(),
    accept: jest.fn(),
    decline: jest.fn(),
    resend: jest.fn(),
    cancel: jest.fn(),
  },
}

// Mock API responses
export const mockApiResponses = {
  auth: {
    signIn: {
      success: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
      },
      error: {
        message: 'Invalid credentials',
      },
    },
    signUp: {
      success: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
        session: null,
      },
      error: {
        message: 'Email already registered',
      },
    },
    resetPassword: {
      success: {},
      error: {
        message: 'Email not found',
      },
    },
  },
  organizations: {
    create: {
      success: {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      error: {
        message: 'Organization name already exists',
      },
    },
    list: {
      success: [
        {
          id: 'org-123',
          name: 'Test Organization',
          slug: 'test-org',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
    },
  },
  members: {
    list: {
      success: [
        {
          id: 'member-123',
          email: 'member@example.com',
          role: 'member',
          status: 'active',
          joined_at: '2023-01-01T00:00:00Z',
        },
      ],
    },
    invite: {
      success: {
        id: 'invitation-123',
        email: 'newmember@example.com',
        role: 'member',
        status: 'pending',
        created_at: '2023-01-01T00:00:00Z',
      },
      error: {
        message: 'Member already exists',
      },
    },
  },
  invitations: {
    list: {
      success: [
        {
          id: 'invitation-123',
          email: 'pending@example.com',
          role: 'member',
          status: 'pending',
          created_at: '2023-01-01T00:00:00Z',
          expires_at: '2023-01-08T00:00:00Z',
        },
      ],
    },
  },
}

// Helper to reset all mocks
export const resetMocks = () => {
  Object.values(mockApiClient).forEach(category => {
    Object.values(category).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset()
      }
    })
  })
}

// Helper to setup common mock responses
export const setupMockResponses = () => {
  mockApiClient.auth.signIn.mockResolvedValue(mockApiResponses.auth.signIn.success)
  mockApiClient.auth.signUp.mockResolvedValue(mockApiResponses.auth.signUp.success)
  mockApiClient.auth.resetPassword.mockResolvedValue(mockApiResponses.auth.resetPassword.success)
  mockApiClient.organizations.create.mockResolvedValue(mockApiResponses.organizations.create.success)
  mockApiClient.organizations.list.mockResolvedValue(mockApiResponses.organizations.list.success)
  mockApiClient.members.list.mockResolvedValue(mockApiResponses.members.list.success)
  mockApiClient.members.invite.mockResolvedValue(mockApiResponses.members.invite.success)
  mockApiClient.invitations.list.mockResolvedValue(mockApiResponses.invitations.list.success)
}