# IDE Extension - TaskOS Integration Guide

## Overview
This document explains how to connect the IDE Extension to TaskOS backend.

## Architecture

```
VS Code Extension
    ↓ HTTP Requests
TaskOS REST API
    ↓ Authentication
Next.js API Routes
    ↓ Database
PostgreSQL
```

## 1. Authentication Methods

### Option A: API Key (Recommended for IDE)
- User generates API key in TaskOS settings
- Extension stores key securely
- Sent as `Authorization: Bearer <api-key>` header

### Option B: OAuth Flow
- Extension opens browser for OAuth
- User authorizes
- Extension receives token
- More complex but more secure

## 2. Required API Endpoints

### Tasks Management
```
GET    /api/v1/tasks                    → List tasks
GET    /api/v1/tasks/:id                → Get task details
POST   /api/v1/tasks                    → Create task
PUT    /api/v1/tasks/:id                → Update task
DELETE /api/v1/tasks/:id                → Delete task
```

### Code Generation
```
POST   /api/v1/ai/generate-code         → Generate code from task
POST   /api/v1/ai/explain-code          → Explain existing code
```

### Workspaces
```
GET    /api/v1/workspaces               → List user workspaces
GET    /api/v1/workspaces/:id/tasks     → Get workspace tasks
```

## 3. Implementation Plan

### Step 1: Create API Key System
- Add `api_keys` table to database
- Create API key generation endpoint
- Add key management UI in settings

### Step 2: Create REST API Routes
- Create `/api/v1/` routes
- Implement authentication middleware
- Add rate limiting
- Add CORS for IDE extension

### Step 3: Code Generation Endpoint
- Extend existing AI endpoint
- Add code generation prompt
- Return formatted code

### Step 4: Extension Development
- VS Code Extension with API client
- Task panel UI
- Code generation integration

## 4. Security Considerations

- API keys should be hashed in database
- Rate limiting per API key
- CORS whitelist for IDE extensions
- Token expiration
- Revocation mechanism
