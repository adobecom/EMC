/**
 * Non-English events must have an "English title for page URL" that is
 * actually distinct from the localized Event Title, otherwise the
 * generated page URL ends up non-English (MWPW-204657).
 */
export function requiresEnTitleConfirmation(locale: string | undefined, name: string, enTitle: string): boolean {
  if (!locale || locale === 'en-US') return false

  const trimmedEnTitle = enTitle.trim()
  return !trimmedEnTitle || trimmedEnTitle === name.trim()
}
