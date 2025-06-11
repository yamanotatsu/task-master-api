# Claude Task Master Database Schema

## Overview

The Claude Task Master database uses PostgreSQL with Supabase as the backend. The schema is designed to support multi-tenant organization management, project tracking, task management with dependencies, and comprehensive audit logging.

## Core Tables

### 1. Organizations

- **Table**: `organizations`
- **Purpose**: Multi-tenant organization management
- **Key Fields**:
  - `id` (UUID, PK): Unique identifier
  - `name` (VARCHAR, NOT NULL): Organization name
  - `slug` (VARCHAR, UNIQUE, NOT NULL): URL-friendly identifier
  - `description` (TEXT): Organization description
  - `settings` (JSONB): Organization-specific settings
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 2. Profiles

- **Table**: `profiles`
- **Purpose**: User profile information (extends Supabase auth.users)
- **Key Fields**:
  - `id` (UUID, PK, FK → auth.users): Links to Supabase auth
  - `email` (VARCHAR, NOT NULL): User email
  - `full_name` (VARCHAR): User's full name
  - `avatar_url` (TEXT): Profile picture URL
  - `preferences` (JSONB): User preferences
  - `last_sign_in_at` (TIMESTAMPTZ): Last login timestamp
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 3. Organization Members

- **Table**: `organization_members`
- **Purpose**: Links users to organizations with roles
- **Key Fields**:
  - `id` (UUID, PK): Unique identifier
  - `organization_id` (UUID, FK → organizations): Organization reference
  - `user_id` (UUID, FK → profiles): User reference
  - `role` (VARCHAR): 'admin' or 'member'
  - `status` (VARCHAR): 'active', 'inactive', etc.
  - `invited_by` (UUID, FK → profiles): Who invited this member
  - `joined_at` (TIMESTAMPTZ): When they joined
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps
- **Constraints**: UNIQUE(organization_id, user_id)

### 4. Invitations

- **Table**: `invitations`
- **Purpose**: Pending organization invitations
- **Key Fields**:
  - `id` (UUID, PK): Unique identifier
  - `organization_id` (UUID, FK → organizations): Target organization
  - `email` (VARCHAR, NOT NULL): Invitee's email
  - `role` (VARCHAR): Invited role (default: 'member')
  - `token` (VARCHAR, UNIQUE): Invitation token
  - `invited_by` (UUID, FK → profiles): Inviter
  - `expires_at` (TIMESTAMPTZ): Expiration time
  - `accepted_at` (TIMESTAMPTZ): When accepted (if applicable)
  - `created_at` (TIMESTAMPTZ): Creation timestamp

### 5. Projects

- **Table**: `projects`
- **Purpose**: Project management within organizations
- **Key Fields**:
  - `id` (UUID, PK): Unique identifier
  - `name` (VARCHAR, NOT NULL): Project name
  - `project_path` (TEXT, NOT NULL): File system path
  - `description` (TEXT): Project description
  - `prd_content` (TEXT): Product Requirements Document
  - `deadline` (TIMESTAMPTZ): Project deadline
  - `status` (VARCHAR): 'active', 'completed', etc.
  - `organization_id` (UUID, FK → organizations): Owner organization
  - `created_by` (UUID, FK → profiles): Creator
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 6. Tasks

- **Table**: `tasks`
- **Purpose**: Individual tasks within projects
- **Key Fields**:
  - `id` (INTEGER, PK): Sequential identifier
  - `project_id` (UUID, FK → projects): Parent project
  - `title` (VARCHAR, NOT NULL): Task title
  - `description` (TEXT): Task description
  - `details` (TEXT): Detailed requirements
  - `test_strategy` (TEXT): Testing approach
  - `priority` (VARCHAR): 'high', 'medium', 'low'
  - `status` (VARCHAR): Task status
  - `assignee_id` (UUID, FK → members): Assigned member
  - `deadline` (TIMESTAMPTZ): Task deadline
  - `organization_id` (UUID, FK → organizations): Organization
  - `created_by` (UUID, FK → profiles): Creator
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 7. Subtasks

- **Table**: `subtasks`
- **Purpose**: Breakdown of tasks into smaller units
- **Key Fields**:
  - `id` (INTEGER, PK): Sequential identifier
  - `task_id` (INTEGER, FK → tasks): Parent task
  - `title` (VARCHAR, NOT NULL): Subtask title
  - `description` (TEXT): Subtask description
  - `status` (VARCHAR): 'pending', 'in-progress', 'completed'
  - `assignee_id` (UUID, FK → members): Assigned member
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 8. Task Dependencies

- **Table**: `task_dependencies`
- **Purpose**: Define task relationships and dependencies
- **Key Fields**:
  - `task_id` (INTEGER, FK → tasks): Dependent task
  - `depends_on_task_id` (INTEGER, FK → tasks): Prerequisite task
  - `created_at` (TIMESTAMPTZ): Creation timestamp
- **Constraints**: PRIMARY KEY(task_id, depends_on_task_id)

