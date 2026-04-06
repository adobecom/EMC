/*
 * <license header>
 */

import type { StatusLightProps } from '@react-spectrum/s2'

/**
 * Semantic StatusLight variant for event/series wizard status (aligned with StatusBadge.tsx).
 */
export function getEventFormStatusLightVariant(
  status: string
): StatusLightProps['variant'] {
  switch (status.toLowerCase()) {
    case 'published':
      return 'positive'
    case 'cancelled':
      return 'negative'
    case 'archived':
      return 'neutral'
    case 'draft':
    default:
      return 'neutral'
  }
}

export function formatEventFormStatusLabel(status: string): string {
  const s = status.trim()
  if (!s) return 'Draft'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
