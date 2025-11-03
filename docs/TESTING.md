# Testing Guide

## Overview

The EMC project uses **Jest** for both unit and end-to-end testing. Tests cover both frontend components and backend actions.

## Test Structure

```
EMC/
├── test/                    # Unit tests for backend actions
│   ├── sample.test.js
│   ├── sampleMessage.test.js
│   └── utils.test.js
├── e2e/                     # End-to-end tests
│   ├── sample.e2e.test.js
│   └── sampleMessage.e2e.test.js
└── jest.setup.js            # Jest configuration
```

## Running Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- sample.test.js

# Run with coverage
npm test -- --coverage

# Run e2e tests
npm run e2e

# Run tests in watch mode
npm test -- --watch
```

## Backend Action Testing

### Test Template

```javascript
// test/myaction.test.js
jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn()
  }
}))

const { Core } = require('@adobe/aio-sdk')
const mockLoggerInstance = { 
  info: jest.fn(), 
  debug: jest.fn(), 
  error: jest.fn() 
}
Core.Logger.mockReturnValue(mockLoggerInstance)

jest.mock('node-fetch')
const fetch = require('node-fetch')
const action = require('../actions/myaction/index.js')

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
})

describe('myaction', () => {
  const fakeParams = { 
    __ow_headers: { authorization: 'Bearer fake-token' }
  }
  
  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })
  
  test('should return success response', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    }
    fetch.mockResolvedValue(mockResponse)
    
    const result = await action.main(fakeParams)
    
    expect(result.statusCode).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.data).toBeDefined()
  })
  
  test('should return error for missing auth', async () => {
    const result = await action.main({})
    
    expect(result.error).toBeDefined()
    expect(result.error.statusCode).toBe(400)
    expect(result.error.body.error).toContain('authorization')
  })
  
  test('should handle external API failure', async () => {
    fetch.mockRejectedValue(new Error('Network error'))
    
    const result = await action.main(fakeParams)
    
    expect(result.error.statusCode).toBe(500)
    expect(mockLoggerInstance.error).toHaveBeenCalled()
  })
})
```

### Testing Utilities

**Testing `utils.js` functions:**

```javascript
// test/utils.test.js
const { 
  checkMissingRequestInputs, 
  getBearerToken, 
  stringParameters 
} = require('../actions/utils.js')

describe('checkMissingRequestInputs', () => {
  test('returns null when all inputs present', () => {
    const params = {
      name: 'John',
      __ow_headers: { authorization: 'Bearer token' }
    }
    const result = checkMissingRequestInputs(params, ['name'], ['authorization'])
    expect(result).toBeNull()
  })
  
  test('returns error for missing parameter', () => {
    const params = { __ow_headers: { authorization: 'Bearer token' } }
    const result = checkMissingRequestInputs(params, ['name'], ['authorization'])
    expect(result).toContain('missing parameter(s)')
    expect(result).toContain('name')
  })
  
  test('returns error for missing header', () => {
    const params = { name: 'John', __ow_headers: {} }
    const result = checkMissingRequestInputs(params, ['name'], ['authorization'])
    expect(result).toContain('missing header(s)')
    expect(result).toContain('authorization')
  })
})

describe('getBearerToken', () => {
  test('extracts token from authorization header', () => {
    const params = {
      __ow_headers: { authorization: 'Bearer abc123' }
    }
    const token = getBearerToken(params)
    expect(token).toBe('abc123')
  })
  
  test('returns undefined if no authorization header', () => {
    const params = { __ow_headers: {} }
    const token = getBearerToken(params)
    expect(token).toBeUndefined()
  })
})

describe('stringParameters', () => {
  test('masks authorization header', () => {
    const params = {
      name: 'test',
      __ow_headers: { authorization: 'Bearer secret' }
    }
    const result = stringParameters(params)
    const parsed = JSON.parse(result)
    
    expect(parsed.name).toBe('test')
    expect(parsed.__ow_headers.authorization).toBe('<hidden>')
  })
})
```

### Mocking External Dependencies

**Mocking database:**

```javascript
jest.mock('../lib/db', () => ({
  organizations: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}))

const db = require('../lib/db')

test('creates organization in database', async () => {
  const mockOrg = { id: '123', name: 'Test Org' }
  db.organizations.insert.mockResolvedValue(mockOrg)
  
  const result = await action.main({
    name: 'Test Org',
    __ow_headers: { authorization: 'Bearer token' }
  })
  
  expect(db.organizations.insert).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Test Org' })
  )
  expect(result.body.data).toEqual(mockOrg)
})
```

**Mocking Adobe I/O State:**

```javascript
jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn(() => ({ info: jest.fn(), debug: jest.fn(), error: jest.fn() })),
    State: {
      init: jest.fn(() => Promise.resolve({
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
      }))
    }
  }
}))

