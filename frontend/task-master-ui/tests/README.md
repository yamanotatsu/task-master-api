# Frontend Test Suite

This directory contains comprehensive tests for the Task Master authentication UI components and functionality.

## Test Structure

```
tests/
├── setup.js                     # Jest test setup and global mocks
├── utils/
│   └── test-utils.tsx           # Custom render functions and utilities
├── mocks/
│   ├── auth-provider.tsx        # Mock authentication context
│   └── api-client.ts           # Mock API client responses
├── components/
│   ├── auth/                   # Authentication component tests
│   │   ├── LoginForm.test.tsx
│   │   ├── SignupForm.test.tsx
│   │   ├── ForgotPasswordForm.test.tsx
│   │   ├── ResetPasswordForm.test.tsx
│   │   └── OrganizationSetupForm.test.tsx
│   └── organization/           # Organization management tests
│       ├── OrganizationSwitcher.test.tsx
│       ├── MemberList.test.tsx
│       ├── InviteMemberModal.test.tsx
│       └── InvitationList.test.tsx
├── lib/                        # Library and utility tests
│   ├── auth.test.tsx           # Authentication context tests
│   └── api.test.tsx            # API client tests
└── pages/                      # Page-level integration tests
    ├── login.test.tsx
    ├── signup.test.tsx
    └── settings.test.tsx
```

## Test Configuration

### Jest Configuration

The test suite uses Jest with the following configuration:

- **Environment**: jsdom (for DOM testing)
- **Setup Files**: `tests/setup.js` for global mocks and configuration
- **Test Patterns**: `tests/**/*.test.{js,jsx,ts,tsx}`
- **Coverage**: Includes all components, pages, and lib files

### Dependencies

- **@testing-library/react**: Component testing utilities
- **@testing-library/jest-dom**: Additional DOM matchers
- **@testing-library/user-event**: User interaction simulation
- **jest**: Test runner and assertion library
- **ts-jest**: TypeScript support for Jest

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test LoginForm.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="validation"
```

## Test Utilities

### Custom Render Function

The `test-utils.tsx` file provides a custom render function that wraps components with necessary providers:

```tsx
import { render } from '@/tests/utils/test-utils';

// Automatically includes QueryClient, AuthProvider, and ToastProvider
render(<MyComponent />);

// Override auth context values
render(<MyComponent />, {
	authContextValue: { user: mockUser }
});
```

### Mock Auth Provider

The `MockAuthProvider` allows testing components with different authentication states:

```tsx
<MockAuthProvider
	value={{
		user: mockUser,
		organization: mockOrganization,
		loading: false,
		signIn: jest.fn()
		// ... other auth methods
	}}
>
	<ComponentUnderTest />
</MockAuthProvider>
```

### API Client Mocks

The `api-client.ts` mock provides pre-configured mock responses for all API methods:

```tsx
import { mockApiClient, setupMockResponses } from '@/tests/mocks/api-client';

// Setup default successful responses
setupMockResponses();

// Override specific methods
mockApiClient.auth.signIn.mockRejectedValue(new Error('Invalid credentials'));
```

## Test Categories

### Component Tests

#### Authentication Components

- **LoginForm**: Email/password validation, sign-in flow, error handling
- **SignupForm**: Registration validation, password strength, terms acceptance
- **ForgotPasswordForm**: Email validation, reset request flow
- **ResetPasswordForm**: Password update with token validation
- **OrganizationSetupForm**: Organization creation flow

#### Organization Components

- **OrganizationSwitcher**: Organization selection and switching
- **MemberList**: Member display, role management, search/filter
- **InviteMemberModal**: Member invitation with validation
- **InvitationList**: Pending invitations management

### Library Tests

#### Authentication Context (`auth.test.tsx`)

- Context initialization and state management
- Authentication methods (signIn, signUp, signOut)
- Organization management
- Member and invitation handling
- Error handling and loading states

#### API Client (`api.test.tsx`)

- Authentication endpoints
- Organization CRUD operations
- Member management
- Invitation handling
- Error handling and edge cases

### Page Tests

#### Authentication Pages

- **Login Page**: Full login flow, redirects, error states
- **Signup Page**: Registration flow, confirmation, invitation handling
- **Settings Pages**: Profile management, member administration

## Testing Patterns

### User Interactions

```tsx
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.type(emailInput, 'test@example.com');
await user.click(submitButton);
```

### Async Operations

```tsx
await waitFor(() => {
	expect(mockSignIn).toHaveBeenCalledWith(expectedData);
	expect(screen.getByText('Success message')).toBeInTheDocument();
});
```

### Error Handling

```tsx
mockSignIn.mockRejectedValue(new Error('Network error'));
await user.click(submitButton);

await waitFor(() => {
	expect(toast.error).toHaveBeenCalledWith('Network error');
});
```

### Form Validation

```tsx
await user.click(submitButton); // Submit without filling fields

await waitFor(() => {
	expect(screen.getByText(/email is required/i)).toBeInTheDocument();
	expect(screen.getByText(/password is required/i)).toBeInTheDocument();
});
```

## Best Practices

### 1. Test User Behavior, Not Implementation

```tsx
// Good: Test what the user sees and does
expect(screen.getByText('Welcome back')).toBeInTheDocument();
await user.type(emailInput, 'test@example.com');

// Avoid: Testing implementation details
expect(component.state.email).toBe('test@example.com');
```

### 2. Use Accessible Queries

```tsx
// Prefer accessible queries
screen.getByLabelText('Email address');
screen.getByRole('button', { name: 'Sign in' });

// Over CSS-based queries
screen.getByTestId('email-input');
```

### 3. Mock External Dependencies

```tsx
// Mock API calls, timers, external libraries
jest.mock('@supabase/supabase-js');
jest.mock('next/navigation');
```

### 4. Test Edge Cases

- Empty states
- Loading states
- Error conditions
- Network failures
- Invalid inputs
- Accessibility requirements

### 5. Organize Tests Logically

```tsx
describe('LoginForm', () => {
	describe('validation', () => {
		it('validates required fields', () => {});
		it('validates email format', () => {});
	});

	describe('submission', () => {
		it('handles successful login', () => {});
		it('handles login errors', () => {});
	});
});
```

## Coverage Goals

- **Components**: 90%+ coverage for all authentication and organization components
- **Library Code**: 95%+ coverage for auth context and API client
- **Pages**: 85%+ coverage for critical user flows
- **Edge Cases**: Test error states, loading states, and boundary conditions

## Debugging Tests

### Common Issues

1. **Async/Await Problems**: Use `waitFor` for async operations
2. **Mock Issues**: Ensure mocks are reset between tests
3. **Provider Missing**: Use custom render function with providers
4. **Timing Issues**: Use `findBy` queries for elements that appear asynchronously

### Debugging Commands

```bash
# Run single test with verbose output
npm test -- --verbose LoginForm.test.tsx

# Debug specific test
npm test -- --testNamePattern="validates email" --verbose

# Run tests without coverage (faster)
npm test -- --collectCoverage=false
```

## Contributing

When adding new tests:

1. Follow the existing file structure and naming conventions
2. Include tests for both happy path and error scenarios
3. Use the provided test utilities and mocks
4. Ensure tests are isolated and don't depend on each other
5. Add appropriate documentation for complex test scenarios
