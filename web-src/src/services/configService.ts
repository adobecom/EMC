/* 
* <license header>
*/

import { 
  EXTERNAL_CONFIG_URLS, 
  getRsvpConfigUrl, 
  hasRsvpConfig,
  type RsvpCloudType 
} from '../config/externalConfigs'
import type { RsvpConfigField } from '../types/attendee'
import type { SeriesTemplatesConfig, UrlPatternEntry, UrlPatternsSheetData } from '../types/domain'
import { env } from '../config/env'

/**
 * Cache entry with data and timestamp
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Service for fetching external configurations
 * Includes caching, error handling, and retry logic
 */
class ConfigService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pendingRequests: Map<string, Promise<any>> = new Map()
  
  /** Cache time-to-live in milliseconds (5 minutes) */
  private readonly CACHE_TTL = 5 * 60 * 1000
  
  /** Maximum retry attempts for failed requests */
  private readonly MAX_RETRIES = 2
  
  /** Retry delay in milliseconds */
  private readonly RETRY_DELAY = 1000

  /**
   * Get cached data if still valid
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > this.CACHE_TTL
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, retries = 0): Promise<Response> {
    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        console.warn(`Fetch failed for ${url}, retrying... (attempt ${retries + 1})`)
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY))
        return this.fetchWithRetry(url, retries + 1)
      }
      throw error
    }
  }

  /**
   * Deduplicated fetch - prevents multiple simultaneous requests for the same URL
   */
  private async fetchDeduplicated<T>(url: string, parser: (data: any) => T): Promise<T> {
    // Check cache first
    const cached = this.getCached<T>(url)
    if (cached !== null) {
      console.log(`📦 Using cached config: ${url}`)
      return cached
    }

    // Check for pending request
    const pending = this.pendingRequests.get(url)
    if (pending) {
      console.log(`⏳ Waiting for pending request: ${url}`)
      return pending
    }

    // Create new request
    const request = (async () => {
      try {
        console.log(`🔄 Fetching config: ${url}`)
        const response = await this.fetchWithRetry(url)
        const rawData = await response.json()
        const data = parser(rawData)
        
        this.setCache(url, data)
        console.log(`✅ Cached config: ${url}`)
        
        return data
      } finally {
        this.pendingRequests.delete(url)
      }
    })()

    this.pendingRequests.set(url, request)
    return request
  }

  /**
   * Get RSVP config for a cloud type
   * Returns array of field configurations
   */
  async getRsvpConfig(cloudType: string): Promise<RsvpConfigField[]> {
    if (!hasRsvpConfig(cloudType)) {
      console.warn(`⚠️ No RSVP config available for cloud type: ${cloudType}`)
      return []
    }

    const url = getRsvpConfigUrl(cloudType as RsvpCloudType)
    
    return this.fetchDeduplicated<RsvpConfigField[]>(url, (rawData) => {
      // Handle different possible JSON structures
      // Could be: array directly, { data: [] }, { fields: [] }, { config: [] }
      if (Array.isArray(rawData)) {
        return rawData
      }
      
      const data = rawData.data || rawData.fields || rawData.config
      
      if (Array.isArray(data)) {
        return data
      }
      
      console.warn(`⚠️ Unexpected RSVP config structure for ${cloudType}:`, rawData)
      return []
    })
  }

  /**
   * Get metadata catalogue configuration
   */
  async getMetadataCatalogue(): Promise<any> {
    const url = EXTERNAL_CONFIG_URLS.metadataCatalogue
    
    return this.fetchDeduplicated(url, (rawData) => {
      return rawData.data || rawData
    })
  }

  /**
   * Get promotional content configuration
   * Note: This may need locale-specific handling in the future
   */
  async getPromotionalContent(): Promise<any[]> {
    const url = EXTERNAL_CONFIG_URLS.promotionalContent
    
    return this.fetchDeduplicated<any[]>(url, (rawData) => {
      const data = rawData.data || rawData
      return Array.isArray(data) ? data : []
    })
  }

  /**
   * Get series templates configuration
   * Returns configuration with template definitions and supported event types
   */
  async getSeriesTemplates(): Promise<SeriesTemplatesConfig> {
    const url = EXTERNAL_CONFIG_URLS.seriesTemplates
    
    return this.fetchDeduplicated<SeriesTemplatesConfig>(url, (rawData) => {
      // Expected structure: { data: [...], total, offset, limit }
      if (!rawData.data || !Array.isArray(rawData.data)) {
        console.warn('⚠️ Unexpected series templates structure:', rawData)
        return { total: 0, offset: 0, limit: 0, data: [] }
      }
      return rawData
    })
  }

  /**
   * Get URL pattern entries for the current environment.
   * The JSON is multi-sheet: "data" (prod), "data-stage", "data-dev".
   */
  async getUrlPatterns(): Promise<UrlPatternEntry[]> {
    const url = EXTERNAL_CONFIG_URLS.urlPatterns

    return this.fetchDeduplicated<UrlPatternEntry[]>(url, (rawData) => {
      const sheetKeyMap: Record<string, string> = {
        prod: 'data',
        stage: 'data-stage',
        dev: 'data-dev',
      }
      const sheetKey = sheetKeyMap[env.ENVIRONMENT] || 'data-dev'
      const sheet: UrlPatternsSheetData | undefined = rawData[sheetKey]

      if (!sheet || !Array.isArray(sheet.data)) {
        console.warn(`⚠️ No URL patterns found for sheet key "${sheetKey}":`, rawData)
        return []
      }

      return sheet.data
    })
  }

  /**
   * Clear all cached data
   * Useful for development/testing or when configs need to be refreshed
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🗑️ Config cache cleared')
  }

  /**
   * Clear cache for a specific URL
   */
  clearCacheFor(url: string): void {
    this.cache.delete(url)
    console.log(`🗑️ Cache cleared for: ${url}`)
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Singleton instance of ConfigService
 */
export const configService = new ConfigService()

export default configService

