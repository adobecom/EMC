/**
 * Non-English events must have an "English title for page URL" that is
 * actually distinct from the localized Event Title, otherwise the
 * generated page URL ends up non-English (MWPW-204657).
 *
 * Scope-configured locales aren't limited to `en-US` — English regional
 * variants such as `en-GB` ("English, UK"), `en-AU`, `en-CA`, `en-IN`, etc.
 * are already in English, so the Event Title and the English URL title are
 * expected to match and never need this confirmation (MWPW-208763).
 */
export function requiresEnTitleConfirmation(locale: string | undefined, name: string, enTitle: string): boolean {
  if (!locale || locale.split('-')[0].toLowerCase() === 'en') return false

  const trimmedEnTitle = enTitle.trim()
  return !trimmedEnTitle || trimmedEnTitle === name.trim()
}
