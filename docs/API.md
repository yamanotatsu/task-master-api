# Task Master API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [User Profile](#user-profile-endpoints)
   - [Organizations](#organization-endpoints)
   - [Members](#member-management-endpoints)
   - [Projects](#project-endpoints)
   - [Tasks](#task-endpoints)
7. [Rate Limiting](#rate-limiting)
8. [SDKs and Libraries](#sdks-and-libraries)

## Overview

The Task Master API is a RESTful API that provides comprehensive project and task management capabilities with multi-tenant organization support. The API uses JSON for request and response bodies and implements JWT-based authentication with role-based access control.

### Key Features

- **Multi-tenant Architecture**: Support for organizations with role-based access control
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **RESTful Design**: Standard HTTP methods and status codes
- **Comprehensive Task Management**: Full CRUD operations for projects, tasks, and subtasks
- **Real-time Capabilities**: WebSocket support for live updates
- **Rich Filtering**: Advanced search and filtering capabilities

## Base URL

```
Production: https://api.taskmaster.com/v1
Development: http://localhost:3001/api/v1
```

## Authentication

All API requests require authentication using Bearer tokens in the Authorization header:

```http
Authorization: Bearer <your_access_token>
```

For detailed authentication information, see the [Authentication Guide](./AUTHENTICATION.md).

## Response Format

### Success Response

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

### Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": []
  }
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Rate Limited
- `500` - Internal Server Error

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_TOKEN_MISSING` | Authorization header missing |
| `AUTH_TOKEN_INVALID` | Invalid or expired token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RESOURCE_ALREADY_EXISTS` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |

## API Endpoints

## Authentication Endpoints

### Sign Up

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**
- `fullName`: Required, 1-100 characters
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters, must contain uppercase, lowercase, and number

**Response (201):**
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

**Error Cases:**
- `400` - Validation error
- `409` - Email already exists

### Sign In

Authenticate user and return access tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
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
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

**Error Cases:**
- `400` - Invalid input
- `401` - Invalid credentials
- `403` - Email not verified

### Sign Out

Invalidate the current session.

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

### Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
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

### Forgot Password

Request a password reset email.

**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent."
  }
}
```

### Reset Password

Reset password using the token from email.

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

## User Profile Endpoints

### Get Profile

Get the current user's profile information.

**Endpoint:** `GET /users/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "avatarUrl": "https://example.com/avatar.jpg",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    }
  }
}
```

### Update Profile

Update the current user's profile information.

**Endpoint:** `PUT /users/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "fullName": "John Smith",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "fullName": "John Smith",
      "avatarUrl": "https://example.com/new-avatar.jpg",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Change Password

Change the current user's password.

