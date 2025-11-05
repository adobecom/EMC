# API Integration Guide

## Overview

This guide explains how the frontend and backend connect, the API contract, and how to implement new API endpoints.

## Architecture

```
┌─────────────────┐
│  React Frontend │
│   (web-src/)    │
└────────┬────────┘
         │
         │ HTTP/JSON
         │
┌────────▼────────┐
│  API Service    │
│  (services/     │
│   api.ts)       │
└────────┬────────┘
         │
         │ actionWebInvoke()
         │
┌────────▼────────┐
│  Adobe I/O      │
│  Runtime        │
│  Actions        │
└─────────────────┘
```

## API Service Layer

### Configuration

The API service loads backend action URLs from `config.json` (generated during build):

```json
{
  "getOrganizations": "https://123456-emc.adobeioruntime.net/api/v1/web/EMC/getOrganizations",
  "createOrganization": "https://123456-emc.adobeioruntime.net/api/v1/web/EMC/createOrganization",
  "updateOrganization": "https://123456-emc.adobeioruntime.net/api/v1/web/EMC/updateOrganization",
  "deleteOrganization": "https://123456-emc.adobeioruntime.net/api/v1/web/EMC/deleteOrganization"
}
```

**Initialization:**
```typescript
// In App.tsx or similar
import { apiService } from './services/api'
import config from './config.json'

// Set action URLs
apiService.setActionUrls(config)

// Set authentication headers
apiService.setAuthHeaders(ims.token, ims.org)
```

### Making API Calls

**Frontend (TypeScript):**
```typescript
import { apiService } from '../services/api'

const handleCreate = async () => {
  try {
    const response = await apiService.createOrganization({
      name: 'Acme Corp',
      description: 'Main organization'
    })
    
    if (response.success && response.data) {
      // Handle success
      console.log('Created:', response.data)
    } else {
      // Handle API error
      console.error('Error:', response.error)
    }
  } catch (error) {
    // Handle network/unexpected error
    console.error('Failed:', error)
  }
}
```

## API Contract

### Standard Request Format

**Headers:**
```
Authorization: Bearer <IMS_TOKEN>
x-gw-ims-org-id: <ORG_ID>
Content-Type: application/json
```

**Body (for POST/PUT):**
```json
{
  "name": "Value",
  "otherField": "value"
}
```

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Resource Name",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**List Response with Pagination:**
```json
{
  "success": true,
  "data": [
    {"id": "1", "name": "Item 1"},
    {"id": "2", "name": "Item 2"}
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 100
  }
}
```

### HTTP Status Codes

| Code | Backend Returns | Frontend Interprets |
|------|-----------------|---------------------|
| 200 | Successful operation | Display data |
| 201 | Resource created | Show success message |
| 400 | Validation error | Show error to user |
| 401 | Authentication failed | Redirect to login |
| 403 | Insufficient permissions | Show permission error |
| 404 | Resource not found | Show "not found" message |
| 500 | Server error | Show generic error |

## Implementing CRUD Operations

### 1. Define Types (Frontend)

**`web-src/src/types/domain.ts`:**
```typescript
export interface Organization {
  id: string
  name: string
  description?: string
  imsOrgId?: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationFormData {
  name: string
  description?: string
  imsOrgId?: string
}
```

### 2. Add API Methods (Frontend)

**`web-src/src/services/api.ts`:**
```typescript
// GET /organizations - List all
async getOrganizations(): Promise<ApiListResponse<Organization>> {
  return this.callAction<ApiListResponse<Organization>>('getOrganizations')
}

// GET /organizations/:id - Get one
async getOrganization(id: string): Promise<ApiResponse<Organization>> {
  return this.callAction<ApiResponse<Organization>>('getOrganization', { id })
}

// POST /organizations - Create
async createOrganization(
  data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<Organization>> {
  return this.callAction<ApiResponse<Organization>>('createOrganization', data)
}

// PUT /organizations/:id - Update
async updateOrganization(
  id: string, 
  data: Partial<Organization>
): Promise<ApiResponse<Organization>> {
  return this.callAction<ApiResponse<Organization>>('updateOrganization', { id, ...data })
}

// DELETE /organizations/:id - Delete
async deleteOrganization(id: string): Promise<ApiResponse<void>> {
  return this.callAction<ApiResponse<void>>('deleteOrganization', { id })
}
```

