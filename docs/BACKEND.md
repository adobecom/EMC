# Backend Development Guide

## Overview

Backend is built with **Adobe I/O Runtime** (serverless platform based on Apache OpenWhisk) using **Node.js 22**.

## Architecture

### Adobe I/O Runtime

**Serverless Functions (Actions):**
- Stateless functions that run on-demand
- Auto-scaling based on load
- Pay-per-invocation pricing
- No server management required

**Key Concepts:**
- **Action**: A function that executes in response to a trigger
- **Package**: Namespace for grouping related actions
- **Web Action**: HTTP-accessible action (can be called via REST API)
- **Sequence**: Chain multiple actions together
- **Trigger**: Event that can invoke an action
- **Rule**: Connects triggers to actions

### Project Structure

```
actions/
├── sample/
│   └── index.js          # Sample action with external API call
├── sampleMessage/
│   └── index.js          # Sample message action
└── utils.js              # Shared utilities for all actions
```

## Action Structure

### Basic Action Template

```javascript
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, checkMissingRequestInputs } = require('../utils')

async function main(params) {
  // 1. Create logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  
  try {
    // 2. Log action start
    logger.info('Action started')
    
    // 3. Validate inputs
    const requiredParams = ['someParam']
    const requiredHeaders = ['Authorization']
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }
    
    // 4. Business logic
    const result = await doSomething(params)
    
    // 5. Return response
    const response = {
      statusCode: 200,
      body: {
        success: true,
        data: result
      }
    }
    
    logger.info('Action completed successfully')
    return response
    
  } catch (error) {
    // 6. Error handling
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
```

### Action Parameters

**Available Parameters:**

1. **Explicit params**: Passed in request body or query string
   ```javascript
   params.someParam  // From request
   ```

2. **Default params**: Defined in `app.config.yaml`
   ```javascript
   params.LOG_LEVEL  // From config
   params.apiKey     // From config inputs
   ```

3. **System params**: Automatically provided
   ```javascript
   params.__ow_headers    // HTTP headers (lowercase keys)
   params.__ow_method     // HTTP method (GET, POST, etc.)
   params.__ow_path       // Request path
   params.__ow_query      // Query string params
   params.__ow_body       // Raw request body
   ```

**Example - Accessing Headers:**
```javascript
// Get authorization token
const token = params.__ow_headers.authorization

// Get organization ID
const orgId = params.__ow_headers['x-gw-ims-org-id']
```

## Shared Utilities (`utils.js`)

### `checkMissingRequestInputs(params, requiredParams, requiredHeaders)`

Validates required parameters and headers.

**Example:**
```javascript
const requiredParams = ['name', 'email']
const requiredHeaders = ['Authorization']
const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)

if (errorMessage) {
  return errorResponse(400, errorMessage, logger)
}
```

**Returns:**
- `null` if all inputs present
- Error message string if any missing: `"missing header(s) 'authorization' and missing parameter(s) 'name'"`

### `getBearerToken(params)`

Extracts bearer token from Authorization header.

**Example:**
```javascript
const token = getBearerToken(params)
// Returns token string without 'Bearer ' prefix, or undefined if not present
```

### `errorResponse(statusCode, message, logger)`

Creates standardized error response.

**Example:**
```javascript
return errorResponse(400, 'Invalid email format', logger)
```

**Returns:**
```javascript
{
  error: {
    statusCode: 400,
    body: {
      error: 'Invalid email format'
    }
  }
}
```

### `stringParameters(params)`

Converts params to JSON string with Authorization header hidden.

**Example:**
```javascript
logger.debug(stringParameters(params))
// Logs: {"someParam": "value", "__ow_headers": {"authorization": "<hidden>"}}
```

## Configuration (`app.config.yaml`)

### Action Definition

```yaml
runtimeManifest:
  packages:
    EMC:                           # Package name
      license: Apache-2.0
      actions:
        sample:                     # Action name
          function: actions/sample/index.js
          web: 'yes'               # Make it a web action
          runtime: nodejs:22       # Node.js version
          inputs:                  # Default params
            LOG_LEVEL: debug
          annotations:
            require-adobe-auth: true    # Require IMS authentication
            final: true                 # Can't be chained
```

