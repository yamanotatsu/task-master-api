import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { InviteMemberModal } from '@/components/organization/InviteMemberModal'
import { MockAuthProvider } from '@/tests/mocks/auth-provider'

// Mock the toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockInviteMember = jest.fn()
const mockOnClose = jest.fn()

const renderInviteMemberModal = (props = {}) => {
  return render(
    <MockAuthProvider
      value={{
        inviteMember: mockInviteMember,
        loading: false,
      }}
    >
      <InviteMemberModal
        isOpen={true}
        onClose={mockOnClose}
        {...props}
      />
    </MockAuthProvider>
  )
}

describe('InviteMemberModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when open', () => {
    renderInviteMemberModal()

    expect(screen.getByText(/invite team member/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderInviteMemberModal({ isOpen: false })

    expect(screen.queryByText(/invite team member/i)).not.toBeInTheDocument()
  })

  it('validates required email field', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    const submitButton = screen.getByRole('button', { name: /send invitation/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })

    expect(mockInviteMember).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })

    expect(mockInviteMember).not.toHaveBeenCalled()
  })

  it('submits invitation with valid data', async () => {
    const user = userEvent.setup()
    mockInviteMember.mockResolvedValue({ success: true })
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const roleSelect = screen.getByLabelText(/role/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    await user.type(emailInput, 'newmember@example.com')
    await user.selectOptions(roleSelect, 'member')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith({
        email: 'newmember@example.com',
        role: 'member',
      })
    })
  })

  it('shows success message and closes modal after successful invitation', async () => {
    const user = userEvent.setup()
    mockInviteMember.mockResolvedValue({ success: true })
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    await user.type(emailInput, 'newmember@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Invitation sent successfully!')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles invitation error', async () => {
    const user = userEvent.setup()
    const errorMessage = 'User is already a member'
    mockInviteMember.mockRejectedValue(new Error(errorMessage))
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    await user.type(emailInput, 'existing@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })

    // Modal should stay open on error
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('shows loading state during submission', () => {
    renderInviteMemberModal()
    
    render(
      <MockAuthProvider
        value={{
          inviteMember: mockInviteMember,
          loading: true,
        }}
      >
        <InviteMemberModal isOpen={true} onClose={mockOnClose} />
      </MockAuthProvider>
    )

    const submitButton = screen.getByRole('button', { name: /sending invitation/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('allows selecting different roles', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    const roleSelect = screen.getByLabelText(/role/i)

    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()

    await user.selectOptions(roleSelect, 'admin')
    expect(roleSelect).toHaveValue('admin')
  })

  it('closes modal on cancel button click', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal on escape key press', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    await user.keyboard('{Escape}')

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal on backdrop click', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    const backdrop = screen.getByTestId('modal-backdrop')
    await user.click(backdrop)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('supports bulk email input', async () => {
    const user = userEvent.setup()
    mockInviteMember.mockResolvedValue({ success: true })
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    // Enter multiple emails
    await user.type(emailInput, 'user1@example.com, user2@example.com, user3@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledTimes(3)
      expect(mockInviteMember).toHaveBeenCalledWith({ email: 'user1@example.com', role: 'member' })
      expect(mockInviteMember).toHaveBeenCalledWith({ email: 'user2@example.com', role: 'member' })
      expect(mockInviteMember).toHaveBeenCalledWith({ email: 'user3@example.com', role: 'member' })
    })
  })

  it('shows role descriptions', () => {
    renderInviteMemberModal()

    expect(screen.getByText(/can view and manage all projects/i)).toBeInTheDocument()
    expect(screen.getByText(/can view and edit assigned projects/i)).toBeInTheDocument()
  })

  it('handles custom invitation message', async () => {
    const user = userEvent.setup()
    mockInviteMember.mockResolvedValue({ success: true })
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const messageInput = screen.getByLabelText(/invitation message/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    await user.type(emailInput, 'newmember@example.com')
    await user.type(messageInput, 'Welcome to our team!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith({
        email: 'newmember@example.com',
        role: 'member',
        message: 'Welcome to our team!',
      })
    })
  })

  it('validates email domain restrictions', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal({ 
      organization: { 
        email_domains: ['company.com', 'company.net'] 
      } 
    })

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    await user.type(emailInput, 'user@external.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email domain not allowed/i)).toBeInTheDocument()
    })

    expect(mockInviteMember).not.toHaveBeenCalled()
  })

  it('shows invitation limit warning', () => {
    renderInviteMemberModal({ 
      organization: { 
        member_limit: 10,
        current_member_count: 9 
      } 
    })

    expect(screen.getByText(/1 invitation remaining/i)).toBeInTheDocument()
  })

  it('disables form when member limit reached', () => {
    renderInviteMemberModal({ 
      organization: { 
        member_limit: 10,
        current_member_count: 10 
      } 
    })

    const submitButton = screen.getByRole('button', { name: /member limit reached/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/upgrade your plan to invite more members/i)).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    const roleSelect = screen.getByLabelText(/role/i)
    const submitButton = screen.getByRole('button', { name: /send invitation/i })

    emailInput.focus()
    await user.tab()
    expect(roleSelect).toHaveFocus()

    await user.tab()
    expect(submitButton).toHaveFocus()
  })

  it('resets form when modal reopens', async () => {
    const user = userEvent.setup()
    const { rerender } = renderInviteMemberModal()

    const emailInput = screen.getByLabelText(/email address/i)
    await user.type(emailInput, 'test@example.com')

    // Close modal
    rerender(
      <MockAuthProvider value={{ inviteMember: mockInviteMember }}>
        <InviteMemberModal isOpen={false} onClose={mockOnClose} />
      </MockAuthProvider>
    )

    // Reopen modal
    rerender(
      <MockAuthProvider value={{ inviteMember: mockInviteMember }}>
        <InviteMemberModal isOpen={true} onClose={mockOnClose} />
      </MockAuthProvider>
    )

    const newEmailInput = screen.getByLabelText(/email address/i)
    expect(newEmailInput).toHaveValue('')
  })
})