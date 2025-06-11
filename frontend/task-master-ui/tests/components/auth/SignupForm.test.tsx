import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { SignupForm } from '@/components/auth/SignupForm';
import { MockAuthProvider } from '@/tests/mocks/auth-provider';

// Mock the toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn()
	}
}));

const mockSignUp = jest.fn();

const renderSignupForm = (authOverrides = {}) => {
	return render(
		<MockAuthProvider
			value={{
				signUp: mockSignUp,
				loading: false,
				...authOverrides
			}}
		>
			<SignupForm />
		</MockAuthProvider>
	);
};

describe('SignupForm', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all form fields', () => {
		renderSignupForm();

		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /create account/i })
		).toBeInTheDocument();
		expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
	});

	it('validates required fields', async () => {
		const user = userEvent.setup();
		renderSignupForm();

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
		renderSignupForm();

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
		renderSignupForm();

		const passwordInput = screen.getByLabelText(/^password$/i);

		// Test weak password
		await user.type(passwordInput, '123');

		await waitFor(() => {
			expect(
				screen.getByText(/password must be at least 8 characters/i)
			).toBeInTheDocument();
		});

		// Clear and test medium strength password
		await user.clear(passwordInput);
		await user.type(passwordInput, 'password');

		await waitFor(() => {
			expect(screen.getByText(/weak/i)).toBeInTheDocument();
		});

		// Test strong password
		await user.clear(passwordInput);
		await user.type(passwordInput, 'StrongPass123!');

		await waitFor(() => {
			expect(screen.getByText(/strong/i)).toBeInTheDocument();
		});
	});

	it('validates password confirmation', async () => {
		const user = userEvent.setup();
		renderSignupForm();

		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(passwordInput, 'password123');
		await user.type(confirmPasswordInput, 'differentpassword');
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
		});

		expect(mockSignUp).not.toHaveBeenCalled();
	});

	it('submits form with valid data', async () => {
		const user = userEvent.setup();
		mockSignUp.mockResolvedValue({ success: true });
		renderSignupForm();

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
			expect(mockSignUp).toHaveBeenCalledWith({
				email: 'john@example.com',
				password: 'StrongPass123!',
				fullName: 'John Doe'
			});
		});
	});

	it('shows loading state during submission', async () => {
		renderSignupForm({ loading: true });

		const submitButton = screen.getByRole('button', {
			name: /creating account/i
		});
		expect(submitButton).toBeDisabled();
		expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
	});

	it('handles signup error', async () => {
		const user = userEvent.setup();
		const errorMessage = 'Email already registered';
		mockSignUp.mockRejectedValue(new Error(errorMessage));
		renderSignupForm();

		const fullNameInput = screen.getByLabelText(/full name/i);
		const emailInput = screen.getByLabelText(/email/i);
		const passwordInput = screen.getByLabelText(/^password$/i);
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		await user.type(fullNameInput, 'John Doe');
		await user.type(emailInput, 'existing@example.com');
		await user.type(passwordInput, 'StrongPass123!');
		await user.type(confirmPasswordInput, 'StrongPass123!');
		await user.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});

	it('shows password strength indicator', async () => {
		const user = userEvent.setup();
		renderSignupForm();

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

	it('toggles password visibility', async () => {
		const user = userEvent.setup();
		renderSignupForm();

		const passwordInput = screen.getByLabelText(
			/^password$/i
		) as HTMLInputElement;
		const confirmPasswordInput = screen.getByLabelText(
			/confirm password/i
		) as HTMLInputElement;
		const toggleButtons = screen.getAllByRole('button', {
			name: /toggle password visibility/i
		});

		expect(passwordInput.type).toBe('password');
		expect(confirmPasswordInput.type).toBe('password');

		// Toggle password field
		await user.click(toggleButtons[0]);
		expect(passwordInput.type).toBe('text');

		// Toggle confirm password field
		await user.click(toggleButtons[1]);
		expect(confirmPasswordInput.type).toBe('text');
	});

	it('navigates to login page', async () => {
		renderSignupForm();

		const loginLink = screen.getByText(/sign in/i);
		expect(loginLink).toHaveAttribute('href', '/auth/login');
	});

	it('validates terms and conditions checkbox', async () => {
		const user = userEvent.setup();
		renderSignupForm();

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

	it('accepts terms and conditions', async () => {
		const user = userEvent.setup();
		mockSignUp.mockResolvedValue({ success: true });
		renderSignupForm();

		const termsCheckbox = screen.getByLabelText(
			/i agree to the terms and conditions/i
		);
		const submitButton = screen.getByRole('button', {
			name: /create account/i
		});

		expect(termsCheckbox).not.toBeChecked();

		await user.click(termsCheckbox);
		expect(termsCheckbox).toBeChecked();

		// Fill form and submit
		await user.type(screen.getByLabelText(/full name/i), 'John Doe');
		await user.type(screen.getByLabelText(/email/i), 'john@example.com');
		await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
		await user.type(
			screen.getByLabelText(/confirm password/i),
			'StrongPass123!'
		);
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockSignUp).toHaveBeenCalledWith({
				email: 'john@example.com',
				password: 'StrongPass123!',
				fullName: 'John Doe'
			});
		});
	});

	it('handles real-time password strength updates', async () => {
		const user = userEvent.setup();
		renderSignupForm();

		const passwordInput = screen.getByLabelText(/^password$/i);

		// Start typing to see real-time updates
		await user.type(passwordInput, 'a');
		expect(screen.getByTestId('password-strength-weak')).toBeInTheDocument();

		await user.type(passwordInput, 'bcdef123');
		expect(screen.getByTestId('password-strength-medium')).toBeInTheDocument();

		await user.type(passwordInput, 'GH!');
		expect(screen.getByTestId('password-strength-strong')).toBeInTheDocument();
	});
});
