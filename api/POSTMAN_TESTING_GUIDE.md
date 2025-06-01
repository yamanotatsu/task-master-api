# Task Master API - Postman Testing Guide

This guide provides comprehensive instructions for testing all Task Master API endpoints using Postman.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [API Base Configuration](#api-base-configuration)
3. [Health Check](#health-check)
4. [Task Management Endpoints](#task-management-endpoints)
5. [Task Expansion Endpoints](#task-expansion-endpoints)
6. [Subtask Management Endpoints](#subtask-management-endpoints)
7. [Dependency Management Endpoints](#dependency-management-endpoints)
8. [Project Management Endpoints](#project-management-endpoints)
9. [Analysis Endpoints](#analysis-endpoints)
10. [PRD Processing Endpoints](#prd-processing-endpoints)
11. [Error Response Patterns](#error-response-patterns)
12. [Testing Workflow Example](#testing-workflow-example)

## Environment Setup

### 1. Postman Environment Variables
Create a new environment in Postman with the following variables:

```
base_url: http://localhost:3000
api_version: v1
```

### 2. Headers Configuration
For all requests, set the following headers:

```
Content-Type: application/json
```

## API Base Configuration

Base URL: `{{base_url}}/api/{{api_version}}`

All endpoints follow the pattern: `{{base_url}}/api/{{api_version}}/[resource]`

## Health Check

### GET /health
**Purpose**: Check if the API server is running

**Request**:
```
Method: GET
URL: {{base_url}}/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-30T12:00:00.000Z"
}
```

## Task Management Endpoints

### 1. List All Tasks
**GET /api/v1/tasks**

**Request**:
```
Method: GET
URL: {{base_url}}/api/{{api_version}}/tasks
Query Parameters (optional):
  - filter: string (e.g., "pending", "completed")
  - format: string (default: "json")
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "Set up authentication system",
        "description": "Implement user authentication with JWT",
        "status": "pending",
        "priority": "high",
        "dependencies": [],
        "subtasks": [],
        "created_at": "2025-01-30T12:00:00.000Z",
        "updated_at": "2025-01-30T12:00:00.000Z"
      }
    ],
    "totalTasks": 1,
    "filteredBy": "all"
  }
}
```

### 2. Get Specific Task
**GET /api/v1/tasks/:id**

**Request**:
```
Method: GET
URL: {{base_url}}/api/{{api_version}}/tasks/1
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Set up authentication system",
      "description": "Implement user authentication with JWT",
      "status": "pending",
      "priority": "high",
      "dependencies": [],
      "subtasks": [],
      "details": "Detailed implementation notes...",
      "testStrategy": "Unit tests for auth middleware",
      "created_at": "2025-01-30T12:00:00.000Z",
      "updated_at": "2025-01-30T12:00:00.000Z"
    }
  }
}
```

**Error Response (404)**:
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID 999 not found"
  }
}
```

### 3. Create New Task
**POST /api/v1/tasks**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks
Body:
{
  "title": "Implement user registration",
  "description": "Create user registration flow with email verification",
  "priority": "high",
  "dependencies": [1],
  "details": "Use nodemailer for email sending",
  "testStrategy": "Integration tests with test email service"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 2,
      "title": "Implement user registration",
      "description": "Create user registration flow with email verification",
      "status": "pending",
      "priority": "high",
      "dependencies": [1],
      "subtasks": [],
      "details": "Use nodemailer for email sending",
      "testStrategy": "Integration tests with test email service",
      "created_at": "2025-01-30T12:00:00.000Z",
      "updated_at": "2025-01-30T12:00:00.000Z"
    },
    "message": "Task created successfully"
  }
}
```

**Error Response (400 - Missing Required Field)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input",
    "details": [
      {
        "field": "title",
        "message": "Required"
      }
    ]
  }
}
```

### 4. Update Task
**PUT /api/v1/tasks/:id**

**Request**:
```
Method: PUT
URL: {{base_url}}/api/{{api_version}}/tasks/1
Body:
{
  "title": "Set up authentication system with OAuth",
  "description": "Implement user authentication with JWT and OAuth providers",
  "priority": "high"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Set up authentication system with OAuth",
      "description": "Implement user authentication with JWT and OAuth providers",
      "status": "pending",
      "priority": "high",
      "dependencies": [],
      "subtasks": [],
      "updated_at": "2025-01-30T12:05:00.000Z"
    },
    "message": "Task updated successfully"
  }
}
```

### 5. Update Task Status
**PATCH /api/v1/tasks/:id/status**

**Request**:
```
Method: PATCH
URL: {{base_url}}/api/{{api_version}}/tasks/1/status
Body:
{
  "status": "in-progress"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Set up authentication system with OAuth",
      "status": "in-progress",
      "updated_at": "2025-01-30T12:06:00.000Z"
    },
    "message": "Task status updated successfully"
  }
}
```

**Error Response (400 - Invalid Status)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid input",
    "details": [
      {
        "field": "status",
        "message": "Invalid enum value. Expected 'pending' | 'in-progress' | 'completed' | 'blocked', received 'invalid-status'"
      }
    ]
  }
}
```

### 6. Delete Task
**DELETE /api/v1/tasks/:id**

**Request**:
```
Method: DELETE
URL: {{base_url}}/api/{{api_version}}/tasks/2
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "message": "Task removed successfully",
    "removedTask": {
      "id": 2,
      "title": "Implement user registration"
    }
  }
}
```

## Task Expansion Endpoints

### 1. Expand Single Task
**POST /api/v1/tasks/:id/expand**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/1/expand
Body:
{
  "numSubtasks": 5,
  "useResearch": false
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Set up authentication system",
      "subtasks": [
        {
          "id": "sub-1-1",
          "title": "Design authentication architecture",
          "status": "pending"
        },
        {
          "id": "sub-1-2",
          "title": "Implement JWT token generation",
          "status": "pending"
        }
      ]
    },
    "subtasksGenerated": 5,
    "message": "Task expanded successfully",
    "telemetryData": {
      "provider": "anthropic",
      "model": "claude-3-sonnet",
      "responseTime": 2345
    }
  }
}
```

### 2. Expand All Tasks
**POST /api/v1/tasks/expand-all**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/expand-all
Body:
{
  "numSubtasks": 3,
  "useResearch": false
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "tasksExpanded": 10,
    "message": "All tasks expanded successfully",
    "telemetryData": {
      "totalResponseTime": 15000,
      "averageResponseTime": 1500
    }
  }
}
```

### 3. Clear Subtasks
**DELETE /api/v1/tasks/:id/subtasks**

**Request**:
```
Method: DELETE
URL: {{base_url}}/api/{{api_version}}/tasks/1/subtasks
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Set up authentication system",
      "subtasks": []
    },
    "message": "Subtasks cleared successfully"
  }
}
```

## Subtask Management Endpoints

### 1. Add Subtask
**POST /api/v1/tasks/:id/subtasks**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/1/subtasks
Body:
{
  "title": "Create user model schema",
  "description": "Define MongoDB schema for user data",
  "assignee": "john.doe"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Set up authentication system",
      "subtasks": [
        {
          "id": "sub-1-1",
          "title": "Create user model schema",
          "description": "Define MongoDB schema for user data",
          "assignee": "john.doe",
          "status": "pending"
        }
      ]
    },
    "subtask": {
      "id": "sub-1-1",
      "title": "Create user model schema",
      "description": "Define MongoDB schema for user data",
      "assignee": "john.doe",
      "status": "pending"
    },
    "message": "Subtask added successfully"
  }
}
```

### 2. Update Subtask
**PUT /api/v1/tasks/:id/subtasks/:subtaskId**

**Request**:
```
Method: PUT
URL: {{base_url}}/api/{{api_version}}/tasks/1/subtasks/sub-1-1
Body:
{
  "title": "Create user model schema with validation",
  "status": "in-progress",
  "assignee": "jane.doe"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "subtasks": [
        {
          "id": "sub-1-1",
          "title": "Create user model schema with validation",
          "status": "in-progress",
          "assignee": "jane.doe"
        }
      ]
    },
    "subtask": {
      "id": "sub-1-1",
      "title": "Create user model schema with validation",
      "status": "in-progress",
      "assignee": "jane.doe"
    },
    "message": "Subtask updated successfully"
  }
}
```

### 3. Remove Subtask
**DELETE /api/v1/tasks/:id/subtasks/:subtaskId**

**Request**:
```
Method: DELETE
URL: {{base_url}}/api/{{api_version}}/tasks/1/subtasks/sub-1-1
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "subtasks": []
    },
    "removedSubtask": {
      "id": "sub-1-1",
      "title": "Create user model schema with validation"
    },
    "message": "Subtask removed successfully"
  }
}
```

## Dependency Management Endpoints

### 1. Add Dependency
**POST /api/v1/tasks/:id/dependencies**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/2/dependencies
Body:
{
  "dependencyId": 1
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 2,
      "title": "Implement user registration",
      "dependencies": [1]
    },
    "message": "Dependency added successfully"
  }
}
```