### Key Settings

**`function`**: Path to action code
- Single file: `actions/sample/index.js` (uses webpack bundling)
- Directory: `actions/sample/` (creates zip with node_modules)

**`web`**: Enable HTTP access
- `'yes'` - web action with `.http` extension
- `'raw'` - raw HTTP response (full control)
- `false` - not web-accessible

**`runtime`**: Execution environment
- `nodejs:22` (recommended)
- `nodejs:20`, `nodejs:18` (older versions)

**`inputs`**: Default parameters
- Static values or environment variables
- `$SERVICE_API_KEY` - reads from `.env`

**`annotations`**:
- `require-adobe-auth: true` - Adobe IMS authentication required
- `final: true` - Can't be part of a sequence
- `web-export: true` - Alternative to `web: 'yes'`

## Authentication & Authorization

### Adobe IMS Integration

When `require-adobe-auth: true`:
1. Request must include `Authorization: Bearer <token>` header
2. Adobe API Gateway validates token
3. Action receives validated token in headers
4. Extract user/org info from token if needed

**Example:**
```javascript
const token = getBearerToken(params)
const orgId = params.__ow_headers['x-gw-ims-org-id']

// Token is already validated by Adobe API Gateway
// Use it to call other Adobe APIs or for logging
logger.info(`Request from org: ${orgId}`)
```

### Disabling Authentication

To make an action public (no authentication):

1. Remove `require-adobe-auth` annotation
2. Remove `Authorization` from required headers
3. **Security warning**: Anyone with URL can invoke action

```javascript
// Remove this line:
const requiredHeaders = ['Authorization']

// Use this instead:
const requiredHeaders = []
```

## Response Formats

### Success Response

**Standard format for consistency with frontend:**
```javascript
return {
  statusCode: 200,
  body: {
    success: true,
    data: result,              // Actual data
    message: 'Optional message',
    pagination: {              // Optional for lists
      page: 1,
      pageSize: 50,
      totalCount: 100
    }
  }
}
```

### Error Response

**Using utility function:**
```javascript
return errorResponse(400, 'Validation failed', logger)
```

**Manual format:**
```javascript
return {
  error: {
    statusCode: 400,
    body: {
      error: 'Detailed error message'
    }
  }
}
```

### HTTP Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Successful operation |
| 201 | Resource created |
| 400 | Client error (validation, bad input) |
| 401 | Authentication required |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 500 | Server error (unhandled exception) |
| 503 | Service unavailable (external dependency down) |

## Logging

### Logger Levels

```javascript
const logger = Core.Logger('actionName', { level: params.LOG_LEVEL || 'info' })

logger.debug('Detailed debugging information')  // Only if LOG_LEVEL=debug
logger.info('General information')               // Default level
logger.warn('Warning messages')
logger.error('Error details')                    // Always logged
```

### Best Practices

```javascript
// ✅ Log action start/end
logger.info('Processing request for user: ' + userId)

// ✅ Log external API calls
logger.info('Calling external API: ' + apiUrl)

// ✅ Log errors with context
logger.error('Failed to save to database', { userId, error: error.message })

// ✅ Use debug for sensitive data
logger.debug(stringParameters(params))

// ❌ Don't log sensitive data at info level
logger.info('Token: ' + token)  // BAD

// ❌ Don't log entire params object (has auth tokens)
logger.info(params)  // BAD
```

### Viewing Logs

```bash
# Tail logs in real-time
aio app logs

# View specific action logs
aio rt activation logs <activation-id>

# List recent activations
aio rt activation list

# Get activation details
aio rt activation get <activation-id>
```

## External API Calls

### Using node-fetch

```javascript
const fetch = require('node-fetch')

async function callExternalAPI(endpoint, token) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ data: 'value' })
  })
  
  if (!response.ok) {
    throw new Error(`API call failed with status ${response.status}`)
  }
  
  return await response.json()
}
```

### Error Handling

```javascript
try {
  const result = await callExternalAPI(apiUrl, token)
  return { statusCode: 200, body: { success: true, data: result } }
} catch (error) {
  logger.error('External API failed:', error)
  
  // Distinguish between client and server errors
  if (error.message.includes('400') || error.message.includes('404')) {
    return errorResponse(400, 'Invalid request to external service', logger)
  }
  
  return errorResponse(503, 'External service unavailable', logger)
}
```