**Endpoint:** `PUT /users/password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

## Organization Endpoints

### Create Organization

Create a new organization.

**Endpoint:** `POST /organizations`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "description": "A sample organization for demonstration"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Corporation",
      "description": "A sample organization for demonstration",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "membership": {
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### List Organizations

Get all organizations for the current user.

**Endpoint:** `GET /organizations`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440001",
        "name": "Acme Corporation",
        "description": "A sample organization for demonstration",
        "role": "admin",
        "memberCount": 5,
        "projectCount": 3,
        "joinedAt": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

### Get Organization

Get detailed information about a specific organization.

**Endpoint:** `GET /organizations/{organizationId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Corporation",
      "description": "A sample organization for demonstration",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "membership": {
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z"
    },
    "statistics": {
      "memberCount": 5,
      "projectCount": 3,
      "activeTaskCount": 25
    }
  }
}
```

### Update Organization

Update organization information (admin only).

**Endpoint:** `PUT /organizations/{organizationId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** admin

**Request Body:**
```json
{
  "name": "Acme Corporation (Updated)",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Corporation (Updated)",
      "description": "Updated description",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Delete Organization

Delete an organization (admin only).

**Endpoint:** `DELETE /organizations/{organizationId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** admin

**Request Body:**
```json
{
  "confirmDeletion": "DELETE MY ORGANIZATION"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Organization has been permanently deleted"
  }
}
```

## Member Management Endpoints

### Invite Member

Invite a new member to the organization (admin only).

**Endpoint:** `POST /organizations/{organizationId}/invites`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** admin

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "750e8400-e29b-41d4-a716-446655440002",
      "email": "newmember@example.com",
      "role": "member",
      "expiresAt": "2024-01-08T00:00:00Z",
      "inviteUrl": "https://app.taskmaster.com/invite/unique-token-here"
    }
  }
}
```

### List Members

Get all members of an organization.

**Endpoint:** `GET /organizations/{organizationId}/members`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `role`: Filter by role (admin, member)
- `search`: Search by name or email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "john.doe@example.com",
        "fullName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg",
        "role": "admin",
        "joinedAt": "2024-01-01T00:00:00Z",
        "lastActiveAt": "2024-01-10T12:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### Update Member Role

Update a member's role (admin only).

**Endpoint:** `PUT /organizations/{organizationId}/members/{profileId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** admin

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "admin",
      "updatedAt": "2024-01-10T12:00:00Z"
    }
  }
}
```

### Remove Member

Remove a member from the organization (admin only).

**Endpoint:** `DELETE /organizations/{organizationId}/members/{profileId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** admin

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Member has been removed from the organization"
  }
}
```

## Project Endpoints

### Create Project

Create a new project in an organization.

**Endpoint:** `POST /organizations/{organizationId}/projects`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Complete redesign of the company website",
  "priority": "high",
  "dueDate": "2024-06-30T23:59:59Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "850e8400-e29b-41d4-a716-446655440003",
      "organizationId": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Website Redesign",
      "description": "Complete redesign of the company website",
      "priority": "high",
      "status": "planning",
      "dueDate": "2024-06-30T23:59:59Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### List Projects

Get all projects in an organization.

**Endpoint:** `GET /organizations/{organizationId}/projects`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status`: Filter by status (planning, active, completed, cancelled)
- `priority`: Filter by priority (low, medium, high)
- `search`: Search by name or description
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "850e8400-e29b-41d4-a716-446655440003",
        "organizationId": "650e8400-e29b-41d4-a716-446655440001",
        "name": "Website Redesign",
        "description": "Complete redesign of the company website",
        "priority": "high",
        "status": "active",
        "dueDate": "2024-06-30T23:59:59Z",
        "taskCount": 15,
        "completedTaskCount": 5,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3
    }
  }
}
```

### Get Project

Get detailed information about a specific project.

**Endpoint:** `GET /projects/{projectId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "850e8400-e29b-41d4-a716-446655440003",
      "organizationId": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Website Redesign",
      "description": "Complete redesign of the company website",
      "priority": "high",
      "status": "active",
      "dueDate": "2024-06-30T23:59:59Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    },
    "statistics": {
      "taskCount": 15,
      "completedTaskCount": 5,
      "memberCount": 3,
      "progress": 33.33
    },
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "fullName": "John Doe",
        "role": "admin"
      }
    ]
  }
}
```

### Update Project

Update project information.

**Endpoint:** `PUT /projects/{projectId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Website Redesign - Phase 2",
  "description": "Updated description",
  "priority": "medium",
  "status": "active",
  "dueDate": "2024-07-15T23:59:59Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "850e8400-e29b-41d4-a716-446655440003",
      "name": "Website Redesign - Phase 2",
      "description": "Updated description",
      "priority": "medium",
      "status": "active",
      "dueDate": "2024-07-15T23:59:59Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Delete Project

Delete a project (admin only).

**Endpoint:** `DELETE /projects/{projectId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Required Role:** admin (organization or project)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Project has been deleted successfully"
  }
}
```

## Task Endpoints

### Create Task

Create a new task in a project.

**Endpoint:** `POST /projects/{projectId}/tasks`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Design homepage mockup",
  "description": "Create wireframes and high-fidelity mockups for the new homepage",
  "priority": "high",
  "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
  "dueDate": "2024-02-15T17:00:00Z",
  "estimatedHours": 8,
  "tags": ["design", "homepage", "ui"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "950e8400-e29b-41d4-a716-446655440004",
      "projectId": "850e8400-e29b-41d4-a716-446655440003",
      "title": "Design homepage mockup",
      "description": "Create wireframes and high-fidelity mockups for the new homepage",
      "status": "todo",
      "priority": "high",
      "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
      "dueDate": "2024-02-15T17:00:00Z",
      "estimatedHours": 8,
      "tags": ["design", "homepage", "ui"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### List Tasks

Get all tasks in a project.

**Endpoint:** `GET /projects/{projectId}/tasks`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status`: Filter by status (todo, in_progress, completed, cancelled)
- `priority`: Filter by priority (low, medium, high)
- `assigneeId`: Filter by assignee
- `tags`: Filter by tags (comma-separated)
- `search`: Search by title or description
- `sortBy`: Sort field (createdAt, dueDate, priority, title)
- `sortOrder`: Sort order (asc, desc)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "950e8400-e29b-41d4-a716-446655440004",
        "projectId": "850e8400-e29b-41d4-a716-446655440003",
        "title": "Design homepage mockup",
        "description": "Create wireframes and high-fidelity mockups for the new homepage",
        "status": "in_progress",
        "priority": "high",
        "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
        "assignee": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "fullName": "John Doe",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "dueDate": "2024-02-15T17:00:00Z",
        "estimatedHours": 8,
        "tags": ["design", "homepage", "ui"],
        "subtaskCount": 3,
        "completedSubtaskCount": 1,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-05T10:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15
    }
  }
}
```

### Get Task

Get detailed information about a specific task.

**Endpoint:** `GET /tasks/{taskId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "950e8400-e29b-41d4-a716-446655440004",
      "projectId": "850e8400-e29b-41d4-a716-446655440003",
      "title": "Design homepage mockup",
      "description": "Create wireframes and high-fidelity mockups for the new homepage",
      "status": "in_progress",
      "priority": "high",
      "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
      "assignee": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "fullName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "dueDate": "2024-02-15T17:00:00Z",
      "estimatedHours": 8,
      "actualHours": 3.5,
      "tags": ["design", "homepage", "ui"],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-05T10:00:00Z"
    },
    "subtasks": [
      {
        "id": "a50e8400-e29b-41d4-a716-446655440005",
        "title": "Create wireframes",
        "status": "completed",
        "completedAt": "2024-01-03T14:00:00Z"
      },
      {
        "id": "a50e8400-e29b-41d4-a716-446655440006",
        "title": "Design high-fidelity mockups",
        "status": "in_progress"
      }
    ],
    "dependencies": [
      {
        "id": "950e8400-e29b-41d4-a716-446655440003",
        "title": "Gather requirements",
        "status": "completed"
      }
    ]
  }
}
```

### Update Task

Update task information.

**Endpoint:** `PUT /tasks/{taskId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Design homepage mockup - Updated",
  "description": "Updated description",
  "status": "completed",
  "priority": "medium",
  "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
  "dueDate": "2024-02-20T17:00:00Z",
  "actualHours": 7.5,
  "tags": ["design", "homepage", "ui", "completed"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "950e8400-e29b-41d4-a716-446655440004",
      "title": "Design homepage mockup - Updated",
      "description": "Updated description",
      "status": "completed",
      "priority": "medium",
      "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
      "dueDate": "2024-02-20T17:00:00Z",
      "actualHours": 7.5,
      "tags": ["design", "homepage", "ui", "completed"],
      "completedAt": "2024-01-15T16:30:00Z",
      "updatedAt": "2024-01-15T16:30:00Z"
    }
  }
}
```

### Delete Task

Delete a task.

**Endpoint:** `DELETE /tasks/{taskId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Task has been deleted successfully"
  }
}
```

### Add Subtask

Add a subtask to a task.

**Endpoint:** `POST /tasks/{taskId}/subtasks`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Review design with stakeholders",
  "description": "Present mockups to stakeholders and gather feedback"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "subtask": {
      "id": "a50e8400-e29b-41d4-a716-446655440007",
      "taskId": "950e8400-e29b-41d4-a716-446655440004",
      "title": "Review design with stakeholders",
      "description": "Present mockups to stakeholders and gather feedback",
      "status": "todo",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Update Subtask

Update a subtask.

**Endpoint:** `PUT /subtasks/{subtaskId}`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Review design with stakeholders - Updated",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subtask": {
      "id": "a50e8400-e29b-41d4-a716-446655440007",
      "title": "Review design with stakeholders - Updated",
      "status": "completed",
      "completedAt": "2024-01-15T14:00:00Z",
      "updatedAt": "2024-01-15T14:00:00Z"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints**: 10 requests per minute per IP
- **General API endpoints**: 1000 requests per hour per user
- **Bulk operations**: 100 requests per hour per user

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@taskmaster/api-client`
- **Python**: `taskmaster-api-client`
- **Go**: `github.com/taskmaster/go-client`

### Community SDKs

- **PHP**: Available on Packagist
- **Ruby**: Available as a gem
- **Java**: Available on Maven Central

### Installation Examples

**JavaScript/Node.js:**
```bash
npm install @taskmaster/api-client
```

```javascript
import { TaskMasterClient } from '@taskmaster/api-client';

const client = new TaskMasterClient({
  baseURL: 'https://api.taskmaster.com/v1',
  accessToken: 'your-access-token'
});

// List organizations
const orgs = await client.organizations.list();
```

**Python:**
```bash
pip install taskmaster-api-client
```

```python
from taskmaster import TaskMasterClient

client = TaskMasterClient(
    base_url='https://api.taskmaster.com/v1',
    access_token='your-access-token'
)

# List organizations
orgs = client.organizations.list()
```

## Webhooks

The API supports webhooks for real-time notifications. See the [Webhook Documentation](./WEBHOOKS.md) for details.

## Support

For API support and questions:

- **Documentation**: [https://docs.taskmaster.com](https://docs.taskmaster.com)
- **Email**: api-support@taskmaster.com
- **Discord**: [https://discord.gg/taskmaster](https://discord.gg/taskmaster)
- **GitHub Issues**: [https://github.com/taskmaster/api/issues](https://github.com/taskmaster/api/issues)