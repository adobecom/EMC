# Mock Data Migration Summary

## Problem

The Series Dashboard was attempting to fetch mock data from `/mocks/list-series.json`, which resulted in a 404 error because:
1. The dev server serves files from `/web-src/` as the root
2. Static JSON file serving configuration was inconsistent
3. Fetch API couldn't reliably access the mock data

## Solution

Migrated from **static JSON files** to **TypeScript mock modules** that export functions returning Promises.

## Changes Made

### 1. Created TypeScript Mock Module

**File:** `/web-src/src/mocks/list-series.ts`
- Exports `mockSeriesList` array with all 19 series
- Exports `getSeriesListMock()` function that returns a Promise
- Simulates 300ms network delay
- Fully type-safe with `SeriesApiResponse` type

### 2. Created Mock Module Index

**File:** `/web-src/src/mocks/index.ts`
- Central export hub for all mock modules
- Makes imports cleaner: `import { getSeriesListMock } from '../mocks'`
- Ready for future mock additions

### 3. Updated API Service

**File:** `/web-src/src/services/api.ts`
- Changed from `fetch('/mocks/list-series.json')` to `getSeriesListMock()`
- Removed dependency on static file serving
- Added clear TODO comments for switching to real API
- Improved error handling and logging

### 4. Documentation

Created/Updated:
- `/web-src/src/mocks/README.md` - Complete guide for mock modules
- `/web-src/mocks/README.md` - Explains deprecation of static files
- `/docs/API_CENTRALIZATION.md` - Updated with new mock approach

## Benefits of New Approach

✅ **Reliable** - No 404 errors or server configuration issues  
✅ **Type-Safe** - Full TypeScript support with compile-time checks  
✅ **Realistic** - Simulates network delays with Promises  
✅ **Testable** - Can import raw data directly in unit tests  
✅ **Flexible** - Easy to add conditional logic, filters, or error scenarios  
✅ **Maintainable** - Easier to update and version control  

## File Structure

```
/web-src/
├── mocks/                    # Deprecated static files (kept as reference)
│   ├── README.md             # Explains deprecation
│   └── list-series.json      # Original JSON file
└── src/
    ├── mocks/                # ✅ Active TypeScript mock modules
    │   ├── README.md         # Usage guide
    │   ├── index.ts          # Central exports
    │   └── list-series.ts    # Series mock with Promise
    └── services/
        └── api.ts            # Uses TypeScript mocks
```

## How to Use

### Current (Mock)
```typescript
import { getSeriesListMock } from '../mocks'

async getSeriesList(): Promise<SeriesApiResponse[]> {
  return await getSeriesListMock()
}
```

### Future (Real API)
```typescript
// Remove mock import
async getSeriesList(): Promise<SeriesApiResponse[]> {
  return this.callAction<SeriesApiResponse[]>('getSeriesList')
}
```

## Testing

The Series Dashboard should now:
1. ✅ Load without 404 errors
2. ✅ Display all 19 series from mock data
3. ✅ Show a 300ms loading state (simulated network delay)
4. ✅ Log "Successfully loaded series data: 19 items" to console

## Next Steps

When backend API is ready:
1. Remove the mock import from `api.ts`
2. Update `getSeriesList()` to use `this.callAction()`
3. Add action URL to `config.json`
4. Test with real backend
5. Keep mock modules for unit tests

## Adding More Mocks

Template for new mock modules:

```typescript
// /web-src/src/mocks/list-{resource}.ts
import { ResourceApiResponse } from '../types/domain'

export const mock{Resource}List: ResourceApiResponse[] = [...]

export function get{Resource}ListMock(): Promise<ResourceApiResponse[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mock{Resource}List]), 300)
  })
}
```

Then export from `index.ts` and use in `api.ts`.

## Migration Complete ✅

The Series Dashboard now uses reliable TypeScript mock modules instead of static JSON files.