### 9. Members (Legacy)

- **Table**: `members`
- **Purpose**: Legacy member management (being phased out)
- **Key Fields**:
  - `id` (UUID, PK): Unique identifier
  - `name` (VARCHAR, NOT NULL): Member name
  - `email` (VARCHAR, UNIQUE, NOT NULL): Member email
  - `avatar_url` (TEXT): Profile picture
  - `role` (VARCHAR, NOT NULL): Member role
  - `status` (VARCHAR): 'active', etc.
  - `organization_id` (UUID, FK → organizations): Organization
  - `user_id` (UUID, FK → profiles): User profile link
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 10. Project Members

- **Table**: `project_members`
- **Purpose**: Links members to projects
- **Key Fields**:
  - `project_id` (UUID, FK → projects): Project reference
  - `member_id` (UUID, FK → members): Member reference
  - `assigned_at` (TIMESTAMPTZ): Assignment timestamp
- **Constraints**: PRIMARY KEY(project_id, member_id)

## AI/Dialogue Tables

### 11. AI Dialogue Sessions

- **Table**: `ai_dialogue_sessions`
- **Purpose**: Track AI-assisted PRD generation sessions
- **Key Fields**:
  - `id` (UUID, PK): Session identifier
  - `project_id` (UUID, FK → projects): Associated project
  - `session_data` (JSONB): Session metadata
  - `prd_quality_score` (INTEGER): Quality rating
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 12. AI Dialogue Messages

- **Table**: `ai_dialogue_messages`
- **Purpose**: Store conversation history
- **Key Fields**:
  - `id` (UUID, PK): Message identifier
  - `session_id` (UUID, FK → ai_dialogue_sessions): Parent session
  - `role` (VARCHAR): 'user' or 'assistant'
  - `content` (TEXT, NOT NULL): Message content
  - `created_at` (TIMESTAMPTZ): Creation timestamp

## Security & Audit Tables

### 13. Audit Logs

- **Table**: `audit_logs`
- **Purpose**: Comprehensive activity logging
- **Key Fields**:
  - `id` (UUID, PK): Log entry identifier
  - `organization_id` (UUID, FK → organizations): Organization context
  - `user_id` (UUID, FK → profiles): Acting user
  - `action` (VARCHAR, NOT NULL): Action performed
  - `resource_type` (VARCHAR, NOT NULL): Type of resource
  - `resource_id` (VARCHAR): Specific resource ID
  - `details` (JSONB): Additional context
  - `ip_address` (INET): Client IP
  - `user_agent` (TEXT): Client user agent
  - `created_at` (TIMESTAMPTZ): Event timestamp

### 14. Security Events

- **Table**: `security_events`
- **Purpose**: Security-specific event tracking
- **Key Fields**:
  - `id` (UUID, PK): Event identifier
  - `user_id` (UUID, FK → profiles): Associated user
  - `event_type` (VARCHAR, NOT NULL): Type of security event
  - `severity` (VARCHAR, NOT NULL): Event severity level
  - `ip_address` (INET): Source IP
  - `user_agent` (TEXT): Client information
  - `details` (JSONB): Event details
  - `created_at` (TIMESTAMPTZ): Event timestamp

### 15. Failed Login Attempts

- **Table**: `failed_login_attempts`
- **Purpose**: Track failed authentication for security
- **Key Fields**:
  - `id` (UUID, PK): Attempt identifier
  - `email` (VARCHAR, NOT NULL): Attempted email
  - `ip_address` (INET, NOT NULL): Source IP
  - `user_agent` (TEXT): Client information
  - `attempt_count` (INTEGER): Number of attempts
  - `blocked_until` (TIMESTAMPTZ): Account lockout time
  - `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

## Key Relationships

1. **Organization Hierarchy**:

   - Organizations → Organization Members → Profiles
   - Organizations → Projects → Tasks → Subtasks
   - Organizations → Invitations

2. **User Relationships**:

   - Profiles ← Organization Members → Organizations
   - Profiles → Created Projects
   - Profiles → Created Tasks
   - Profiles → Audit Logs

3. **Task Management**:

   - Projects → Tasks → Subtasks
   - Tasks ← Task Dependencies → Tasks
   - Tasks/Subtasks → Members (assignees)

4. **Security & Audit**:
   - All major operations → Audit Logs
   - Security events → Security Events table
   - Failed logins → Failed Login Attempts

## Database Features

### Row Level Security (RLS)

- Implemented on all tables
- Users can only access data from their organizations
- Admins have elevated privileges within their organizations

### Triggers & Functions

- Automatic timestamp updates
- Cascade deletes for related records
- Audit log generation for sensitive operations
- Organization slug generation

### Indexes

- Primary keys on all tables
- Foreign key indexes for performance
- Unique constraints on email fields
- Composite indexes for common query patterns

## Migration Notes

- The system is transitioning from the legacy `members` table to `organization_members`
- Profile data is synchronized with Supabase auth.users
- All new features should use the organization-based multi-tenant model
