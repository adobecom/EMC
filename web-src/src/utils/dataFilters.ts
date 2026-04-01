/* 
 * Data filter constants and pure utility functions for API payload handling
 * Based on v1 reference implementation
 * 
 * This module contains:
 * - Data field descriptors that define which fields are submittable, localizable, cloneable, and updatable
 * - Pure utility functions for filtering and transforming data
 * 
 * For async payload builders that require API calls, see services/payloadBuilders.ts
 */

// ============================================================================
// DATA FILTER TYPES
// ============================================================================

export interface DataFieldDescriptor {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  submittable: boolean
  localizable?: boolean
  cloneable?: boolean
  updatable?: boolean
  ref?: DataFilter
}

export type DataFilter = Record<string, DataFieldDescriptor>

export interface FilterOptions {
  excludeKeys?: string[]
}

export interface SplitFieldsResult {
  localizableFields: Record<string, any>
  nonLocalizableFields: Record<string, any>
}

// ============================================================================
// AGENDA DATA FILTER
// ============================================================================

export const AGENDA_DATA_REF_FILTER: DataFilter = {
  startTime: { type: 'string', submittable: true },
  description: { type: 'string', submittable: true },
  title: { type: 'string', submittable: true },
}

// ============================================================================
// VIDEO DATA FILTER
// ============================================================================

export const VIDEO_DATA_REF_FILTER: DataFilter = {
  url: { type: 'string', submittable: true },
}

// ============================================================================
// REGISTRATION DATA FILTER
// ============================================================================

export const REGISTRATION_DATA_REF_FILTER: DataFilter = {
  type: { type: 'string', submittable: true },
  formData: { type: 'string', submittable: true },
}

// ============================================================================
// MARKETO INTEGRATION DATA FILTER
// ============================================================================

export const MARKETO_INTEGRATION_DATA_REF_FILTER: DataFilter = {
  eventType: { type: 'string', submittable: true },
  salesforceCampaignId: { type: 'string', submittable: true },
  mczProgramName: { type: 'string', submittable: true },
  coMarketingPartner: { type: 'string', submittable: true },
  eventPoi: { type: 'string', submittable: true },
}

// ============================================================================
// SERIES DATA FILTER
// ============================================================================

export const SERIES_DATA_FILTER: DataFilter = {
  seriesName: { type: 'string', submittable: true, cloneable: true, updatable: true },
  seriesDescription: { type: 'string', submittable: true, cloneable: true, updatable: true },
  seriesStatus: { type: 'string', submittable: true, cloneable: true, updatable: true },
  susiContextId: { type: 'string', submittable: true, cloneable: true, updatable: true },
  externalThemeId: { type: 'string', submittable: true, cloneable: true, updatable: true },
  cloudType: { type: 'string', submittable: true, cloneable: true, updatable: true },
  targetCms: { type: 'object', submittable: true, cloneable: true, updatable: false },
  templateId: { type: 'string', submittable: true, cloneable: true, updatable: true },
  relatedDomain: { type: 'string', submittable: true, cloneable: true, updatable: true },
  contentRoot: { type: 'string', submittable: true, cloneable: true, updatable: true },
  modificationTime: { type: 'string', submittable: true, cloneable: false, updatable: true },
  createdBy: { type: 'string', submittable: false, cloneable: false, updatable: false },
  modifiedBy: { type: 'string', submittable: false, cloneable: false, updatable: false },
  seriesId: { type: 'string', submittable: false, cloneable: true, updatable: false },
  creationTime: { type: 'string', submittable: false, cloneable: false, updatable: false },
}

// ============================================================================
// EVENT DATA FILTER
// ============================================================================

