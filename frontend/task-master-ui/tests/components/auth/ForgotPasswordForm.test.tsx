import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';

// Mock the toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn()
	}
}));

const mockResetPassword = jest.fn();

const renderForgotPasswordForm = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				resetPassword: mockResetPassword,
				loading: false,
				...authOverrides
			}}
		>
			<ForgotPasswordForm />
		</MockAuthProvider>
	);
};

describe('ForgotPasswordForm', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all form elements', () => {
		renderForgotPasswordForm();

		expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
		expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /send reset link/i })
		).toBeInTheDocument();
		expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
	});

	it('validates required email field', async () => {
		const user = userEvent.setup();
		renderForgotPasswordForm();

		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
		});

		expect(mockResetPassword).not.toHaveBeenCalled();
	});

	it('validates email format', async () => {
		const user = userEvent.setup();
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		await user.type(emailInput, 'invalid-email');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
		});

		expect(mockResetPassword).not.toHaveBeenCalled();
	});

	it('submits form with valid email', async () => {
		const user = userEvent.setup();
		mockResetPassword.mockResolvedValue({ success: true });
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		await user.type(emailInput, 'test@example.com');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
			expect(toast.success).toHaveBeenCalledWith(
				'Password reset link sent! Check your email.'
			);
		});
	});

	it('shows loading state during submission', () => {
		renderForgotPasswordForm({ loading: true });

		const submitButton = screen.getByRole('button', { name: /sending/i });
		expect(submitButton).toBeDisabled();
		expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
	});

	it('handles reset password error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Email not found';
		mockResetPassword.mockRejectedValue(new Error(errorMessage));
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		await user.type(emailInput, 'nonexistent@example.com');
		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});

	it('navigates back to login page', () => {
		renderForgotPasswordForm();

		const backToLoginLink = screen.getByText(/back to sign in/i);
		expect(backToLoginLink).toHaveAttribute('href', '/auth/login');
	});

	it('shows success message after successful submission', async () => {
		const user = userEvent.setup();
		mockResetPassword.mockResolvedValue({ success: true });
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		await user.type(emailInput, 'test@example.com');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/check your email/i)).toBeInTheDocument();
			expect(
				screen.getByText(/we've sent a password reset link/i)
			).toBeInTheDocument();
		});
	});

	it('allows resending reset email', async () => {
		const user = userEvent.setup();
		mockResetPassword.mockResolvedValue({ success: true });
		renderForgotPasswordForm();

		// First submission
		const emailInput = screen.getByLabelText(/email/i);
		await user.type(emailInput, 'test@example.com');
		await user.click(screen.getByRole('button', { name: /send reset link/i }));

		await waitFor(() => {
			expect(screen.getByText(/check your email/i)).toBeInTheDocument();
		});

		// Resend
		const resendButton = screen.getByRole('button', { name: /resend email/i });
		await user.click(resendButton);

		await waitFor(() => {
			expect(mockResetPassword).toHaveBeenCalledTimes(2);
			expect(toast.success).toHaveBeenCalledWith(
				'Password reset link sent again!'
			);
		});
	});

	it('handles keyboard navigation', async () => {
		const user = userEvent.setup();
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		emailInput.focus();
		await user.tab();
		expect(submitButton).toHaveFocus();
	});

	it('submits form on Enter key press', async () => {
		const user = userEvent.setup();
		mockResetPassword.mockResolvedValue({ success: true });
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);

		await user.type(emailInput, 'test@example.com');
		await user.keyboard('{Enter}');

		await waitFor(() => {
			expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
		});
	});

	it('disables form after successful submission', async () => {
		const user = userEvent.setup();
		mockResetPassword.mockResolvedValue({ success: true });
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		await user.type(emailInput, 'test@example.com');
		await user.click(submitButton);

		await waitFor(() => {
			expect(emailInput).toBeDisabled();
		});
	});

	it('shows rate limiting message', async () => {
		const user = userEvent.setup();
		mockResetPassword.mockRejectedValue(
			new Error('Rate limit exceeded. Please try again later.')
		);
		renderForgotPasswordForm();

		const emailInput = screen.getByLabelText(/email/i);
		const submitButton = screen.getByRole('button', {
			name: /send reset link/i
		});

		await user.type(emailInput, 'test@example.com');
		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Rate limit exceeded. Please try again later.'
			);
		});
	});
});
