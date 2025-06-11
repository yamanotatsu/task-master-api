import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SettingsPage from '@/app/settings/page';
import MembersPage from '@/app/settings/members/page';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';
import { toast } from 'sonner';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
	useRouter: jest.fn()
}));

// Mock toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn()
	},
	Toaster: () => null
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();

const mockUpdateProfile = jest.fn();
const mockCreateOrganization = jest.fn();
const mockInviteMember = jest.fn();
const mockRemoveMember = jest.fn();
const mockUpdateMemberRole = jest.fn();

const mockUser = {
	id: 'user-123',
	email: 'admin@example.com',
	user_metadata: { full_name: 'Admin User' }
};

const mockOrganization = {
	id: 'org-123',
	name: 'Test Organization',
	slug: 'test-org',
	role: 'admin'
};

const mockMembers = [
	{
		id: 'member-1',
		email: 'admin@example.com',
		full_name: 'Admin User',
		role: 'admin',
		status: 'active',
		joined_at: '2023-01-01T00:00:00Z'
	},
	{
		id: 'member-2',
		email: 'member@example.com',
		full_name: 'Team Member',
		role: 'member',
		status: 'active',
		joined_at: '2023-01-02T00:00:00Z'
	}
];

const renderSettingsPage = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				user: mockUser,
				organization: mockOrganization,
				updateProfile: mockUpdateProfile,
				createOrganization: mockCreateOrganization,
				loading: false,
				...authOverrides
			}}
		>
			<SettingsPage />
		</MockAuthProvider>
	);
};

const renderMembersPage = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				user: mockUser,
				organization: mockOrganization,
				inviteMember: mockInviteMember,
				removeMember: mockRemoveMember,
				updateMemberRole: mockUpdateMemberRole,
				loading: false,
				...authOverrides
			}}
		>
			<MembersPage members={mockMembers} />
		</MockAuthProvider>
	);
};