export const EVENT_DATA_FILTER: DataFilter = {
  agenda: { type: 'array', localizable: true, cloneable: true, submittable: true, ref: AGENDA_DATA_REF_FILTER },
  tags: { type: 'string', localizable: false, cloneable: true, submittable: true },
  topics: { type: 'array', localizable: false, cloneable: true, submittable: true },
  speakers: { type: 'array', localizable: false, cloneable: false, submittable: false },
  sponsors: { type: 'array', localizable: false, cloneable: false, submittable: false },
  eventType: { type: 'string', localizable: false, cloneable: true, submittable: true },
  cloudType: { type: 'string', localizable: false, cloneable: true, submittable: true },
  seriesId: { type: 'string', localizable: false, cloneable: true, submittable: true },
  communityTopicUrl: { type: 'string', localizable: false, cloneable: true, submittable: true },
  cta: { type: 'array', localizable: true, cloneable: true, submittable: true },
  title: { type: 'string', localizable: true, cloneable: true, submittable: true },
  enTitle: { type: 'string', localizable: false, cloneable: true, submittable: true },
  defaultLocale: { type: 'string', localizable: false, cloneable: true, submittable: true },
  description: { type: 'string', localizable: true, cloneable: true, submittable: true },
  eventDetails: { type: 'string', localizable: true, cloneable: true, submittable: true },
  localStartDate: { type: 'string', localizable: false, cloneable: true, submittable: true },
  localEndDate: { type: 'string', localizable: false, cloneable: true, submittable: true },
  localStartTime: { type: 'string', localizable: false, cloneable: true, submittable: true },
  localEndTime: { type: 'string', localizable: false, cloneable: true, submittable: true },
  localizations: { type: 'object', localizable: false, cloneable: true, submittable: true },
  localizationOverrides: { type: 'object', localizable: false, cloneable: true, submittable: true },
  timezone: { type: 'string', localizable: false, cloneable: true, submittable: true },
  showAgendaPostEvent: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  showVenuePostEvent: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  showVenueAdditionalInfoPostEvent: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  venue: { type: 'object', localizable: false, cloneable: false, submittable: false },
  showSponsors: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  rsvpFormFields: { type: 'object', localizable: false, cloneable: true, submittable: true },
  promotionalItems: { type: 'array', localizable: true, cloneable: true, submittable: true },
  rsvpDescription: { type: 'string', localizable: true, cloneable: true, submittable: true },
  attendeeLimit: { type: 'number', localizable: false, cloneable: true, submittable: true },
  allowWaitlisting: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  allowGuestRegistration: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  hostEmail: { type: 'string', localizable: false, cloneable: true, submittable: true },
  eventId: { type: 'string', localizable: false, cloneable: false, submittable: true },
  published: { type: 'boolean', localizable: false, cloneable: false, submittable: true },
  creationTime: { type: 'string', localizable: false, cloneable: false, submittable: true },
  modificationTime: { type: 'string', localizable: false, cloneable: false, submittable: true },
  isPrivate: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  inviteOnly: { type: 'boolean', localizable: false, cloneable: true, submittable: true },
  detailPagePath: { type: 'string', localizable: false, cloneable: false, submittable: false },
  useLegacyDetailPagePath: { type: 'boolean', localizable: false, cloneable: false, submittable: true },
  video: { type: 'object', localizable: false, cloneable: true, submittable: true, ref: VIDEO_DATA_REF_FILTER },
  registration: { type: 'object', localizable: false, cloneable: true, submittable: true, ref: REGISTRATION_DATA_REF_FILTER },
  marketoIntegration: { type: 'object', localizable: false, cloneable: false, submittable: true, ref: MARKETO_INTEGRATION_DATA_REF_FILTER },
}

// ============================================================================
// SPEAKER DATA FILTER
// ============================================================================

