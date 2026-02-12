# Cache and Throttling Implementation Summary

This document summarizes the implementation of caching and throttling utilities following the patterns from `throttling.md`.

## ✅ Implementation Complete

### 1. **cacheUtils.ts** - Core Utilities
Location: `web-src/src/services/cacheUtils.ts`

**Implemented Features:**
- ✅ `apiCache` - Function-based memoization with request deduplication
- ✅ `throttle` - Rate limiting with leading/trailing edge execution
- ✅ `debounce` - Wait until user stops activity
- ✅ `debounceCancellable` - Debounce with cancel capability
- ✅ `fetchThrottledMemoizedText` - URL-based cache for text responses
- ✅ `fetchThrottledMemoizedJSON` - URL-based cache for JSON responses

**Key Features:**
- 10-second default cache timeout (configurable)
- Request deduplication (multiple calls = 1 API request)
- Pattern-based cache invalidation
- Auto-expiration for URL-based caches

### 2. **cachedApi** - Cached API Service
Location: `web-src/src/services/api.ts` (lines ~1680+)

**Implemented:**
- ✅ All GET operations wrapped with `apiCache.get()`
- ✅ Automatic cache invalidation on mutations
- ✅ Utility methods: `clearCache()`, `invalidateCache()`, `getCacheStats()`, `setCacheTimeout()`

**Usage:**
```typescript
import { cachedApi } from './services/api'

// GET operations (cached)
const events = await cachedApi.getEventsList()
const series = await cachedApi.getSeriesList()

// Mutations (with auto cache invalidation)
await cachedApi.createEvent(data, locale) // Invalidates events cache
await cachedApi.updateSeries(id, data) // Invalidates series cache
```

### 3. **ResourceDashboardLayout** - Updated to Use Standard Debounce
Location: `web-src/src/components/shared/ResourceDashboardLayout.tsx`

**Updated:**
- ✅ Now uses `debounce` utility from `cacheUtils.ts`
- ✅ Follows throttling.md pattern (300ms delay for search)
- ✅ Proper React integration with `useMemo`

### 4. **Browser Console Helpers**
Available in browser console:
- `clearApiCache()` - Clear all cached API responses
- `getApiCacheStats()` - View cache statistics
- `cachedApi` - Access cached API service
- `apiCache` - Direct access to cache utility

## 📋 Pattern Compliance

### ✅ Follows throttling.md Patterns:

1. **API Cache Pattern** ✅
   - IIFE module pattern
   - Three-layer request logic (cache → pending → new request)
   - Function name + args key generation
   - Time-based expiration
   - Pattern-based invalidation

2. **Throttle Pattern** ✅
   - Hybrid throttle (leading + trailing edge)
   - Smart delay calculation
   - Context preservation with `apply()`

3. **Debounce Pattern** ✅
   - Simple debounce implementation
   - Cancellable variant available
   - Proper cleanup

4. **URL-Based Cache** ✅
   - fetchThrottledMemoizedText
   - fetchThrottledMemoizedJSON
   - Configurable TTL
   - Auto-expiration

## 🔧 Configuration

### Cache Timeout
```typescript
// Default: 10 seconds
apiCache.setCacheTimeout(30000) // Set to 30 seconds

// Or via cachedApi
cachedApi.setCacheTimeout(30000)
```

### Debounce Delay
```typescript
// Search: 300ms (as per throttling.md)
const debouncedSearch = debounce(handler, 300)

// Auto-save: 500ms-1000ms
const debouncedSave = debounce(handler, 1000)
```

### Throttle Delay
```typescript
// Scroll/resize: 100-200ms
const throttledHandler = throttle(handler, 200)

// Button clicks: 300ms
const throttledClick = throttle(handler, 300)
```

## 📊 Cache Statistics

Monitor cache usage:
```typescript
const stats = cachedApi.getCacheStats()
console.log(stats)
// {
//   size: 15,           // Number of cached entries
//   pendingSize: 2,     // Number of pending requests
//   keys: [...]         // Array of cache keys
// }
```

## 🧹 Cache Management

### Clear All Cache
```typescript
// On logout or major state change
cachedApi.clearCache()
```

### Invalidate Specific Patterns
```typescript
// After updating an event
cachedApi.invalidateCache('event-123')

// After updating series
cachedApi.invalidateCache('series-456')

// After any event mutation
cachedApi.invalidateCache('getEventsList')
```

## 🎯 Usage Examples

### Example 1: Caching Event Images
```typescript
// Multiple components request same event images
const images1 = await cachedApi.getEventImages(eventId)
const images2 = await cachedApi.getEventImages(eventId)
// Only 1 API call made, both get same cached result
```

### Example 2: Cascading Cached Calls
```typescript
// First call fetches and caches
const event = await cachedApi.getEvent(eventId)

// Second call uses cache
const event2 = await cachedApi.getEvent(eventId) // From cache

// Related data also cached
const history = await cachedApi.getEventHistory(eventId)
```

### Example 3: Cache Invalidation on Mutation
```typescript
// Update event
await cachedApi.updateEvent(eventId, data)
// Cache automatically invalidated for:
// - getEvent(eventId)
// - getEventsList()
```

### Example 4: Throttled Event Handler
```typescript
import { throttle } from './services/cacheUtils'

const handleScroll = throttle(() => {
  updateScrollPosition()
}, 200)

window.addEventListener('scroll', handleScroll)
```

### Example 5: Debounced Search
```typescript
import { debounce } from './services/cacheUtils'

const handleSearch = debounce((query: string) => {
  performSearch(query)
}, 500)

searchInput.addEventListener('input', (e) => {
  handleSearch(e.target.value)
})
```

## ✅ Testing Checklist

- [x] Cache stores and retrieves data correctly
- [x] Request deduplication works (multiple calls = 1 request)
- [x] Cache expiration works (10-second timeout)
- [x] Cache invalidation works (pattern matching)
- [x] Throttle limits execution rate correctly
- [x] Debounce waits for inactivity correctly
- [x] React integration works (ResourceDashboardLayout)
- [x] No linting errors
- [x] Browser console helpers work

## 📝 Notes

- Cache timeout is configurable but defaults to 10 seconds as per throttling.md
- All GET operations are cached automatically via `cachedApi`
- Mutations automatically invalidate related cache entries
- URL-based caches (fetchThrottledMemoizedText/JSON) use configurable TTL
- React components use `useMemo` to maintain stable debounced/throttled function references

## 🔗 Related Files

- `throttling.md` - Original documentation and patterns
- `web-src/src/services/cacheUtils.ts` - Core utilities
- `web-src/src/services/api.ts` - Cached API service wrapper
- `web-src/src/components/shared/ResourceDashboardLayout.tsx` - Example usage