**Error Response (400 - Circular Dependency)**:
```json
{
  "success": false,
  "error": {
    "code": "CIRCULAR_DEPENDENCY",
    "message": "Adding this dependency would create a circular dependency"
  }
}
```

### 2. Remove Dependency
**DELETE /api/v1/tasks/:id/dependencies/:depId**

**Request**:
```
Method: DELETE
URL: {{base_url}}/api/{{api_version}}/tasks/2/dependencies/1
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 2,
      "title": "Implement user registration",
      "dependencies": []
    },
    "message": "Dependency removed successfully"
  }
}
```

### 3. Validate Dependencies
**POST /api/v1/tasks/validate-dependencies**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/validate-dependencies
Body:
{
  "autoFix": false
}
```

**Expected Response (Valid)**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "issues": [],
    "message": "All dependencies are valid"
  }
}
```

**Expected Response (Invalid with autoFix)**:
```json
{
  "success": true,
  "data": {
    "valid": false,
    "issues": [
      {
        "type": "circular",
        "taskId": 3,
        "message": "Circular dependency detected"
      }
    ],
    "fixed": true,
    "fixedIssues": [
      {
        "type": "circular",
        "taskId": 3,
        "action": "removed dependency"
      }
    ],
    "message": "Found 1 issue(s), fixed 1"
  }
}
```

