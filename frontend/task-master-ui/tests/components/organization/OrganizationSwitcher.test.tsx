import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationSwitcher } from '@/components/organization/OrganizationSwitcher';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';

const mockSwitchOrganization = jest.fn();

const mockOrganizations = [
	{
		id: 'org-1',
		name: 'Organization One',
		slug: 'org-one',
		created_at: '2023-01-01T00:00:00Z',
		updated_at: '2023-01-01T00:00:00Z'
	},
	{
		id: 'org-2',
		name: 'Organization Two',
		slug: 'org-two',
		created_at: '2023-01-02T00:00:00Z',
		updated_at: '2023-01-02T00:00:00Z'
	},
	{
		id: 'org-3',
		name: 'Organization Three',
		slug: 'org-three',
		created_at: '2023-01-03T00:00:00Z',
		updated_at: '2023-01-03T00:00:00Z'
	}
];

const renderOrganizationSwitcher = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				organization: mockOrganizations[0],
				organizations: mockOrganizations,
				switchOrganization: mockSwitchOrganization,
				loading: false,
				...authOverrides
			}}
		>
			<OrganizationSwitcher />
		</MockAuthProvider>
	);
};

describe('OrganizationSwitcher', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders current organization name', () => {
		renderOrganizationSwitcher();

		expect(screen.getByText('Organization One')).toBeInTheDocument();
	});

	it('shows organization list when clicked', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(screen.getByText('Organization Two')).toBeInTheDocument();
			expect(screen.getByText('Organization Three')).toBeInTheDocument();
		});
	});

	it('switches to selected organization', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		const orgTwoOption = screen.getByText('Organization Two');
		await user.click(orgTwoOption);

		await waitFor(() => {
			expect(mockSwitchOrganization).toHaveBeenCalledWith('org-2');
		});
	});

	it('shows current organization with indicator', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			const currentOrgOption = screen.getByText('Organization One');
			expect(
				currentOrgOption.closest('[data-current="true"]')
			).toBeInTheDocument();
		});
	});

	it('shows loading state during organization switch', () => {
		renderOrganizationSwitcher({ loading: true });

		expect(
			screen.getByTestId('organization-switcher-loading')
		).toBeInTheDocument();
	});

	it('handles empty organizations list', () => {
		renderOrganizationSwitcher({
			organizations: [],
			organization: null
		});

		expect(screen.getByText(/no organizations/i)).toBeInTheDocument();
	});

	it('shows create new organization option', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(screen.getByText(/create new organization/i)).toBeInTheDocument();
		});
	});

	it('navigates to create organization page', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		const createOption = screen.getByText(/create new organization/i);
		expect(createOption).toHaveAttribute('href', '/organizations/new');
	});

	it('filters organizations by search', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		const searchInput = screen.getByPlaceholderText(/search organizations/i);
		await user.type(searchInput, 'Two');

		await waitFor(() => {
			expect(screen.getByText('Organization Two')).toBeInTheDocument();
			expect(screen.queryByText('Organization Three')).not.toBeInTheDocument();
		});
	});

	it('shows no results message when search has no matches', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		const searchInput = screen.getByPlaceholderText(/search organizations/i);
		await user.type(searchInput, 'Nonexistent');

		await waitFor(() => {
			expect(screen.getByText(/no organizations found/i)).toBeInTheDocument();
		});
	});

	it('handles keyboard navigation', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });

		// Open with Enter
		switcher.focus();
		await user.keyboard('{Enter}');

		await waitFor(() => {
			expect(screen.getByText('Organization Two')).toBeInTheDocument();
		});

		// Navigate with arrows
		await user.keyboard('{ArrowDown}');
		await user.keyboard('{Enter}');

		await waitFor(() => {
			expect(mockSwitchOrganization).toHaveBeenCalledWith('org-2');
		});
	});

	it('closes dropdown on escape key', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(screen.getByText('Organization Two')).toBeInTheDocument();
		});

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(screen.queryByText('Organization Two')).not.toBeInTheDocument();
		});
	});

	it('closes dropdown when clicking outside', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(screen.getByText('Organization Two')).toBeInTheDocument();
		});

		await user.click(document.body);

		await waitFor(() => {
			expect(screen.queryByText('Organization Two')).not.toBeInTheDocument();
		});
	});

	it('shows organization role/permissions', async () => {
		const user = userEvent.setup();
		const orgsWithRoles = mockOrganizations.map((org, index) => ({
			...org,
			role: index === 0 ? 'admin' : 'member'
		}));

		renderOrganizationSwitcher({ organizations: orgsWithRoles });

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(screen.getByText('Admin')).toBeInTheDocument();
			expect(screen.getByText('Member')).toBeInTheDocument();
		});
	});

	it('shows organization settings link for admins', async () => {
		const user = userEvent.setup();
		const orgsWithRoles = [
			{ ...mockOrganizations[0], role: 'admin' },
			...mockOrganizations.slice(1)
		];

		renderOrganizationSwitcher({ organizations: orgsWithRoles });

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(screen.getByText(/organization settings/i)).toBeInTheDocument();
		});
	});

	it('does not show settings link for non-admins', async () => {
		const user = userEvent.setup();
		const orgsWithRoles = [
			{ ...mockOrganizations[0], role: 'member' },
			...mockOrganizations.slice(1)
		];

		renderOrganizationSwitcher({ organizations: orgsWithRoles });

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		await waitFor(() => {
			expect(
				screen.queryByText(/organization settings/i)
			).not.toBeInTheDocument();
		});
	});

	it('handles organization switch error gracefully', async () => {
		const user = userEvent.setup();
		mockSwitchOrganization.mockRejectedValue(new Error('Switch failed'));
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.click(switcher);

		const orgTwoOption = screen.getByText('Organization Two');
		await user.click(orgTwoOption);

		// Should still attempt the switch
		await waitFor(() => {
			expect(mockSwitchOrganization).toHaveBeenCalledWith('org-2');
		});
	});

	it('shows tooltip on hover', async () => {
		const user = userEvent.setup();
		renderOrganizationSwitcher();

		const switcher = screen.getByRole('button', { name: /organization one/i });
		await user.hover(switcher);

		await waitFor(() => {
			expect(screen.getByText(/switch organization/i)).toBeInTheDocument();
		});
	});

	it('renders organization avatar/icon', () => {
		renderOrganizationSwitcher();

		expect(screen.getByTestId('organization-avatar')).toBeInTheDocument();
	});
});
