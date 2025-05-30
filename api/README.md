# Task Master REST API

A comprehensive REST API for Task Master, providing programmatic access to all task management features including AI-powered PRD analysis, task CRUD operations, dependency management, and more.

## Getting Started

### 1. Set up environment variables

Create a `.env` file in the project root with at least one API key:

```bash
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
XAI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

### 2. Start the API server

```bash
# Using npm scripts
npm run api

# Or with development mode (auto-reload)
npm run api:dev

# Or directly
node api/index.js
```

The server will start on port 3000 by default (or the port specified in `API_PORT` environment variable).

## API Endpoints

### Health Check

**Endpoint:** `GET /health`

Check if the API server is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Generate Tasks from PRD

**Endpoint:** `POST /api/v1/generate-tasks-from-prd`

**Request Body:**
```json
{
  "prd_content": "Your full PRD text here...",
  "target_task_count": 15,        // Optional, default: 10
  "use_research_mode": false      // Optional, default: false
}
```

**Parameters:**
- `prd_content` (string, required): The full text of your Product Requirements Document
- `target_task_count` (number, optional): Number of tasks to generate (1-100, default: 10)
- `use_research_mode` (boolean, optional): Whether to use research mode for enhanced analysis

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "Initialize project structure",
        "description": "Set up the basic project structure with necessary folders and configuration files",
        "status": "pending",
        "dependencies": [],
        "priority": "high",
        "details": "Create src/, tests/, docs/ directories. Initialize package.json, .gitignore, README.md...",
        "testStrategy": "Verify all directories exist and configuration files are properly formatted",
        "subtasks": []
      }
    ],
    "metadata": {
      "projectName": "My Project",
      "totalTasks": 15,
      "sourceLength": 12345,
      "generatedAt": "2024-01-20T10:30:00.000Z"
    },
    "telemetryData": {
      "timestamp": "2024-01-20T10:30:00.000Z",
      "userId": "api-user",
      "commandName": "api_generate_tasks_from_prd",
      "modelUsed": "claude-3-5-sonnet-20241022",
      "providerName": "anthropic",
      "inputTokens": 1500,
      "outputTokens": 2000,
      "totalTokens": 3500,
      "totalCost": 0.0525,
      "currency": "USD",
      "processingTime": 5432
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid request body",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "string",
        "inclusive": true,
        "exact": false,
        "message": "PRD content is required",
        "path": ["prd_content"]
      }
    ]
  }
}
```

**Error Codes:**
- `INVALID_INPUT` (400): Invalid request body or parameters
- `PRD_PARSE_ERROR` (400): Error parsing the PRD content
- `MISSING_API_KEY` (401): No valid API keys configured
- `RATE_LIMIT_EXCEEDED` (429): API rate limit exceeded
- `TASK_GENERATION_ERROR` (500): General error during task generation
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

### Task Management

#### List All Tasks

**Endpoint:** `GET /api/v1/tasks`

Get a list of all tasks in the project.

**Query Parameters:**
- `filter` (optional): Filter tasks by status. Values: `all`, `pending`, `in-progress`, `completed`, `blocked`
- `withSubtasks` (optional): Include subtasks in response. Default: `false`

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "Setup project infrastructure",
        "description": "Initialize the project with necessary dependencies",
        "status": "pending",
        "priority": "high",
        "dependencies": [],
        "subtasks": []
      }
    ],
    "totalTasks": 1,
    "filteredBy": "all"
  }
}
```

#### Get Task by ID

**Endpoint:** `GET /api/v1/tasks/:id`

Get details of a specific task by its ID.

**Path Parameters:**
- `id`: Task ID (number)

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Setup project infrastructure",
      "description": "Initialize the project with necessary dependencies",
      "details": "Create project structure, install dependencies, setup build tools",
      "testStrategy": "Verify all dependencies are installed correctly",
      "status": "pending",
      "priority": "high",
      "dependencies": [],
      "subtasks": []
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID 999 not found"
  }
}
```

#### Create Task

**Endpoint:** `POST /api/v1/tasks`

Create a new task manually (without AI).

**Request Body:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "priority": "high",
  "details": "Implement login, logout, and token refresh endpoints",
  "testStrategy": "Unit tests for auth logic and integration tests for endpoints",
  "dependencies": []
}
```

**Required Fields:**
- `title` (string): Task title

**Optional Fields:**
- `description` (string): Brief description
- `priority` (string): `high`, `medium`, or `low`. Default: `medium`
- `details` (string): Detailed implementation notes
- `testStrategy` (string): How to test this task
- `dependencies` (array): Array of task IDs this task depends on

**Response (201):**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 2,
      "title": "Implement user authentication",
      "status": "pending"
    },
    "message": "Task #2 created successfully"
  }
}
```

