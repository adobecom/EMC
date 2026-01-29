/* 
* <license header>
*/

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useSafeState - A safer alternative to useState that prevents state updates on unmounted components
 * 
 * This hook wraps useState and only allows state updates if the component is still mounted.
 * This eliminates the need for manual cancellation checks in async callbacks.
 * 
 * @param initialValue - The initial state value
 * @returns A tuple [state, setSafeState] identical to useState
 * 
 * @example
 * // Instead of this:
 * const [data, setData] = useState([])
 * const isMountedRef = useRef(true)
 * 
 * useEffect(() => {
 *   return () => { isMountedRef.current = false }
 * }, [])
 * 
 * const loadData = async () => {
 *   const result = await fetchData()
 *   if (!isMountedRef.current) return  // ❌ Verbose check
 *   setData(result)
 * }
 * 
 * // Use this:
 * const [data, setData] = useSafeState([])
 * 
 * const loadData = async () => {
 *   const result = await fetchData()
 *   setData(result)  // ✅ Automatically safe
 * }
 */
export function useSafeState<T>(
  initialValue: T | (() => T)
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const setSafeState = useCallback((value: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setState(value)
    }
  }, [])

  return [state, setSafeState]
}