### 3. Implement Backend Actions

**`actions/getOrganizations/index.js`:**
```javascript
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, checkMissingRequestInputs } = require('../utils')

async function main(params) {
  const logger = Core.Logger('getOrganizations', { level: params.LOG_LEVEL || 'info' })
  
  try {
    logger.info('Fetching organizations')
    
    // Validate authentication
    const errorMessage = checkMissingRequestInputs(params, [], ['Authorization'])
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }
    
    // Get organization ID from headers
    const orgId = params.__ow_headers['x-gw-ims-org-id']
    
    // Fetch from database (pseudocode)
    const organizations = await db.organizations.findAll({ imsOrgId: orgId })
    
    // Return success response
    return {
      statusCode: 200,
      body: {
        success: true,
        data: organizations
      }
    }
  } catch (error) {
    logger.error('Failed to fetch organizations:', error)
    return errorResponse(500, 'Failed to fetch organizations', logger)
  }
}

exports.main = main
```

**`actions/createOrganization/index.js`:**
```javascript
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, checkMissingRequestInputs } = require('../utils')
const { v4: uuid } = require('uuid')

async function main(params) {
  const logger = Core.Logger('createOrganization', { level: params.LOG_LEVEL || 'info' })
  
  try {
    logger.info('Creating organization')
    
    // Validate inputs
    const requiredParams = ['name']
    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }
    
    // Additional validation
    if (params.name.trim().length < 3) {
      return errorResponse(400, 'Organization name must be at least 3 characters', logger)
    }
    
    // Get organization ID from headers
    const imsOrgId = params.__ow_headers['x-gw-ims-org-id']
    
    // Create organization
    const organization = {
      id: uuid(),
      name: params.name,
      description: params.description || '',
      imsOrgId: imsOrgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Save to database (pseudocode)
    await db.organizations.insert(organization)
    
    logger.info('Organization created:', organization.id)
    
    // Return success response
    return {
      statusCode: 201,
      body: {
        success: true,
        data: organization,
        message: 'Organization created successfully'
      }
    }
  } catch (error) {
    logger.error('Failed to create organization:', error)
    return errorResponse(500, 'Failed to create organization', logger)
  }
}

exports.main = main
```

### 4. Configure Actions

**`app.config.yaml`:**
```yaml
runtimeManifest:
  packages:
    EMC:
      actions:
        getOrganizations:
          function: actions/getOrganizations/index.js
          web: 'yes'
          runtime: nodejs:22
          inputs:
            LOG_LEVEL: debug
          annotations:
            require-adobe-auth: true
            final: true
        
        createOrganization:
          function: actions/createOrganization/index.js
          web: 'yes'
          runtime: nodejs:22
          inputs:
            LOG_LEVEL: debug
          annotations:
            require-adobe-auth: true
            final: true
```

### 5. Use in Frontend Component

**`web-src/src/components/OrgManagement.tsx`:**
```typescript
import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import { Organization } from '../types/domain'

export const OrgManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load organizations on mount
  useEffect(() => {
    loadOrganizations()
  }, [])
  
  const loadOrganizations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiService.getOrganizations()
      
      if (response.success && response.data) {
        setOrganizations(response.data)
      } else {
        setError(response.error || 'Failed to load organizations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreate = async (name: string, description: string) => {
    try {
      const response = await apiService.createOrganization({ name, description })
      
      if (response.success && response.data) {
        // Add to list
        setOrganizations([...organizations, response.data])
        // Show success message
        alert('Organization created successfully')
      } else {
        alert(response.error || 'Failed to create organization')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    }
  }
  
  // Render UI...
}
```

## Data Persistence

### Option 1: Adobe I/O State Library

**Backend:**
```javascript
const { Core } = require('@adobe/aio-sdk')

async function main(params) {
  const stateLib = await Core.State.init()
  
  // Store organization
  await stateLib.put(`org:${orgId}`, organization, { ttl: 86400 })
  
  // Retrieve organization
  const org = await stateLib.get(`org:${orgId}`)
  
  // List organizations (store index separately)
  const orgIds = await stateLib.get('org:index') || []
  const orgs = await Promise.all(orgIds.map(id => stateLib.get(`org:${id}`)))
}
```

