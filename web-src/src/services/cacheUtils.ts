/* 
* Cache and Throttling Utilities
* 
* Implements caching, throttling, and debouncing patterns as per ECC project standards.
* Based on throttling.md documentation.
* 
* Features:
* - API Cache: Function-based memoization with request deduplication
* - Throttle: Rate limiting with leading and trailing edge execution
* - Debounce: Wait until user stops activity
* - Fetch Throttled Memoized Text: URL-based cache with configurable TTL
*/

// ============================================================================
// API CACHE SYSTEM (Function-Based Memoization)
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Stable stringify - sorts object keys for consistent serialization
 * Prevents cache misses due to property ordering differences
 */
function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return String(obj)
  if (typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  
  const keys = Object.keys(obj).sort()
  const pairs = keys.map(key => `"${key}":${stableStringify(obj[key])}`)
  return `{${pairs.join(',')}}`
}

/**
 * Deep clone helper - prevents cache mutation bugs
 * Uses native structuredClone (fast) with JSON fallback
 */
function deepClone<T>(data: T): T {
  if (data === null || data === undefined) return data
  
  try {
    if (typeof structuredClone !== 'undefined') {
      return structuredClone(data)
    }
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.warn('⚠️ Cache clone failed, returning original:', error)
    return data
  }
}

/**
 * API Cache - Caches function results with request deduplication
 * 
 * Features:
 * - Time-based expiration (default 10 seconds)
 * - Request deduplication (multiple calls = 1 API request)
 * - Pattern-based invalidation
 * - Manual cache clearing
 * 
 * @example
 * // Basic usage
 * const data = await apiCache.get(getEventsList)
 * 
 * // With arguments
 * const event = await apiCache.get(getEventById, eventId)
 * 
 * // Invalidate after mutation
 * await updateEvent(eventId, data)
 * apiCache.invalidate(eventId)
 */
