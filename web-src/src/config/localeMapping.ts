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