const { Core } = require('@adobe/aio-sdk')

test('stores data in state', async () => {
  const mockState = {
    put: jest.fn(),
    get: jest.fn().mockResolvedValue({ id: '123', name: 'Test' })
  }
  Core.State.init.mockResolvedValue(mockState)
  
  const result = await action.main({ name: 'Test' })
  
  expect(mockState.put).toHaveBeenCalled()
  expect(result.statusCode).toBe(200)
})
```

## Frontend Component Testing

### Testing Components with API Service

**Mocking the API service:**

```typescript
// __mocks__/services/api.ts
export const apiService = {
  setActionUrls: jest.fn(),
  setAuthHeaders: jest.fn(),
  getOrganizations: jest.fn(),
  createOrganization: jest.fn()
}
```

**Component test:**

```typescript
// components/__tests__/OrgManagement.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OrgManagement } from '../OrgManagement'
import { apiService } from '../../services/api'

jest.mock('../../services/api')

describe('OrgManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  test('loads and displays organizations', async () => {
    const mockOrgs = [
      { id: '1', name: 'Org 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: '2', name: 'Org 2', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    ]
    
    apiService.getOrganizations.mockResolvedValue({
      success: true,
      data: mockOrgs
    })
    
    render(<OrgManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Org 1')).toBeInTheDocument()
      expect(screen.getByText('Org 2')).toBeInTheDocument()
    })
  })
  
  test('displays error message on load failure', async () => {
    apiService.getOrganizations.mockResolvedValue({
      success: false,
      error: 'Failed to load'
    })
    
    render(<OrgManagement />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })
  
  test('creates new organization', async () => {
    apiService.getOrganizations.mockResolvedValue({ success: true, data: [] })
    apiService.createOrganization.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'New Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    })
    
    render(<OrgManagement />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByText(/create/i)
    
    fireEvent.change(nameInput, { target: { value: 'New Org' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(apiService.createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Org' })
      )
    })
  })
})
```

### Testing Hooks

```typescript
// hooks/__tests__/useLoadData.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useLoadData } from '../useLoadData'
import { apiService } from '../../services/api'

jest.mock('../../services/api')

describe('useLoadData', () => {
  test('loads data successfully', async () => {
    const mockData = [{ id: '1', name: 'Item 1' }]
    apiService.getData.mockResolvedValue({ success: true, data: mockData })
    
    const { result } = renderHook(() => useLoadData(apiService.getData))
    
    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBeNull()
    })
  })
  
  test('handles error', async () => {
    apiService.getData.mockResolvedValue({ success: false, error: 'Load failed' })
    
    const { result } = renderHook(() => useLoadData(apiService.getData))
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Load failed')
    })
  })
})
```

## End-to-End Testing

### E2E Test Template

```javascript
// e2e/organizations.e2e.test.js
const fetch = require('node-fetch')

// Load from environment or config
const BASE_URL = process.env.E2E_BASE_URL
const TEST_TOKEN = process.env.E2E_TOKEN
const TEST_ORG = process.env.E2E_ORG

describe('Organizations E2E', () => {
  let createdOrgId
  
  test('creates organization', async () => {
    const response = await fetch(`${BASE_URL}/createOrganization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'x-gw-ims-org-id': TEST_ORG,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `E2E Test Org ${Date.now()}`,
        description: 'Created by E2E test'
      })
    })
    
    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.id).toBeDefined()
    
    createdOrgId = data.data.id
  })
  
  test('retrieves organizations', async () => {
    const response = await fetch(`${BASE_URL}/getOrganizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'x-gw-ims-org-id': TEST_ORG
      }
    })
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
  })
  
  test('updates organization', async () => {
    const response = await fetch(`${BASE_URL}/updateOrganization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'x-gw-ims-org-id': TEST_ORG,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: createdOrgId,
        name: 'Updated Name'
      })
    })
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Updated Name')
  })
  
  test('deletes organization', async () => {
    const response = await fetch(`${BASE_URL}/deleteOrganization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'x-gw-ims-org-id': TEST_ORG,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: createdOrgId
      })
    })
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
  })
  
  afterAll(async () => {
    // Cleanup if test failed
    if (createdOrgId) {
      try {
        await fetch(`${BASE_URL}/deleteOrganization`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'x-gw-ims-org-id': TEST_ORG,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: createdOrgId })
        })
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })
})
```

### Running E2E Tests

```bash
# Set environment variables
export E2E_BASE_URL=https://your-namespace.adobeioruntime.net/api/v1/web/EMC
export E2E_TOKEN=your-test-token
export E2E_ORG=your-test-org