export const SPEAKER_DATA_FILTER: DataFilter = {
  speakerId: { type: 'string', localizable: false, submittable: true },
  firstName: { type: 'string', localizable: false, submittable: true },
  lastName: { type: 'string', localizable: false, submittable: true },
  title: { type: 'string', localizable: true, submittable: true },
  bio: { type: 'string', localizable: true, submittable: true },
  socialLinks: { type: 'array', localizable: false, submittable: true },
  localizations: { type: 'object', localizable: false, submittable: true },
  creationTime: { type: 'string', localizable: false, submittable: false },
  modificationTime: { type: 'string', localizable: false, submittable: true },
}

// ============================================================================
// SPONSOR DATA FILTER
// ============================================================================

export const SPONSOR_DATA_FILTER: DataFilter = {
  sponsorId: { type: 'string', localizable: false, submittable: true },
  name: { type: 'string', localizable: false, submittable: true },
  info: { type: 'string', localizable: true, submittable: true },
  link: { type: 'string', localizable: false, submittable: true },
  localizations: { type: 'object', localizable: false, submittable: true },
  creationTime: { type: 'string', localizable: false, submittable: false },
  modificationTime: { type: 'string', localizable: false, submittable: true },
}

// ============================================================================
// VENUE DATA FILTER
// ============================================================================

// Required fields per OpenAPI BaseVenueProperties:
// placeId, venueName, formattedAddress, addressComponents, coordinates, gmtOffset
export const VENUE_DATA_FILTER: DataFilter = {
  venueName: { type: 'string', localizable: false, submittable: true },
  placeId: { type: 'string', localizable: false, submittable: true },
  coordinates: { type: 'object', localizable: false, submittable: true },
  gmtOffset: { type: 'number', localizable: false, submittable: true },
  addressComponents: { type: 'array', localizable: false, submittable: true }, // Required by OpenAPI
  formattedAddress: { type: 'string', localizable: false, submittable: true },
  localizations: { type: 'object', localizable: false, submittable: true },
  localizationOverrides: { type: 'object', localizable: false, submittable: true },
  additionalInformation: { type: 'string', localizable: true, submittable: true },
  creationTime: { type: 'string', localizable: false, submittable: false },
  modificationTime: { type: 'string', localizable: false, submittable: true },
}

// ============================================================================
// PUBLISHING PROFILE DATA FILTER
// ============================================================================

export const PUBLISHING_PROFILE_DATA_FILTER: DataFilter = {
  name: { type: 'string', submittable: true, updatable: true },
  description: { type: 'string', submittable: true, updatable: true },
  metadata: { type: 'object', submittable: true, updatable: true },
  status: { type: 'string', submittable: true, updatable: true },
  profileId: { type: 'string', submittable: false, updatable: false },
  modificationTime: { type: 'number', submittable: true, updatable: true },
  creationTime: { type: 'number', submittable: false, updatable: false },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an attribute value is valid (not undefined, null, or empty string)
 * Note: false is considered valid
 */
export function isValidAttribute(attr: any): boolean {
  return (attr !== undefined && attr !== null && attr !== '') || attr === false
}

// ============================================================================
// SERIES FILTERING
// ============================================================================

export type SeriesFilterMode = 'submission' | 'clone' | 'update'

const SERIES_FILTER_STRATEGIES: Record<SeriesFilterMode, (descriptor: DataFieldDescriptor | undefined) => boolean> = {
  submission: (descriptor) => descriptor?.submittable === true,
  clone: (descriptor) => descriptor?.submittable === true && descriptor?.cloneable !== false,
  update: (descriptor) => descriptor?.submittable === true && descriptor?.updatable !== false,
}

/**
 * Filter series data based on mode (submission, clone, update)
 */
export function filterSeriesData(
  data: Record<string, any>,
  mode: SeriesFilterMode = 'submission',
  options: FilterOptions = {}
): Record<string, any> {
  if (!data || typeof data !== 'object') return {}

  const strategy = SERIES_FILTER_STRATEGIES[mode] || SERIES_FILTER_STRATEGIES.submission
  const { excludeKeys = [] } = options

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (excludeKeys.includes(key)) return acc

    const descriptor = SERIES_DATA_FILTER[key]

    if (!descriptor) return acc
    if (!strategy(descriptor)) return acc
    if (!isValidAttribute(value)) return acc

    acc[key] = value
    return acc
  }, {} as Record<string, any>)
}

