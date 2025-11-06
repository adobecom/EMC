# Mock Data Modules

This directory contains TypeScript/JavaScript modules that provide mock data for API endpoints during development.

## Overview

Mock modules return Promises to simulate real API calls, including network delays. This approach is more reliable than fetching static JSON files and provides better type safety.

## Structure

```
/web-src/src/mocks/
├── index.ts              # Central export file
├── list-series.ts        # Series list mock
└── [future mocks].ts     # Additional mock modules
```

## How It Works

Each mock module exports:
1. **Raw data** - The actual mock data array
2. **Mock function** - A function that returns a Promise

### Example: list-series.ts

```typescript
import { SeriesApiResponse } from '../types/domain'

// Export raw data
export const mockSeriesList: SeriesApiResponse[] = [
  {
    seriesId: "123",
    seriesName: "Example Series",
    // ... more fields
  }
]

// Export function that returns Promise
export function getSeriesListMock(): Promise<SeriesApiResponse[]> {
  return new Promise((resolve) => {
    // Simulate 300ms network delay
    setTimeout(() => {
      resolve([...mockSeriesList])
    }, 300)
  })
}
```

## Usage

### In API Service

```typescript
import { getSeriesListMock } from '../mocks'

class ApiService {
  async getSeriesList(): Promise<SeriesApiResponse[]> {
    // Use mock during development
    return await getSeriesListMock()
    
    // Switch to real API when ready:
    // return this.callAction<SeriesApiResponse[]>('getSeriesList')
  }
}
```

### In Tests

```typescript
import { mockSeriesList } from '@/mocks'

test('should display series', () => {
  // Use raw data directly in tests
  expect(mockSeriesList).toHaveLength(19)
})
```

## Adding New Mock Data

1. **Create a new mock file**:

```typescript
// list-events.ts
import { EventApiResponse } from '../types/domain'

export const mockEventsList: EventApiResponse[] = [
  // Your mock data here
]

export function getEventsListMock(): Promise<EventApiResponse[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockEventsList]), 300)
  })
}
```

2. **Export from index.ts**:

```typescript
export { mockEventsList, getEventsListMock } from './list-events'
```

3. **Use in API service**:

```typescript
import { getEventsListMock } from '../mocks'

async getEventsList(): Promise<EventApiResponse[]> {
  return await getEventsListMock()
}
```

## Benefits

✅ **Type-safe** - Full TypeScript support
✅ **Reliable** - No 404 errors or server configuration issues  
✅ **Realistic** - Simulates network delays with Promises  
✅ **Testable** - Can import raw data directly in tests  
✅ **Flexible** - Easy to add conditional logic or error scenarios  

## Customizing Behavior

### Simulate Errors

```typescript
export function getSeriesListMock(shouldFail = false): Promise<SeriesApiResponse[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock API error'))
      } else {
        resolve([...mockSeriesList])
      }
    }, 300)
  })
}
```

### Adjust Delay

```typescript
export function getSeriesListMock(delay = 300): Promise<SeriesApiResponse[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockSeriesList]), delay)
  })
}
```

### Filter Data

```typescript
export function getSeriesListMock(status?: string): Promise<SeriesApiResponse[]> {
  return new Promise((resolve) => {
    const filtered = status 
      ? mockSeriesList.filter(s => s.seriesStatus === status)
      : mockSeriesList
    setTimeout(() => resolve([...filtered]), 300)
  })
}
```

## Migration to Real API

When backend endpoints are ready, switching from mock to real API is simple:

**Before (Mock):**
```typescript
import { getSeriesListMock } from '../mocks'

async getSeriesList(): Promise<SeriesApiResponse[]> {
  return await getSeriesListMock()
}
```

**After (Real API):**
```typescript
// Remove the import
// import { getSeriesListMock } from '../mocks'

async getSeriesList(): Promise<SeriesApiResponse[]> {
  return this.callAction<SeriesApiResponse[]>('getSeriesList')
}
```

## Best Practices

1. **Match Real API Structure** - Mock data should match the actual API response format
2. **Use TypeScript Types** - Import and use the proper types from `domain.ts`
3. **Keep Data Realistic** - Use realistic values and edge cases
4. **Document Changes** - Update this README when adding new mocks
5. **Version Control** - Commit mock data so the team can develop consistently

## See Also

- `/docs/API_CENTRALIZATION.md` - Complete API architecture documentation
- `/web-src/src/services/api.ts` - API service implementation
- `/web-src/src/types/domain.ts` - Type definitions