### 4. Fix Dependencies
**POST /api/v1/tasks/fix-dependencies**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/fix-dependencies
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "fixedIssues": [
      {
        "type": "circular",
        "taskId": 3,
        "action": "removed dependency"
      }
    ],
    "message": "Dependencies fixed successfully"
  }
}
```

## Project Management Endpoints

### 1. Initialize Project
**POST /api/v1/projects/initialize**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/projects/initialize
Body:
{
  "projectName": "my-awesome-project",
  "projectPath": "/home/user/projects/my-awesome-project",
  "template": "web",
  "aiProvider": "anthropic",
  "includeRooFiles": true
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "projectPath": "/home/user/projects/my-awesome-project",
    "filesCreated": [
      ".gitignore",
      "README.md",
      "tasks.json",
      ".tm/config.json",
      ".roo/setup.md"
    ],
    "message": "Project initialized successfully"
  }
}
```

### 2. Generate Task Files
**POST /api/v1/projects/generate-task-files**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/projects/generate-task-files
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "filesGenerated": 10,
    "message": "Task files generated successfully"
  }
}
```

## Analysis Endpoints

### 1. Get Next Task
**GET /api/v1/tasks/next**

**Request**:
```
Method: GET
URL: {{base_url}}/api/{{api_version}}/tasks/next
```

**Expected Response (Task Found)**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 3,
      "title": "Set up database connection",
      "status": "pending",
      "priority": "high",
      "dependencies": []
    },
    "recommendation": "This task has no dependencies and is high priority",
    "reasoning": "High priority tasks with no blockers should be completed first"
  }
}
```

