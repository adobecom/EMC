# API Caching, Deduplication & Memory Leak Prevention

## Overview

This implementation provides production-ready API caching, data deduplication, and memory leak prevention across the application.

## 1. Triple-Layer Deduplication

**Problem:** React errors due to duplicate keys in lists, caused by backend data inconsistencies.

**Solution:** Three defensive layers ensure unique data at every stage.

### Layer 1: API Boundary (`cachedApi`)
All list/batch GET methods automatically deduplicate before returning data.

```typescript
// In api.ts
getEventsList: async () => {
  const result = await apiCache.get(() => apiService.getEventsList())
  return deduplicateBy(result, (e) => e.eventId, {
    warnOnDuplicates: true,
    logPrefix: 'cachedApi.getEventsList'
  })
}
```

### Layer 2: DataTable Component
Final safety net before rendering. Uses the same `deduplicateBy` utility.

```typescript
// In DataTable.tsx
const deduplicatedData = useMemo(() => {
  return deduplicateBy(data, getItemKey, { logPrefix: '[DataTable]' })
}, [data, getItemKey])
```

### Layer 3: React Keys
Native React duplicate detection provides the final check.

**Files:**
- `web-src/src/utils/deduplication.ts` - Core utilities
- `web-src/src/services/api.ts` - API boundary deduplication
- `web-src/src/components/shared/DataTable.tsx` - Component-level deduplication

---

## 2. Production-Grade API Caching

**Problem:** Redundant API calls and potential race conditions.

**Solution:** Robust caching layer with LRU eviction, stable keys, and deep cloning.

### Features

#### Request Deduplication
Multiple simultaneous calls to the same endpoint share one request.

```typescript
// 3 components call this at once → only 1 network request
const events1 = await cachedApi.getEventsList()
const events2 = await cachedApi.getEventsList() 
const events3 = await cachedApi.getEventsList()
```

#### LRU Cache Eviction
Automatically evicts oldest entries when cache reaches limit (default: 100 entries).

#### Stable Cache Keys
Uses `stableStringify` to ensure consistent cache keys regardless of object property order.

```typescript
// These produce the same cache key
apiCache.get(fn, { id: 1, name: 'test' })
apiCache.get(fn, { name: 'test', id: 1 })
```

#### Deep Cloning
All cached data is cloned on return to prevent mutations.

```typescript
const data = await cachedApi.getEventsList()
data.push({ ... }) // Won't affect cache
```

#### Pattern-Based Invalidation
Mutations automatically clear related cache entries.

```typescript
// Clears all cache entries matching 'getEvent*'
apiCache.invalidate('getEvent')
```

### Usage

**GET Operations** (use `cachedApi`):
```typescript
// ✅ Cached, deduplicated, cloned
const events = await cachedApi.getEventsList()
```

**Mutations** (use `apiService`):
```typescript
// ✅ Automatically invalidates related cache
await apiService.updateEvent(eventId, data)
```

### Browser Console Helpers

```javascript
clearApiCache()           // Clear all cached data
getApiCacheStats()        // View cache stats (size, hits, misses)
resetCacheStats()         // Reset analytics counters
invalidateApiCache('getEvent') // Clear specific entries
```

**Files:**
- `web-src/src/services/cacheUtils.ts` - Cache implementation
- `web-src/src/services/api.ts` - `cachedApi` wrapper and invalidation

---

## 3. Memory Leak Prevention

**Problem:** React warnings about state updates on unmounted components.

**Solution:** Consistent cancellation pattern across all async operations in `useEffect`.

### The Pattern

**For functions called ONLY from useEffect:**
```typescript
useEffect(() => {
  let cancelled = false
  
  const fetchData = async () => {
    const data = await api.getData()
    if (cancelled) return // Guard state updates
    setData(data)
  }
  
  fetchData()
  
  return () => {
    cancelled = true // Cleanup
  }
}, [])
```

**For functions called from useEffect AND user actions (buttons):**
```typescript
const loadData = async (signal?: { cancelled: boolean }) => {
  setLoading(true)
  const data = await api.getData()
  
  if (signal?.cancelled) return // Guard if signal provided
  
  setData(data)
  if (!signal?.cancelled) setLoading(false)
}

// From useEffect - with signal
useEffect(() => {
  const signal = { cancelled: false }
  loadData(signal)
  return () => { signal.cancelled = true }
}, [])

// From button - no signal
<Button onPress={() => loadData()}>Retry</Button>
```

