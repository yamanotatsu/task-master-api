import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { OrganizationSetupForm } from '@/components/auth/OrganizationSetupForm'
import { MockAuthProvider } from '@/tests/mocks/auth-provider'

// Mock the toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockCreateOrganization = jest.fn()
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

const renderOrganizationSetupForm = (authOverrides = {}) => {
  return render(
    <MockAuthProvider
      value={{
        createOrganization: mockCreateOrganization,
        loading: false,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          user_metadata: { full_name: 'Test User' },
        },
        ...authOverrides,
      }}
    >
      <OrganizationSetupForm />
    </MockAuthProvider>
  )
}

describe('OrganizationSetupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form elements', () => {
    renderOrganizationSetupForm()

    expect(screen.getByText(/create your organization/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization slug/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument()
    expect(screen.getByText(/skip for now/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const submitButton = screen.getByRole('button', { name: /create organization/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/organization name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/organization slug is required/i)).toBeInTheDocument()
    })

    expect(mockCreateOrganization).not.toHaveBeenCalled()
  })

  it('validates organization name length', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)
    const submitButton = screen.getByRole('button', { name: /create organization/i })

    // Test too short
    await user.type(nameInput, 'AB')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/organization name must be at least 3 characters/i)).toBeInTheDocument()
    })

    // Test too long
    await user.clear(nameInput)
    await user.type(nameInput, 'A'.repeat(51))
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/organization name must be less than 50 characters/i)).toBeInTheDocument()
    })

    expect(mockCreateOrganization).not.toHaveBeenCalled()
  })

  it('validates organization slug format', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const slugInput = screen.getByLabelText(/organization slug/i)
    const submitButton = screen.getByRole('button', { name: /create organization/i })

    // Test invalid characters
    await user.type(slugInput, 'invalid slug!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/slug can only contain lowercase letters, numbers, and hyphens/i)).toBeInTheDocument()
    })

    // Test too short
    await user.clear(slugInput)
    await user.type(slugInput, 'ab')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/slug must be at least 3 characters/i)).toBeInTheDocument()
    })

    expect(mockCreateOrganization).not.toHaveBeenCalled()
  })

  it('auto-generates slug from organization name', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)
    const slugInput = screen.getByLabelText(/organization slug/i) as HTMLInputElement

    await user.type(nameInput, 'My Awesome Company')

    await waitFor(() => {
      expect(slugInput.value).toBe('my-awesome-company')
    })
  })

  it('allows manual slug editing', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const slugInput = screen.getByLabelText(/organization slug/i)

    await user.type(slugInput, 'custom-slug')

    expect(slugInput).toHaveValue('custom-slug')
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockCreateOrganization.mockResolvedValue({ 
      id: 'org-123',
      name: 'Test Company',
      slug: 'test-company' 
    })
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)
    const slugInput = screen.getByLabelText(/organization slug/i)
    const submitButton = screen.getByRole('button', { name: /create organization/i })

    await user.type(nameInput, 'Test Company')
    await user.clear(slugInput)
    await user.type(slugInput, 'test-company')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith({
        name: 'Test Company',
        slug: 'test-company',
      })
    })
  })

  it('shows loading state during submission', () => {
    renderOrganizationSetupForm({ loading: true })

    const submitButton = screen.getByRole('button', { name: /creating organization/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles organization creation error', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Organization slug already exists'
    mockCreateOrganization.mockRejectedValue(new Error(errorMessage))
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)
    const slugInput = screen.getByLabelText(/organization slug/i)
    const submitButton = screen.getByRole('button', { name: /create organization/i })

    await user.type(nameInput, 'Test Company')
    await user.clear(slugInput)
    await user.type(slugInput, 'existing-slug')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('redirects to dashboard after successful creation', async () => {
    const user = userEvent.setup()
    mockCreateOrganization.mockResolvedValue({ 
      id: 'org-123',
      name: 'Test Company',
      slug: 'test-company' 
    })
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)
    const submitButton = screen.getByRole('button', { name: /create organization/i })

    await user.type(nameInput, 'Test Company')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      expect(toast.success).toHaveBeenCalledWith('Organization created successfully!')
    })
  })

  it('handles skip for now option', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const skipButton = screen.getByText(/skip for now/i)
    await user.click(skipButton)

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
  })

  it('shows slug availability check', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const slugInput = screen.getByLabelText(/organization slug/i)

    await user.type(slugInput, 'available-slug')

    await waitFor(() => {
      expect(screen.getByText(/checking availability/i)).toBeInTheDocument()
    })

    // Mock slug available
    await waitFor(() => {
      expect(screen.getByText(/slug is available/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows slug unavailable message', async () => {
    const user = userEvent.setup()
    // Mock API to return slug unavailable
    mockCreateOrganization.mockRejectedValue(new Error('Slug already exists'))
    renderOrganizationSetupForm()

    const slugInput = screen.getByLabelText(/organization slug/i)

    await user.type(slugInput, 'taken-slug')

    await waitFor(() => {
      expect(screen.getByText(/checking availability/i)).toBeInTheDocument()
    })

    // Mock slug unavailable
    await waitFor(() => {
      expect(screen.getByText(/slug is not available/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)
    const slugInput = screen.getByLabelText(/organization slug/i)
    const submitButton = screen.getByRole('button', { name: /create organization/i })

    nameInput.focus()
    await user.tab()
    expect(slugInput).toHaveFocus()

    await user.tab()
    expect(submitButton).toHaveFocus()
  })

  it('submits form on Enter key press', async () => {
    const user = userEvent.setup()
    mockCreateOrganization.mockResolvedValue({ 
      id: 'org-123',
      name: 'Test Company',
      slug: 'test-company' 
    })
    renderOrganizationSetupForm()

    const nameInput = screen.getByLabelText(/organization name/i)

    await user.type(nameInput, 'Test Company')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith({
        name: 'Test Company',
        slug: 'test-company',
      })
    })
  })

  it('shows organization benefits section', () => {
    renderOrganizationSetupForm()

    expect(screen.getByText(/why create an organization/i)).toBeInTheDocument()
    expect(screen.getByText(/collaborate with team members/i)).toBeInTheDocument()
    expect(screen.getByText(/manage projects together/i)).toBeInTheDocument()
    expect(screen.getByText(/control access and permissions/i)).toBeInTheDocument()
  })

  it('validates slug in real-time', async () => {
    const user = userEvent.setup()
    renderOrganizationSetupForm()

    const slugInput = screen.getByLabelText(/organization slug/i)

    // Type invalid character
    await user.type(slugInput, 'invalid_slug')

    await waitFor(() => {
      expect(screen.getByText(/slug can only contain lowercase letters, numbers, and hyphens/i)).toBeInTheDocument()
    })
  })
})