# Claude Task Master API Reference

## Overview

The Claude Task Master API is a RESTful API that provides endpoints for managing organizations, projects, tasks, and users. All endpoints follow REST conventions and return JSON responses.

## Base URL

```
https://api.claudetaskmaster.com/api/v1
```

## Authentication

Most endpoints require authentication using Bearer tokens:

```
Authorization: Bearer <access_token>
```

Tokens are obtained through the authentication endpoints and should be included in all subsequent requests.

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "optional success message",
  "meta": {
    "pagination": { ... }  // when applicable
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ ... ]  // validation errors
  }
}
```

## API Endpoints

### Authentication (`/auth`)

#### Sign Up

- **POST** `/auth/signup`
- **Public**: Yes
- **Request**:
  ```json
  {
  	"fullName": "string",
  	"email": "string",
  	"password": "string"
  }
  ```

#### Login

- **POST** `/auth/login`
- **Public**: Yes
- **Features**: Rate limiting, brute force protection, CAPTCHA
- **Request**:
  ```json
  {
  	"email": "string",
  	"password": "string"
  }
  ```
- **Response**: Access token, refresh token, user info

#### Logout

- **POST** `/auth/logout`
- **Auth**: Required

#### Refresh Token

- **POST** `/auth/refresh`
- **Request**:
  ```json
  {
  	"refreshToken": "string"
  }
  ```

#### Forgot Password

- **POST** `/auth/forgot-password`
- **Public**: Yes
- **Features**: Rate limiting, CAPTCHA
- **Request**:
  ```json
  {
  	"email": "string"
  }
  ```

#### Reset Password

- **POST** `/auth/reset-password`
- **Public**: Yes
- **Request**:
  ```json
  {
  	"token": "string",
  	"newPassword": "string"
  }
  ```

### Organizations (`/organizations`)

#### Create Organization

- **POST** `/organizations`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"name": "string (max 100)",
  	"description": "string (optional)"
  }
  ```

#### List Organizations

- **GET** `/organizations`
- **Auth**: Required
- **Query**: `page`, `limit`, `organizationId`

#### Get Organization

- **GET** `/organizations/:organizationId`
- **Auth**: Required
- **Access**: Organization member

#### Update Organization

- **PUT** `/organizations/:organizationId`
- **Auth**: Required
- **Access**: Admin only
- **Request**:
  ```json
  {
  	"name": "string (optional)",
  	"description": "string (optional)"
  }
  ```

#### Delete Organization

- **DELETE** `/organizations/:organizationId`
- **Auth**: Required
- **Access**: Admin only
- **Restrictions**: No existing projects, must be last admin

### Organization Members

#### List Members

- **GET** `/organizations/:organizationId/members`
- **Auth**: Required
- **Access**: Organization member
- **Query**: `page`, `limit`, `role`, `search`

#### Update Member Role

- **PUT** `/organizations/:organizationId/members/:profileId`
- **Auth**: Required
- **Access**: Admin only
- **Request**:
  ```json
  {
  	"role": "admin|member"
  }
  ```

#### Remove Member

- **DELETE** `/organizations/:organizationId/members/:profileId`
- **Auth**: Required
- **Access**: Admin only

### Organization Invitations

#### Send Invitation

- **POST** `/organizations/:organizationId/invites`
- **Auth**: Required
- **Access**: Admin only
- **Request**:
  ```json
  {
  	"email": "string",
  	"role": "admin|member (default: member)"
  }
  ```

#### List Invitations

- **GET** `/organizations/:organizationId/invites`
- **Auth**: Required
- **Access**: Admin only
- **Query**: `page`, `limit`

#### Cancel Invitation

- **DELETE** `/organizations/:organizationId/invites/:inviteId`
- **Auth**: Required
- **Access**: Admin only

#### Accept Invitation

- **POST** `/organizations/:organizationId/invites/:token/accept`
- **Auth**: Optional

### Projects (`/projects`)

#### List Projects

- **GET** `/projects`
- **Auth**: Required
- **Query**: `organizationId`

#### Get Project

- **GET** `/projects/:id`
- **Auth**: Required
- **Access**: Organization member

#### Create Project