#### Update Task

**Endpoint:** `PUT /api/v1/tasks/:id`

Update an existing task's properties.

**Path Parameters:**
- `id`: Task ID to update

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "priority": "medium",
  "details": "Updated details",
  "testStrategy": "Updated test strategy"
}
```

All fields are optional - only include fields you want to update.

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Updated task title",
      "description": "Updated description",
      "priority": "medium"
    },
    "message": "Task #1 updated successfully"
  }
}
```

#### Delete Task

**Endpoint:** `DELETE /api/v1/tasks/:id`

Delete a task and all its subtasks.

**Path Parameters:**
- `id`: Task ID to delete

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Task #1 deleted successfully"
  }
}
```

#### Update Task Status

**Endpoint:** `PATCH /api/v1/tasks/:id/status`

Update only the status of a task.

**Path Parameters:**
- `id`: Task ID

**Request Body:**
```json
{
  "status": "in-progress"
}
```

**Valid Status Values:**
- `pending`
- `in-progress`
- `completed`
- `blocked`

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "status": "in-progress"
    },
    "message": "Task #1 status updated to in-progress"
  }
}
```

### Subtask Management

#### Add Subtask

**Endpoint:** `POST /api/v1/tasks/:id/subtasks`

Add a new subtask to an existing task.

**Path Parameters:**
- `id`: Parent task ID

**Request Body:**
```json
{
  "title": "Create database schema",
  "description": "Design and implement the database tables"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "subtask": {
      "id": 1,
      "title": "Create database schema",
      "description": "Design and implement the database tables",
      "parentTaskId": 1,
      "status": "pending"
    },
    "message": "Subtask added successfully"
  }
}
```

#### Update Subtask

**Endpoint:** `PUT /api/v1/tasks/:id/subtasks/:subtaskId`

Update an existing subtask.

**Path Parameters:**
- `id`: Parent task ID
- `subtaskId`: Subtask ID to update

**Request Body:**
```json
{
  "title": "Updated subtask title",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Subtask updated successfully"
  }
}
```

#### Delete Subtask

**Endpoint:** `DELETE /api/v1/tasks/:id/subtasks/:subtaskId`

Remove a specific subtask.

**Path Parameters:**
- `id`: Parent task ID
- `subtaskId`: Subtask ID to delete

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Subtask removed successfully"
  }
}
```

#### Clear All Subtasks

**Endpoint:** `DELETE /api/v1/tasks/:id/subtasks`

Remove all subtasks from a task.

**Path Parameters:**
- `id`: Parent task ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "All subtasks cleared successfully",
    "clearedCount": 3
  }
}
```

### Task Expansion

#### Expand Task

**Endpoint:** `POST /api/v1/tasks/:id/expand`

Use AI to automatically generate subtasks for a task.

**Path Parameters:**
- `id`: Task ID to expand

**Request Body:**
```json
{
  "numSubtasks": 5,
  "useResearch": false
}
```

**Parameters:**
- `numSubtasks` (optional): Number of subtasks to generate. Default: 5
- `useResearch` (optional): Use research mode for more detailed analysis. Default: false

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "title": "Setup project infrastructure",
      "subtasks": [
        {
          "id": 1,
          "title": "Initialize package.json",
          "description": "Create package.json with project metadata"
        },
        {
          "id": 2,
          "title": "Setup build tools",
          "description": "Configure webpack/vite for bundling"
        }
      ]
    },
    "message": "Task expanded with 5 subtasks"
  }
}
```

#### Expand All Tasks

**Endpoint:** `POST /api/v1/tasks/expand-all`

Expand all pending tasks that don't have subtasks yet.

**Request Body:**
```json
{
  "numSubtasks": 3,
  "useResearch": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expandedTasks": 5,
    "totalSubtasksCreated": 15,
    "message": "Expanded 5 tasks"
  }
}
```

### Dependency Management

#### Add Dependency

**Endpoint:** `POST /api/v1/tasks/:id/dependencies`

Add a dependency to a task.

**Path Parameters:**
- `id`: Task ID that will have the dependency

**Request Body:**
```json
{
  "dependencyId": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Dependency added: Task 5 now depends on Task 3"
  }
}
```

**Error Response (Circular Dependency):**
```json
{
  "success": false,
  "error": {
    "code": "CIRCULAR_DEPENDENCY",
    "message": "Cannot add dependency: would create circular dependency"
  }
}
```

#### Remove Dependency

**Endpoint:** `DELETE /api/v1/tasks/:id/dependencies/:depId`

Remove a dependency from a task.

**Path Parameters:**
- `id`: Task ID
- `depId`: Dependency task ID to remove

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Dependency removed successfully"
  }
}
```

