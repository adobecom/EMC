# API Centralization Guide

## Overview

This document describes the centralized API management system for the EMC (Experience Makers Connect) application. The system provides a single point of control for all API calls, making it easier to manage, test, and maintain backend integrations.

## Architecture

### API Service Layer (`/web-src/src/services/api.ts`)

The `ApiService` class is a singleton service that handles all external API calls. It provides:

1. **Centralized Configuration**: All API endpoints and authentication headers are managed in one place
2. **Type Safety**: Full TypeScript support with strongly-typed responses
3. **Mock Support**: Easy integration with mock data for development and testing
4. **Consistent Error Handling**: Standardized error handling across all API calls

### Key Features

#### 1. Authentication Management
```typescript
apiService.setAuthHeaders(token, org)
```
Automatically sets authentication headers for all API calls.

#### 2. Action URL Configuration
```typescript
apiService.setActionUrls(urls)
```
Configures backend action URLs from the config.json file.

#### 3. Generic API Call Method
```typescript
private async callAction<T>(actionName, params, method)
```
Internal method that handles all API calls with consistent error handling and response parsing.

## Series List API Implementation

### New Types (`/web-src/src/types/domain.ts`)

#### `SeriesApiResponse`
Represents the raw series data from the backend API:

```typescript
interface SeriesApiResponse {
  seriesId: string
  seriesName: string
  seriesDescription?: string
  seriesStatus: 'published' | 'draft' | 'archived'
  cloudType: string
  targetCms: TargetCms
  templateId: string
  externalThemeId?: string
  relatedDomain?: string
  creationTime: number
  modificationTime: number
}
```

#### `SeriesDashboardItem`
Enhanced type for dashboard display with additional fields:

```typescript
interface SeriesDashboardItem {
  seriesId: string
  seriesName: string
  seriesDescription?: string
  seriesStatus: 'published' | 'draft' | 'archived' | 'unknown'
  cloudType: string
  creationTime: number
  modificationTime: number
  createdBy?: string          // To be fetched from separate endpoint
  modifiedBy?: string         // To be fetched from separate endpoint
  eventCount?: number         // To be fetched from separate endpoint
}
```

### API Methods

#### `getSeriesList()`
Fetches the list of all series. Currently uses mock data from `/mocks/list-series.json`.

```typescript
async getSeriesList(): Promise<SeriesApiResponse[]>
```

**Usage:**
```typescript
const seriesList = await apiService.getSeriesList()
```

#### `getSeriesDetails(seriesId)`
Placeholder for fetching individual series details including created/modified by information.

```typescript
async getSeriesDetails(seriesId: string): Promise<SeriesDashboardItem | null>
```

**Status:** Not yet implemented - requires backend endpoint

## Series Dashboard Component

### Location
`/web-src/src/components/SeriesDashboard.tsx`

### Features

1. **Data Display**
   - Series Name (with description)
   - Status (with colored badges)
   - Cloud Type
   - Last Modified (formatted date)
   - Created (formatted date)
   - Created By (placeholder - "N/A")
   - Modified By (placeholder - "N/A")
   - Event Count (placeholder - "-")

2. **Actions**
   - View series details
   - Edit series
   - Delete series (placeholder)
   - Refresh data
   - Create new series

3. **UI Components**
   - Spectrum 2 compliant DataTable
   - StatusBadge for visual status indicators
   - LoadingSpinner for async operations
   - Empty state with call-to-action
   - Error state with retry option

### Navigation

The Series Dashboard is accessible at:
- **Route:** `/series`
- **Navigation:** Top navigation bar → "Series" link

## Using Mock Data

### Development Setup

The application uses JavaScript/TypeScript mock modules for API responses during development. This approach is more reliable than fetching JSON files and doesn't depend on dev server configuration.

**Location:** `/web-src/src/mocks/`

All mock functions return Promises to simulate real API calls, including a small delay to mimic network latency.

### Mock Data Structure

Mock modules are located in `/web-src/src/mocks/` and export both the data and a function that returns a Promise:

**Example: `/web-src/src/mocks/list-series.ts`**

```typescript
export const mockSeriesList: SeriesApiResponse[] = [...]

export function getSeriesListMock(): Promise<SeriesApiResponse[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockSeriesList]), 300)
  })
}
```

The mock data contains an array of series objects matching the `SeriesApiResponse` interface:

```json
[
  {
    "seriesId": "f69a42a6-d393-4734-b868-4ea91e5a52e2",
    "seriesName": "Ask me anything",
    "seriesDescription": "DMe Community Event Series...",
    "seriesStatus": "published",
    "cloudType": "CreativeCloud",
    "targetCms": {
      "provider": "sharepoint",
      "instance": "acom",
      "code": "sp-acom"
    },
    "creationTime": 1753219416683,
    "modificationTime": 1760379841615
  }
]
```

### Switching to Real API

To switch from mock data to real API:

1. **Remove the mock import** from `api.ts`:
```typescript
// Remove this line:
import { getSeriesListMock } from '../mocks'
```

2. **Update the `getSeriesList()` method** in `api.ts`:
```typescript
async getSeriesList(): Promise<SeriesApiResponse[]> {
  return this.callAction<SeriesApiResponse[]>('getSeriesList')
}
```

3. **Add the action URL** to `config.json`:
```json
{
  "actions": {
    "getSeriesList": "https://your-api.com/series"
  }
}
```

### Adding New Mock Data

To add mock data for a new API endpoint:

1. **Create a new mock file** in `/web-src/src/mocks/`:
```typescript
// /web-src/src/mocks/list-events.ts
import { EventApiResponse } from '../types/domain'

export const mockEventsList: EventApiResponse[] = [...]

export function getEventsListMock(): Promise<EventApiResponse[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockEventsList]), 300)
  })
}
```

2. **Export from index**:
```typescript
// /web-src/src/mocks/index.ts
export { mockEventsList, getEventsListMock } from './list-events'
```

3. **Use in API service**:
```typescript
import { getEventsListMock } from '../mocks'

async getEventsList(): Promise<EventApiResponse[]> {
  return await getEventsListMock()
}
```

## Future Enhancements

### Planned API Integrations

1. **Individual Series Details**
   - Endpoint to fetch series with created/modified by information
   - Implementation needed in `getSeriesDetails()`

2. **Event Count**
   - Fetch event count for each series
   - Can be done as batch operation or individual calls

3. **User Information**
   - Map user IDs to user names for Created By / Modified By fields
   - May require additional user API endpoint

### Implementation Steps

1. **Add Backend Endpoints**
   - Create endpoint for series details with user info
   - Create endpoint for series event count

2. **Update API Service**
   ```typescript
   async getSeriesWithDetails(seriesId: string): Promise<SeriesDashboardItem> {
     const [series, events, creator, modifier] = await Promise.all([
       this.getSeriesById(seriesId),
       this.getEvents(seriesId),
       this.getUserById(series.createdBy),
       this.getUserById(series.modifiedBy)
     ])
     
     return {
       ...series,
       eventCount: events.length,
       createdBy: creator.name,
       modifiedBy: modifier.name
     }
   }
   ```

3. **Update Dashboard Component**
   - Add batch loading for series details
   - Implement progressive loading (show basic info first, then enrich)
   - Add caching to avoid repeated API calls

## Best Practices

### Error Handling
Always wrap API calls in try-catch blocks:

```typescript
try {
  const data = await apiService.getSeriesList()
  // Handle success
} catch (error) {
  console.error('Error loading series:', error)
  // Handle error
}
```

### Loading States
Show loading indicators while fetching data:

```typescript
const [isLoading, setIsLoading] = useState(true)
// ... fetch data ...
setIsLoading(false)
```

### Type Safety
Always use the typed interfaces:

```typescript
const [series, setSeries] = useState<SeriesDashboardItem[]>([])
```

### Memoization
Use React hooks for expensive computations:

```typescript
const formattedDate = useMemo(() => 
  formatDate(item.modificationTime), 
  [item.modificationTime]
)
```

## Testing

### Testing with Mock Data

The mock data setup makes it easy to test the UI without a backend:

1. Modify `/mocks/list-series.json` to test different scenarios
2. Add edge cases (empty descriptions, missing fields, etc.)
3. Test different status types and date ranges

### Future: Integration Testing

When real API endpoints are available:

1. Create separate test environment
2. Use environment variables to switch between mock and real data
3. Implement API response validation
4. Add error scenario testing

## Summary

The centralized API management system provides:

✅ Single source of truth for API calls  
✅ Type-safe API interactions  
✅ Easy mock data integration  
✅ Consistent error handling  
✅ Scalable architecture  
✅ Spectrum 2 compliant UI components  

The Series Dashboard is now fully functional with mock data and ready for real API integration when backend endpoints are available.