- **POST** `/projects`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"name": "string",
  	"projectPath": "string",
  	"prdContent": "string (optional)",
  	"deadline": "date (optional)",
  	"organizationId": "string"
  }
  ```

#### Update Project

- **PUT** `/projects/:id`
- **Auth**: Required
- **Access**: Project member
- **Request**:
  ```json
  {
  	"name": "string (optional)",
  	"deadline": "date (optional)",
  	"description": "string (optional)"
  }
  ```

#### Delete Project

- **DELETE** `/projects/:id`
- **Auth**: Required
- **Access**: Organization admin

#### Initialize Project

- **POST** `/projects/initialize`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"projectPath": "string",
  	"projectName": "string",
  	"organizationId": "string"
  }
  ```

### AI Dialogue

#### Start/Continue Dialogue

- **POST** `/projects/ai-dialogue`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"sessionId": "string",
  	"message": "string",
  	"mode": "string (optional)"
  }
  ```

#### Finalize PRD

- **POST** `/projects/:projectId/prd/finalize`
- **Auth**: Required
- **Access**: Project member
- **Request**:
  ```json
  {
  	"sessionId": "string"
  }
  ```

### Tasks (`/tasks`)

#### List Tasks

- **GET** `/tasks`
- **Auth**: Required
- **Query**: `projectId`, `status`, `assignee`, `organizationId`

#### Get Task

- **GET** `/tasks/:id`
- **Auth**: Required
- **Access**: Project access required

#### Create Task (Manual)

- **POST** `/tasks`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"title": "string",
  	"description": "string",
  	"projectId": "string",
  	"priority": "high|medium|low",
  	"details": "string (optional)",
  	"testStrategy": "string (optional)"
  }
  ```

#### Create Task (AI-driven)

- **POST** `/tasks`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"prompt": "string",
  	"projectId": "string",
  	"priority": "high|medium|low",
  	"dependencies": ["taskId"],
  	"assignee": "string",
  	"deadline": "date"
  }
  ```

#### Update Task

- **PUT** `/tasks/:id`
- **Auth**: Required
- **Access**: Project member
- **Request**: Similar to create

#### Update Task Status

- **PATCH** `/tasks/:id/status`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"status": "pending|in-progress|completed|done|blocked|review|deferred|cancelled|not-started"
  }
  ```

#### Delete Task

- **DELETE** `/tasks/:id`
- **Auth**: Required
- **Access**: Project member

#### Batch Update Tasks

- **POST** `/tasks/batch-update`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"taskIds": ["id1", "id2"],
  	"update": {
  		"status": "string",
  		"assignee": "string",
  		"priority": "string"
  	}
  }
  ```

### Subtasks

#### Add Subtask

- **POST** `/tasks/:id/subtasks`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"title": "string",
  	"description": "string (optional)"
  }
  ```

#### Update Subtask

- **PUT** `/tasks/:taskId/subtasks/:subtaskId`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"title": "string",
  	"description": "string",
  	"status": "string",
  	"assignee": "string"
  }
  ```

#### Delete Subtask

- **DELETE** `/tasks/:taskId/subtasks/:subtaskId`
- **Auth**: Required

#### Clear All Subtasks

- **DELETE** `/tasks/:id/subtasks`
- **Auth**: Required

### Task Dependencies

#### Add Dependency

- **POST** `/tasks/:id/dependencies`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"dependencyId": 123
  }
  ```

#### Remove Dependency

- **DELETE** `/tasks/:id/dependencies/:dependencyId`
- **Auth**: Required

#### Validate Dependencies

- **POST** `/tasks/validate-dependencies`
- **Request**:
  ```json
  {
  	"autoFix": false
  }
  ```

#### Fix Dependencies

- **POST** `/tasks/fix-dependencies`

### Task Expansion

#### Expand Task

- **POST** `/tasks/:id/expand`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"numSubtasks": 5,
  	"useResearch": false,
  	"force": false,
  	"targetSubtasks": 5
  }
  ```

#### Expand All Tasks

- **POST** `/tasks/expand-all`
- **Request**:
  ```json
  {
  	"numSubtasks": 5,
  	"useResearch": false
  }
  ```

### Task Generation

#### Generate Tasks from PRD

- **POST** `/generate-tasks-from-prd`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"prd_content": "string",
  	"target_task_count": 10,
  	"use_research_mode": false,
  	"projectId": "string"
  }
  ```

