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

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

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