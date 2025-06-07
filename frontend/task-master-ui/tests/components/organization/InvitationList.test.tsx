import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { InvitationList } from '@/components/organization/InvitationList'
import { MockAuthProvider } from '@/tests/mocks/auth-provider'

// Mock the toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockResendInvitation = jest.fn()
const mockCancelInvitation = jest.fn()

const mockInvitations = [
  {
    id: 'inv-1',
    email: 'pending1@example.com',
    role: 'member',
    status: 'pending',
    created_at: '2023-01-01T00:00:00Z',
    expires_at: '2023-01-08T00:00:00Z',
    invited_by: {
      id: 'user-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
    },
  },
  {
    id: 'inv-2',
    email: 'pending2@example.com',
    role: 'admin',
    status: 'pending',
    created_at: '2023-01-02T00:00:00Z',
    expires_at: '2023-01-09T00:00:00Z',
    invited_by: {
      id: 'user-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
    },
  },
  {
    id: 'inv-3',
    email: 'expired@example.com',
    role: 'member',
    status: 'expired',
    created_at: '2022-12-01T00:00:00Z',
    expires_at: '2022-12-08T00:00:00Z',
    invited_by: {
      id: 'user-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
    },
  },
]

const renderInvitationList = (authOverrides = {}) => {
  return render(
    <MockAuthProvider
      value={{
        user: { id: 'user-1', email: 'admin@example.com' },
        organization: { id: 'org-1', role: 'admin' },
        resendInvitation: mockResendInvitation,
        cancelInvitation: mockCancelInvitation,
        loading: false,
        ...authOverrides,
      }}
    >
      <InvitationList invitations={mockInvitations} />
    </MockAuthProvider>
  )
}