# Run e2e tests
npm run e2e
```

## Test Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Goals

| Area | Target Coverage |
|------|----------------|
| Backend Actions | 80%+ |
| Utilities | 90%+ |
| Frontend Components | 70%+ |
| Critical Paths | 100% |

## Testing Best Practices

### 1. Test Behavior, Not Implementation

```javascript
// ✅ Good - tests behavior
test('creates organization with valid data', async () => {
  const result = await action.main({ name: 'Test', __ow_headers: { authorization: 'Bearer token' } })
  expect(result.statusCode).toBe(201)
  expect(result.body.data.name).toBe('Test')
})

// ❌ Bad - tests implementation details
test('calls database.insert', async () => {
  await action.main({ name: 'Test' })
  expect(database.insert).toHaveBeenCalled()
})
```

### 2. Use Descriptive Test Names

```javascript
// ✅ Good
test('returns 400 error when organization name is missing', ...)

// ❌ Bad
test('test 1', ...)
```

### 3. Arrange-Act-Assert Pattern

```javascript
test('creates organization', async () => {
  // Arrange - setup test data
  const orgData = { name: 'Test Org', description: 'Test' }
  db.insert.mockResolvedValue({ id: '123', ...orgData })
  
  // Act - execute the code
  const result = await action.main(orgData)
  
  // Assert - verify results
  expect(result.statusCode).toBe(201)
  expect(result.body.data.name).toBe('Test Org')
})
```

### 4. Test Edge Cases

```javascript
test('handles empty organization name', ...)
test('handles very long organization name', ...)
test('handles special characters in name', ...)
test('handles database connection failure', ...)
test('handles missing optional fields', ...)
```

### 5. Use Test Fixtures

```javascript
// test/fixtures/organizations.js
module.exports = {
  validOrg: {
    name: 'Valid Org',
    description: 'A valid organization',
    imsOrgId: 'org123'
  },
  invalidOrg: {
    name: '',  // Invalid: empty name
    description: 'Invalid org'
  }
}

// In test
const { validOrg, invalidOrg } = require('./fixtures/organizations')

test('creates valid organization', async () => {
  const result = await action.main(validOrg)
  expect(result.statusCode).toBe(201)
})
```

### 6. Clean Up After Tests

```javascript
let testOrgId

afterEach(async () => {
  // Clean up created resources
  if (testOrgId) {
    await db.organizations.delete(testOrgId)
    testOrgId = null
  }
})
```

### 7. Isolate Tests

```javascript
// ✅ Good - isolated tests
beforeEach(() => {
  jest.clearAllMocks()
})

// ❌ Bad - tests depend on each other
let sharedData
test('test 1', () => { sharedData = ... })
test('test 2', () => { use sharedData })  // Depends on test 1
```

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## Debugging Tests

### Running Single Test

```bash
# Run specific test file
npm test -- myaction.test.js

# Run specific test case
npm test -- -t "creates organization"
```

### Using Debugger

```javascript
test('debuggable test', async () => {
  debugger  // Add breakpoint
  const result = await action.main(params)
  expect(result).toBeDefined()
})
```

**Run with debugger:**
```bash
node --inspect-brk node_modules/.bin/jest --runInBand myaction.test.js
```

### Verbose Output

```bash
npm test -- --verbose
```

## Common Testing Pitfalls

### 1. Not Mocking External Dependencies

```javascript
// ❌ Bad - real API call in test
test('fetches data', async () => {
  const result = await fetch('https://api.example.com/data')
  // This makes a real HTTP request!
})

// ✅ Good - mocked API call
jest.mock('node-fetch')
const fetch = require('node-fetch')

test('fetches data', async () => {
  fetch.mockResolvedValue({ json: () => ({ data: 'test' }) })
  // Mock call, no real HTTP request
})
```

### 2. Testing Too Much in One Test

```javascript
// ❌ Bad - testing multiple things
test('complete user flow', async () => {
  // Creates user
  // Updates user
  // Deletes user
  // 50 lines of assertions
})

// ✅ Good - separate tests
test('creates user', ...)
test('updates user', ...)
test('deletes user', ...)
```

### 3. Hardcoding Values

```javascript
// ❌ Bad
expect(result.createdAt).toBe('2024-01-15T10:30:00Z')

// ✅ Good
expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Frontend Testing Guide](./FRONTEND.md#testing)
- [Backend Testing Guide](./BACKEND.md#testing-actions)

