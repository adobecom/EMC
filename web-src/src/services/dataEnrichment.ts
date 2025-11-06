/* 
* <license header>
*/

/**
 * Data Enrichment Service
 * Provides utilities for fetching and caching additional data for dashboard items
 * with proper API alleviation (debouncing, throttling, caching)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface EnrichmentRequest<K, V> {
  key: K
  resolve: (value: V | null) => void
  reject: (error: any) => void
}

interface EnrichmentOptions {
  cacheDuration?: number // milliseconds, default 5 minutes
  batchDelay?: number // milliseconds, default 100ms
  maxBatchSize?: number // default 10
}

/**
 * Generic data enrichment manager with caching, batching, and throttling
 */
export class DataEnrichmentManager<K extends string | number, V> {
  private cache: Map<K, CacheEntry<V>> = new Map()
  private pendingRequests: Map<K, EnrichmentRequest<K, V>[]> = new Map()
  private batchTimeout: NodeJS.Timeout | null = null
  private fetchFunction: (keys: K[]) => Promise<Map<K, V>>
  private options: Required<EnrichmentOptions>

  constructor(
    fetchFunction: (keys: K[]) => Promise<Map<K, V>>,
    options: EnrichmentOptions = {}
  ) {
    this.fetchFunction = fetchFunction
    this.options = {
      cacheDuration: options.cacheDuration || 5 * 60 * 1000, // 5 minutes
      batchDelay: options.batchDelay || 100, // 100ms
      maxBatchSize: options.maxBatchSize || 10
    }
  }

  /**
   * Get enriched data for a single key
   */
  async get(key: K): Promise<V | null> {
    // Check cache first
    const cached = this.getCached(key)
    if (cached !== null) {
      return cached
    }

    // Return pending request if already in progress
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return new Promise((resolve, reject) => {
        pending.push({ key, resolve, reject })
      })
    }

    // Create new pending request
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(key, [{ key, resolve, reject }])
      this.scheduleBatch()
    })
  }

  /**
   * Get enriched data for multiple keys
   */
  async getMany(keys: K[]): Promise<Map<K, V | null>> {
    const results = new Map<K, V | null>()
    const keysToFetch: K[] = []

    // Check cache for each key
    for (const key of keys) {
      const cached = this.getCached(key)
      if (cached !== null) {
        results.set(key, cached)
      } else {
        keysToFetch.push(key)
      }
    }

    // Fetch remaining keys
    if (keysToFetch.length > 0) {
      const fetchedData = await Promise.all(keysToFetch.map(key => this.get(key)))
      keysToFetch.forEach((key, index) => {
        results.set(key, fetchedData[index])
      })
    }

    return results
  }

  /**
   * Get cached value if available and not expired
   */
  private getCached(key: K): V | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > this.options.cacheDuration) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Schedule a batch fetch
   */
  private scheduleBatch(): void {
    if (this.batchTimeout) return

    this.batchTimeout = setTimeout(() => {
      this.executeBatch()
    }, this.options.batchDelay)
  }

  /**
   * Execute batch fetch for pending requests
   */
  private async executeBatch(): Promise<void> {
    this.batchTimeout = null

    const allKeys = Array.from(this.pendingRequests.keys())
    if (allKeys.length === 0) return

    // Process in batches to respect maxBatchSize
    const batches: K[][] = []
    for (let i = 0; i < allKeys.length; i += this.options.maxBatchSize) {
      batches.push(allKeys.slice(i, i + this.options.maxBatchSize))
    }

    for (const batch of batches) {
      await this.processBatch(batch)
    }
  }

  /**
   * Process a single batch of keys
   */
  private async processBatch(keys: K[]): Promise<void> {
    try {
      const results = await this.fetchFunction(keys)
      const now = Date.now()

      // Resolve all pending requests for these keys
      for (const key of keys) {
        const requests = this.pendingRequests.get(key)
        if (!requests) continue

        const value = results.get(key) || null

        // Cache the result
        if (value !== null) {
          this.cache.set(key, { data: value, timestamp: now })
        }

        // Resolve all pending requests
        requests.forEach(req => req.resolve(value))
        this.pendingRequests.delete(key)
      }
    } catch (error) {
      // Reject all pending requests for these keys
      for (const key of keys) {
        const requests = this.pendingRequests.get(key)
        if (!requests) continue

        requests.forEach(req => req.reject(error))
        this.pendingRequests.delete(key)
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Clear cache for specific keys
   */
  clearCacheForKeys(keys: K[]): void {
    keys.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: K[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Create a data enrichment manager instance
 */
export function createEnrichmentManager<K extends string | number, V>(
  fetchFunction: (keys: K[]) => Promise<Map<K, V>>,
  options?: EnrichmentOptions
): DataEnrichmentManager<K, V> {
  return new DataEnrichmentManager(fetchFunction, options)
}