describe('InvitationList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all invitations', () => {
    renderInvitationList()

    expect(screen.getByText('pending1@example.com')).toBeInTheDocument()
    expect(screen.getByText('pending2@example.com')).toBeInTheDocument()
    expect(screen.getByText('expired@example.com')).toBeInTheDocument()
  })

  it('shows invitation status badges', () => {
    renderInvitationList()

    expect(screen.getAllByText('Pending')).toHaveLength(2)
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('shows invitation roles', () => {
    renderInvitationList()

    expect(screen.getAllByText('Member')).toHaveLength(2)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('shows who sent the invitation', () => {
    renderInvitationList()

    expect(screen.getAllByText(/invited by admin user/i)).toHaveLength(3)
  })

  it('shows invitation dates', () => {
    renderInvitationList()

    expect(screen.getByText(/sent jan 1, 2023/i)).toBeInTheDocument()
    expect(screen.getByText(/sent jan 2, 2023/i)).toBeInTheDocument()
    expect(screen.getByText(/sent dec 1, 2022/i)).toBeInTheDocument()
  })

  it('shows expiration dates for pending invitations', () => {
    renderInvitationList()

    expect(screen.getByText(/expires jan 8, 2023/i)).toBeInTheDocument()
    expect(screen.getByText(/expires jan 9, 2023/i)).toBeInTheDocument()
  })

  it('shows expired date for expired invitations', () => {
    renderInvitationList()

    expect(screen.getByText(/expired dec 8, 2022/i)).toBeInTheDocument()
  })

  it('shows resend option for pending invitations', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0]) // First pending invitation

    await waitFor(() => {
      expect(screen.getByText(/resend invitation/i)).toBeInTheDocument()
    })
  })

  it('resends invitation', async () => {
    const user = userEvent.setup()
    mockResendInvitation.mockResolvedValue({ success: true })
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    const resendOption = screen.getByText(/resend invitation/i)
    await user.click(resendOption)

    await waitFor(() => {
      expect(mockResendInvitation).toHaveBeenCalledWith('inv-1')
      expect(toast.success).toHaveBeenCalledWith('Invitation resent successfully')
    })
  })

  it('handles resend invitation error', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to resend invitation'
    mockResendInvitation.mockRejectedValue(new Error(errorMessage))
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    const resendOption = screen.getByText(/resend invitation/i)
    await user.click(resendOption)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('shows cancel option for pending invitations', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    await waitFor(() => {
      expect(screen.getByText(/cancel invitation/i)).toBeInTheDocument()
    })
  })

  it('confirms before canceling invitation', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    const cancelOption = screen.getByText(/cancel invitation/i)
    await user.click(cancelOption)

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to cancel this invitation/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /keep invitation/i })).toBeInTheDocument()
    })
  })

  it('cancels invitation after confirmation', async () => {
    const user = userEvent.setup()
    mockCancelInvitation.mockResolvedValue({ success: true })
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    const cancelOption = screen.getByText(/cancel invitation/i)
    await user.click(cancelOption)

    const confirmButton = screen.getByRole('button', { name: /confirm cancel/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockCancelInvitation).toHaveBeenCalledWith('inv-1')
      expect(toast.success).toHaveBeenCalledWith('Invitation canceled successfully')
    })
  })

  it('handles cancel invitation error', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to cancel invitation'
    mockCancelInvitation.mockRejectedValue(new Error(errorMessage))
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    const cancelOption = screen.getByText(/cancel invitation/i)
    await user.click(cancelOption)

    const confirmButton = screen.getByRole('button', { name: /confirm cancel/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  it('shows limited options for expired invitations', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const expiredInvitation = screen.getByText('expired@example.com').closest('[data-testid="invitation-row"]')
    const actionMenu = expiredInvitation.querySelector('[role="button"][aria-label*="invitation options"]')
    
    await user.click(actionMenu)

    await waitFor(() => {
      expect(screen.getByText(/delete invitation/i)).toBeInTheDocument()
      expect(screen.queryByText(/resend invitation/i)).not.toBeInTheDocument()
    })
  })

  it('filters invitations by status', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const statusFilter = screen.getByLabelText(/filter by status/i)
    await user.selectOptions(statusFilter, 'pending')

    await waitFor(() => {
      expect(screen.getByText('pending1@example.com')).toBeInTheDocument()
      expect(screen.getByText('pending2@example.com')).toBeInTheDocument()
      expect(screen.queryByText('expired@example.com')).not.toBeInTheDocument()
    })
  })

  it('filters invitations by role', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const roleFilter = screen.getByLabelText(/filter by role/i)
    await user.selectOptions(roleFilter, 'admin')

    await waitFor(() => {
      expect(screen.getByText('pending2@example.com')).toBeInTheDocument()
      expect(screen.queryByText('pending1@example.com')).not.toBeInTheDocument()
    })
  })

  it('searches invitations by email', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const searchInput = screen.getByPlaceholderText(/search invitations/i)
    await user.type(searchInput, 'pending1')

    await waitFor(() => {
      expect(screen.getByText('pending1@example.com')).toBeInTheDocument()
      expect(screen.queryByText('pending2@example.com')).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no invitations', () => {
    render(
      <MockAuthProvider>
        <InvitationList invitations={[]} />
      </MockAuthProvider>
    )

    expect(screen.getByText(/no pending invitations/i)).toBeInTheDocument()
    expect(screen.getByText(/invite team members to get started/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    renderInvitationList({ loading: true })

    expect(screen.getByTestId('invitation-list-loading')).toBeInTheDocument()
  })

  it('sorts invitations by date', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const sortButton = screen.getByRole('button', { name: /sort invitations/i })
    await user.click(sortButton)

    const sortByDate = screen.getByText(/sort by date/i)
    await user.click(sortByDate)

    // Verify invitations are sorted (newest first)
    const invitationRows = screen.getAllByTestId('invitation-row')
    expect(invitationRows[0]).toHaveTextContent('pending2@example.com')
    expect(invitationRows[1]).toHaveTextContent('pending1@example.com')
  })

  it('shows invitation link for copying', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    await waitFor(() => {
      expect(screen.getByText(/copy invitation link/i)).toBeInTheDocument()
    })
  })

  it('copies invitation link to clipboard', async () => {
    const user = userEvent.setup()
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    renderInvitationList()

    const actionMenus = screen.getAllByRole('button', { name: /invitation options/i })
    await user.click(actionMenus[0])

    const copyLinkOption = screen.getByText(/copy invitation link/i)
    await user.click(copyLinkOption)

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/invite/')
      )
      expect(toast.success).toHaveBeenCalledWith('Invitation link copied to clipboard')
    })
  })

  it('shows expiration warning for soon-to-expire invitations', () => {
    const soonToExpireInvitations = [
      {
        ...mockInvitations[0],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 1 day
      },
    ]

    render(
      <MockAuthProvider>
        <InvitationList invitations={soonToExpireInvitations} />
      </MockAuthProvider>
    )

    expect(screen.getByText(/expires soon/i)).toBeInTheDocument()
  })

  it('shows bulk actions for multiple selections', async () => {
    const user = userEvent.setup()
    renderInvitationList()

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    await waitFor(() => {
      expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /resend selected/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel selected/i })).toBeInTheDocument()
    })
  })

  it('performs bulk resend operation', async () => {
    const user = userEvent.setup()
    mockResendInvitation.mockResolvedValue({ success: true })
    renderInvitationList()

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    const resendSelectedButton = screen.getByRole('button', { name: /resend selected/i })
    await user.click(resendSelectedButton)

    await waitFor(() => {
      expect(mockResendInvitation).toHaveBeenCalledTimes(2)
      expect(toast.success).toHaveBeenCalledWith('2 invitations resent successfully')
    })
  })
})