import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { MemberList } from '@/components/organization/MemberList';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';

// Mock the toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
		warning: jest.fn()
	}
}));

const mockRemoveMember = jest.fn();
const mockUpdateMemberRole = jest.fn();

const mockMembers = [
	{
		id: 'member-1',
		email: 'admin@example.com',
		full_name: 'Admin User',
		role: 'admin',
		status: 'active',
		joined_at: '2023-01-01T00:00:00Z',
		avatar_url: null
	},
	{
		id: 'member-2',
		email: 'member@example.com',
		full_name: 'Regular Member',
		role: 'member',
		status: 'active',
		joined_at: '2023-01-02T00:00:00Z',
		avatar_url: 'https://example.com/avatar.jpg'
	},
	{
		id: 'member-3',
		email: 'pending@example.com',
		full_name: null,
		role: 'member',
		status: 'pending',
		joined_at: null,
		avatar_url: null
	}
];

const renderMemberList = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				user: { id: 'member-1', email: 'admin@example.com' },
				organization: { id: 'org-1', role: 'admin' },
				removeMember: mockRemoveMember,
				updateMemberRole: mockUpdateMemberRole,
				loading: false,
				...authOverrides
			}}
		>
			<MemberList members={mockMembers} />
		</MockAuthProvider>
	);
};