#### Validate Dependencies

**Endpoint:** `POST /api/v1/tasks/validate-dependencies`

Check all tasks for dependency issues.

**Request Body:**
```json
{
  "autoFix": false
}
```

**Parameters:**
- `autoFix` (optional): Automatically fix issues if possible. Default: false

**Response:**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "taskId": 5,
        "type": "missing_dependency",
        "message": "Task 5 depends on non-existent task 99"
      }
    ],
    "fixed": 0
  }
}
```

#### Fix Dependencies

**Endpoint:** `POST /api/v1/tasks/fix-dependencies`

Automatically fix all dependency issues.

**Response:**
```json
{
  "success": true,
  "data": {
    "issuesFixed": 3,
    "message": "Fixed 3 dependency issues"
  }
}
```

### Task Analysis

#### Get Next Task

**Endpoint:** `GET /api/v1/tasks/next`

Get the next recommended task to work on based on dependencies and priority.

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 3,
      "title": "Setup database connection",
      "priority": "high",
      "dependencies": []
    },
    "recommendation": "This task has no dependencies and high priority",
    "reasoning": "High priority tasks with no blockers should be completed first"
  }
}
```

**Response (No tasks available):**
```json
{
  "success": true,
  "data": {
    "task": null,
    "message": "No pending tasks found",
    "recommendation": "All tasks are either completed or blocked"
  }
}
```

#### Analyze Task Complexity

**Endpoint:** `POST /api/v1/tasks/analyze-complexity`

Use AI to analyze the complexity of a specific task.

**Request Body:**
```json
{
  "taskId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": 1,
    "complexity": {
      "score": 8,
      "level": "high",
      "factors": [
        "Requires integration with multiple systems",
        "Complex business logic",
        "High security requirements"
      ]
    },
    "recommendations": [
      "Break down into smaller subtasks",
      "Allocate extra time for testing",
      "Consider pair programming"
    ],
    "estimatedHours": 16
  }
}
```

#### Get Complexity Report

**Endpoint:** `GET /api/v1/tasks/complexity-report`

Get a complexity analysis report for all tasks.

**Response:**
```json
{
  "success": true,
  "data": {
    "report": {
      "totalTasks": 15,
      "analyzedTasks": 10,
      "complexityDistribution": {
        "low": 3,
        "medium": 5,
        "high": 2
      }
    },
    "summary": {
      "averageComplexity": 5.5,
      "totalEstimatedHours": 120
    },
    "highComplexityTasks": [
      {
        "id": 1,
        "title": "Implement authentication system",
        "complexity": 9
      }
    ],
    "recommendations": [
      "Focus on high complexity tasks first",
      "Consider breaking down tasks with complexity > 7"
    ]
  }
}
```

### Project Management

#### Initialize Project

**Endpoint:** `POST /api/v1/projects/initialize`

Initialize a new Task Master project.

**Request Body:**
```json
{
  "projectName": "my-awesome-project",
  "projectPath": "/path/to/project",
  "template": "web",
  "aiProvider": "anthropic",
  "includeRooFiles": true
}
```

**Parameters:**
- `projectName` (required): Name of the project
- `projectPath` (optional): Where to create the project. Default: current directory
- `template` (optional): Project template. Values: `basic`, `web`, `api`, `mobile`, `ml`. Default: `basic`
- `aiProvider` (optional): Preferred AI provider. Values: `anthropic`, `openai`, `google`, `perplexity`
- `includeRooFiles` (optional): Include Roo code assistance files. Default: false

**Response (201):**
```json
{
  "success": true,
  "data": {
    "projectPath": "/path/to/project",
    "filesCreated": [
      "tasks.json",
      ".taskmaster/config.json",
      "README.md"
    ],
    "message": "Project initialized successfully"
  }
}
```

#### Generate Task Files

**Endpoint:** `POST /api/v1/projects/generate-task-files`

Generate individual markdown files for each task.

**Request Body:**
```json
{
  "outputDir": "tasks"
}
```

**Parameters:**
- `outputDir` (optional): Directory to output task files. Default: "tasks"

