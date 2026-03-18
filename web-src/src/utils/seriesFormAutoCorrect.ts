/* 
* <license header>
*/

/**
 * Normalizes relatedDomain for series form: must start with https://, cannot end with /.
 * Used for auto-correction on blur and before save/publish (no validation errors).
 */
export function normalizeRelatedDomain(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return trimmed
  let result = trimmed
  if (!result.startsWith('https://')) {
    result = 'https://' + result
  }
  return result.replace(/\/+$/, '')
}

/**
 * Normalizes contentRoot for series form: must start with /, must not end with /.
 * Used for auto-correction on blur and before save/publish (no validation errors).
 */
export function normalizeContentRoot(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return trimmed
  let result = trimmed
  if (!result.startsWith('/')) {
    result = '/' + result
  }
  return result.replace(/\/+$/, '')
}
