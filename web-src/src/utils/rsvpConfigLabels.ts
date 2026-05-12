/* 
* <license header>
*/

import type { RsvpConfigField } from '../types/attendee'

/**
 * Label for EMC surfaces (RSVP field picker, attendee table columns, filters).
 * When JSON `Label` contains Milo merge tokens (`[[`), use `Placeholder` or a derived field title.
 */
export function rsvpConfigUiLabel(
  f: RsvpConfigField,
  fieldNameFallback: (fieldKey: string) => string
): string {
  const label = f.Label?.trim() || ''
  if (label.includes('[[')) {
    return f.Placeholder?.trim() || fieldNameFallback(f.Field)
  }
  return label || fieldNameFallback(f.Field)
}
