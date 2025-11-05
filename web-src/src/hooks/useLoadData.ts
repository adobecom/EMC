/* 
* <license header>
*/

import { useState, useEffect } from 'react'

interface LoadDataOptions<T> {
  fetchFn: () => Promise<{ success: boolean; data?: T; error?: string }>
  dependencies?: any[]
  autoLoad?: boolean
}

interface LoadDataResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Custom hook for loading data with loading and error states
 */
export function useLoadData<T>({
  fetchFn,
  dependencies = [],
  autoLoad = true
}: LoadDataOptions<T>): LoadDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchFn()
      if (response.success && response.data !== undefined) {
        setData(response.data)
      } else {
        setError(response.error || 'Failed to load data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (autoLoad) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return {
    data,
    isLoading,
    error,
    reload: loadData
  }
}

