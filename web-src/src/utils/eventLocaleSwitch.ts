/*
 * Locale switch helpers for the event form.
 * Keep locale metadata and locale-specific draft content in sync when switching languages.
 */

import { DEFAULT_LOCALE, getLanguageKeyFromLocale } from '../config/localeMapping'
import { EventApiResponse, EventFormData, ProfileData, SponsorData, VenueData } from '../types/domain'
import { mapApiResponseToFormData } from './eventFormMappers'

export interface LocaleSwitchResult {
  formData: EventFormData
  isDirty: boolean
}

function syncFormDataLocaleMetadata(formData: EventFormData, locale: string): EventFormData {
  return {
    ...formData,
    language: getLanguageKeyFromLocale(locale),
    defaultLocale: locale,
  }
}

function resetVenueForLocaleSwitch(venue?: VenueData): VenueData | undefined {
  if (!venue) return venue

  return {
    ...venue,
    additionalInformation: '',
  }
}

function resetProfilesForLocaleSwitch(profiles?: ProfileData[]): ProfileData[] | undefined {
  if (!profiles) return profiles

  return profiles.map((profile) => ({
    ...profile,
    title: '',
    bio: undefined,
  }))
}

function resetSponsorsForLocaleSwitch(sponsors?: SponsorData[]): SponsorData[] | undefined {
  if (!sponsors) return sponsors

  return sponsors.map((sponsor) => ({
    ...sponsor,
    info: undefined,
  }))
}

export function applyLocaleMetadataToFormData(formData: EventFormData, locale: string): EventFormData {
  return syncFormDataLocaleMetadata(formData, locale || DEFAULT_LOCALE)
}

export function buildCreateModeLocaleSwitchFormData(
  currentFormData: EventFormData,
  newLocale: string
): EventFormData {
  const locale = newLocale || DEFAULT_LOCALE

  return syncFormDataLocaleMetadata(
    {
      ...currentFormData,
      name: '',
      description: '',
      eventDetails: '',
      shortDescription: '',
      rsvpDescription: '',
      communityForumUrl: '',
      communityTopicUrl: null,
      secondaryLinkTitle: '',
      cta: [],
      promotionalItems: [],
      agendaItems: [],
      agenda: [],
      venue: resetVenueForLocaleSwitch(currentFormData.venue),
      profiles: resetProfilesForLocaleSwitch(currentFormData.profiles),
      sponsors: resetSponsorsForLocaleSwitch(currentFormData.sponsors),
      localizations: undefined,
      localizationOverrides: undefined,
    },
    locale
  )
}

export function buildLocaleSwitchFormData(
  currentFormData: EventFormData,
  newLocale: string,
  eventDataResp: EventApiResponse | null
): EventFormData {
  const locale = newLocale || DEFAULT_LOCALE

  if (!eventDataResp) {
    return buildCreateModeLocaleSwitchFormData(currentFormData, locale)
  }

  return syncFormDataLocaleMetadata(
    {
      ...currentFormData,
      ...mapApiResponseToFormData(eventDataResp, locale),
    },
    locale
  )
}

export function buildLocaleSwitchResult(
  currentFormData: EventFormData,
  newLocale: string,
  eventDataResp: EventApiResponse | null
): LocaleSwitchResult {
  return {
    formData: buildLocaleSwitchFormData(currentFormData, newLocale, eventDataResp),
    isDirty: eventDataResp == null,
  }
}