describe('MemberList', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all members', () => {
		renderMemberList();

		expect(screen.getByText('Admin User')).toBeInTheDocument();
		expect(screen.getByText('admin@example.com')).toBeInTheDocument();
		expect(screen.getByText('Regular Member')).toBeInTheDocument();
		expect(screen.getByText('member@example.com')).toBeInTheDocument();
		expect(screen.getByText('pending@example.com')).toBeInTheDocument();
	});

	it('shows member roles', () => {
		renderMemberList();

		expect(screen.getByText('Admin')).toBeInTheDocument();
		expect(screen.getAllByText('Member')).toHaveLength(2);
	});

	it('shows member status badges', () => {
		renderMemberList();

		expect(screen.getByText('Active')).toBeInTheDocument();
		expect(screen.getByText('Pending')).toBeInTheDocument();
	});

	it('shows join dates for active members', () => {
		renderMemberList();

		expect(screen.getByText(/joined jan 1, 2023/i)).toBeInTheDocument();
		expect(screen.getByText(/joined jan 2, 2023/i)).toBeInTheDocument();
	});

	it('shows pending status for invited members', () => {
		renderMemberList();

		expect(screen.getByText(/invitation pending/i)).toBeInTheDocument();
	});

	it('displays member avatars', () => {
		renderMemberList();

		const avatars = screen.getAllByTestId('member-avatar');
		expect(avatars).toHaveLength(3);
	});

	it('shows role change dropdown for admin users', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const roleButtons = screen.getAllByRole('button', { name: /change role/i });
		await user.click(roleButtons[1]); // Click on regular member's role button

		await waitFor(() => {
			expect(screen.getByText('Make Admin')).toBeInTheDocument();
			expect(screen.getByText('Keep as Member')).toBeInTheDocument();
		});
	});

	it('changes member role', async () => {
		const user = userEvent.setup();
		mockUpdateMemberRole.mockResolvedValue({ success: true });
		renderMemberList();

		const roleButtons = screen.getAllByRole('button', { name: /change role/i });
		await user.click(roleButtons[1]); // Click on regular member's role button

		const makeAdminOption = screen.getByText('Make Admin');
		await user.click(makeAdminOption);

		await waitFor(() => {
			expect(mockUpdateMemberRole).toHaveBeenCalledWith('member-2', 'admin');
			expect(toast.success).toHaveBeenCalledWith(
				'Member role updated successfully'
			);
		});
	});

	it('handles role change error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Failed to update role';
		mockUpdateMemberRole.mockRejectedValue(new Error(errorMessage));
		renderMemberList();

		const roleButtons = screen.getAllByRole('button', { name: /change role/i });
		await user.click(roleButtons[1]);

		const makeAdminOption = screen.getByText('Make Admin');
		await user.click(makeAdminOption);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});

	it('shows remove member option for admin users', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const memberMenus = screen.getAllByRole('button', {
			name: /member options/i
		});
		await user.click(memberMenus[1]); // Click on regular member's menu

		await waitFor(() => {
			expect(screen.getByText(/remove member/i)).toBeInTheDocument();
		});
	});

	it('confirms before removing member', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const memberMenus = screen.getAllByRole('button', {
			name: /member options/i
		});
		await user.click(memberMenus[1]);

		const removeOption = screen.getByText(/remove member/i);
		await user.click(removeOption);

		await waitFor(() => {
			expect(
				screen.getByText(/are you sure you want to remove/i)
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /confirm remove/i })
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /cancel/i })
			).toBeInTheDocument();
		});
	});

	it('removes member after confirmation', async () => {
		const user = userEvent.setup();
		mockRemoveMember.mockResolvedValue({ success: true });
		renderMemberList();

		const memberMenus = screen.getAllByRole('button', {
			name: /member options/i
		});
		await user.click(memberMenus[1]);

		const removeOption = screen.getByText(/remove member/i);
		await user.click(removeOption);

		const confirmButton = screen.getByRole('button', {
			name: /confirm remove/i
		});
		await user.click(confirmButton);

		await waitFor(() => {
			expect(mockRemoveMember).toHaveBeenCalledWith('member-2');
			expect(toast.success).toHaveBeenCalledWith('Member removed successfully');
		});
	});

	it('handles member removal error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Failed to remove member';
		mockRemoveMember.mockRejectedValue(new Error(errorMessage));
		renderMemberList();

		const memberMenus = screen.getAllByRole('button', {
			name: /member options/i
		});
		await user.click(memberMenus[1]);

		const removeOption = screen.getByText(/remove member/i);
		await user.click(removeOption);

		const confirmButton = screen.getByRole('button', {
			name: /confirm remove/i
		});
		await user.click(confirmButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});

	it('prevents admin from removing themselves', () => {
		renderMemberList();

		const adminMemberMenu = screen.getAllByRole('button', {
			name: /member options/i
		})[0];
		expect(adminMemberMenu).toBeDisabled();
	});

	it('prevents admin from changing their own role', () => {
		renderMemberList();

		const adminRoleButton = screen.getAllByRole('button', {
			name: /change role/i
		})[0];
		expect(adminRoleButton).toBeDisabled();
	});

	it('shows limited options for non-admin users', () => {
		renderMemberList({
			user: { id: 'member-2', email: 'member@example.com' },
			organization: { id: 'org-1', role: 'member' }
		});

		const roleButtons = screen.queryAllByRole('button', {
			name: /change role/i
		});
		const memberMenus = screen.queryAllByRole('button', {
			name: /member options/i
		});

		expect(roleButtons).toHaveLength(0);
		expect(memberMenus).toHaveLength(0);
	});

	it('filters members by search', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const searchInput = screen.getByPlaceholderText(/search members/i);
		await user.type(searchInput, 'Admin');

		await waitFor(() => {
			expect(screen.getByText('Admin User')).toBeInTheDocument();
			expect(screen.queryByText('Regular Member')).not.toBeInTheDocument();
		});
	});

	it('filters members by role', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const roleFilter = screen.getByLabelText(/filter by role/i);
		await user.selectOptions(roleFilter, 'admin');

		await waitFor(() => {
			expect(screen.getByText('Admin User')).toBeInTheDocument();
			expect(screen.queryByText('Regular Member')).not.toBeInTheDocument();
		});
	});

	it('filters members by status', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const statusFilter = screen.getByLabelText(/filter by status/i);
		await user.selectOptions(statusFilter, 'pending');

		await waitFor(() => {
			expect(screen.getByText('pending@example.com')).toBeInTheDocument();
			expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
		});
	});

	it('shows empty state when no members', () => {
		render(
			<MockAuthProvider>
				<MemberList members={[]} />
			</MockAuthProvider>
		);

		expect(screen.getByText(/no members found/i)).toBeInTheDocument();
	});

	it('shows loading state for pending role changes', () => {
		renderMemberList({ loading: true });

		expect(screen.getByTestId('member-list-loading')).toBeInTheDocument();
	});

	it('sorts members by join date', async () => {
		const user = userEvent.setup();
		renderMemberList();

		const sortButton = screen.getByRole('button', { name: /sort members/i });
		await user.click(sortButton);

		const sortByJoinDate = screen.getByText(/sort by join date/i);
		await user.click(sortByJoinDate);

		// Verify members are sorted (newest first by default)
		const memberRows = screen.getAllByTestId('member-row');
		expect(memberRows[0]).toHaveTextContent('Regular Member');
		expect(memberRows[1]).toHaveTextContent('Admin User');
	});

	it('resends invitation for pending members', async () => {
		const user = userEvent.setup();
		const mockResendInvitation = jest.fn().mockResolvedValue({ success: true });
		renderMemberList({ resendInvitation: mockResendInvitation });

		const resendButton = screen.getByRole('button', {
			name: /resend invitation/i
		});
		await user.click(resendButton);

		await waitFor(() => {
			expect(mockResendInvitation).toHaveBeenCalledWith('pending@example.com');
			expect(toast.success).toHaveBeenCalledWith(
				'Invitation resent successfully'
			);
		});
	});
});