export const apiCache = (() => {
  const cache = new Map<string, CacheEntry<any>>()
  const pendingRequests = new Map<string, Promise<any>>()
  let cacheTimeout = 10000 // 10 seconds default
  const MAX_CACHE_SIZE = 100
  
  // Cache analytics
  const stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    getHitRate(): number {
      const total = this.hits + this.misses
      return total === 0 ? 0 : (this.hits / total) * 100
    },
    reset(): void {
      this.hits = 0
      this.misses = 0
      this.evictions = 0
    }
  }

  /**
   * Generate cache key from function signature and arguments
   * Uses stable stringify for consistent key generation
   */
  const generateKey = (apiFunction: Function, ...args: any[]): string => {
    // Use function code signature instead of name (survives minification)
    const funcSignature = apiFunction.toString().slice(0, 100).replace(/\s+/g, '')
    const argsKey = stableStringify(args)
    return `${funcSignature}_${argsKey}`
  }

  /**
   * Check if cache entry is expired
   */
  const isExpired = (timestamp: number): boolean => {
    return Date.now() - timestamp > cacheTimeout
  }
  
  /**
   * Evict least recently used entry when cache is full
   */
  const evictLRU = (): void => {
    if (cache.size < MAX_CACHE_SIZE) return
    
    let lruKey: string | null = null
    let lruTime = Infinity
    
    cache.forEach((entry, key) => {
      if (entry.timestamp < lruTime) {
        lruTime = entry.timestamp
        lruKey = key
      }
    })
    
    if (lruKey) {
      cache.delete(lruKey)
      stats.evictions++
    }
  }

  return {
    /**
     * Get cached result or fetch fresh data
     * Implements 3-layer logic with single clone at boundary
     * 1. Return from cache if valid (cloned to prevent mutations)
     * 2. Return pending request if exists (deduplication)
     * 3. Make new request and cache result
     */
    async get<T>(apiFunction: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
      const key = generateKey(apiFunction, ...args)

      // Layer 1: Check cache
      if (cache.has(key)) {
        const { data, timestamp } = cache.get(key)!
        if (!isExpired(timestamp)) {
          stats.hits++
          return deepClone(data) as T  // Clone at boundary
        }
        cache.delete(key) // Expired, remove it
      }

      stats.misses++

      // Layer 2: Request deduplication - return pending request if exists
      if (pendingRequests.has(key)) {
        // Wait for pending request, then clone the result
        return pendingRequests.get(key)!.then(data => deepClone(data) as T)
      }

      // Layer 3: Make new request
      const request = apiFunction(...args)
        .then((data) => {
          // Evict LRU entry if cache is full
          evictLRU()
          
          // Store original in cache (no clone)
          cache.set(key, { data, timestamp: Date.now() })
          pendingRequests.delete(key)
          
          // Return clone to caller
          return deepClone(data)
        })
        .catch((error) => {
          pendingRequests.delete(key)
          throw error
        })

      pendingRequests.set(key, request)
      return request
    },

    /**
     * Clear all cached data and pending requests
     * Use when: user logs out, major app state change
     */
    clear(): void {
      cache.clear()
      pendingRequests.clear()
    },

    /**
     * Invalidate cache entries matching a pattern
     * Use when: specific data is updated/deleted
     * 
     * @example
     * apiCache.invalidate('event-123') // Removes all cached data for that event
     * apiCache.invalidate('getEventsList') // Removes all event list cache entries
     */
    invalidate(pattern: string): void {
      const keysToDelete: string[] = []
      cache.forEach((_, key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach((key) => cache.delete(key))
    },

    /**
     * Set cache timeout (in milliseconds)
     * Default is 10 seconds
     */
    setCacheTimeout(timeout: number): void {
      cacheTimeout = timeout
    },

    /**
     * Get current cache timeout
     */
    getCacheTimeout(): number {
      return cacheTimeout
    },

    /**
     * Get cache statistics for debugging/monitoring
     */
    getStats(): { 
      size: number
      pendingSize: number
      hits: number
      misses: number
      evictions: number
      hitRate: number
      maxSize: number
      keys: string[]
    } {
      return {
        size: cache.size,
        pendingSize: pendingRequests.size,
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions,
        hitRate: stats.getHitRate(),
        maxSize: MAX_CACHE_SIZE,
        keys: Array.from(cache.keys())
      }
    },
    
    /**
     * Reset cache statistics
     */
    resetStats(): void {
      stats.reset()
    }
  }
})()

// ============================================================================
// THROTTLE FUNCTION
// ============================================================================

/**
 * Throttle - Limits function execution rate
 * 
 * Hybrid throttle that combines:
 * 1. Leading edge execution: Runs immediately on first call
 * 2. Trailing edge execution: Ensures last call eventually executes
 * 
 * @param func - Function to throttle
 * @param delay - Minimum time between executions (milliseconds)
 * @returns Throttled function
 * 
 * @example
 * // Throttle column sorting
 * const throttledSort = throttle(() => {
 *   sortData(data, config)
 * }, 300)
 * 
 * sortButton.addEventListener('click', throttledSort)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastExecTime = 0

  return function throttledFunction(this: any, ...args: Parameters<T>): void {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      // Enough time has passed - execute immediately
      func.apply(this, args)
      lastExecTime = currentTime
    } else {
      // Too soon - schedule for remaining time
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

// ============================================================================
// DEBOUNCE FUNCTION
// ============================================================================

/**
 * Debounce - Wait until user stops activity
 * 
 * Only executes after a period of inactivity.
 * Each call resets the timer.
 * 
 * @param func - Function to debounce
 * @param delay - Wait time after last call (milliseconds)
 * @returns Debounced function
 * 
 * @example
 * // Debounce search input
 * const debouncedSearch = debounce((query) => {
 *   performSearch(query)
 * }, 500)
 * 
 * searchInput.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value)
 * })
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debouncedFunction(this: any, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * Debounce with cancel capability
 * 
 * @param func - Function to debounce
 * @param delay - Wait time after last call (milliseconds)
 * @returns Object with call() and cancel() methods
 */
export function debounceCancellable<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): { call: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return {
    call(this: any, ...args: Parameters<T>): void {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    },
    cancel(): void {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }
}

// ============================================================================
// FETCH THROTTLED MEMOIZED TEXT (URL-Based Cache)
// ============================================================================

interface FetchCacheOptions {
  ttl?: number // Time to live in milliseconds, default 3000 (3 seconds)
}

/**
 * Fetch Throttled Memoized Text - URL-based cache with configurable TTL
 * 
 * Features:
 * - URL + options based caching
 * - Configurable TTL per request
 * - Request deduplication
 * - Auto-expiration with setTimeout
 * 
 * @param url - URL to fetch
 * @param options - Fetch options (method, headers, etc.)
 * @param cacheOptions - Cache options ({ ttl: number })
 * @returns Promise with text content or null on error
 * 
 * @example
 * // Basic usage
 * const html = await fetchThrottledMemoizedText('https://example.com/content.html')
 * 
 * // With custom TTL
 * const data = await fetchThrottledMemoizedText(
 *   'https://api.example.com/data',
 *   { method: 'GET', headers: { Authorization: 'Bearer token' } },
 *   { ttl: 60000 } // 1 minute cache
 * )
 */
export const fetchThrottledMemoizedText = (() => {
  const cache = new Map<string, string | null>()
  const pending = new Map<string, Promise<string | null>>()

  const memoize = async (
    url: string,
    options: RequestInit,
    fetcher: typeof fetch,
    ttl: number
  ): Promise<string | null> => {
    const key = `${url}-${JSON.stringify(options)}`

    // Check cache
    if (cache.has(key)) {
      return cache.get(key)!
    }

    // Request deduplication
    if (pending.has(key)) {
      return pending.get(key)!
    }

    // Make new request
    const fetchPromise = (async () => {
      try {
        const response = await fetcher(url, options)
        const text = response.ok ? await response.text() : null
        cache.set(key, text)
        setTimeout(() => cache.delete(key), ttl) // Auto-expire
        return text
      } finally {
        pending.delete(key)
      }
    })()

    pending.set(key, fetchPromise)
    return fetchPromise
  }

  return (
    url: string,
    options: RequestInit = {},
    { ttl = 3000 }: FetchCacheOptions = {}
  ): Promise<string | null> => memoize(url, options, fetch, ttl)
})()

/**
 * Fetch Throttled Memoized JSON - URL-based cache for JSON responses
 * Same as fetchThrottledMemoizedText but parses JSON
 */
export const fetchThrottledMemoizedJSON = (() => {
  const cache = new Map<string, any>()
  const pending = new Map<string, Promise<any>>()

  const memoize = async (
    url: string,
    options: RequestInit,
    fetcher: typeof fetch,
    ttl: number
  ): Promise<any> => {
    const key = `${url}-${JSON.stringify(options)}`

    // Check cache
    if (cache.has(key)) {
      return deepClone(cache.get(key))
    }

    // Request deduplication
    if (pending.has(key)) {
      return pending.get(key)!.then(data => deepClone(data))
    }

    // Make new request
    const fetchPromise = (async () => {
      try {
        const response = await fetcher(url, options)
        const json = response.ok ? await response.json() : null
        cache.set(key, json)
        setTimeout(() => cache.delete(key), ttl) // Auto-expire
        return deepClone(json)
      } finally {
        pending.delete(key)
      }
    })()

    pending.set(key, fetchPromise)
    return fetchPromise
  }

  return (
    url: string,
    options: RequestInit = {},
    { ttl = 3000 }: FetchCacheOptions = {}
  ): Promise<any> => memoize(url, options, fetch, ttl)
})()

// ============================================================================
// REACT HOOKS FOR THROTTLE/DEBOUNCE
// ============================================================================

/**
 * Creates a throttled callback for use in React components
 * Note: Import React's useCallback and useRef when using this
 * 
 * @example
 * const throttledHandler = useThrottledCallback(() => {
 *   handleScroll()
 * }, 200, [dependency])
 */
export function createThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return throttle(callback, delay) as T
}

/**
 * Creates a debounced callback for use in React components
 * 
 * @example
 * const debouncedSearch = createDebouncedCallback((query) => {
 *   performSearch(query)
 * }, 500)
 */
export function createDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return debounce(callback, delay) as T
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Clear all caches - use on logout or major state changes
 */
export function clearAllCaches(): void {
  apiCache.clear()
  // Note: fetchThrottledMemoized caches auto-expire via setTimeout
}

/**
 * Throttle vs Debounce Decision Helper
 * 
 * Use THROTTLE for:
 * - Scroll events (need periodic updates while scrolling)
 * - Window resize handlers
 * - Button clicks (prevent double-clicks but allow intentional rapid clicks)
 * - API rate limiting
 * 
 * Use DEBOUNCE for:
 * - Search input (wait for user to finish typing)
 * - Form validation (validate after user finishes field)
 * - Auto-save functionality
 * - API calls triggered by text input
 */

