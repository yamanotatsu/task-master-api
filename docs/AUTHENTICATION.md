# Task Master Authentication Guide

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Token Management](#token-management)
4. [Role-Based Access Control](#role-based-access-control)
5. [Security Best Practices](#security-best-practices)
6. [Implementation Examples](#implementation-examples)
7. [Error Handling](#error-handling)
8. [SDK Integration](#sdk-integration)

## Overview

Task Master uses JWT (JSON Web Token) based authentication with refresh token rotation for secure API access. The system supports multi-tenant organization management with role-based access control.

### Authentication Features

- **JWT-based Authentication**: Stateless token-based authentication
- **Refresh Token Rotation**: Automatic token refresh for enhanced security
- **Multi-tenant Support**: Organization-based access control
- **Role-based Authorization**: Fine-grained permission system
- **Session Management**: Secure session handling with automatic cleanup

## Authentication Flow

### 1. User Registration

```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com"
    }
  }
}
```

### 2. Email Verification

Users must verify their email address before they can sign in. The verification link is sent to the provided email address.

### 3. User Sign In

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTg4MDB9.signature",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQxNjAwMDAwfQ.signature",
      "expiresIn": 3600
    }
  }
}
```

### 4. Making Authenticated Requests

Include the access token in the Authorization header:

```http
GET /api/v1/organizations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Token Refresh

When the access token expires, use the refresh token to get a new access token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

## Token Management

### Access Tokens

- **Lifetime**: 1 hour (3600 seconds)
- **Purpose**: API authentication
- **Storage**: Memory (client-side)
- **Auto-refresh**: Yes, when expired

### Refresh Tokens

- **Lifetime**: 7 days
- **Purpose**: Obtaining new access tokens
- **Storage**: Secure HTTP-only cookies (recommended) or secure client storage
- **Rotation**: Yes, new refresh token issued with each refresh

### Token Structure

Access tokens contain the following claims:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "iat": 1640995200,
  "exp": 1640998800,
  "type": "access"
}
```

## Role-Based Access Control

### Organization Roles

Task Master implements a hierarchical role system:

| Role | Permissions |
|------|-------------|
| **admin** | Full organization management, all projects and tasks |
| **member** | View organization, manage assigned projects and tasks |

### Permission Matrix

| Action | Admin | Member |
|--------|-------|--------|
| View organization details | ✅ | ✅ |
| Update organization settings | ✅ | ❌ |
| Invite/remove members | ✅ | ❌ |
| Create projects | ✅ | ✅ |
| Delete projects | ✅ | ❌ (own projects only) |
| View all tasks | ✅ | ✅ (organization tasks) |
| Assign tasks | ✅ | ✅ (project members) |
| Delete tasks | ✅ | ✅ (assigned or created) |

### Checking User Permissions

To check if a user has specific permissions, examine their role in the context:

```javascript
// Check if user is organization admin
const isOrgAdmin = userOrganizations.some(org => 
  org.id === organizationId && org.role === 'admin'
);

// Check if user is project member
const isProjectMember = userProjects.some(project => 
  project.id === projectId
);
```

## Security Best Practices

### 1. Token Storage

**✅ Recommended:**
- Store access tokens in memory (JavaScript variables)
- Store refresh tokens in HTTP-only, secure cookies
- Use secure storage mechanisms on mobile apps

**❌ Avoid:**
- Storing tokens in localStorage or sessionStorage
- Storing tokens in unencrypted client-side storage
- Including tokens in URL parameters

### 2. Token Transmission

**✅ Recommended:**
- Always use HTTPS in production
- Include tokens in Authorization header
- Validate SSL certificates

**❌ Avoid:**
- Transmitting tokens over HTTP
- Including tokens in GET request URLs
- Logging tokens in application logs

### 3. Token Validation

**✅ Recommended:**
- Validate token signature
- Check token expiration
- Verify token audience and issuer
- Implement proper error handling

### 4. Session Management

**✅ Recommended:**
- Implement automatic token refresh
- Provide manual logout functionality
- Clear tokens on logout
- Handle token expiration gracefully

## Implementation Examples

### JavaScript/TypeScript (Frontend)

```typescript
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.data.tokens.accessToken;
      this.refreshToken = data.data.tokens.refreshToken;
      
      // Store refresh token in HTTP-only cookie
      document.cookie = `refreshToken=${this.refreshToken}; HttpOnly; Secure; SameSite=Strict`;
      
      return data.data.user;
    }
    
    throw new Error('Login failed');
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshAccessToken();
      
      // Retry the original request
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    }

    return response;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.data.tokens.accessToken;
      this.refreshToken = data.data.tokens.refreshToken;
      
      // Update refresh token cookie
      document.cookie = `refreshToken=${this.refreshToken}; HttpOnly; Secure; SameSite=Strict`;
    } else {
      // Refresh failed, user needs to login again
      this.logout();
      throw new Error('Token refresh failed');
    }
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    
    // Clear refresh token cookie
    document.cookie = 'refreshToken=; HttpOnly; Secure; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Redirect to login page
    window.location.href = '/login';
  }
}
```

### Python (Backend/CLI)

```python
import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class TaskMasterAuth:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and store tokens."""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        
        data = response.json()
        tokens = data["data"]["tokens"]
        
        self.access_token = tokens["accessToken"]
        self.refresh_token = tokens["refreshToken"]
        self.token_expires_at = datetime.now() + timedelta(seconds=tokens["expiresIn"])
        
        return data["data"]["user"]

    def _ensure_valid_token(self):
        """Ensure access token is valid, refresh if necessary."""
        if not self.access_token:
            raise ValueError("No access token available. Please login first.")
        
        if self.token_expires_at and datetime.now() >= self.token_expires_at:
            self._refresh_token()

    def _refresh_token(self):
        """Refresh the access token using the refresh token."""
        if not self.refresh_token:
            raise ValueError("No refresh token available. Please login again.")
        
        response = requests.post(
            f"{self.base_url}/auth/refresh",
            json={"refreshToken": self.refresh_token}
        )
        
        if response.status_code == 401:
            raise ValueError("Refresh token expired. Please login again.")
        
        response.raise_for_status()
        
        data = response.json()
        tokens = data["data"]["tokens"]
        
        self.access_token = tokens["accessToken"]
        self.refresh_token = tokens["refreshToken"]
        self.token_expires_at = datetime.now() + timedelta(seconds=tokens["expiresIn"])

    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make an authenticated request to the API."""
        self._ensure_valid_token()
        
        headers = kwargs.get("headers", {})
        headers["Authorization"] = f"Bearer {self.access_token}"
        kwargs["headers"] = headers
        
        response = requests.request(method, f"{self.base_url}/{endpoint}", **kwargs)
        
        if response.status_code == 401:
            # Token might have expired, try refreshing
            self._refresh_token()
            headers["Authorization"] = f"Bearer {self.access_token}"
            response = requests.request(method, f"{self.base_url}/{endpoint}", **kwargs)
        
        return response

    def logout(self):
        """Clear stored tokens."""
        if self.access_token:
            try:
                self.make_request("POST", "auth/logout")
            except:
                pass  # Ignore errors during logout
        
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