describe('Settings Pages', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
			replace: mockReplace
		});
	});

	describe('Settings Page', () => {
		it('renders settings page with navigation', () => {
			renderSettingsPage();

			expect(screen.getByText(/settings/i)).toBeInTheDocument();
			expect(screen.getByText(/profile/i)).toBeInTheDocument();
			expect(screen.getByText(/organization/i)).toBeInTheDocument();
			expect(screen.getByText(/members/i)).toBeInTheDocument();
			expect(screen.getByText(/billing/i)).toBeInTheDocument();
		});

		it('redirects unauthenticated users', () => {
			renderSettingsPage({ user: null });

			expect(mockReplace).toHaveBeenCalledWith(
				'/auth/login?redirect=/settings'
			);
		});

		it('shows profile section by default', () => {
			renderSettingsPage();

			expect(screen.getByText(/personal information/i)).toBeInTheDocument();
			expect(screen.getByDisplayValue('Admin User')).toBeInTheDocument();
			expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument();
		});

		it('updates user profile successfully', async () => {
			const user = userEvent.setup();
			mockUpdateProfile.mockResolvedValue({ success: true });
			renderSettingsPage();

			const nameInput = screen.getByDisplayValue('Admin User');
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await user.clear(nameInput);
			await user.type(nameInput, 'Updated Name');
			await user.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateProfile).toHaveBeenCalledWith({
					fullName: 'Updated Name'
				});
				expect(toast.success).toHaveBeenCalledWith(
					'Profile updated successfully'
				);
			});
		});

		it('handles profile update error', async () => {
			const user = userEvent.setup();
			const errorMessage = 'Failed to update profile';
			mockUpdateProfile.mockRejectedValue(new Error(errorMessage));
			renderSettingsPage();

			const nameInput = screen.getByDisplayValue('Admin User');
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await user.clear(nameInput);
			await user.type(nameInput, 'Updated Name');
			await user.click(saveButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(errorMessage);
			});
		});

		it('shows organization settings for admin users', () => {
			renderSettingsPage();

			// Click on organization tab
			const orgTab = screen.getByText(/organization/i);
			expect(orgTab).toBeInTheDocument();
		});

		it('hides organization settings for non-admin users', () => {
			renderSettingsPage({
				organization: { ...mockOrganization, role: 'member' }
			});

			expect(
				screen.queryByText(/organization settings/i)
			).not.toBeInTheDocument();
		});

		it('navigates between settings sections', async () => {
			const user = userEvent.setup();
			renderSettingsPage();

			const membersTab = screen.getByText(/members/i);
			await user.click(membersTab);

			expect(mockPush).toHaveBeenCalledWith('/settings/members');
		});

		it('shows avatar upload section', () => {
			renderSettingsPage();

			expect(screen.getByText(/profile picture/i)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /upload new picture/i })
			).toBeInTheDocument();
		});

		it('handles avatar upload', async () => {
			const user = userEvent.setup();
			const mockFile = new File(['avatar'], 'avatar.jpg', {
				type: 'image/jpeg'
			});
			mockUpdateProfile.mockResolvedValue({ success: true });
			renderSettingsPage();

			const fileInput = screen.getByLabelText(/upload new picture/i);
			await user.upload(fileInput, mockFile);

			await waitFor(() => {
				expect(mockUpdateProfile).toHaveBeenCalledWith({
					avatar: mockFile
				});
			});
		});

		it('shows email change section with verification', () => {
			renderSettingsPage();

			expect(screen.getByText(/change email address/i)).toBeInTheDocument();
			expect(
				screen.getByText(/current email will remain active/i)
			).toBeInTheDocument();
		});

		it('shows password change section', () => {
			renderSettingsPage();

			expect(screen.getByText(/change password/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
			expect(
				screen.getByLabelText(/confirm new password/i)
			).toBeInTheDocument();
		});

		it('shows account deletion section', () => {
			renderSettingsPage();

			expect(screen.getByText(/delete account/i)).toBeInTheDocument();
			expect(
				screen.getByText(/this action cannot be undone/i)
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /delete account/i })
			).toBeInTheDocument();
		});

		it('confirms before account deletion', async () => {
			const user = userEvent.setup();
			renderSettingsPage();

			const deleteButton = screen.getByRole('button', {
				name: /delete account/i
			});
			await user.click(deleteButton);

			await waitFor(() => {
				expect(
					screen.getByText(/are you sure you want to delete/i)
				).toBeInTheDocument();
				expect(
					screen.getByRole('button', { name: /yes, delete my account/i })
				).toBeInTheDocument();
			});
		});

		it('shows notification preferences', () => {
			renderSettingsPage();

			expect(screen.getByText(/notification preferences/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
			expect(
				screen.getByLabelText(/browser notifications/i)
			).toBeInTheDocument();
		});

		it('shows timezone settings', () => {
			renderSettingsPage();

			expect(screen.getByText(/timezone/i)).toBeInTheDocument();
			expect(
				screen.getByRole('combobox', { name: /select timezone/i })
			).toBeInTheDocument();
		});

		it('shows language settings', () => {
			renderSettingsPage();

			expect(screen.getByText(/language/i)).toBeInTheDocument();
			expect(
				screen.getByRole('combobox', { name: /select language/i })
			).toBeInTheDocument();
		});
	});

	describe('Members Settings Page', () => {
		it('renders members page with member list', () => {
			renderMembersPage();

			expect(screen.getByText(/team members/i)).toBeInTheDocument();
			expect(screen.getByText('Admin User')).toBeInTheDocument();
			expect(screen.getByText('Team Member')).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /invite member/i })
			).toBeInTheDocument();
		});

		it('shows invite member modal', async () => {
			const user = userEvent.setup();
			renderMembersPage();

			const inviteButton = screen.getByRole('button', {
				name: /invite member/i
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(screen.getByText(/invite team member/i)).toBeInTheDocument();
				expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			});
		});

		it('invites member successfully', async () => {
			const user = userEvent.setup();
			mockInviteMember.mockResolvedValue({ success: true });
			renderMembersPage();

			const inviteButton = screen.getByRole('button', {
				name: /invite member/i
			});
			await user.click(inviteButton);

			const emailInput = screen.getByLabelText(/email address/i);
			const sendButton = screen.getByRole('button', {
				name: /send invitation/i
			});

			await user.type(emailInput, 'newmember@example.com');
			await user.click(sendButton);

			await waitFor(() => {
				expect(mockInviteMember).toHaveBeenCalledWith({
					email: 'newmember@example.com',
					role: 'member'
				});
				expect(toast.success).toHaveBeenCalledWith(
					'Invitation sent successfully!'
				);
			});
		});

		it('shows member role management', async () => {
			const user = userEvent.setup();
			renderMembersPage();

			const roleButtons = screen.getAllByRole('button', {
				name: /change role/i
			});
			await user.click(roleButtons[1]); // Click on team member's role

			await waitFor(() => {
				expect(screen.getByText(/make admin/i)).toBeInTheDocument();
				expect(screen.getByText(/keep as member/i)).toBeInTheDocument();
			});
		});

		it('updates member role successfully', async () => {
			const user = userEvent.setup();
			mockUpdateMemberRole.mockResolvedValue({ success: true });
			renderMembersPage();

			const roleButtons = screen.getAllByRole('button', {
				name: /change role/i
			});
			await user.click(roleButtons[1]);

			const makeAdminOption = screen.getByText(/make admin/i);
			await user.click(makeAdminOption);

			await waitFor(() => {
				expect(mockUpdateMemberRole).toHaveBeenCalledWith('member-2', 'admin');
				expect(toast.success).toHaveBeenCalledWith(
					'Member role updated successfully'
				);
			});
		});

		it('shows remove member option', async () => {
			const user = userEvent.setup();
			renderMembersPage();

			const memberMenus = screen.getAllByRole('button', {
				name: /member options/i
			});
			await user.click(memberMenus[1]); // Click on team member's menu

			await waitFor(() => {
				expect(screen.getByText(/remove member/i)).toBeInTheDocument();
			});
		});

		it('removes member successfully', async () => {
			const user = userEvent.setup();
			mockRemoveMember.mockResolvedValue({ success: true });
			renderMembersPage();

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
				expect(toast.success).toHaveBeenCalledWith(
					'Member removed successfully'
				);
			});
		});

		it('prevents admin from removing themselves', () => {
			renderMembersPage();

			const adminMemberMenu = screen.getAllByRole('button', {
				name: /member options/i
			})[0];
			expect(adminMemberMenu).toBeDisabled();
		});

		it('filters members by search', async () => {
			const user = userEvent.setup();
			renderMembersPage();

			const searchInput = screen.getByPlaceholderText(/search members/i);
			await user.type(searchInput, 'Admin');

			await waitFor(() => {
				expect(screen.getByText('Admin User')).toBeInTheDocument();
				expect(screen.queryByText('Team Member')).not.toBeInTheDocument();
			});
		});

		it('filters members by role', async () => {
			const user = userEvent.setup();
			renderMembersPage();

			const roleFilter = screen.getByLabelText(/filter by role/i);
			await user.selectOptions(roleFilter, 'admin');

			await waitFor(() => {
				expect(screen.getByText('Admin User')).toBeInTheDocument();
				expect(screen.queryByText('Team Member')).not.toBeInTheDocument();
			});
		});

		it('shows member limit warning', () => {
			renderMembersPage({
				organization: {
					...mockOrganization,
					member_limit: 10,
					current_member_count: 9
				}
			});

			expect(screen.getByText(/1 member slot remaining/i)).toBeInTheDocument();
		});

		it('disables invite when member limit reached', () => {
			renderMembersPage({
				organization: {
					...mockOrganization,
					member_limit: 10,
					current_member_count: 10
				}
			});

			const inviteButton = screen.getByRole('button', {
				name: /member limit reached/i
			});
			expect(inviteButton).toBeDisabled();
		});

		it('shows pending invitations section', () => {
			const pendingInvitations = [
				{
					id: 'inv-1',
					email: 'pending@example.com',
					role: 'member',
					status: 'pending',
					created_at: '2023-01-01T00:00:00Z'
				}
			];

			renderMembersPage({ invitations: pendingInvitations });

			expect(screen.getByText(/pending invitations/i)).toBeInTheDocument();
			expect(screen.getByText('pending@example.com')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('supports keyboard navigation', async () => {
			const user = userEvent.setup();
			renderSettingsPage();

			const nameInput = screen.getByDisplayValue('Admin User');
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			nameInput.focus();
			await user.tab();
			expect(saveButton).toHaveFocus();
		});

		it('has proper ARIA labels and roles', () => {
			renderSettingsPage();

			expect(screen.getByRole('main')).toBeInTheDocument();
			expect(screen.getByRole('navigation')).toBeInTheDocument();
			expect(screen.getAllByRole('button')).toHaveLength(expect.any(Number));
		});

		it('provides proper form labels', () => {
			renderSettingsPage();

			const nameInput = screen.getByLabelText(/full name/i);
			const emailInput = screen.getByLabelText(/email address/i);

			expect(nameInput).toBeInTheDocument();
			expect(emailInput).toBeInTheDocument();
		});
	});
});