// ============================================================================
// EVENT FILTERING
// ============================================================================

export type EventFilterMode = 'submission' | 'clone'

const EVENT_FILTER_STRATEGIES: Record<EventFilterMode, (descriptor: DataFieldDescriptor | undefined) => boolean> = {
  submission: (descriptor) => descriptor?.submittable === true,
  clone: (descriptor) => descriptor?.submittable === true && descriptor?.cloneable !== false,
}

/**
 * Filter event data based on mode (submission, clone)
 * 
 * - submission: Include all submittable fields (for publish/unpublish/update)
 * - clone: Include only submittable AND cloneable fields (excludes eventId, published, etc.)
 */
export function filterEventData(
  data: Record<string, any>,
  mode: EventFilterMode = 'submission',
  options: FilterOptions = {}
): Record<string, any> {
  if (!data || typeof data !== 'object') return {}

  const strategy = EVENT_FILTER_STRATEGIES[mode] || EVENT_FILTER_STRATEGIES.submission
  const { excludeKeys = [] } = options

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (excludeKeys.includes(key)) return acc

    const descriptor = EVENT_DATA_FILTER[key]

    if (!descriptor) return acc
    if (!strategy(descriptor)) return acc
    if (!isValidAttribute(value)) return acc

    acc[key] = value
    return acc
  }, {} as Record<string, any>)
}

// ============================================================================
// PUBLISHING PROFILE FILTERING
// ============================================================================

export type PublishingProfileFilterMode = 'submission' | 'update'

const PUBLISHING_PROFILE_FILTER_STRATEGIES: Record<PublishingProfileFilterMode, (descriptor: DataFieldDescriptor | undefined) => boolean> = {
  submission: (descriptor) => descriptor?.submittable === true,
  update: (descriptor) => descriptor?.submittable === true && descriptor?.updatable !== false,
}

/**
 * Filter publishing profile data based on mode (submission, update)
 */
export function filterPublishingProfileData(
  data: Record<string, any>,
  mode: PublishingProfileFilterMode = 'submission',
  options: FilterOptions = {}
): Record<string, any> {
  if (!data || typeof data !== 'object') return {}

  const strategy = PUBLISHING_PROFILE_FILTER_STRATEGIES[mode] || PUBLISHING_PROFILE_FILTER_STRATEGIES.submission
  const { excludeKeys = [] } = options

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (excludeKeys.includes(key)) return acc

    const descriptor = PUBLISHING_PROFILE_DATA_FILTER[key]

    if (!descriptor) return acc
    if (!strategy(descriptor)) return acc
    if (!isValidAttribute(value)) return acc

    acc[key] = value
    return acc
  }, {} as Record<string, any>)
}

// ============================================================================
// EVENT ATTRIBUTE HELPERS
// ============================================================================

/**
 * Set an event attribute, handling localization
 */
export function setEventAttribute(
  data: Record<string, any>,
  key: string,
  value: any,
  locale: string
): void {
  if (EVENT_DATA_FILTER[key]?.localizable) {
    if (!data.localizations) data.localizations = {}
    if (!data.localizations[locale]) data.localizations[locale] = {}
    data.localizations[locale][key] = value
  } else {
    data[key] = value
  }
}

/**
 * Get an event attribute, handling localization
 */
export function getAttribute(
  data: Record<string, any>,
  key: string,
  locale: string
): any {
  if (data.localizations?.[locale]?.[key]) {
    return data.localizations[locale][key]
  }
  return data[key]
}

// ============================================================================
// PROFILE (SPEAKER/SPONSOR) ATTRIBUTE HELPERS
// ============================================================================

/**
 * Get a profile attribute, handling localization
 */
