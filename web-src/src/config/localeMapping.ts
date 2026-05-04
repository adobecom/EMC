/**
 * Maps Language picker keys (en, es, fr, etc.) to IETF locale codes
 * used by the Adobe ESP API (en-US, es-ES, fr-FR, etc.)
 */
export const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-BR',
  zh: 'zh-CN'
}

export const DEFAULT_LOCALE = 'en-US'

/** IETF locale codes supported for speaker title/bio (stable order for pickers) */
export const SUPPORTED_SPEAKER_LOCALES: readonly string[] = [
  'en-US',
  'es-ES',
  'fr-FR',
  'de-DE',
  'ja-JP',
  'ko-KR',
  'pt-BR',
  'zh-CN',
]

/** Short labels for speaker locale picker */
export const SPEAKER_LOCALE_LABELS: Record<string, string> = {
  'en-US': 'English (US)',
  'es-ES': 'Spanish (Spain)',
  'fr-FR': 'French (France)',
  'de-DE': 'German (Germany)',
  'ja-JP': 'Japanese (Japan)',
  'ko-KR': 'Korean (Korea)',
  'pt-BR': 'Portuguese (Brazil)',
  'zh-CN': 'Chinese (China)',
}

export const LOCALE_TO_LANGUAGE: Record<string, string> = Object.entries(LANGUAGE_TO_LOCALE).reduce(
  (acc, [languageKey, locale]) => {
    acc[locale] = languageKey
    return acc
  },
  {} as Record<string, string>
)

export function getLanguageKeyFromLocale(locale: string | undefined | null): string {
  if (!locale) {
    return 'en'
  }

  return LOCALE_TO_LANGUAGE[locale] || locale.split('-')[0] || 'en'
}
