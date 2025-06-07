/**
 * Mock data generators for authentication system tests
 */

import { jest } from '@jest/globals';

/**
 * Mock user data
 */
export const mockUsers = {
  admin: {
    id: 'mock-admin-user-id',
    email: 'admin@test.com',
    fullName: 'Test Admin',
    password: 'AdminPass123!',
    role: 'admin',
    profile: {
      id: 'mock-admin-user-id',
      email: 'admin@test.com',
      full_name: 'Test Admin',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  member: {
    id: 'mock-member-user-id',
    email: 'member@test.com',
    fullName: 'Test Member',
    password: 'MemberPass123!',
    role: 'member',
    profile: {
      id: 'mock-member-user-id',
      email: 'member@test.com',
      full_name: 'Test Member',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  newUser: {
    id: 'mock-new-user-id',
    email: 'newuser@test.com',
    fullName: 'New Test User',
    password: 'NewUserPass123!',
    profile: {
      id: 'mock-new-user-id',
      email: 'newuser@test.com',
      full_name: 'New Test User',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
};

/**
 * Mock organization data
 */
export const mockOrganizations = {
  primary: {
    id: 'mock-org-1',
    name: 'Test Organization 1',
    description: 'Primary test organization',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  secondary: {
    id: 'mock-org-2',
    name: 'Test Organization 2',
    description: 'Secondary test organization',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

/**
 * Mock membership data
 */
export const mockMemberships = {
  adminMembership: {
    organization_id: 'mock-org-1',
    profile_id: 'mock-admin-user-id',
    role: 'admin',
    joined_at: '2024-01-01T00:00:00Z'
  },
  memberMembership: {
    organization_id: 'mock-org-1',
    profile_id: 'mock-member-user-id',
    role: 'member',
    joined_at: '2024-01-01T00:00:00Z'
  }
};

/**
 * Mock invitation data
 */
export const mockInvitations = {
  pending: {
    id: 'mock-invitation-1',
    organization_id: 'mock-org-1',
    email: 'invited@test.com',
    role: 'member',
    token: 'mock-invitation-token',
    invited_by: 'mock-admin-user-id',
    expires_at: '2024-01-08T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z'
  },
  expired: {
    id: 'mock-invitation-2',
    organization_id: 'mock-org-1',
    email: 'expired@test.com',
    role: 'member',
    token: 'mock-expired-token',
    invited_by: 'mock-admin-user-id',
    expires_at: '2023-12-01T00:00:00Z',
    created_at: '2023-11-24T00:00:00Z'
  }
};

/**
 * Mock authentication responses
 */
export const mockAuthResponses = {
  signupSuccess: {
    data: {
      user: {
        id: 'mock-new-user-id',
        email: 'newuser@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z'
      },
      session: null
    },
    error: null
  },
  signupEmailExists: {
    data: null,
    error: {
      message: 'User already registered'
    }
  },
  loginSuccess: {
    data: {
      user: {
        id: 'mock-admin-user-id',
        email: 'admin@test.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z'
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }
    },
    error: null
  },
  loginInvalidCredentials: {
    data: null,
    error: {
      message: 'Invalid login credentials'
    }
  },
  loginEmailNotConfirmed: {
    data: null,
    error: {
      message: 'Email not confirmed'
    }
  },
  refreshSuccess: {
    data: {
      user: {
        id: 'mock-admin-user-id',
        email: 'admin@test.com'
      },
      session: {
        access_token: 'new-mock-access-token',
        refresh_token: 'new-mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }
    },
    error: null
  },
  refreshInvalid: {
    data: null,
    error: {
      message: 'Invalid refresh token'
    }
  },
  getUserSuccess: {
    data: {
      user: {
        id: 'mock-admin-user-id',
        email: 'admin@test.com',
        aud: 'authenticated'
      }
    },
    error: null
  },
  getUserInvalid: {
    data: null,
    error: {
      message: 'Invalid JWT'
    }
  }
};

/**
 * Mock database responses
 */
export const mockDatabaseResponses = {
  profileSelect: {
    data: mockUsers.admin.profile,
    error: null
  },
  profileInsert: {
    data: mockUsers.newUser.profile,
    error: null
  },
  organizationSelect: {
    data: [mockOrganizations.primary],
    error: null
  },
  organizationInsert: {
    data: mockOrganizations.primary,
    error: null
  },
  membershipSelect: {
    data: mockMemberships.adminMembership,
    error: null
  },
  membershipInsert: {
    data: mockMemberships.memberMembership,
    error: null
  },
  invitationSelect: {
    data: [mockInvitations.pending],
    error: null
  },
  invitationInsert: {
    data: mockInvitations.pending,
    error: null
  }
};

/**
 * Mock validation errors
 */
export const mockValidationErrors = {
  email: {
    required: { field: 'email', message: 'Email is required' },
    invalid: { field: 'email', message: 'Invalid email format' },
    exists: { field: 'email', message: 'Email already exists' }
  },
  password: {
    required: { field: 'password', message: 'Password is required' },
    weak: { field: 'password', message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' },
    mismatch: { field: 'confirmPassword', message: 'Passwords do not match' }
  },
  fullName: {
    required: { field: 'fullName', message: 'Full name is required' },
    tooLong: { field: 'fullName', message: 'Full name must be less than 100 characters' }
  },
  organization: {
    nameRequired: { field: 'name', message: 'Organization name is required' },
    nameTooLong: { field: 'name', message: 'Organization name must be less than 100 characters' }
  }
};

/**
 * Mock API error responses
 */
export const mockErrorResponses = {
  validation: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: [mockValidationErrors.email.invalid]
    }
  },
  unauthorized: {
    success: false,
    error: {
      code: 'AUTH_TOKEN_MISSING',
      message: 'Authentication required'
    }
  },
  forbidden: {
    success: false,
    error: {
      code: 'AUTHZ_INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions'
    }
  },
  notFound: {
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found'
    }
  },
  conflict: {
    success: false,
    error: {
      code: 'AUTH_EMAIL_EXISTS',
      message: 'Email already registered'
    }
  },
  rateLimited: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  },
  internalError: {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  }
};

/**
 * Mock API success responses
 */
export const mockSuccessResponses = {
  signup: {
    success: true,
    data: {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: mockUsers.newUser.id,
        email: mockUsers.newUser.email
      }
    }
  },
  login: {
    success: true,
    data: {
      user: {
        id: mockUsers.admin.id,
        email: mockUsers.admin.email,
        fullName: mockUsers.admin.fullName
      },
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600
      }
    }
  },
  logout: {
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  },
  refresh: {
    success: true,
    data: {
      tokens: {
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
        expiresIn: 3600
      }
    }
  },
  profile: {
    success: true,
    data: {
      profile: mockUsers.admin.profile
    }
  },
  organizationCreate: {
    success: true,
    data: {
      organization: mockOrganizations.primary,
      membership: mockMemberships.adminMembership
    }
  },
  organizationList: {
    success: true,
    data: {
      organizations: [
        {
          ...mockOrganizations.primary,
          role: 'admin',
          memberCount: 2,
          projectCount: 0,
          joinedAt: '2024-01-01T00:00:00Z'
        }
      ]
    },
    meta: {
      pagination: {
        page: 1,
        limit: 20,
        total: 1
      }
    }
  },
  memberList: {
    success: true,
    data: {
      members: [
        {
          id: mockUsers.admin.id,
          email: mockUsers.admin.email,
          fullName: mockUsers.admin.fullName,
          role: 'admin',
          joinedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: mockUsers.member.id,
          email: mockUsers.member.email,
          fullName: mockUsers.member.fullName,
          role: 'member',
          joinedAt: '2024-01-01T00:00:00Z'
        }
      ]
    },
    meta: {
      pagination: {
        page: 1,
        limit: 20,
        total: 2
      }
    }
  },
  invitation: {
    success: true,
    data: {
      invitation: {
        ...mockInvitations.pending,
        inviteUrl: `${process.env.APP_URL}/invite/${mockInvitations.pending.token}`
      }
    }
  }
};

/**
 * Create Supabase mock with customizable responses
 */
export const createSupabaseMock = (overrides = {}) => {
  const defaultMocks = {
    auth: {
      signUp: jest.fn().mockResolvedValue(mockAuthResponses.signupSuccess),
      signInWithPassword: jest.fn().mockResolvedValue(mockAuthResponses.loginSuccess),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue(mockAuthResponses.getUserSuccess),
      refreshSession: jest.fn().mockResolvedValue(mockAuthResponses.refreshSuccess),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue(mockAuthResponses.getUserSuccess),
      admin: {
        createUser: jest.fn().mockResolvedValue(mockAuthResponses.signupSuccess),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
        getUserByEmail: jest.fn().mockResolvedValue(mockAuthResponses.getUserSuccess),
        listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null })
      }
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(mockDatabaseResponses.profileSelect),
      maybeSingle: jest.fn().mockResolvedValue(mockDatabaseResponses.profileSelect),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };

  // Apply overrides recursively
  const applyOverrides = (target, source) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !jest.isMockFunction(source[key])) {
        if (!target[key]) target[key] = {};
        applyOverrides(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  };

  applyOverrides(defaultMocks, overrides);
  return defaultMocks;
};

/**
 * Create Express app mock with middleware
 */
export const createExpressAppMock = () => {
  const app = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn(),
    set: jest.fn()
  };

  const req = {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null,
    organizationMember: null
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  };

  const next = jest.fn();

  return { app, req, res, next };
};

/**
 * Test scenario data
 */
export const testScenarios = {
  signupFlow: {
    validUser: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      password: 'SecurePass123!'
    },
    invalidEmail: {
      fullName: 'John Doe',
      email: 'invalid-email',
      password: 'SecurePass123!'
    },
    weakPassword: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      password: 'weak'
    },
    existingEmail: {
      fullName: 'John Doe',
      email: 'admin@test.com',
      password: 'SecurePass123!'
    }
  },
  loginFlow: {
    validCredentials: {
      email: 'admin@test.com',
      password: 'AdminPass123!'
    },
    invalidCredentials: {
      email: 'admin@test.com',
      password: 'WrongPassword'
    },
    nonExistentUser: {
      email: 'nonexistent@test.com',
      password: 'SomePassword123!'
    },
    unverifiedEmail: {
      email: 'unverified@test.com',
      password: 'ValidPass123!'
    }
  },
  organizationFlow: {
    createOrg: {
      name: 'New Test Organization',
      description: 'A new organization for testing'
    },
    updateOrg: {
      name: 'Updated Organization Name',
      description: 'Updated description'
    },
    inviteMember: {
      email: 'newmember@example.com',
      role: 'member'
    },
    inviteAdmin: {
      email: 'newadmin@example.com',
      role: 'admin'
    }
  }
};