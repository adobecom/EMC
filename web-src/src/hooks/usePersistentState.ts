/*
* <license header>
*/

import { useState, useEffect, Dispatch, SetStateAction } from 'react'

/**
 * useState-shaped hook backed by sessionStorage.
 * State persists across page refreshes within the session but not across browser sessions.
 * When the stored value is a plain object and initialValue is also a plain object,
 * they are merged (initialValue as defaults) to handle schema additions gracefully.
 */
export function usePersistentState<T>(
  storageKey: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T
        // Merge with initialValue to handle new keys added to the shape
        if (
          typeof initialValue === 'object' &&
          initialValue !== null &&
          !Array.isArray(initialValue) &&
          typeof parsed === 'object' &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          return { ...initialValue, ...parsed } as T
        }
        return parsed
      }
    } catch {
      // sessionStorage unavailable or JSON parse error — fall back to initialValue
    }
    return initialValue
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // Ignore write failures (private browsing mode, storage quota exceeded, etc.)
    }
  }, [storageKey, state])

  return [state, setState]
}
