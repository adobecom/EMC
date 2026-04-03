/*
 * <license header>
 */

import { useEffect, useSyncExternalStore } from 'react'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function getColorScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Tracks OS / browser light vs dark preference and keeps `data-color-scheme` on
 * `<html>` aligned with S2 `page.css` and `S2Provider`.
 */
export function usePreferredColorScheme(): 'light' | 'dark' {
  const scheme = useSyncExternalStore(
    subscribe,
    getColorScheme,
    (): 'light' | 'dark' => 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', scheme)
  }, [scheme])

  return scheme
}