**Expected Response (No Tasks)**:
```json
{
  "success": true,
  "data": {
    "task": null,
    "message": "No pending tasks found"
  }
}
```

### 2. Analyze Task Complexity
**POST /api/v1/tasks/analyze-complexity**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/tasks/analyze-complexity
Body:
{
  "taskId": 1
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "taskId": 1,
    "complexity": {
      "score": 8,
      "level": "high",
      "breakdown": {
        "technical": 3,
        "dependencies": 2,
        "scope": 3
      }
    },
    "factors": {
      "hasSubtasks": true,
      "subtaskCount": 5,
      "dependencyCount": 2,
      "estimatedHours": 16
    },
    "recommendations": [
      "Consider breaking down into smaller tasks",
      "Review dependencies for potential parallelization"
    ],
    "telemetryData": {
      "analysisTime": 250
    }
  }
}
```

### 3. Get Complexity Report
**GET /api/v1/tasks/complexity-report**

**Request**:
```
Method: GET
URL: {{base_url}}/api/{{api_version}}/tasks/complexity-report
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "report": {
      "totalTasks": 25,
      "averageComplexity": 5.2,
      "complexityDistribution": {
        "low": 10,
        "medium": 12,
        "high": 3
      }
    },
    "summary": {
      "mostComplexTask": {
        "id": 15,
        "title": "Implement real-time chat system",
        "complexity": 9
      },
      "leastComplexTask": {
        "id": 3,
        "title": "Update README",
        "complexity": 1
      }
    },
    "highComplexityTasks": [
      {
        "id": 15,
        "title": "Implement real-time chat system",
        "complexity": 9
      }
    ],
    "recommendations": [
      "Focus on high-complexity tasks early in the sprint",
      "Consider pair programming for tasks with complexity > 7"
    ]
  }
}
```

## PRD Processing Endpoints

### Generate Tasks from PRD
**POST /api/v1/generate-tasks-from-prd**

**Request**:
```
Method: POST
URL: {{base_url}}/api/{{api_version}}/generate-tasks-from-prd
Body:
{
  "prd_content": "# E-commerce Platform MVP\n\n## Overview\nBuild a minimal e-commerce platform with user authentication, product catalog, shopping cart, and checkout functionality.\n\n## Requirements\n1. User registration and authentication\n2. Product listing with search and filters\n3. Shopping cart management\n4. Basic checkout process\n5. Order history for users",
  "target_task_count": 10,
  "use_research_mode": false
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "Set up project infrastructure",
        "description": "Initialize project with necessary dependencies and folder structure",
        "priority": "high",
        "dependencies": [],
        "status": "pending"
      },
      {
        "id": 2,
        "title": "Implement user authentication system",
        "description": "Create registration, login, and JWT-based authentication",
        "priority": "high",
        "dependencies": [1],
        "status": "pending"
      }
    ],
    "metadata": {
      "totalGenerated": 10,
      "processingTime": 3500
    },
    "telemetryData": {
      "provider": "anthropic",
      "model": "claude-3-sonnet",
      "tokensUsed": 2500
    }
  }
}
```

**Error Response (401 - Missing API Key)**:
```json
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "API key is required for task generation. Please set ANTHROPIC_API_KEY environment variable."
  }
}
```

## Error Response Patterns

### Common Error Codes and Status

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_INPUT | Request validation failed |
| 400 | INVALID_TASK_ID | Task ID is not a valid positive integer |
| 400 | CIRCULAR_DEPENDENCY | Operation would create circular dependency |
| 401 | MISSING_API_KEY | AI provider API key not configured |
| 404 | TASK_NOT_FOUND | Requested task does not exist |
| 404 | SUBTASK_NOT_FOUND | Requested subtask does not exist |
| 429 | RATE_LIMIT_EXCEEDED | AI provider rate limit hit |
| 500 | INTERNAL_SERVER_ERROR | Unexpected server error |

### Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Validation error message"
      }
    ]
  }
}
```

