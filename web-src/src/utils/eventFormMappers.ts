/* 
 * Event form data mappers for API response <-> form state
 * Extracted for reuse when switching locale and re-mapping form data
 */

import {
  EventFormData,
  ProfileData,
  SponsorData,
  EventApiResponse,
  EventCustomAttributeGroup,
  SeriesSpeaker,
  SpeakerType,
} from '../types/domain'
import { getLanguageKeyFromLocale } from '../config/localeMapping'
import { fromApiSocialLink } from './socialPlatformDetector'

/**
 * Check if a speaker has localized content (at least title) for the given locale.
 * Requires explicit localizations[locale].title — no fallback to top-level title.
 */
export function speakerHasLocalization(speaker: SeriesSpeaker, locale: string): boolean {
  const loc = speaker.localizations?.[locale]
  return !!(loc?.title && String(loc.title).trim())
}

/**
 * Get a localized value from an object, falling back to direct property
 */
export function getLocalizedValue(obj: any, fieldName: string, locale: string): any {
  const localized = obj?.localizations?.[locale]?.[fieldName]
  if (localized !== undefined && localized !== null && localized !== '') {
    return localized
  }
  return obj?.[fieldName]
}

/**
 * Read an event's RSVP form field config. ESP's RSVPFormFields schema stores
 * `{ required: string[], visible: string[] }` — expand it into the form's
 * per-field array shape (display order = visible[] order).
 */
function readRsvpFormFields(
  raw: any
): Array<{ field: string; required?: boolean }> {
  if (!raw || !Array.isArray(raw.visible)) return []
  const requiredSet = new Set<string>(Array.isArray(raw.required) ? raw.required : [])
  return raw.visible.map((field: string) => ({
    field,
    required: requiredSet.has(field),
  }))
}

/**
 * Map ESP event speakerType (PascalCase per OpenAPI) to form ProfileData SpeakerType (kebab-case Picker keys).
 * Accepts lowercase legacy values. Unknown values default to 'speaker'.
 */
export function apiSpeakerTypeToFormSpeakerType(apiType: string | undefined | null): SpeakerType {
  if (apiType == null || apiType === '') return 'speaker'
  const key = String(apiType).trim()
  const map: Record<string, SpeakerType> = {
    Host: 'host',
    Presenter: 'presenter',
    Speaker: 'speaker',
    GuestSpeaker: 'guest-speaker',
    Keynote: 'keynote',
    Judge: 'judge',
    PortfolioReviewer: 'portfolio-reviewer',
    CareerAdvisor: 'career-advisor',
    ProductDemonstrator: 'product-demonstrator',
    host: 'host',
    presenter: 'presenter',
    speaker: 'speaker',
    'guest-speaker': 'guest-speaker',
    keynote: 'keynote',
    judge: 'judge',
    'portfolio-reviewer': 'portfolio-reviewer',
    'career-advisor': 'career-advisor',
    'product-demonstrator': 'product-demonstrator',
  }
  return map[key] ?? 'speaker'
}

/**
 * Map API speaker data to ProfileData format
 */
export function mapSpeakersToProfiles(speakers: any[], locale: string = 'en-US'): ProfileData[] {
  return speakers.map(speaker => ({
    type: apiSpeakerTypeToFormSpeakerType(speaker.speakerType),
    speakerId: speaker.speakerId,
    firstName: getLocalizedValue(speaker, 'firstName', locale) || speaker.firstName || '',
    lastName: getLocalizedValue(speaker, 'lastName', locale) || speaker.lastName || '',
    title: getLocalizedValue(speaker, 'title', locale) || speaker.title || '',
    bio: getLocalizedValue(speaker, 'bio', locale) || speaker.bio || '',
    imageUrl: speaker.photo?.imageUrl || speaker.imageUrl || '',
    imageId: speaker.photo?.imageId || speaker.imageId || '',
    socialLinks: (speaker.socialLinks || []).map((link: any) => fromApiSocialLink(link)),
    isSaved: true,
    isFromSeries: true
  }))
}

/**
 * Map API sponsor data to SponsorData format
 */
export function mapSponsorsToFormData(sponsors: any[], locale: string = 'en-US'): SponsorData[] {
  return sponsors.map((sponsor, index) => ({
    id: sponsor.sponsorId || `sponsor-${index}`,
    sponsorId: sponsor.sponsorId,
    partnerName: getLocalizedValue(sponsor, 'name', locale) || sponsor.name || sponsor.partnerName || '',
    partnerUrl: getLocalizedValue(sponsor, 'link', locale) || sponsor.link || sponsor.partnerUrl || '',
    imageUrl: sponsor.image?.imageUrl || sponsor.imageUrl || '',
    imageId: sponsor.image?.imageId || sponsor.imageId || '',
    type: sponsor.sponsorType,
    isSaved: true,
    isFromSeries: true
  }))
}

/**
 * Map API response to form data for a given locale
 */