## Data Persistence

Adobe I/O Runtime actions are **stateless**. For persistence:

### Option 1: Adobe I/O State Library

```javascript
const { Core } = require('@adobe/aio-sdk')
const stateLib = await Core.State.init()

// Store data
await stateLib.put('key', { some: 'data' }, { ttl: 86400 })

// Retrieve data
const data = await stateLib.get('key')

// Delete data
await stateLib.delete('key')
```

**Limitations:**
- Max 1MB per key
- TTL-based expiration
- Not suitable for large datasets

### Option 2: External Database

Connect to external database (Cosmos DB, PostgreSQL, etc.):

```javascript
const { MongoClient } = require('mongodb')

async function main(params) {
  const client = await MongoClient.connect(params.DB_CONNECTION_STRING)
  const db = client.db('emc')
  const collection = db.collection('events')
  
  try {
    const result = await collection.insertOne({ name: 'Event 1' })
    return { statusCode: 200, body: { success: true, data: result } }
  } finally {
    await client.close()
  }
}
```

## Testing Actions

### Unit Testing (Jest)

**Test file structure:**
```javascript
// test/myaction.test.js
jest.mock('@adobe/aio-sdk')
jest.mock('node-fetch')

const action = require('../actions/myaction/index.js')
const fetch = require('node-fetch')

describe('myaction', () => {
  test('returns success response', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'test' }) }
    fetch.mockResolvedValue(mockResponse)
    
    const result = await action.main({ 
      __ow_headers: { authorization: 'Bearer fake' }
    })
    
    expect(result.statusCode).toBe(200)
    expect(result.body.success).toBe(true)
  })
  
  test('returns error for missing auth', async () => {
    const result = await action.main({})
    
    expect(result.error.statusCode).toBe(400)
    expect(result.error.body.error).toContain('authorization')
  })
})
```

**Run tests:**
```bash
npm test                    # Run all tests
npm test -- myaction.test.js   # Run specific test
```

### Manual Testing

**Using curl:**
```bash
# Get action URL
aio app:get-url sample

# Invoke action
curl -X POST https://your-namespace.adobeioruntime.net/api/v1/web/EMC/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-gw-ims-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"someParam": "value"}'
```

**Using aio CLI:**
```bash
# Invoke action directly
aio rt action invoke EMC/sample -p someParam value -r

# Invoke with auth (web action)
aio rt action invoke EMC/sample --web-secure YOUR_SECRET -r
```

## Deployment

### Deploy All Actions

```bash
aio app deploy
```

### Deploy Single Action

```bash
aio app deploy --action sample
```

### Undeploy

```bash
aio app undeploy              # Remove all actions
aio app undeploy --action sample  # Remove single action
```

## Action Lifecycle

```
1. Development
   ├── Write code in actions/myaction/index.js
   ├── Add dependencies to package.json (root or action folder)
   └── Configure in app.config.yaml

2. Testing
   ├── Write unit tests in test/myaction.test.js
   ├── Run locally: aio app run --local
   └── Test manually or with Jest

3. Deployment
   ├── aio app deploy
   ├── Code bundled/zipped
   └── Uploaded to Adobe I/O Runtime

4. Invocation
   ├── HTTP request to action URL
   ├── Adobe API Gateway validates auth
   ├── Runtime creates container (if needed)
   ├── Action executes
   └── Response returned
```

## Best Practices

### 1. Keep Actions Small and Focused

```javascript
// ✅ Good - single responsibility
async function createEvent(params) {
  validateEventData(params)
  const event = await saveEvent(params)
  await sendNotification(event)
  return { success: true, data: event }
}

// ❌ Bad - too many responsibilities
async function handleAllEventOperations(params) {
  // 200 lines of code doing create, update, delete, list...
}
```

### 2. Validate Input Early

```javascript
// ✅ Good - validate before processing
const errorMessage = checkMissingRequestInputs(params, ['name', 'email'], ['Authorization'])
if (errorMessage) {
  return errorResponse(400, errorMessage, logger)
}

// Additional validation
if (!/\S+@\S+\.\S+/.test(params.email)) {
  return errorResponse(400, 'Invalid email format', logger)
}

// Now proceed with business logic
```

