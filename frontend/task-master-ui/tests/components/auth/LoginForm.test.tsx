import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';

// Mock the toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn()
	}
}));

const mockSignIn = jest.fn();

const renderLoginForm = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				signIn: mockSignIn,
				loading: false,
				...authOverrides
			}}
		>
			<LoginForm />
		</MockAuthProvider>
	);
};

describe('LoginForm', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all form fields', () => {
		renderLoginForm();

		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /sign in/i })
		).toBeInTheDocument();
		expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
		expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
	});

	it('validates required fields', async () => {
		const user = userEvent.setup();
		renderLoginForm();

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
		renderLoginForm();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'invalid-email');
		await user.type(passwordInput, 'password123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
		});

		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it('validates minimum password length', async () => {
		const user = userEvent.setup();
		renderLoginForm();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, '123');
		await user.click(submitButton);

		await waitFor(() => {
			expect(
				screen.getByText(/password must be at least 6 characters/i)
			).toBeInTheDocument();
		});

		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it('submits form with valid data', async () => {
		const user = userEvent.setup();
		mockSignIn.mockResolvedValue({ success: true });
		renderLoginForm();

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
		});
	});

	it('shows loading state during submission', async () => {
		const user = userEvent.setup();
		renderLoginForm({ loading: true });

		const submitButton = screen.getByRole('button', { name: /signing in/i });
		expect(submitButton).toBeDisabled();
		expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
	});

	it('handles sign in error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Invalid credentials';
		mockSignIn.mockRejectedValue(new Error(errorMessage));
		renderLoginForm();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		await user.type(emailInput, 'test@example.com');
		await user.type(passwordInput, 'wrongpassword');
		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});

	it('toggles password visibility', async () => {
		const user = userEvent.setup();
		renderLoginForm();

		const passwordInput = screen.getByLabelText(
			/password/i
		) as HTMLInputElement;
		const toggleButton = screen.getByRole('button', {
			name: /toggle password visibility/i
		});

		expect(passwordInput.type).toBe('password');

		await user.click(toggleButton);
		expect(passwordInput.type).toBe('text');

		await user.click(toggleButton);
		expect(passwordInput.type).toBe('password');
	});

	it('navigates to forgot password page', async () => {
		const user = userEvent.setup();
		renderLoginForm();

		const forgotPasswordLink = screen.getByText(/forgot your password/i);
		expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
	});

	it('navigates to signup page', async () => {
		const user = userEvent.setup();
		renderLoginForm();

		const signupLink = screen.getByText(/sign up/i);
		expect(signupLink).toHaveAttribute('href', '/auth/signup');
	});

	it('remembers user preference with checkbox', async () => {
		const user = userEvent.setup();
		renderLoginForm();

		const rememberCheckbox = screen.getByLabelText(/remember me/i);
		expect(rememberCheckbox).not.toBeChecked();

		await user.click(rememberCheckbox);
		expect(rememberCheckbox).toBeChecked();
	});

	it('handles keyboard navigation', async () => {
		const user = userEvent.setup();
		renderLoginForm();

		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/password/i);
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		emailInput.focus();
		await user.tab();
		expect(passwordInput).toHaveFocus();

		await user.tab();
		expect(screen.getByLabelText(/remember me/i)).toHaveFocus();

		await user.tab();
		expect(submitButton).toHaveFocus();
	});

	it('submits form on Enter key press', async () => {
		const user = userEvent.setup();
		mockSignIn.mockResolvedValue({ success: true });
		renderLoginForm();

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
});
