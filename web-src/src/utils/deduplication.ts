/* 
* Deduplication Utilities
* 
* Provides safe deduplication of arrays by key extractor
* Last occurrence wins (preserves most recent data)
*/

/**
 * Deduplicate array by key extractor
 * 
 * @param items - Array to deduplicate
 * @param getKey - Function to extract unique key from item
 * @param options - Optional configuration
 * @returns Deduplicated array (last occurrence of each key wins)
 * 
 * @example
 * const items = [
 *   { id: '1', name: 'Old' },
 *   { id: '2', name: 'Item' },
 *   { id: '1', name: 'New' }  // Duplicate
 * ]
 * const unique = deduplicateBy(items, i => i.id)
 * // Returns: [{ id: '2', name: 'Item' }, { id: '1', name: 'New' }]
 */
export function deduplicateBy<T>(
  items: T[],
  getKey: (item: T) => string,
  options?: {
    warnOnDuplicates?: boolean
    logPrefix?: string
  }
): T[] {
  if (!Array.isArray(items)) {
    console.error('[deduplicateBy] Expected array, got:', typeof items)
    return []
  }

  const seen = new Map<string, T>()
  const duplicateKeys: string[] = []

  items.forEach(item => {
    try {
      const key = getKey(item)
      
      if (seen.has(key)) {
        duplicateKeys.push(key)
      }
      
      // Last occurrence wins (more recent data)
      seen.set(key, item)
    } catch (error) {
      console.error('[deduplicateBy] Failed to extract key:', error, item)
    }
  })

  // Warn about duplicates if requested
  if (options?.warnOnDuplicates && duplicateKeys.length > 0) {
    const prefix = options.logPrefix || 'deduplicateBy'
    console.warn(
      `[${prefix}] Found ${duplicateKeys.length} duplicate(s). Keeping last occurrence.`,
      { duplicates: duplicateKeys.slice(0, 5) } // Show first 5
    )
  }

  return Array.from(seen.values())
}

/**
 * Check if array has duplicates
 * Useful for assertions and debugging
 */
export function hasDuplicates<T>(
  items: T[],
  getKey: (item: T) => string
): boolean {
  const seen = new Set<string>()
  
  for (const item of items) {
    const key = getKey(item)
    if (seen.has(key)) {
      return true
    }
    seen.add(key)
  }
  
  return false
}

/**
 * Get duplicate keys from array
 * Returns array of keys that appear more than once
 */
export function getDuplicateKeys<T>(
  items: T[],
  getKey: (item: T) => string
): string[] {
  const counts = new Map<string, number>()
  
  items.forEach(item => {
    const key = getKey(item)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  
  return Array.from(counts.entries())
    .filter(([_, count]) => count > 1)
    .map(([key]) => key)
}

