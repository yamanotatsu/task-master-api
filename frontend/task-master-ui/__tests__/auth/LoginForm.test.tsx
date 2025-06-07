import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('LoginForm', () => {
  const mockSignIn = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
    });
  });

  it('should render login form with all required fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByText('新規登録')).toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce(undefined);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';
    mockSignIn.mockRejectedValueOnce(new Error(errorMessage));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ログイン中...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    // HTML5 validation should prevent submission
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeInvalid();
  });

  it('should require all fields', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  it('should navigate to signup page when clicking signup link', () => {
    render(<LoginForm />);

    const signupLink = screen.getByText('新規登録');
    expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });
});