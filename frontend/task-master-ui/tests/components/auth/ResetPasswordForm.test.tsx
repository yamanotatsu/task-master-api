import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { MockAuthProvider } from '@/tests/mocks/auth-provider'

// Mock the toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock useSearchParams
const mockSearchParams = {
  get: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

const mockUpdatePassword = jest.fn()

const renderResetPasswordForm = (authOverrides = {}) => {
  return render(
    <MockAuthProvider
      value={{
        updatePassword: mockUpdatePassword,
        loading: false,
        ...authOverrides,
      }}
    >
      <ResetPasswordForm />
    </MockAuthProvider>
  )
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.get.mockReturnValue('valid-token')
  })

  it('renders all form elements', () => {
    renderResetPasswordForm()

    expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderResetPasswordForm()

    const submitButton = screen.getByRole('button', { name: /update password/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/new password is required/i)).toBeInTheDocument()
    })

    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('validates password strength', async () => {
    const user = userEvent.setup()
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    
    // Test weak password
    await user.type(passwordInput, '123')
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    // Test medium strength password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'password')
    
    await waitFor(() => {
      expect(screen.getByText(/weak/i)).toBeInTheDocument()
    })

    // Test strong password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'StrongPass123!')
    
    await waitFor(() => {
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    const user = userEvent.setup()
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    const submitButton = screen.getByRole('button', { name: /update password/i })

    await user.type(passwordInput, 'StrongPass123!')
    await user.type(confirmPasswordInput, 'DifferentPass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockUpdatePassword.mockResolvedValue({ success: true })
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    const submitButton = screen.getByRole('button', { name: /update password/i })

    await user.type(passwordInput, 'StrongPass123!')
    await user.type(confirmPasswordInput, 'StrongPass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('StrongPass123!')
    })
  })

  it('shows loading state during submission', () => {
    renderResetPasswordForm({ loading: true })

    const submitButton = screen.getByRole('button', { name: /updating password/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles password update error', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid or expired reset token'
    mockUpdatePassword.mockRejectedValue(new Error(errorMessage))
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    const submitButton = screen.getByRole('button', { name: /update password/i })

    await user.type(passwordInput, 'StrongPass123!')
    await user.type(confirmPasswordInput, 'StrongPass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('shows success message after successful password update', async () => {
    const user = userEvent.setup()
    mockUpdatePassword.mockResolvedValue({ success: true })
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    const submitButton = screen.getByRole('button', { name: /update password/i })

    await user.type(passwordInput, 'StrongPass123!')
    await user.type(confirmPasswordInput, 'StrongPass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Password updated successfully! Redirecting to login...'
      )
    })
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement
    const toggleButtons = screen.getAllByRole('button', { name: /toggle password visibility/i })

    expect(passwordInput.type).toBe('password')
    expect(confirmPasswordInput.type).toBe('password')

    // Toggle new password field
    await user.click(toggleButtons[0])
    expect(passwordInput.type).toBe('text')

    // Toggle confirm password field
    await user.click(toggleButtons[1])
    expect(confirmPasswordInput.type).toBe('text')
  })

  it('shows password strength indicator', async () => {
    const user = userEvent.setup()
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)

    // Test weak password
    await user.type(passwordInput, 'weak')
    expect(screen.getByTestId('password-strength-weak')).toBeInTheDocument()

    // Test medium password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'mediumpass')
    expect(screen.getByTestId('password-strength-medium')).toBeInTheDocument()

    // Test strong password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'StrongPass123!')
    expect(screen.getByTestId('password-strength-strong')).toBeInTheDocument()
  })

  it('handles missing reset token', () => {
    mockSearchParams.get.mockReturnValue(null)
    renderResetPasswordForm()

    expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument()
    expect(screen.getByText(/request a new password reset/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
  })

  it('handles expired reset token', async () => {
    const user = userEvent.setup()
    mockUpdatePassword.mockRejectedValue(new Error('Reset token has expired'))
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    const submitButton = screen.getByRole('button', { name: /update password/i })

    await user.type(passwordInput, 'StrongPass123!')
    await user.type(confirmPasswordInput, 'StrongPass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Reset token has expired')
      expect(screen.getByText(/request a new password reset/i)).toBeInTheDocument()
    })
  })

  it('provides link to request new reset', () => {
    mockSearchParams.get.mockReturnValue(null)
    renderResetPasswordForm()

    const newResetLink = screen.getByText(/request a new password reset/i)
    expect(newResetLink).toHaveAttribute('href', '/auth/forgot-password')
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
    const submitButton = screen.getByRole('button', { name: /update password/i })

    passwordInput.focus()
    await user.tab()
    expect(confirmPasswordInput).toHaveFocus()

    await user.tab()
    expect(submitButton).toHaveFocus()
  })

  it('submits form on Enter key press', async () => {
    const user = userEvent.setup()
    mockUpdatePassword.mockResolvedValue({ success: true })
    renderResetPasswordForm()

    const passwordInput = screen.getByLabelText(/new password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

    await user.type(passwordInput, 'StrongPass123!')
    await user.type(confirmPasswordInput, 'StrongPass123!')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('StrongPass123!')
    })
  })
})