export function getProfileAttr(
  data: Record<string, any>,
  key: string,
  locale: string
): any {
  if (SPEAKER_DATA_FILTER[key]?.localizable) {
    const localizedData = data.localizations?.[locale]
    if (localizedData?.[key]) {
      return localizedData[key]
    }
    return data[key]
  }
  return data[key]
}

/**
 * Set a profile attribute, handling localization
 */
export function setProfileAttr(
  data: Record<string, any>,
  key: string,
  value: any,
  locale: string
): void {
  if (SPEAKER_DATA_FILTER[key]?.localizable) {
    if (!data.localizations) data.localizations = {}
    if (!data.localizations[locale]) data.localizations[locale] = {}
    data.localizations[locale][key] = value
  } else {
    data[key] = value
  }
}

// ============================================================================
// FIELD SPLITTING
// ============================================================================

/**
 * Split data into localizable and non-localizable fields based on a filter
 */
export function splitLocalizableFields(
  data: Record<string, any>,
  filter: DataFilter,
  locale: string
): SplitFieldsResult {
  const localizableFields: Record<string, any> = {}
  const nonLocalizableFields: Record<string, any> = {}

  Object.entries(data).forEach(([key, value]) => {
    if (filter[key]?.localizable) {
      if (data.localizations?.[locale]?.[key]) {
        localizableFields[key] = data.localizations[locale][key]
      } else {
        localizableFields[key] = value
      }
    } else if (isValidAttribute(value)) {
      nonLocalizableFields[key] = value
    }
  })

  return { localizableFields, nonLocalizableFields }
}

// ============================================================================
// SYNC PAYLOAD BUILDERS (no API calls)
// ============================================================================

/**
 * Build a venue payload for API submission (sync - no API calls needed)
 */
export function getVenuePayload(
  venueData: Record<string, any>,
  locale: string
): Record<string, any> {
  if (!venueData) return venueData

  // Split venue data into localizable and non-localizable fields
  const { localizableFields, nonLocalizableFields } = splitLocalizableFields(
    venueData,
    VENUE_DATA_FILTER,
    locale
  )

  const filteredGlobalPayload = Object.entries(nonLocalizableFields).reduce((acc, [key, value]) => {
    if (VENUE_DATA_FILTER[key]?.submittable) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  const filteredLocalePayload = Object.entries(localizableFields).reduce((acc, [key, value]) => {
    if (VENUE_DATA_FILTER[key]?.submittable) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  const payload: Record<string, any> = { ...filteredGlobalPayload }

  if (Object.keys(filteredLocalePayload).length > 0) {
    payload.localizations = { [locale]: filteredLocalePayload }
  }

  return payload
}

/**
 * Build an event payload for API submission (sync - no API calls needed)
 */
export function getEventPayload(
  eventData: Record<string, any>,
  locale: string
): Record<string, any> {
  if (!eventData) return eventData

  const { localizableFields, nonLocalizableFields } = splitLocalizableFields(
    eventData,
    EVENT_DATA_FILTER,
    locale
  )

  const filteredGlobalPayload = Object.entries(nonLocalizableFields).reduce((acc, [key, value]) => {
    if (EVENT_DATA_FILTER[key]?.submittable) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  const filteredLocalePayload = Object.entries(localizableFields).reduce((acc, [key, value]) => {
    if (EVENT_DATA_FILTER[key]?.submittable) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  const payload: Record<string, any> = { ...filteredGlobalPayload }

  if (Object.keys(filteredLocalePayload).length > 0) {
    payload.localizations = { [locale]: filteredLocalePayload }
  }

  return payload
}

/**
 * Filter submittable fields from data based on a filter definition
 * Generic helper used by payload builders
 */
export function filterSubmittableFields(
  data: Record<string, any>,
  filter: DataFilter
): Record<string, any> {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (filter[key]?.submittable && isValidAttribute(value)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)
}

