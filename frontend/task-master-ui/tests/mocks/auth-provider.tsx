import React, { createContext, useContext } from 'react'

export interface MockAuthUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
}

export interface MockOrganization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface MockAuthContextType {
  user: MockAuthUser | null
  organization: MockOrganization | null
  organizations: MockOrganization[]
  loading: boolean
  signIn: jest.Mock
  signUp: jest.Mock
  signOut: jest.Mock
  resetPassword: jest.Mock
  updateProfile: jest.Mock
  createOrganization: jest.Mock
  switchOrganization: jest.Mock
  inviteMember: jest.Mock
  removeMember: jest.Mock
  updateMemberRole: jest.Mock
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined)

export const useMockAuth = () => {
  const context = useContext(MockAuthContext)
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider')
  }
  return context
}

interface MockAuthProviderProps {
  children: React.ReactNode
  value?: Partial<MockAuthContextType>
}

export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({ 
  children, 
  value = {} 
}) => {
  const defaultValue: MockAuthContextType = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    },
    organization: {
      id: 'test-org-id',
      name: 'Test Organization',
      slug: 'test-org',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    organizations: [
      {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updateProfile: jest.fn(),
    createOrganization: jest.fn(),
    switchOrganization: jest.fn(),
    inviteMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    ...value,
  }

  return (
    <MockAuthContext.Provider value={defaultValue}>
      {children}
    </MockAuthContext.Provider>
  )
}