**Pros:**
- Easy to use, built-in
- No external dependencies

**Cons:**
- Max 1MB per key
- TTL-based expiration
- Limited query capabilities

### Option 2: External Database

**Example with MongoDB:**

```javascript
const { MongoClient } = require('mongodb')

let cachedDb = null

async function connectToDatabase(uri) {
  if (cachedDb) return cachedDb
  
  const client = await MongoClient.connect(uri)
  cachedDb = client.db('emc')
  return cachedDb
}

async function main(params) {
  const db = await connectToDatabase(params.DB_URI)
  const organizations = db.collection('organizations')
  
  // Insert
  const result = await organizations.insertOne({
    id: uuid(),
    name: params.name,
    createdAt: new Date()
  })
  
  // Query
  const org = await organizations.findOne({ id: params.id })
  
  // Update
  await organizations.updateOne(
    { id: params.id },
    { $set: { name: params.name, updatedAt: new Date() } }
  )
  
  // Delete
  await organizations.deleteOne({ id: params.id })
}
```

**Connection String (in .env):**
```bash
DB_URI=mongodb+srv://user:pass@cluster.mongodb.net/emc
```

**Configuration (app.config.yaml):**
```yaml
inputs:
  DB_URI: $DB_URI
```

## Authentication Flow

```
1. User logs in via Adobe ExC Shell
   ↓
2. ExC Shell provides IMS token
   ↓
3. Frontend receives token in props.ims
   ↓
4. Frontend sets auth headers in API service
   apiService.setAuthHeaders(ims.token, ims.org)
   ↓
5. Frontend makes API call
   await apiService.createOrganization(data)
   ↓
6. API service adds auth headers to request
   Authorization: Bearer <token>
   x-gw-ims-org-id: <org>
   ↓
7. Adobe API Gateway validates token
   ↓
8. Backend action receives validated request
   const orgId = params.__ow_headers['x-gw-ims-org-id']
   ↓
9. Backend processes request
   ↓
10. Backend returns response
    { success: true, data: {...} }
```

## Error Handling

### Frontend Error Handling

```typescript
const handleOperation = async () => {
  try {
    const response = await apiService.someMethod()
    
    // Check API-level success
    if (response.success && response.data) {
      // Success path
      handleSuccess(response.data)
    } else {
      // API returned error
      handleApiError(response.error || 'Operation failed')
    }
  } catch (error) {
    // Network error or exception
    handleNetworkError(error)
  }
}

const handleApiError = (message: string) => {
  // Show user-friendly error
  if (message.includes('not found')) {
    setError('Resource not found')
  } else if (message.includes('unauthorized')) {
    setError('You do not have permission')
  } else {
    setError(message)
  }
}

const handleNetworkError = (error: any) => {
  console.error('Network error:', error)
  setError('Unable to connect to server. Please try again.')
}
```

### Backend Error Handling

```javascript
async function main(params) {
  const logger = Core.Logger('main')
  
  try {
    // Validation errors (400)
    if (!params.name) {
      return errorResponse(400, 'Name is required', logger)
    }
    
    // Business logic errors (400)
    const existing = await db.find({ name: params.name })
    if (existing) {
      return errorResponse(400, 'Organization with this name already exists', logger)
    }
    
    // External service errors
    try {
      await externalAPI.call()
    } catch (error) {
      logger.error('External API failed:', error)
      return errorResponse(503, 'External service unavailable', logger)
    }
    
    // Success
    return { statusCode: 200, body: { success: true, data: result } }
    
  } catch (error) {
    // Unexpected errors (500)
    logger.error('Unexpected error:', error)
    return errorResponse(500, 'Internal server error', logger)
  }
}
```

## Testing Integration

### Mocking API Service (Frontend Tests)

```typescript
// __mocks__/services/api.ts
export const apiService = {
  setActionUrls: jest.fn(),
  setAuthHeaders: jest.fn(),
  getOrganizations: jest.fn().mockResolvedValue({
    success: true,
    data: [
      { id: '1', name: 'Org 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    ]
  }),
  createOrganization: jest.fn().mockResolvedValue({
    success: true,
    data: { id: '2', name: 'New Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
  })
}
```

