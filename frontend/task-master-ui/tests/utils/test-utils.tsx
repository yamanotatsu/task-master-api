import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MockAuthProvider, MockAuthContextType } from '../mocks/auth-provider';
import { ToastProvider } from '@/providers/ToastProvider';

// Mock auth context values
export const mockAuthUser = {
	id: 'test-user-id',
	email: 'test@example.com',
	user_metadata: {
		full_name: 'Test User'
	}
};

export const mockOrganization = {
	id: 'test-org-id',
	name: 'Test Organization',
	slug: 'test-org',
	created_at: '2023-01-01T00:00:00Z',
	updated_at: '2023-01-01T00:00:00Z'
};

export const mockAuthContextValue: MockAuthContextType = {
	user: mockAuthUser,
	organization: mockOrganization,
	organizations: [mockOrganization],
	loading: false,
	signIn: jest.fn(),
	signUp: jest.fn(),
	signOut: jest.fn(),
	resetPassword: jest.fn(),
	updateProfile: jest.fn(),
	createOrganization: jest.fn(),
	switchOrganization: jest.fn(),
	inviteMember: jest.fn(),
	removeMember: jest.fn(),
	updateMemberRole: jest.fn()
};

// Custom render function with providers
interface AllTheProvidersProps {
	children: React.ReactNode;
	authContextValue?: Partial<MockAuthContextType>;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
	children,
	authContextValue = mockAuthContextValue
}) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	});

	return (
		<QueryClientProvider client={queryClient}>
			<MockAuthProvider value={authContextValue}>
				<ToastProvider>{children}</ToastProvider>
			</MockAuthProvider>
		</QueryClientProvider>
	);
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
	authContextValue?: Partial<MockAuthContextType>;
}

const customRender = (
	ui: React.ReactElement,
	options: CustomRenderOptions = {}
) => {
	const { authContextValue, ...renderOptions } = options;

	return render(ui, {
		wrapper: ({ children }) => (
			<AllTheProviders authContextValue={authContextValue}>
				{children}
			</AllTheProviders>
		),
		...renderOptions
	});
};

// Mock API responses
export const mockApiResponse = {
	success: (data: any) => ({
		ok: true,
		json: async () => data,
		status: 200
	}),
	error: (message: string, status = 400) => ({
		ok: false,
		json: async () => ({ error: message }),
		status
	})
};

// Mock form data helper
export const mockFormData = (data: Record<string, string>) => {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		formData.append(key, value);
	});
	return formData;
};

// Helper to wait for async operations
export const waitForAsync = () =>
	new Promise((resolve) => setTimeout(resolve, 0));

// Mock file for upload tests
export const mockFile = new File(['test content'], 'test.jpg', {
	type: 'image/jpeg'
});

// Export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
