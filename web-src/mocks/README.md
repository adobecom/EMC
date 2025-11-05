# Mock Data (Static Files)

This directory contains static JSON mock data files for reference and backwards compatibility.

## Current Status

✅ **Active Mock System:** JavaScript/TypeScript modules in `/web-src/src/mocks/`

This directory (`/web-src/mocks/`) is now **deprecated** for active use. We've migrated to using TypeScript mock modules instead of static JSON files for better reliability and type safety.

## Why the Change?

Static JSON files had issues with dev server configuration and file serving. TypeScript mock modules are:
- ✅ More reliable (no 404 errors)
- ✅ Type-safe
- ✅ Can simulate network delays
- ✅ Easier to maintain
- ✅ Work regardless of dev server setup

## How Mock Data Works Now

Mock data is defined in TypeScript files under `/web-src/src/mocks/`:

```
/web-src/src/mocks/
├── index.ts              # Export hub for all mocks
├── list-series.ts        # Series list mock data + function
└── [future mocks].ts
```

Each mock file exports:
1. The raw data array
2. A function that returns a Promise

Example:
```typescript
export const mockSeriesList: SeriesApiResponse[] = [...]
export function getSeriesListMock(): Promise<SeriesApiResponse[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockSeriesList]), 300)
  })
}
```

## Reference

The JSON files here can be kept as reference or for backend testing, but they are **not used by the frontend application**.

See `/docs/API_CENTRALIZATION.md` for complete documentation on the mock system.

