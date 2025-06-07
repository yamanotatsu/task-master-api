# Task Master API Quickstart Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Quick Setup](#quick-setup)
3. [Basic Authentication](#basic-authentication)
4. [Common Use Cases](#common-use-cases)
5. [SDK Usage](#sdk-usage)
6. [Next Steps](#next-steps)

## Getting Started

Welcome to the Task Master API! This quickstart guide will help you get up and running with the API in just a few minutes.

### Prerequisites

- Task Master account (sign up at [app.taskmaster.com](https://app.taskmaster.com))
- Basic knowledge of REST APIs
- HTTP client (curl, Postman, or programming language of choice)

### Base URL

```
Production: https://api.taskmaster.com/v1
```

## Quick Setup

### 1. Create Your Account

First, create a Task Master account:

```bash
curl -X POST https://api.taskmaster.com/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com"
    }
  }
}
```

### 2. Verify Your Email

Check your email and click the verification link before proceeding.

### 3. Sign In and Get Your Token

```bash
curl -X POST https://api.taskmaster.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "fullName": "John Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### 4. Test Your Connection

Use your access token to test the connection:

```bash
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET https://api.taskmaster.com/v1/users/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Basic Authentication

### Authentication Header

Include your access token in all API requests:

```http
Authorization: Bearer <your_access_token>
```

### Token Refresh

When your access token expires (after 1 hour), use the refresh token:

```bash
curl -X POST https://api.taskmaster.com/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

## Common Use Cases

### 1. Create Your First Organization

```bash
curl -X POST https://api.taskmaster.com/v1/organizations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "description": "My first organization"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "My Company",
      "description": "My first organization",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "membership": {
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 2. Create a Project

```bash
export ORG_ID="650e8400-e29b-41d4-a716-446655440001"

curl -X POST https://api.taskmaster.com/v1/organizations/$ORG_ID/projects \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Website Redesign",
    "description": "Redesign our company website",
    "priority": "high",
    "dueDate": "2024-06-30T23:59:59Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "850e8400-e29b-41d4-a716-446655440003",
      "organizationId": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Website Redesign",
      "description": "Redesign our company website",
      "priority": "high",
      "status": "planning",
      "dueDate": "2024-06-30T23:59:59Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 3. Create Tasks

```bash
export PROJECT_ID="850e8400-e29b-41d4-a716-446655440003"

curl -X POST https://api.taskmaster.com/v1/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design new homepage",
    "description": "Create mockups and wireframes for the new homepage",
    "priority": "high",
    "dueDate": "2024-02-15T17:00:00Z",
    "estimatedHours": 8,
    "tags": ["design", "homepage"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "950e8400-e29b-41d4-a716-446655440004",
      "projectId": "850e8400-e29b-41d4-a716-446655440003",
      "title": "Design new homepage",
      "description": "Create mockups and wireframes for the new homepage",
      "status": "todo",
      "priority": "high",
      "dueDate": "2024-02-15T17:00:00Z",
      "estimatedHours": 8,
      "tags": ["design", "homepage"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 4. List and Filter Tasks

```bash
# Get all tasks in a project
curl -X GET "https://api.taskmaster.com/v1/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Filter by status
curl -X GET "https://api.taskmaster.com/v1/projects/$PROJECT_ID/tasks?status=todo" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Filter by priority and search
curl -X GET "https://api.taskmaster.com/v1/projects/$PROJECT_ID/tasks?priority=high&search=homepage" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 5. Update Task Status

```bash
export TASK_ID="950e8400-e29b-41d4-a716-446655440004"

curl -X PUT https://api.taskmaster.com/v1/tasks/$TASK_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'
```

### 6. Add Subtasks

```bash
curl -X POST https://api.taskmaster.com/v1/tasks/$TASK_ID/subtasks \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Create wireframes",
    "description": "Design basic wireframes for the homepage layout"
  }'
```

### 7. Invite Team Members

```bash
curl -X POST https://api.taskmaster.com/v1/organizations/$ORG_ID/invites \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teammate@example.com",
    "role": "member"
  }'
```

## SDK Usage

### JavaScript/Node.js

**Installation:**
```bash
npm install @taskmaster/api-client
```

**Usage:**
```javascript
import { TaskMasterClient } from '@taskmaster/api-client';

const client = new TaskMasterClient({
  baseURL: 'https://api.taskmaster.com/v1'
});

async function quickStart() {
  // Login
  const user = await client.auth.login('john@example.com', 'SecurePassword123!');
  console.log(`Logged in as: ${user.fullName}`);

  // Create organization
  const org = await client.organizations.create({
    name: 'My Company',
    description: 'My first organization'
  });

  // Create project
  const project = await client.projects.create(org.id, {
    name: 'Website Redesign',
    description: 'Redesign our company website',
    priority: 'high'
  });

  // Create task
  const task = await client.tasks.create(project.id, {
    title: 'Design new homepage',
    description: 'Create mockups and wireframes',
    priority: 'high'
  });

  console.log(`Created task: ${task.title}`);
}

quickStart().catch(console.error);
```

### Python

**Installation:**
```bash
pip install taskmaster-api-client
```

**Usage:**
```python
from taskmaster import TaskMasterClient

client = TaskMasterClient(base_url='https://api.taskmaster.com/v1')

# Login
user = client.auth.login('john@example.com', 'SecurePassword123!')
print(f"Logged in as: {user['fullName']}")

# Create organization
org = client.organizations.create({
    'name': 'My Company',
    'description': 'My first organization'
})

# Create project
project = client.projects.create(org['id'], {
    'name': 'Website Redesign',
    'description': 'Redesign our company website',
    'priority': 'high'
})

# Create task
task = client.tasks.create(project['id'], {
    'title': 'Design new homepage',
    'description': 'Create mockups and wireframes',
    'priority': 'high'
})

print(f"Created task: {task['title']}")
```

### Frontend React Example

```jsx
import React, { useState, useEffect } from 'react';
import { TaskMasterClient } from '@taskmaster/api-client';

const client = new TaskMasterClient({
  baseURL: 'https://api.taskmaster.com/v1'
});

function App() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  const handleLogin = async (email, password) => {
    try {
      const userData = await client.auth.login(email, password);
      setUser(userData);
      
      // Load organizations
      const orgs = await client.organizations.list();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div>
      <h1>Welcome, {user.fullName}!</h1>
      <h2>Your Organizations:</h2>
      <ul>
        {organizations.map(org => (
          <li key={org.id}>{org.name}</li>
        ))}
      </ul>
    </div>
  );
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Testing with Postman

### 1. Import Collection

Create a new Postman collection with these requests:

**Environment Variables:**
- `baseUrl`: `https://api.taskmaster.com/v1`
- `accessToken`: `{{accessToken}}` (will be set automatically)

### 2. Authentication Request

```json
{
  "name": "Login",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"email\": \"john@example.com\",\n  \"password\": \"SecurePassword123!\"\n}"
    },
    "url": {
      "raw": "{{baseUrl}}/auth/login",
      "host": ["{{baseUrl}}"],
      "path": ["auth", "login"]
    }
  },
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "if (pm.response.code === 200) {",
          "    const response = pm.response.json();",
          "    pm.environment.set('accessToken', response.data.tokens.accessToken);",
          "}"
        ]
      }
    }
  ]
}
```

### 3. Pre-request Script for Authentication

Add this to requests that require authentication:

```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('accessToken')
});
```

## Error Handling Examples

### JavaScript

```javascript
async function handleApiCall() {
  try {
    const response = await client.tasks.list(projectId);
    return response;
  } catch (error) {
    if (error.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
    } else if (error.status === 403) {
      // Insufficient permissions
      alert('You do not have permission to perform this action');
    } else if (error.status === 404) {
      // Resource not found
      alert('The requested resource was not found');
    } else {
      // Generic error
      alert('An error occurred: ' + error.message);
    }
  }
}
```

### Python

```python
from taskmaster.exceptions import TaskMasterAPIError

try:
    tasks = client.tasks.list(project_id)
except TaskMasterAPIError as e:
    if e.status_code == 401:
        print("Authentication required. Please login again.")
    elif e.status_code == 403:
        print("Insufficient permissions.")
    elif e.status_code == 404:
        print("Resource not found.")
    else:
        print(f"API Error: {e.message}")
```

## Rate Limiting

The API implements rate limiting:

- **Authentication endpoints**: 10 requests per minute
- **General endpoints**: 1000 requests per hour per user

Monitor rate limit headers in responses:

```javascript
const response = await fetch('/api/v1/tasks', {
  headers: { 'Authorization': `Bearer ${token}` }
});

console.log('Rate limit remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Rate limit reset:', response.headers.get('X-RateLimit-Reset'));
```

## Next Steps

Now that you've completed the quickstart guide, here are some next steps:

### 1. Explore Advanced Features

- **Webhooks**: Set up real-time notifications
- **Bulk Operations**: Manage multiple tasks at once
- **Advanced Filtering**: Use complex queries to find data
- **File Attachments**: Upload and manage task attachments

### 2. Read Detailed Documentation

- [Full API Reference](./API.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Webhook Documentation](./WEBHOOKS.md)
- [SDK Documentation](./SDK.md)

### 3. Join the Community

- **Discord**: [https://discord.gg/taskmaster](https://discord.gg/taskmaster)
- **GitHub**: [https://github.com/taskmaster/api](https://github.com/taskmaster/api)
- **Support**: api-support@taskmaster.com

### 4. Build Your Integration

Some popular integration ideas:

- **Slack Bot**: Create tasks from Slack messages
- **Email Integration**: Convert emails to tasks
- **Time Tracking**: Integrate with time tracking tools
- **Reporting Dashboard**: Build custom analytics
- **Mobile App**: Create a mobile task management app

### 5. Stay Updated

- Follow our [Changelog](./CHANGELOG.md) for API updates
- Subscribe to our [Developer Newsletter](https://taskmaster.com/developers/newsletter)
- Star our [GitHub repository](https://github.com/taskmaster/api) for updates

## Troubleshooting

### Common Issues

**Problem**: 401 Unauthorized error
**Solution**: Check that your access token is valid and included in the Authorization header

**Problem**: 403 Forbidden error
**Solution**: Verify that your user has the required permissions for the action

**Problem**: 404 Not Found error
**Solution**: Ensure the resource ID is correct and the resource exists

**Problem**: 429 Rate Limited error
**Solution**: Reduce request frequency or implement exponential backoff

### Getting Help

If you run into issues:

1. Check the [API Documentation](./API.md)
2. Search [GitHub Issues](https://github.com/taskmaster/api/issues)
3. Ask on [Discord](https://discord.gg/taskmaster)
4. Contact [Support](mailto:api-support@taskmaster.com)

Happy coding with the Task Master API! 🚀