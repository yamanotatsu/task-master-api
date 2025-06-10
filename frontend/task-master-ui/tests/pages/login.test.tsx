import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from '@/app/auth/login/page';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';
import { toast } from 'sonner';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
	useRouter: jest.fn(),
	useSearchParams: jest.fn()
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
const mockSearchParams = {
	get: jest.fn()
};

const mockSignIn = jest.fn();

const renderLoginPage = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				signIn: mockSignIn,
				loading: false,
				user: null,
				...authOverrides
			}}
		>
			<LoginPage />
		</MockAuthProvider>
	);
};

describe('Login Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
			replace: mockReplace
		});
		(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
		mockSearchParams.get.mockReturnValue(null);
	});

	it('renders login page with all elements', () => {
		renderLoginPage();

		expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
		expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /sign in/i })
		).toBeInTheDocument();
		expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
		expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
	});

	it('handles successful login and redirects to dashboard', async () => {
		const user = userEvent.setup();
		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		mockSignIn.mockResolvedValue({ user: mockUser });
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockSignIn).toHaveBeenCalledWith({
				email: 'test@example.com',
				password: 'password123'
			});
			expect(mockPush).toHaveBeenCalledWith('/dashboard');
		});
	});

	it('redirects to intended page after login', async () => {
		const user = userEvent.setup();
		mockSearchParams.get.mockReturnValue('/projects/123');

		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		mockSignIn.mockResolvedValue({ user: mockUser });
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith('/projects/123');
		});
	});

	it('handles login error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Invalid credentials';
		mockSignIn.mockRejectedValue(new Error(errorMessage));
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'wrongpassword');
		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	it('shows loading state during sign in', async () => {
		const user = userEvent.setup();
		renderLoginPage({ loading: true });

		const submitButton = screen.getByRole('button', { name: /signing in/i });
		expect(submitButton).toBeDisabled();
	});

	it('redirects authenticated user to dashboard', () => {
		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		renderLoginPage({ user: mockUser });

		expect(mockReplace).toHaveBeenCalledWith('/dashboard');
	});

	it('shows error message for expired session', () => {
		mockSearchParams.get.mockImplementation((key) => {
			if (key === 'error') return 'session_expired';
			return null;
		});

		renderLoginPage();

		expect(screen.getByText(/your session has expired/i)).toBeInTheDocument();
	});

	it('shows success message after signup', () => {
		mockSearchParams.get.mockImplementation((key) => {
			if (key === 'message') return 'signup_success';
			return null;
		});

		renderLoginPage();

		expect(
			screen.getByText(/account created successfully/i)
		).toBeInTheDocument();
	});

	it('shows success message after password reset', () => {
		mockSearchParams.get.mockImplementation((key) => {
			if (key === 'message') return 'password_reset_success';
			return null;
		});

		renderLoginPage();

		expect(
			screen.getByText(/password updated successfully/i)
		).toBeInTheDocument();
	});

	it('navigates to signup page', async () => {
		const user = userEvent.setup();
		renderLoginPage();

		const signupLink = screen.getByText(/sign up/i);
		expect(signupLink).toHaveAttribute('href', '/auth/signup');
	});

	it('navigates to forgot password page', async () => {
		const user = userEvent.setup();
		renderLoginPage();

		const forgotPasswordLink = screen.getByText(/forgot your password/i);
		expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
	});

	it('validates form fields before submission', async () => {
		const user = userEvent.setup();
		renderLoginPage();

		const submitButton = screen.getByRole('button', { name: /sign in/i });
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
			expect(screen.getByText(/password is required/i)).toBeInTheDocument();
		});

		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it('validates email format', async () => {
		const user = userEvent.setup();
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'invalid-email');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
		});

		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it('shows remember me option', () => {
		renderLoginPage();

		expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
	});

	it('handles remember me functionality', async () => {
		const user = userEvent.setup();
		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		mockSignIn.mockResolvedValue({ user: mockUser });
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const rememberCheckbox = screen.getByLabelText(/remember me/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(rememberCheckbox);
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockSignIn).toHaveBeenCalledWith({
				email: 'test@example.com',
				password: 'password123',
				rememberMe: true
			});
		});
	});

	it('handles rate limiting error', async () => {
		const user = userEvent.setup();
		const rateLimitError = new Error(
			'Too many attempts. Please try again in 5 minutes.'
		);
		mockSignIn.mockRejectedValue(rateLimitError);
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
		});
	});

	it('supports keyboard navigation', async () => {
		const user = userEvent.setup();
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const rememberCheckbox = screen.getByLabelText(/remember me/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		emailInput.focus();
		await user.tab();
		expect(passwordInput).toHaveFocus();

		await user.tab();
		expect(rememberCheckbox).toHaveFocus();

		await user.tab();
		expect(submitButton).toHaveFocus();
	});

	it('submits form on Enter key press', async () => {
		const user = userEvent.setup();
		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		mockSignIn.mockResolvedValue({ user: mockUser });
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.keyboard('{Enter}');

		await waitFor(() => {
			expect(mockSignIn).toHaveBeenCalledWith({
				email: 'test@example.com',
				password: 'password123'
			});
		});
	});

	it('shows organization selection after login for multi-org users', async () => {
		const user = userEvent.setup();
		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		const mockOrganizations = [
			{ id: 'org-1', name: 'Org One' },
			{ id: 'org-2', name: 'Org Two' }
		];

		mockSignIn.mockResolvedValue({
			user: mockUser,
			organizations: mockOrganizations
		});
		renderLoginPage();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/select an organization/i)).toBeInTheDocument();
			expect(screen.getByText('Org One')).toBeInTheDocument();
			expect(screen.getByText('Org Two')).toBeInTheDocument();
		});
	});

	it('shows social login options', () => {
		renderLoginPage();

		expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /continue with google/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /continue with github/i })
		).toBeInTheDocument();
	});

	it('handles accessibility requirements', () => {
		renderLoginPage();

		// Check for proper ARIA labels
		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(screen.getByRole('form')).toBeInTheDocument();

		// Check for proper heading structure
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

		// Check for proper field labels
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);

		expect(emailInput).toHaveAttribute('type', 'email');
		expect(passwordInput).toHaveAttribute('type', 'password');
	});
});
