/* 
* <license header>
*/

import { createEnrichmentManager } from './dataEnrichment'
import { cachedApi } from './api'
import { EventHistoryResponse, HistoryUser, SeriesApiResponse } from '../types/domain'

/**
 * Enriched data types for series
 */
export interface SeriesInfo {
  seriesName: string
  seriesDescription?: string
  seriesStatus?: 'published' | 'draft' | 'archived'
}

export interface SeriesHistoryInfo {
  creator?: HistoryUser
  modifier?: HistoryUser
  publishedAt?: number
}

/**
 * Extract series information from series API response
 */
export function extractSeriesInfo(series: SeriesApiResponse): SeriesInfo {
  return {
    seriesName: series.seriesName,
    seriesDescription: series.seriesDescription,
    seriesStatus: series.seriesStatus
  }
}

/**
 * Series enrichment manager
 * Handles fetching, caching, and batching series metadata requests
 */
export const seriesEnrichmentManager = createEnrichmentManager<string, SeriesInfo>(
  async (seriesIds: string[]) => {
    const results = new Map<string, SeriesInfo>()
    
    try {
      // Fetch series in batch
      const seriesData = await cachedApi.getSeriesBatch(seriesIds)
      
      // Extract series info from each series
      seriesData.forEach((series, seriesId) => {
        const seriesInfo = extractSeriesInfo(series)
        results.set(seriesId, seriesInfo)
      })
      
    } catch (error) {
      console.error('Error enriching series:', error)
    }
    
    return results
  },
  {
    cacheDuration: 15 * 60 * 1000, // Cache for 15 minutes (series change less frequently than events)
    batchDelay: 150, // Wait 150ms to batch requests
    maxBatchSize: 20 // Fetch up to 20 series at once
  }
)

/**
 * Extract history information from series history response
 * - Creator: User from the first history record
 * - Modifier: User from the last history record
 * - Published At: Timestamp from the last record where diff.updated.seriesStatus is 'published'
 */
export function extractSeriesHistoryInfo(historyResponse: EventHistoryResponse): SeriesHistoryInfo | null {
  const { history } = historyResponse
  
  if (!history || history.length === 0) {
    return null
  }
  
  const result: SeriesHistoryInfo = {}
  
  // Creator: first record's user
  if (history[0]?.user) {
    result.creator = history[0].user
  }
  
  // Modifier: last record's user
  if (history[history.length - 1]?.user) {
    result.modifier = history[history.length - 1].user
  }
  
  // Published At: last timestamp where diff.updated.seriesStatus is 'published'
  // Iterate from the end to find the most recent publish event
  for (let i = history.length - 1; i >= 0; i--) {
    const record = history[i]
    if (record.diff?.updated?.seriesStatus === 'published') {
      result.publishedAt = record.timestamp
      break
    }
  }
  
  return result
}

/**
 * Series history enrichment manager
 * Handles fetching, caching, and batching history requests for creator, modifier
 */
export const seriesHistoryEnrichmentManager = createEnrichmentManager<string, SeriesHistoryInfo>(
  async (seriesIds: string[]) => {
    const results = new Map<string, SeriesHistoryInfo>()
    
    try {
      // Fetch series histories in batch
      const historyData = await cachedApi.getSeriesHistoryBatch(seriesIds)
      
      // Extract history info from each series
      historyData.forEach((history, seriesId) => {
        const historyInfo = extractSeriesHistoryInfo(history)
        if (historyInfo) {
          results.set(seriesId, historyInfo)
        }
      })
      
    } catch (error) {
      console.error('Error enriching series history:', error)
    }
    
    return results
  },
  {
    cacheDuration: 10 * 60 * 1000, // Cache for 10 minutes
    batchDelay: 150, // Wait 150ms to batch requests
    maxBatchSize: 20 // Fetch up to 20 series at once
  }
)

/**
 * Clear all series enrichment caches
 */
export function clearSeriesEnrichmentCaches(): void {
  seriesEnrichmentManager.clearCache()
  seriesHistoryEnrichmentManager.clearCache()
}

