import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import SignupPage from '@/app/auth/signup/page';
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

const mockSignUp = jest.fn();

const renderSignupPage = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				signUp: mockSignUp,
				loading: false,
				user: null,
				...authOverrides
			}}
		>
			<SignupPage />
		</MockAuthProvider>
	);
};

describe('Signup Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
			replace: mockReplace
		});
		(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
		mockSearchParams.get.mockReturnValue(null);
	});

	it('renders signup page with all elements', () => {
		renderSignupPage();

		expect(screen.getByText(/create your account/i)).toBeInTheDocument();
		expect(screen.getByText(/join thousands of teams/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /create account/i })
		).toBeInTheDocument();
		expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
	});

	it('handles successful signup and shows confirmation', async () => {
		const user = userEvent.setup();
		mockSignUp.mockResolvedValue({
			user: { id: 'user-123', email: 'test@example.com' },
			session: null // Usually null for email confirmation
		});
		renderSignupPage();

		const fullNameInput = screen.getByLabelText(/full name/i);
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(fullNameInput, 'John Doe');
		await user.type(emailInput, 'john@example.com');
		await user.type(passwordInput, 'StrongPass123!');
		await user.type(confirmPasswordInput, 'StrongPass123!');
		await user.click(termsCheckbox);
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockSignUp).toHaveBeenCalledWith({
				email: 'john@example.com',
				password: 'StrongPass123!',
				fullName: 'John Doe'
			});
			expect(screen.getByText(/check your email/i)).toBeInTheDocument();
			expect(
				screen.getByText(/we've sent a confirmation link/i)
			).toBeInTheDocument();
		});
	});

	it('redirects to login page after email confirmation', async () => {
		const user = userEvent.setup();
		mockSignUp.mockResolvedValue({
			user: { id: 'user-123', email: 'test@example.com' },
			session: null
		});
		renderSignupPage();

		// Fill and submit form
		await user.type(screen.getByLabelText(/full name/i), 'John Doe');
		await user.type(screen.getByLabelText(/email/i), 'john@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
		await user.type(
			screen.getByLabelText(/confirm password/i),
			'StrongPass123!'
		);
		await user.click(screen.getByLabelText(/i agree to the terms/i));
		await user.click(screen.getByRole('button', { name: /create account/i }));

		// After confirmation message is shown, click link to login
		await waitFor(() => {
			expect(screen.getByText(/go to login/i)).toBeInTheDocument();
		});

		const loginLink = screen.getByText(/go to login/i);
		expect(loginLink).toHaveAttribute(
			'href',
			'/auth/login?message=signup_success'
		);
	});

	it('handles signup error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Email already registered';
		mockSignUp.mockRejectedValue(new Error(errorMessage));
		renderSignupPage();

		const fullNameInput = screen.getByLabelText(/full name/i);
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(fullNameInput, 'John Doe');
		await user.type(emailInput, 'existing@example.com');
		await user.type(passwordInput, 'StrongPass123!');
		await user.type(confirmPasswordInput, 'StrongPass123!');
		await user.click(termsCheckbox);
		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});

	it('shows loading state during signup', () => {
		renderSignupPage({ loading: true });

		const submitButton = screen.getByRole('button', {
			name: /creating account/i
		});
		expect(submitButton).toBeDisabled();
	});

	it('redirects authenticated user to dashboard', () => {
		const mockUser = {
			id: 'user-123',
			email: 'test@example.com',
			user_metadata: { full_name: 'Test User' }
		};

		renderSignupPage({ user: mockUser });

		expect(mockReplace).toHaveBeenCalledWith('/dashboard');
	});

	it('validates required fields', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
			expect(screen.getByText(/password is required/i)).toBeInTheDocument();
		});

		expect(mockSignUp).not.toHaveBeenCalled();
	});

	it('validates email format', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(emailInput, 'invalid-email');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
		});

		expect(mockSignUp).not.toHaveBeenCalled();
	});

	it('validates password strength', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const passwordInput = screen.getByLabelText(/^password$/i);

		// Test weak password
		await user.type(passwordInput, 'weak');

		await waitFor(() => {
			expect(
				screen.getByText(/password must be at least 8 characters/i)
			).toBeInTheDocument();
		});

		// Clear and test medium password
		await user.clear(passwordInput);
		await user.type(passwordInput, 'password');

		await waitFor(() => {
			expect(screen.getByTestId('password-strength-weak')).toBeInTheDocument();
		});

		// Test strong password
		await user.clear(passwordInput);
		await user.type(passwordInput, 'StrongPass123!');

		await waitFor(() => {
			expect(
				screen.getByTestId('password-strength-strong')
			).toBeInTheDocument();
		});
	});

	it('validates password confirmation', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(passwordInput, 'StrongPass123!');
		await user.type(confirmPasswordInput, 'DifferentPass123!');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
		});

		expect(mockSignUp).not.toHaveBeenCalled();
	});

	it('validates terms and conditions acceptance', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const fullNameInput = screen.getByLabelText(/full name/i);
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(fullNameInput, 'John Doe');
		await user.type(emailInput, 'john@example.com');
		await user.type(passwordInput, 'StrongPass123!');
		await user.type(confirmPasswordInput, 'StrongPass123!');
		await user.click(submitButton);

		await waitFor(() => {
			expect(
				screen.getByText(/you must accept the terms and conditions/i)
			).toBeInTheDocument();
		});

		expect(mockSignUp).not.toHaveBeenCalled();
	});

	it('navigates to login page', () => {
		renderSignupPage();

		const loginLink = screen.getByText(/sign in/i);
		expect(loginLink).toHaveAttribute('href', '/auth/login');
	});

	it('shows social signup options', () => {
		renderSignupPage();

		expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /continue with google/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /continue with github/i })
		).toBeInTheDocument();
	});

	it('handles invitation signup flow', () => {
		mockSearchParams.get.mockImplementation((key) => {
			if (key === 'invitation') return 'inv-123';
			if (key === 'email') return 'invited@example.com';
			return null;
		});

		renderSignupPage();

		expect(
			screen.getByText(/you've been invited to join/i)
		).toBeInTheDocument();
		expect(screen.getByDisplayValue('invited@example.com')).toBeInTheDocument();
		expect(screen.getByDisplayValue('invited@example.com')).toBeDisabled();
	});

	it('shows password strength indicator', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const passwordInput = screen.getByLabelText(/^password$/i);

		// Test weak password
		await user.type(passwordInput, 'weak');
		expect(screen.getByTestId('password-strength-weak')).toBeInTheDocument();

		// Test medium password
		await user.clear(passwordInput);
		await user.type(passwordInput, 'mediumpass');
		expect(screen.getByTestId('password-strength-medium')).toBeInTheDocument();

		// Test strong password
		await user.clear(passwordInput);
		await user.type(passwordInput, 'StrongPass123!');
		expect(screen.getByTestId('password-strength-strong')).toBeInTheDocument();
	});

	it('shows marketing consent checkbox', () => {
		renderSignupPage();

		expect(
			screen.getByLabelText(/send me product updates/i)
		).toBeInTheDocument();
	});

	it('handles marketing consent selection', async () => {
		const user = userEvent.setup();
		mockSignUp.mockResolvedValue({
			user: { id: 'user-123', email: 'test@example.com' },
			session: null
		});
		renderSignupPage();

		const marketingCheckbox = screen.getByLabelText(/send me product updates/i);
		const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);

		await user.click(marketingCheckbox);
		await user.click(termsCheckbox);

		// Fill form and submit
		await user.type(screen.getByLabelText(/full name/i), 'John Doe');
		await user.type(screen.getByLabelText(/email/i), 'john@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
		await user.type(
			screen.getByLabelText(/confirm password/i),
			'StrongPass123!'
		);
		await user.click(screen.getByRole('button', { name: /create account/i }));

		await waitFor(() => {
			expect(mockSignUp).toHaveBeenCalledWith({
				email: 'john@example.com',
				password: 'StrongPass123!',
				fullName: 'John Doe',
				marketingConsent: true
			});
		});
	});

	it('supports keyboard navigation', async () => {
		const user = userEvent.setup();
		renderSignupPage();

		const fullNameInput = screen.getByLabelText(/full name/i);
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		fullNameInput.focus();
		await user.tab();
		expect(emailInput).toHaveFocus();

		await user.tab();
		expect(passwordInput).toHaveFocus();

		await user.tab();
		expect(confirmPasswordInput).toHaveFocus();

		await user.tab();
		expect(termsCheckbox).toHaveFocus();

		await user.tab();
		expect(submitButton).toHaveFocus();
	});

	it('handles company signup flow', () => {
		mockSearchParams.get.mockImplementation((key) => {
			if (key === 'type') return 'company';
			return null;
		});

		renderSignupPage();

		expect(screen.getByText(/create company account/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/company size/i)).toBeInTheDocument();
	});

	it('handles resend confirmation email', async () => {
		const user = userEvent.setup();
		const mockResendConfirmation = jest.fn().mockResolvedValue({});

		mockSignUp.mockResolvedValue({
			user: { id: 'user-123', email: 'test@example.com' },
			session: null
		});

		renderSignupPage({ resendConfirmation: mockResendConfirmation });

		// Complete signup first
		await user.type(screen.getByLabelText(/full name/i), 'John Doe');
		await user.type(screen.getByLabelText(/email/i), 'john@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
		await user.type(
			screen.getByLabelText(/confirm password/i),
			'StrongPass123!'
		);
		await user.click(screen.getByLabelText(/i agree to the terms/i));
		await user.click(screen.getByRole('button', { name: /create account/i }));

		// Wait for confirmation screen and click resend
		await waitFor(() => {
			expect(screen.getByText(/resend confirmation/i)).toBeInTheDocument();
		});

		const resendButton = screen.getByText(/resend confirmation/i);
		await user.click(resendButton);

		await waitFor(() => {
			expect(mockResendConfirmation).toHaveBeenCalledWith('john@example.com');
			expect(toast.success).toHaveBeenCalledWith('Confirmation email sent!');
		});
	});

	it('handles accessibility requirements', () => {
		renderSignupPage();

		// Check for proper ARIA labels
		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(screen.getByRole('form')).toBeInTheDocument();

		// Check for proper heading structure
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

		// Check for proper field labels and types
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password$/i);

		expect(emailInput).toHaveAttribute('type', 'email');
		expect(passwordInput).toHaveAttribute('type', 'password');
		expect(emailInput).toHaveAttribute('autocomplete', 'email');
		expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
	});

	it('shows password requirements', () => {
		renderSignupPage();

		expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
		expect(
			screen.getByText(/include uppercase and lowercase/i)
		).toBeInTheDocument();
		expect(
			screen.getByText(/include at least one number/i)
		).toBeInTheDocument();
		expect(
			screen.getByText(/include at least one special character/i)
		).toBeInTheDocument();
	});
});