# Usage example
auth = TaskMasterAuth("https://api.taskmaster.com/v1")

# Login
user = auth.login("user@example.com", "password")
print(f"Logged in as: {user['fullName']}")

# Make authenticated requests
orgs_response = auth.make_request("GET", "organizations")
organizations = orgs_response.json()["data"]["organizations"]

# Logout
auth.logout()
```

### React Hooks (Frontend)

```typescript
import { useState, useEffect, useContext, createContext } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/v1/users/profile', {
        credentials: 'include' // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.data.profile);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data.data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Custom hook for authenticated API requests
export function useAuthenticatedFetch() {
  return async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    return response;
  };
}
```

## Error Handling

### Common Authentication Errors

| Error Code | HTTP Status | Description | Action |
|------------|-------------|-------------|--------|
| `AUTH_TOKEN_MISSING` | 401 | No Authorization header | Redirect to login |
| `AUTH_TOKEN_INVALID` | 401 | Invalid or malformed token | Clear tokens, redirect to login |
| `AUTH_TOKEN_EXPIRED` | 401 | Token has expired | Attempt token refresh |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email not verified | Show verification message |
| `AUTH_ACCOUNT_DISABLED` | 403 | Account disabled | Show account status message |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password | Show error message |

### Error Handling Example

```javascript
function handleAuthError(error) {
  switch (error.code) {
    case 'AUTH_TOKEN_EXPIRED':
      // Attempt to refresh token
      return authService.refreshAccessToken();
    
    case 'AUTH_TOKEN_INVALID':
    case 'AUTH_TOKEN_MISSING':
      // Clear tokens and redirect to login
      authService.logout();
      break;
    
    case 'AUTH_EMAIL_NOT_VERIFIED':
      // Show email verification prompt
      showEmailVerificationDialog();
      break;
    
    case 'AUTH_INVALID_CREDENTIALS':
      // Show error message
      showError('Invalid email or password');
      break;
    
    default:
      showError('Authentication error occurred');
  }
}
```

## SDK Integration

### Official JavaScript SDK

```javascript
import { TaskMasterClient } from '@taskmaster/api-client';

const client = new TaskMasterClient({
  baseURL: 'https://api.taskmaster.com/v1',
  // Authentication handled automatically
  onTokenRefresh: (newTokens) => {
    // Handle token refresh
    console.log('Tokens refreshed');
  },
  onAuthError: (error) => {
    // Handle authentication errors
    console.error('Auth error:', error);
    window.location.href = '/login';
  }
});

// Login
await client.auth.login('user@example.com', 'password');

// Make authenticated requests (tokens handled automatically)
const organizations = await client.organizations.list();
```

### Token Persistence

```javascript
// Custom storage adapter
class TokenStorage {
  setTokens(tokens) {
    sessionStorage.setItem('accessToken', tokens.accessToken);
    // Store refresh token in HTTP-only cookie via API call
    fetch('/api/set-refresh-cookie', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    });
  }

  getAccessToken() {
    return sessionStorage.getItem('accessToken');
  }

  clearTokens() {
    sessionStorage.removeItem('accessToken');
    fetch('/api/clear-refresh-cookie', { method: 'POST' });
  }
}

const client = new TaskMasterClient({
  baseURL: 'https://api.taskmaster.com/v1',
  tokenStorage: new TokenStorage()
});
```

## Security Considerations

### 1. Token Security

- **Secure Storage**: Never store tokens in localStorage or sessionStorage for production applications
- **Transmission**: Always use HTTPS to prevent token interception
- **Expiration**: Implement proper token expiration and refresh mechanisms

### 2. CSRF Protection

```javascript
// Include CSRF token in requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

fetch('/api/v1/sensitive-action', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-CSRF-Token': csrfToken
  }
});
```

### 3. Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://api.taskmaster.com;
               script-src 'self' 'unsafe-inline';">
```

### 4. Rate Limiting

Implement client-side rate limiting to avoid hitting API limits:

```javascript
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

This authentication guide provides comprehensive information for implementing secure authentication with the Task Master API. For additional security considerations and advanced use cases, please refer to our [Security Documentation](./SECURITY.md).