### Testing Backend Actions

```javascript
// test/getOrganizations.test.js
jest.mock('../path/to/db')
const db = require('../path/to/db')
const action = require('../actions/getOrganizations/index.js')

test('returns organizations for authenticated user', async () => {
  const mockOrgs = [{ id: '1', name: 'Org 1' }]
  db.organizations.findAll.mockResolvedValue(mockOrgs)
  
  const result = await action.main({
    __ow_headers: {
      authorization: 'Bearer fake-token',
      'x-gw-ims-org-id': 'org123'
    }
  })
  
  expect(result.statusCode).toBe(200)
  expect(result.body.success).toBe(true)
  expect(result.body.data).toEqual(mockOrgs)
})
```

### E2E Testing

```javascript
// e2e/organizations.e2e.test.js
const actionUrl = process.env.ORG_ACTION_URL
const token = process.env.TEST_TOKEN

test('create and retrieve organization', async () => {
  // Create
  const createResponse = await fetch(`${actionUrl}/createOrganization`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Test Org' })
  })
  
  const createData = await createResponse.json()
  expect(createData.success).toBe(true)
  
  // Retrieve
  const getResponse = await fetch(`${actionUrl}/getOrganizations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const getData = await getResponse.json()
  expect(getData.data).toContainEqual(expect.objectContaining({ name: 'Test Org' }))
})
```

## Debugging Tips

### Frontend Debugging

```typescript
// Enable verbose logging
apiService.setAuthHeaders(ims.token, ims.org)

console.log('Making API call with headers:', {
  authorization: ims.token.substring(0, 20) + '...',
  org: ims.org
})

const response = await apiService.getOrganizations()
console.log('API response:', response)
```

### Backend Debugging

```javascript
async function main(params) {
  const logger = Core.Logger('main', { level: 'debug' })
  
  // Log request
  logger.debug('Received params:', stringParameters(params))
  
  // Log process
  logger.info('Fetching from database...')
  const result = await db.query()
  logger.debug('Database result:', result)
  
  // Log response
  logger.info('Returning response')
  return response
}
```

**View logs:**
```bash
aio app logs --tail
```

### Network Debugging

**Browser DevTools:**
1. Open Network tab
2. Make request
3. Inspect request/response headers and body
4. Check status code

**curl:**
```bash
curl -v -X POST https://your-action-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-gw-ims-org-id: $ORG" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

## Common Issues

### Issue: "Action not found in configuration"

**Cause:** Action URL not in `config.json`

**Solution:**
1. Add action to `app.config.yaml`
2. Deploy: `aio app deploy`
3. Verify URLs generated in `dist/config.json`

### Issue: 401 Unauthorized

**Cause:** Missing or invalid auth headers

**Solution:**
```typescript
// Ensure auth headers are set
apiService.setAuthHeaders(ims.token, ims.org)

// Verify token is not empty
console.log('Token:', ims.token ? 'present' : 'missing')
```

### Issue: CORS errors

**Cause:** Actions not configured as web actions

**Solution:**
```yaml
# app.config.yaml
actions:
  myAction:
    web: 'yes'  # Enable web action
```

### Issue: 500 Internal Server Error

**Check backend logs:**
```bash
aio rt activation list
aio rt activation get <activation-id>
aio rt activation logs <activation-id>
```

### Issue: Response format mismatch

**Frontend expects:**
```json
{ "success": true, "data": [...] }
```

**Backend returns:**
```javascript
return {
  statusCode: 200,
  body: {  // ← Must wrap in body
    success: true,
    data: [...]
  }
}
```

## Best Practices

1. **Always return standardized responses** from backend
2. **Validate inputs** on both frontend and backend
3. **Handle errors gracefully** with user-friendly messages
4. **Log important operations** for debugging
5. **Use TypeScript types** for type safety
6. **Test API calls** with unit and e2e tests
7. **Version your APIs** if breaking changes are possible
8. **Document payload formats** for each endpoint
9. **Implement proper pagination** for large datasets
10. **Secure sensitive data** (never log tokens at info level)

## Resources

- [Frontend Guide](./FRONTEND.md)
- [Backend Guide](./BACKEND.md)
- [Testing Guide](./TESTING.md)