### Statistics & Analytics

#### Project Statistics

- **GET** `/projects/:id/statistics`
- **Auth**: Required

#### Gantt Chart Data

- **GET** `/projects/:id/gantt-data`
- **Auth**: Required

#### Dependency Graph

- **GET** `/projects/:id/dependency-graph`
- **Auth**: Required

#### Task Complexity Analysis

- **POST** `/tasks/analyze-complexity`
- **Request**:
  ```json
  {
  	"taskId": 123
  }
  ```

#### Complexity Report

- **GET** `/tasks/complexity-report`
- **Query**: `projectId`

#### Next Task Recommendation

- **GET** `/tasks/next`

### User Management (`/users`)

#### Get Profile

- **GET** `/users/profile`
- **Auth**: Required

#### Update Profile

- **PUT** `/users/profile`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"fullName": "string",
  	"avatarUrl": "string"
  }
  ```

#### Change Password

- **PUT** `/users/password`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"currentPassword": "string",
  	"newPassword": "string"
  }
  ```

#### List User Organizations

- **GET** `/users/organizations`
- **Auth**: Required
- **Query**: `page`, `limit`

#### Get User Activities

- **GET** `/users/activities`
- **Auth**: Required
- **Query**: `page`, `limit`

#### Delete Account

- **DELETE** `/users/account`
- **Auth**: Required
- **Request**:
  ```json
  {
  	"password": "string",
  	"confirmDeletion": true
  }
  ```

### Audit Logs (`/audit`)

#### List Audit Events

- **GET** `/audit/events/:organizationId`
- **Auth**: Required
- **Access**: Admin only
- **Query**: `start_date`, `end_date`, `event_type`, `user_id`, `risk_level`, `limit`, `offset`

#### Audit Summary

- **GET** `/audit/summary/:organizationId`
- **Auth**: Required
- **Access**: Admin only
- **Query**: `days` (default: 30)

#### Export Audit Logs

- **GET** `/audit/export/:organizationId`
- **Auth**: Required
- **Access**: Admin only
- **Query**: `start_date`, `end_date`, `format` (csv|json)

#### User Activity

- **GET** `/audit/user-activity/:organizationId/:userId`
- **Auth**: Required
- **Access**: Admin only

#### Security Alerts

- **GET** `/audit/security-alerts/:organizationId`
- **Auth**: Required
- **Access**: Admin only
- **Query**: `status`, `severity`, `limit`, `offset`

#### Mark Event Reviewed

- **POST** `/audit/mark-reviewed/:organizationId/:eventId`
- **Auth**: Required
- **Access**: Admin only
- **Request**:
  ```json
  {
  	"notes": "string (optional)"
  }
  ```

#### Real-time Events

- **GET** `/audit/real-time/events`
- **Auth**: Required
- **Access**: Admin only

#### Audit Dashboard

- **GET** `/audit/dashboard`
- **Auth**: Required
- **Access**: Admin only
- **Query**: `organizationId`

## Rate Limiting

The API implements rate limiting on sensitive endpoints:

- **Authentication endpoints**: 5 requests per minute
- **Password reset**: 3 requests per hour
- **General API**: 1000 requests per hour

## Security Features

1. **CAPTCHA Protection**: On signup, login, and password reset
2. **Brute Force Protection**: Account lockout after failed attempts
3. **CORS**: Configured for allowed origins
4. **Security Headers**: Via Helmet middleware
5. **Input Validation**: All inputs validated with Zod schemas
6. **SQL Injection Protection**: Parameterized queries
7. **XSS Protection**: Input sanitization
8. **Audit Logging**: All sensitive operations logged

## Error Codes

Common error codes returned by the API:

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Pagination

List endpoints support pagination:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes:

```json
{
	"meta": {
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 100,
			"totalPages": 5
		}
	}
}
```

## Webhooks

The API supports webhooks for real-time notifications (coming soon):

- Task status changes
- Project updates
- Organization member changes
- Security events

## SDK Support

Official SDKs are available for:

- JavaScript/TypeScript
- Python
- Go
- Ruby

## API Versioning

The API uses URL versioning. Current version: `v1`

Breaking changes will result in a new version. The current version will be maintained for at least 12 months after a new version is released.