export function mapApiResponseToFormData(event: EventApiResponse, locale: string): Partial<EventFormData> {
  const localized = event.localizations?.[locale] || {}

  const parsedTags = event.tags
    ? event.tags.split(',').map((tag: string) => ({
        name: tag.split('/').pop() || tag,
        caasId: tag.trim()
      }))
    : []

  const agendaItems = (localized.agenda || []).map((item: any, index: number) => ({
    id: `agenda-${index}`,
    title: item.title || '',
    description: item.description || '',
    startDateTime: item.startTime
      ? `${event.localStartDate}T${item.startTime}`
      : '',
    endDateTime: item.endTime
      ? `${event.localStartDate}T${item.endTime}`
      : ''
  }))

  const cta = localized.cta?.[0]

  const venueLocalized = event.venue?.localizations?.[locale] || {}
  const imgs = event.images || []
  const venueAdditionalImageRow = imgs.find((i: { imageKind?: string }) => i.imageKind === 'venue-additional-image')
  const venueMapImageRow = imgs.find((i: { imageKind?: string }) => i.imageKind === 'venue-map-image')

  const venueData = event.venue ? {
    venueName: event.venue.venueName || '',
    formattedAddress: event.venue.formattedAddress || event.venue.address || '',
    placeId: event.venue.placeId,
    coordinates: event.venue.coordinates,
    gmtOffset: event.venue.gmtOffset ?? event.gmtOffset,
    addressComponents: event.venue.addressComponents,
    additionalInformation: venueLocalized.additionalInformation
      ?? event.venue.additionalInformation
      ?? event.venue.additionalInfo
      ?? '',
    venueAdditionalImageUrl: (venueAdditionalImageRow as { imageUrl?: string } | undefined)?.imageUrl,
    venueAdditionalImageId: (venueAdditionalImageRow as { imageId?: string } | undefined)?.imageId,
    venueMapImageUrl: (venueMapImageRow as { imageUrl?: string } | undefined)?.imageUrl,
    showVenuePostEvent: event.showVenuePostEvent ?? true,
    showAdditionalInfoPostEvent: event.showVenueAdditionalInfoPostEvent ?? true,
    googlePlaceName: event.venue.venueName || ''
  } : undefined

  const mappedEventType = event.eventType?.toLowerCase() === 'webinar' ? 'webinar' : 'in-person'

  return {
    cloudType: (event.cloudType as 'CreativeCloud' | 'ExperienceCloud') || 'CreativeCloud',
    eventType: mappedEventType as 'in-person' | 'webinar',
    seriesId: event.seriesId || '',
    name: localized.title || '',
    enTitle: event.enTitle || '',
    urlTitle: event.detailPagePath?.split('/').slice(-5, -4).join('/') || '',
    description: localized.eventDetails || '',
    shortDescription: localized.description || '',
    language: getLanguageKeyFromLocale(locale),
    defaultLocale: locale,
    isPrivate: event.isPrivate || false,
    inviteOnly: event.inviteOnly || false,
    tags: parsedTags,
    startDateTime: event.localStartDate && event.localStartTime
      ? `${event.localStartDate}T${event.localStartTime.slice(0, 5)}`
      : '',
    endDateTime: event.localEndDate && event.localEndTime
      ? `${event.localEndDate}T${event.localEndTime.slice(0, 5)}`
      : '',
    timezone: event.timezone,
    venue: venueData,
    attendeeLimit: event.attendeeLimit,
    status: event.published ? 'published' : 'draft',
    registrationOpen: true,
    allowWaitlist: event.allowWaitlisting || false,
    allowGuestRegistration: event.allowGuestRegistration || false,
    closeRegistration: event.closeRegistration ?? false,
    hostEmail: event.hostEmail || '',
    rsvpDescription: localized.rsvpDescription || '',
    registrationType: (event.registration?.type === 'ESP' || event.registration?.type === 'Marketo')
      ? event.registration.type
      : 'ESP',
    // Only populate marketoFormUrl from formData when type is Marketo.
    // When type is ESP, formData is "v1" (placeholder token for rsvpFormFields) — do not show in Marketo input.
    marketoFormUrl: event.registration?.type === 'Marketo' ? (event.registration.formData || '') : '',
    rsvpFormFields: readRsvpFormFields(event.rsvpFormFields),
    images: event.images || [],
    profiles: mapSpeakersToProfiles(event.speakers || [], locale),
    communityForumUrl: cta?.url || '',
    secondaryLinkTitle: cta?.label || '',
    agendaItems: agendaItems,
    showAgendaPostEvent: event.showAgendaPostEvent || false,
    showSponsors: event.showSponsors ?? true,
    sponsors: mapSponsorsToFormData(event.sponsors || [], locale),
    promotionalItems: (localized.promotionalItems || [])
      .filter((item: any) => {
        if (typeof item === 'string') return item.trim() !== ''
        return item && item.title
      })
      .map((item: any) => {
        if (typeof item === 'string') return { title: item }
        return item
      }),
    marketoIntegration: event.marketoIntegration,
    video: event.video,
    customAttributes: (event.customAttributes as EventCustomAttributeGroup[] | undefined)?.flatMap(g =>
      g.values.map((v, i) => ({
        attributeId: g.attributeId,
        attribute: g.attribute,
        valueId: v.valueId,
        value: v.value,
        ordinal: i,
      }))
    ) ?? [],
  }
}