## Testing Workflow Example

Here's a recommended testing flow to validate the API functionality:

### 1. Initial Setup
1. Start with health check to ensure server is running
2. Initialize a project using `/api/v1/projects/initialize`

### 2. Task Creation Flow
1. Generate tasks from PRD using `/api/v1/generate-tasks-from-prd`
2. List all generated tasks using `/api/v1/tasks`
3. Get details of specific tasks using `/api/v1/tasks/:id`

### 3. Task Management Flow
1. Update task details using `PUT /api/v1/tasks/:id`
2. Change task status using `PATCH /api/v1/tasks/:id/status`
3. Add dependencies using `POST /api/v1/tasks/:id/dependencies`
4. Validate dependencies using `POST /api/v1/tasks/validate-dependencies`

### 4. Task Expansion Flow
1. Expand a task into subtasks using `POST /api/v1/tasks/:id/expand`
2. Add custom subtasks using `POST /api/v1/tasks/:id/subtasks`
3. Update subtask status using `PUT /api/v1/tasks/:id/subtasks/:subtaskId`

### 5. Analysis Flow
1. Get next recommended task using `GET /api/v1/tasks/next`
2. Analyze task complexity using `POST /api/v1/tasks/analyze-complexity`
3. Get overall complexity report using `GET /api/v1/tasks/complexity-report`

### 6. Cleanup Flow
1. Remove subtasks using `DELETE /api/v1/tasks/:id/subtasks/:subtaskId`
2. Clear all subtasks using `DELETE /api/v1/tasks/:id/subtasks`
3. Delete tasks using `DELETE /api/v1/tasks/:id`

## Postman Collection Organization

Organize your Postman collection with the following folder structure:

```
Task Master API
├── Environment Setup
├── Health Check
├── Task Management
│   ├── List Tasks
│   ├── Get Task
│   ├── Create Task
│   ├── Update Task
│   ├── Update Status
│   └── Delete Task
├── Task Expansion
│   ├── Expand Task
│   ├── Expand All Tasks
│   └── Clear Subtasks
├── Subtask Management
│   ├── Add Subtask
│   ├── Update Subtask
│   └── Remove Subtask
├── Dependencies
│   ├── Add Dependency
│   ├── Remove Dependency
│   ├── Validate Dependencies
│   └── Fix Dependencies
├── Projects
│   ├── Initialize Project
│   └── Generate Task Files
├── Analysis
│   ├── Get Next Task
│   ├── Analyze Complexity
│   └── Complexity Report
└── PRD Processing
    └── Generate Tasks from PRD
```

## Tips for Testing

1. **Use Variables**: Store frequently used IDs (task IDs, subtask IDs) as collection variables for easy reference
2. **Pre-request Scripts**: Use Postman's pre-request scripts to generate timestamps or random data
3. **Tests**: Add test scripts to validate response structure and store IDs for subsequent requests
4. **Request Chaining**: Use Postman's collection runner to execute workflows automatically
5. **Error Testing**: Include negative test cases to validate error handling

### Example Test Script
```javascript
// Test for successful response
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success true", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

// Store task ID for later use
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.task) {
        pm.collectionVariables.set("lastTaskId", jsonData.data.task.id);
    }
}
```

## Notes

- All timestamps are in ISO 8601 format
- Task IDs are integers
- Subtask IDs follow the pattern "sub-{taskId}-{index}"
- Default port is 3000 (configurable via API_PORT environment variable)
- Maximum request body size is 10MB
- API uses semantic versioning (currently v1)