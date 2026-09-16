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

// Mirrors ESP's TagId schema pattern (src/api/openapi.json) and the
// lowercasing/hyphenation Utils.formatTags applies server-side, so a tag
// entered here matches an ESP default tag byte-for-byte after normalization.
const TAG_ID_PATTERN = /^(?:caas:[0-9a-zA-Z\-_/&()]+)+[^/,-]$/

/**
 * Normalizes an auto-tagging exclusion entry: trims, lowercases, and
 * replaces spaces with hyphens, matching ESP's Utils.formatTags.
 */
export function normalizeTagId(value: string): string {
  return value.trim().toLowerCase().replace(/ /g, '-')
}

/**
 * Whether a normalized value matches ESP's TagId pattern: must start with
 * `caas:`, restricted charset, cannot end in `/`, `,`, or `-`.
 */
export function isValidTagId(value: string): boolean {
  return TAG_ID_PATTERN.test(value)
}