**Response:**
```json
{
  "success": true,
  "data": {
    "filesGenerated": 15,
    "outputDirectory": "tasks",
    "files": [
      "task_001.md",
      "task_002.md",
      "task_003.md"
    ],
    "message": "Generated 15 task files"
  }
}
```

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional information
  }
}
```

### Common Error Codes

- `INVALID_INPUT` (400): Invalid request parameters or body
- `TASK_NOT_FOUND` (404): Requested task does not exist
- `CIRCULAR_DEPENDENCY` (400): Operation would create circular dependency
- `MISSING_API_KEY` (401): No valid API keys configured
- `PRD_PARSE_ERROR` (400): Error parsing PRD content
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

## Complete API Summary

### Core Endpoints
- `GET /health` - Health check
- `POST /api/v1/generate-tasks-from-prd` - Generate tasks from PRD using AI

### Task Management
- `GET /api/v1/tasks` - List all tasks
- `GET /api/v1/tasks/:id` - Get specific task
- `POST /api/v1/tasks` - Create new task
- `PUT /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task
- `PATCH /api/v1/tasks/:id/status` - Update task status

### Subtask Management
- `POST /api/v1/tasks/:id/subtasks` - Add subtask
- `PUT /api/v1/tasks/:id/subtasks/:subtaskId` - Update subtask
- `DELETE /api/v1/tasks/:id/subtasks/:subtaskId` - Delete subtask
- `DELETE /api/v1/tasks/:id/subtasks` - Clear all subtasks

### Task Expansion (AI-powered)
- `POST /api/v1/tasks/:id/expand` - Expand single task with AI
- `POST /api/v1/tasks/expand-all` - Expand all eligible tasks

### Dependency Management
- `POST /api/v1/tasks/:id/dependencies` - Add dependency
- `DELETE /api/v1/tasks/:id/dependencies/:depId` - Remove dependency
- `POST /api/v1/tasks/validate-dependencies` - Validate all dependencies
- `POST /api/v1/tasks/fix-dependencies` - Auto-fix dependency issues

### Task Analysis
- `GET /api/v1/tasks/next` - Get next recommended task
- `POST /api/v1/tasks/analyze-complexity` - Analyze task complexity with AI
- `GET /api/v1/tasks/complexity-report` - Get complexity report

### Project Management
- `POST /api/v1/projects/initialize` - Initialize new project
- `POST /api/v1/projects/generate-task-files` - Generate task markdown files

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:3000/api/v1/generate-tasks-from-prd \
  -H "Content-Type: application/json" \
  -d '{
    "prd_content": "# My Project\n\nA web application for task management...",
    "target_task_count": 10,
    "use_research_mode": true
  }'
```

### Using JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3000/api/v1/generate-tasks-from-prd', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prd_content: '# My Project\n\nA web application for task management...',
    target_task_count: 10,
    use_research_mode: true
  })
});

const result = await response.json();
console.log(result);
```

### Using Python

```python
import requests

url = 'http://localhost:3000/api/v1/generate-tasks-from-prd'
data = {
    'prd_content': '# My Project\n\nA web application for task management...',
    'target_task_count': 10,
    'use_research_mode': True
}

response = requests.post(url, json=data)
result = response.json()
print(result)
```

## Configuration

### Environment Variables

- `API_PORT`: Port for the API server (default: 3000)
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude models
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_API_KEY`: Google API key for Gemini models
- `PERPLEXITY_API_KEY`: Perplexity API key (recommended for research mode)
- `XAI_API_KEY`: xAI API key
- `OPENROUTER_API_KEY`: OpenRouter API key
- `MISTRAL_API_KEY`: Mistral API key
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key
- `OLLAMA_API_KEY`: Ollama API key

### Model Configuration

The API uses the same model configuration as the Task Master CLI. You can configure which models to use for main, research, and fallback operations through the Task Master configuration system.

## Rate Limits

Rate limits depend on your API provider. The API will return a 429 status code if you exceed your provider's rate limits.

## Security Considerations

1. **API Keys**: Never expose your API keys in client-side code
2. **Request Size**: Maximum request body size is 10MB
3. **CORS**: The API uses CORS to allow cross-origin requests
4. **Helmet**: Security headers are applied via Helmet.js

## Troubleshooting

### No API keys found
Ensure you have set at least one API key in your environment variables or `.env` file.

### PRD parse errors
Make sure your PRD content is well-formatted text. The API expects a clear project description with requirements.

### Rate limit errors
If you encounter rate limits, consider:
- Using a different API provider
- Implementing request throttling in your client
- Upgrading your API plan