### 3. Handle Errors Gracefully

```javascript
// ✅ Good - specific error handling
try {
  const user = await getUser(userId)
  if (!user) {
    return errorResponse(404, 'User not found', logger)
  }
  // ... process user
} catch (error) {
  logger.error('Database error:', error)
  return errorResponse(500, 'Database error', logger)
}

// ❌ Bad - generic error handling
try {
  // ... lots of code
} catch (error) {
  return errorResponse(500, 'Error', logger)
}
```

### 4. Use Environment Variables for Secrets

```yaml
# app.config.yaml
inputs:
  DB_CONNECTION: $DB_CONNECTION_STRING
  API_KEY: $SERVICE_API_KEY
```

```bash
# .env (not committed)
DB_CONNECTION_STRING=mongodb://...
SERVICE_API_KEY=abc123...
```

### 5. Implement Proper Logging

```javascript
// ✅ Good - contextual logging
logger.info('Creating event', { userId, eventName: params.name })
try {
  const event = await createEvent(params)
  logger.info('Event created', { eventId: event.id })
  return { statusCode: 201, body: { success: true, data: event } }
} catch (error) {
  logger.error('Event creation failed', { userId, error: error.message })
  return errorResponse(500, 'Failed to create event', logger)
}
```

### 6. Set Appropriate Timeouts

```yaml
# app.config.yaml
actions:
  sample:
    limits:
      timeout: 60000      # 60 seconds (default: 60000ms)
      memory: 256         # MB (default: 256MB)
```

**Guidelines:**
- Short actions (<5s): Quick lookups, validations
- Medium actions (5-30s): API calls, simple processing
- Long actions (30-60s): Complex processing, multiple API calls
- Very long (>60s): Consider breaking into multiple actions or using async pattern

## Common Patterns

### CRUD Operations

```javascript
// GET - Retrieve resource
async function getResource(params) {
  const resource = await db.get(params.id)
  if (!resource) {
    return errorResponse(404, 'Resource not found', logger)
  }
  return { statusCode: 200, body: { success: true, data: resource } }
}

// POST - Create resource
async function createResource(params) {
  const resource = await db.insert(params)
  return { statusCode: 201, body: { success: true, data: resource } }
}

// PUT - Update resource
async function updateResource(params) {
  const resource = await db.update(params.id, params)
  return { statusCode: 200, body: { success: true, data: resource } }
}

// DELETE - Delete resource
async function deleteResource(params) {
  await db.delete(params.id)
  return { statusCode: 200, body: { success: true, message: 'Deleted' } }
}
```

### Pagination

```javascript
async function listResources(params) {
  const page = parseInt(params.page) || 1
  const pageSize = parseInt(params.pageSize) || 50
  const offset = (page - 1) * pageSize
  
  const [resources, totalCount] = await Promise.all([
    db.list({ offset, limit: pageSize }),
    db.count()
  ])
  
  return {
    statusCode: 200,
    body: {
      success: true,
      data: resources,
      pagination: { page, pageSize, totalCount }
    }
  }
}
```

## Troubleshooting

### Action Not Deploying

```bash
# Check for syntax errors
node actions/myaction/index.js

# Check configuration
aio app:config

# View deployment logs
aio app deploy --verbose
```

### Action Failing at Runtime

```bash
# View recent activations
aio rt activation list

# Get detailed activation info
aio rt activation get <activation-id>

# View logs
aio rt activation logs <activation-id>
```

### Action Timeout

- Increase timeout limit in `app.config.yaml`
- Optimize code (reduce API calls, database queries)
- Use async processing for long-running tasks

### Out of Memory

- Increase memory limit in `app.config.yaml`
- Optimize data structures
- Process data in chunks instead of loading all at once

## Resources

- [Adobe I/O Runtime Docs](https://developer.adobe.com/runtime/docs/)
- [App Builder Actions](https://developer.adobe.com/app-builder/docs/guides/actions/)
- [OpenWhisk Documentation](https://openwhisk.apache.org/documentation.html)
- [API Integration Guide](./API_INTEGRATION.md)

