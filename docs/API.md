# TaskOS API Documentation

## Overview

The TaskOS API provides programmatic access to task management features, allowing you to integrate TaskOS with your IDE extensions, automation tools, and custom applications.

**Base URL:** `https://your-domain.com/api/v1`

**Authentication:** All API requests require authentication using API keys. API access is available for **Pro** and **Enterprise** plans.

## Authentication

All API requests must include an API key in the Authorization header:

```
Authorization: Bearer <your-api-key>
```

### Getting an API Key

1. Navigate to **Account Settings** → **Security** → **API Keys**
2. Click **Create Key**
3. Give your key a descriptive name (e.g., "VS Code Extension")
4. Optionally set an expiration date
5. **Important:** Copy the key immediately - you won't be able to see it again!

### API Key Security

- Store API keys securely and never commit them to version control
- Rotate keys regularly
- Delete unused keys
- Use different keys for different applications

## Rate Limiting

API requests are rate-limited based on your plan:

### Pro Plan
- **60 requests per minute**
- **1,000 requests per hour**
- **10,000 requests per day**

### Enterprise Plan
- **120 requests per minute**
- **5,000 requests per hour**
- **50,000 requests per day**

When rate limits are exceeded, you'll receive a `429 Too Many Requests` response with the following headers:

- `X-RateLimit-Limit-*`: The limit for the time window
- `X-RateLimit-Remaining-*`: Remaining requests in the time window
- `Retry-After`: Seconds to wait before retrying

## Request Limits

- **Maximum request body size:** 1MB
- **Content-Type:** `application/json`

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE" // Optional
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (feature not available for your plan)
- `404` - Not Found
- `413` - Request too large
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable

## Endpoints

### Tasks

#### List Tasks

```http
GET /api/v1/tasks?workspaceId={workspaceId}&status={status}&priority={priority}&assigneeId={assigneeId}&limit={limit}&offset={offset}
```

**Query Parameters:**
- `workspaceId` (required) - UUID of the workspace
- `status` (optional) - Filter by status: `backlog`, `todo`, `in_progress`, `review`, `done`
- `priority` (optional) - Filter by priority: `low`, `medium`, `high`, `urgent`
- `assigneeId` (optional) - Filter by assignee UUID
- `limit` (optional) - Number of results (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "title": "Task title",
      "description": "Task description",
      "status": "todo",
      "priority": "medium",
      "dueDate": "2024-01-01T00:00:00Z",
      "startDate": "2024-01-01T00:00:00Z",
      "workspaceId": "uuid",
      "projectId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "assignees": [
        {
          "id": "uuid",
          "name": "User Name",
          "email": "user@example.com",
          "image": "https://..."
        }
      ],
      "tags": [
        {
          "id": "uuid",
          "name": "Tag Name",
          "color": "#FF0000"
        }
      ],
      "createdBy": {
        "id": "uuid",
        "name": "Creator Name",
        "email": "creator@example.com",
        "image": "https://..."
      }
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

#### Get Task Details

```http
GET /api/v1/tasks/{taskId}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "uuid",
    "title": "Task title",
    "description": "Task description",
    "status": "todo",
    "priority": "medium",
    "dueDate": "2024-01-01T00:00:00Z",
    "startDate": "2024-01-01T00:00:00Z",
    "workspaceId": "uuid",
    "projectId": "uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "assignees": [...],
    "tags": [...],
    "createdBy": {...},
    "comments": [
      {
        "id": "uuid",
        "content": "Comment text",
        "createdAt": "2024-01-01T00:00:00Z",
        "user": {
          "id": "uuid",
          "name": "User Name",
          "email": "user@example.com",
          "image": "https://..."
        }
      }
    ]
  }
}
```

#### Create Task

```http
POST /api/v1/tasks
```

