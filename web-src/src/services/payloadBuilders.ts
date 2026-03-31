/* 
 * Async payload builders for API submissions
 * 
 * These functions build payloads for API submissions and require fetching
 * existing data from the API to properly merge localizations.
 * 
 * For pure data filters and sync utilities, see utils/dataFilters.ts
 */

import { cachedApi } from './api'
import {
  SPEAKER_DATA_FILTER,
  SPONSOR_DATA_FILTER,
  splitLocalizableFields,
  isValidAttribute
} from '../utils/dataFilters'

// ============================================================================
// SPEAKER PAYLOAD BUILDER
// ============================================================================

/**
 * Build a speaker payload for API submission
 * 
 * This is async because it needs to fetch existing speaker data to properly
 * merge localizations when updating an existing speaker.
 * 
 * @param speakerData - The speaker data from the form
 * @param locale - The current locale
 * @param seriesId - The series ID (speakers belong to a series)
 * @returns The payload ready for API submission
 */
export async function getSpeakerPayload(
  speakerData: Record<string, any>,
  locale: string,
  seriesId: string
): Promise<Record<string, any>> {
  if (!speakerData) return speakerData

  // Remove empty social links
  // socialLinks should be in API format: { serviceName, link }
  if (speakerData.socialLinks) {
    speakerData.socialLinks = speakerData.socialLinks.filter((sm: any) => 
      sm.link && sm.link !== '' && sm.serviceName
    )
  }

  // Fetch existing speaker data to preserve other locale's localizations
  let existingSpeakerPayload: Record<string, any> = {}
  if (speakerData.speakerId) {
    const result = await cachedApi.getSpeaker(seriesId, speakerData.speakerId)
    if (!('error' in result)) {
      existingSpeakerPayload = result
    }
  }

  // Split speaker data into localizable and non-localizable fields
  const { localizableFields, nonLocalizableFields } = splitLocalizableFields(
    speakerData,
    SPEAKER_DATA_FILTER,
    locale
  )

  // Filter to only submittable non-localizable fields
  const filteredGlobalPayload = Object.entries(nonLocalizableFields).reduce((acc, [key, value]) => {
    if (SPEAKER_DATA_FILTER[key]?.submittable && isValidAttribute(value)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  // Filter to only submittable localizable fields
  const filteredLocalePayload = Object.entries(localizableFields).reduce((acc, [key, value]) => {
    if (SPEAKER_DATA_FILTER[key]?.submittable && isValidAttribute(value)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  // Merge with existing localizations (preserves other locales)
  return {
    ...filteredGlobalPayload,
    localizations: { 
      ...existingSpeakerPayload.localizations, 
      [locale]: filteredLocalePayload 
    },
  }
}

// ============================================================================
// SPONSOR PAYLOAD BUILDER
// ============================================================================

/**
 * Build a sponsor payload for API submission
 * 
 * This is async because it needs to fetch existing sponsor data to properly
 * merge localizations when updating an existing sponsor.
 * 
 * @param sponsorData - The sponsor data from the form
 * @param locale - The current locale
 * @param seriesId - The series ID (sponsors belong to a series)
 * @returns The payload ready for API submission
 */
export async function getSponsorPayload(
  sponsorData: Record<string, any>,
  locale: string,
  seriesId: string
): Promise<Record<string, any>> {
  if (!sponsorData) return sponsorData

  // Fetch existing sponsor data to preserve other locale's localizations
  let existingSponsorPayload: Record<string, any> = {}
  if (sponsorData.sponsorId) {
    const result = await cachedApi.getSponsor(seriesId, sponsorData.sponsorId)
    if (!('error' in result)) {
      existingSponsorPayload = result
    }
  }

  // Split sponsor data into localizable and non-localizable fields
  const { localizableFields, nonLocalizableFields } = splitLocalizableFields(
    sponsorData,
    SPONSOR_DATA_FILTER,
    locale
  )

  // Filter to only submittable non-localizable fields
  const filteredGlobalPayload = Object.entries(nonLocalizableFields).reduce((acc, [key, value]) => {
    if (SPONSOR_DATA_FILTER[key]?.submittable && isValidAttribute(value)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  // Filter to only submittable localizable fields
  const filteredLocalePayload = Object.entries(localizableFields).reduce((acc, [key, value]) => {
    if (SPONSOR_DATA_FILTER[key]?.submittable && isValidAttribute(value)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  // Preserve existing locale slices; only patch current locale when there is localized data.
  // Applying [locale]: {} would wipe that locale's fields when only name/link change.
  const localizations: Record<string, any> = {
    ...(existingSponsorPayload.localizations || {}),
  }
  if (Object.keys(filteredLocalePayload).length > 0) {
    localizations[locale] = {
      ...(existingSponsorPayload.localizations?.[locale] || {}),
      ...filteredLocalePayload,
    }
  }

  const merged: Record<string, any> = {
    ...filteredGlobalPayload,
  }
  if (Object.keys(localizations).length > 0) {
    merged.localizations = localizations
  }

  // SponsorUpdateBody (OpenAPI): Sponsor requires sponsorId + modificationTime in the body
  if (sponsorData.sponsorId) {
    merged.sponsorId = sponsorData.sponsorId
    const modTime =
      merged.modificationTime ?? existingSponsorPayload.modificationTime
    if (modTime != null) {
      merged.modificationTime = modTime
    }
  }

  return merged
}