### Why This Works

- **Local scope:** Each effect has its own `cancelled` flag, no interference
- **Mutable object:** `signal` object can be mutated in cleanup, affecting in-flight requests
- **Optional:** User actions don't need cancellation (user is actively present)

**Files Fixed:**
- `web-src/src/pages/AttendeeDashboard/AttendeeDashboard.tsx`
- `web-src/src/pages/CloudManagementConsole/CloudManagementConsole.tsx`
- `web-src/src/pages/OverviewDashboard/OverviewDashboard.tsx`
- `web-src/src/pages/SpeakersDashboard/SpeakersDashboard.tsx`
- `web-src/src/pages/EventsDashboard/EventsDashboard.tsx`
- `web-src/src/pages/SeriesDashboard/SeriesDashboard.tsx`
- `web-src/src/pages/AttendeeDashboard/EventInfoComponent.tsx`

---

## 4. Migration Summary

### Before
```typescript
// ❌ No caching, no deduplication, no cleanup
const events = await apiService.getEventsList()

useEffect(() => {
  fetchData() // Memory leak - no cleanup
}, [])
```

### After
```typescript
// ✅ Cached, deduplicated, properly cleaned up
const events = await cachedApi.getEventsList()

useEffect(() => {
  let cancelled = false
  const fetch = async () => {
    const data = await cachedApi.getData()
    if (cancelled) return
    setData(data)
  }
  fetch()
  return () => { cancelled = true }
}, [])
```

### Files Updated
17 files migrated from `apiService` to `cachedApi` for GET operations:
- All dashboard components
- All form components  
- Custom hooks
- Service layers

---

## 5. Key Utilities

### `deduplicateBy<T>`
Generic deduplication function with optional logging.

```typescript
const unique = deduplicateBy(
  items,
  (item) => item.id,
  { warnOnDuplicates: true, logPrefix: 'MyComponent' }
)
```

### `stableStringify`
Order-independent object stringification for cache keys.

```typescript
stableStringify({ b: 2, a: 1 }) === stableStringify({ a: 1, b: 2 })
// true
```

### `apiCache.get`
Function-based memoization with automatic deduplication.

```typescript
const data = await apiCache.get(
  (id: string) => apiService.getEvent(id),
  eventId
)
```

---

## 6. Configuration

### Cache Settings
```typescript
// In cacheUtils.ts
apiCache.setCacheTimeout(15000)     // Set to 15 seconds (default: 10s)
apiCache.setMaxCacheSize(200)       // Set max entries (default: 100)
```

### Analytics
```typescript
const stats = apiCache.getStats()
// {
//   size: 45,              // Current cache entries
//   pendingSize: 2,        // In-flight requests
//   hitCount: 234,         // Cache hits
//   missCount: 45,         // Cache misses
//   evictionCount: 12      // LRU evictions
// }
```

---

## 7. Best Practices

### ✅ DO
- Use `cachedApi` for all GET operations
- Use `apiService` for all mutations (POST/PUT/DELETE)
- Always add cleanup to `useEffect` with async operations
- Check for cancellation after every `await`

### ❌ DON'T
- Don't use `cachedApi` for mutations
- Don't use `apiService` for GET operations (unless you need fresh data)
- Don't mutate data received from `cachedApi` (it's already cloned, but bad practice)
- Don't skip cleanup in `useEffect` with async code

---

## 8. Troubleshooting

### "Encountered two children with the same key"
**Cause:** Backend returning duplicate data  
**Solution:** Check console for deduplication warnings, fix backend data

### Memory leak warnings
**Cause:** Missing cleanup in `useEffect`  
**Solution:** Add `cancelled` flag and guard all state updates

### Stale cache data
**Cause:** Cache not invalidated after mutation  
**Solution:** Ensure mutation uses `apiService`, not `cachedApi`

### Cache growing too large
**Cause:** Many unique API calls  
**Solution:** Increase `maxCacheSize` or reduce cache timeout

---

## Documentation

- **Caching Details:** `web-src/src/services/CACHE_IMPLEMENTATION.md`
- **Throttling Patterns:** `throttling.md`
- **This Guide:** `IMPLEMENTATION_GUIDE.md`