**Request Body:**
```json
{
  "workspaceId": "uuid",
  "projectId": "uuid", // optional
  "title": "Task title",
  "description": "Task description", // optional
  "status": "todo", // optional, default: "todo"
  "priority": "low", // optional, default: "low"
  "dueDate": "2024-01-01T00:00:00Z", // optional, ISO 8601
  "startDate": "2024-01-01T00:00:00Z", // optional, ISO 8601
  "assigneeIds": ["uuid1", "uuid2"], // optional
  "tagIds": ["uuid1", "uuid2"] // optional
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "task": {
    // Full task object (same as Get Task Details)
  }
}
```

#### Update Task

```http
PUT /api/v1/tasks/{taskId}
```

**Request Body:** (all fields optional)
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "dueDate": "2024-01-01T00:00:00Z",
  "startDate": "2024-01-01T00:00:00Z",
  "assigneeIds": ["uuid1", "uuid2"],
  "tagIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    // Updated task object
  }
}
```

#### Delete Task

```http
DELETE /api/v1/tasks/{taskId}
```

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

### AI Code Generation

#### Generate Code

```http
POST /api/v1/ai/generate-code
```

**Request Body:**
```json
{
  "taskDescription": "Create a function that calculates the factorial of a number",
  "taskId": "uuid", // optional - provides context from existing task
  "language": "typescript", // optional - preferred language
  "context": {
    "workspaceName": "My Workspace", // optional
    "projectName": "My Project", // optional
    "filePath": "src/utils/math.ts", // optional
    "existingCode": "// existing code..." // optional
  }
}
```

**Response:**
```json
{
  "success": true,
  "code": "function factorial(n: number): number { ... }",
  "language": "typescript",
  "explanation": "This function calculates the factorial...",
  "dependencies": ["@types/node"],
  "files": [
    {
      "path": "src/utils/math.ts",
      "content": "function factorial(n: number): number { ... }"
    }
  ]
}
```

**Note:** AI Code Generation requires a **Pro** or **Enterprise** plan.

## Examples

### cURL

```bash
# List tasks
curl -X GET "https://your-domain.com/api/v1/tasks?workspaceId=uuid" \
  -H "Authorization: Bearer your-api-key"

# Create task
curl -X POST "https://your-domain.com/api/v1/tasks" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "uuid",
    "title": "New Task",
    "description": "Task description",
    "priority": "high"
  }'

# Generate code
curl -X POST "https://your-domain.com/api/v1/ai/generate-code" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "taskDescription": "Create a function to validate email addresses"
  }'
```

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://your-domain.com/api/v1';
const API_KEY = 'your-api-key';

async function listTasks(workspaceId: string) {
  const response = await fetch(
    `${API_BASE}/tasks?workspaceId=${workspaceId}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

async function createTask(task: {
  workspaceId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}) {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

async function generateCode(taskDescription: string) {
  const response = await fetch(`${API_BASE}/ai/generate-code`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taskDescription }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Python

```python
import requests

API_BASE = 'https://your-domain.com/api/v1'
API_KEY = 'your-api-key'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

# List tasks
response = requests.get(
    f'{API_BASE}/tasks',
    params={'workspaceId': 'uuid'},
    headers=headers
)
tasks = response.json()

# Create task
task_data = {
    'workspaceId': 'uuid',
    'title': 'New Task',
    'description': 'Task description',
    'priority': 'high',
}
response = requests.post(
    f'{API_BASE}/tasks',
    json=task_data,
    headers=headers
)
task = response.json()

# Generate code
code_data = {
    'taskDescription': 'Create a function to validate email addresses',
}
response = requests.post(
    f'{API_BASE}/ai/generate-code',
    json=code_data,
    headers=headers
)
code = response.json()
```

## Best Practices

1. **Handle Rate Limits:** Implement exponential backoff when receiving `429` responses
2. **Error Handling:** Always check response status codes and handle errors gracefully
3. **Pagination:** Use `limit` and `offset` for large result sets
4. **Caching:** Cache task lists and details when appropriate
5. **Request Size:** Keep request bodies under 1MB
6. **Security:** Never expose API keys in client-side code

## Support

For API support, please contact support@taskos.com or visit our [documentation site](https://docs.taskos.com).
