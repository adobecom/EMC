import { getLanguageKeyFromLocale } from '../config/localeMapping'
import { EventApiResponse, EventFormData } from '../types/domain'
import {
  applyLocaleMetadataToFormData,
  buildCreateModeLocaleSwitchFormData,
  buildLocaleSwitchFormData,
  buildLocaleSwitchResult,
} from './eventLocaleSwitch'

function createBaseFormData(): EventFormData {
  return {
    cloudType: 'CreativeCloud',
    eventType: 'in-person',
    seriesId: 'series-1',
    organizationId: 'org-1',
    name: 'English title',
    enTitle: 'Canonical English title',
    urlTitle: 'canonical-english-title',
    description: 'English rich description',
    eventDetails: 'English rich description',
    shortDescription: 'English short description',
    language: 'en',
    defaultLocale: 'en-US',
    isPrivate: true,
    inviteOnly: true,
    tags: [{ name: 'Design', caasId: 'caas:design' }],
    startDateTime: '2026-05-01T09:00',
    endDateTime: '2026-05-01T10:00',
    timezone: 'America/Los_Angeles',
    venue: {
      venueName: 'Moscone Center',
      formattedAddress: '123 Main St',
      placeId: 'place-1',
      coordinates: { lat: 37.783, lon: -122.401 },
      gmtOffset: -7,
      addressComponents: [
        {
          longName: '123 Main St',
          shortName: '123 Main St',
          types: ['street_address'],
        },
      ],
      additionalInformation: 'Doors open 30 minutes early.',
      showVenuePostEvent: true,
      showAdditionalInfoPostEvent: true,
    },
    attendeeLimit: 250,
    status: 'draft',
    registrationOpen: true,
    allowWaitlist: true,
    allowGuestRegistration: true,
    hostEmail: 'host@example.com',
    rsvpDescription: 'English RSVP copy',
    registrationType: 'ESP',
    marketoFormUrl: '',
    visibleRsvpFields: ['email'],
    requiredRsvpFields: ['email'],
    images: [{ imageKind: 'event-card-image', imageUrl: 'https://example.com/card.jpg' }],
    profiles: [
      {
        type: 'speaker',
        speakerId: 'speaker-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        title: 'Engineer',
        bio: 'English bio',
        isSaved: true,
        isFromSeries: true,
      },
    ],
    video: { url: 'https://example.com/video' },
    communityForumUrl: 'https://community.adobe.com/english-topic',
    communityTopicUrl: 'https://community.adobe.com/english-topic',
    secondaryLinkTitle: 'Join the discussion',
    agendaItems: [
      {
        id: 'agenda-1',
        startDateTime: '2026-05-01T09:00',
        endDateTime: '2026-05-01T09:30',
        title: 'Welcome',
        description: 'English agenda copy',
      },
    ],
    agenda: [
      {
        startTime: '09:00:00',
        title: 'Welcome',
        description: 'English agenda copy',
      },
    ],
    showAgendaPostEvent: true,
    sponsors: [
      {
        id: 'sponsor-1',
        sponsorId: 'series-sponsor-1',
        partnerName: 'Adobe',
        partnerUrl: 'https://adobe.com',
        info: 'English sponsor copy',
        type: 'Partner',
        isSaved: true,
        isFromSeries: true,
      },
    ],
    promotionalItems: [{ title: 'English promo' }],
    localizations: {
      'en-US': {
        title: 'English title',
      },
    },
    localizationOverrides: {
      source: 'draft',
    },
  }
}

function createEventResponse(): EventApiResponse {
  return {
    eventId: 'event-1',
    published: false,
    seriesId: 'series-1',
    cloudType: 'ExperienceCloud',
    eventType: 'InPerson',
    enTitle: 'Canonical English title',
    detailPagePath: 'https://example.com/us/en/events/canonical-english-title/overview.html',
    localStartDate: '2026-05-01',
    localEndDate: '2026-05-01',
    localStartTime: '09:00:00',
    localEndTime: '10:00:00',
    timezone: 'Europe/Madrid',
    isPrivate: false,
    inviteOnly: false,
    allowWaitlisting: true,
    allowGuestRegistration: true,
    hostEmail: 'host@example.com',
    attendeeLimit: 300,
    registration: {
      type: 'ESP',
      formData: 'v1',
    },
    rsvpFormFields: {
      visible: ['email'],
      required: ['email'],
    },
    venue: {
      venueId: 'venue-1',
      venueName: 'Madrid Creative Center',
      formattedAddress: 'Gran Via 1',
      placeId: 'place-2',
      coordinates: { lat: 40.42, lon: -3.7 },
      gmtOffset: 2,
      addressComponents: [],
      localizations: {
        'es-ES': {
          additionalInformation: 'Trae una identificacion valida.',
        },
      },
    },
    localizations: {
      'en-US': {
        title: 'English API title',
        description: 'English API short description',
        eventDetails: 'English API details',
        rsvpDescription: 'English API RSVP',
        cta: [
          {
            url: 'https://community.adobe.com/english-topic',
            label: 'English CTA',
          },
        ],
        promotionalItems: [{ title: 'English promo' }],
        agenda: [
          {
            startTime: '09:00:00',
            title: 'Opening',
            description: 'English agenda copy',
          },
        ],
      },
      'es-ES': {
        title: 'Titulo en espanol',
        description: 'Resumen en espanol',
        eventDetails: 'Detalles en espanol',
        rsvpDescription: 'RSVP en espanol',
        cta: [
          {
            url: 'https://community.adobe.com/espanol-topic',
            label: 'CTA en espanol',
          },
        ],
        promotionalItems: [{ title: 'Promo en espanol' }],
        agenda: [
          {
            startTime: '09:00:00',
            title: 'Apertura',
            description: 'Agenda en espanol',
          },
        ],
      },
    },
    images: [],
    speakers: [],
    sponsors: [],
  }
}

test('getLanguageKeyFromLocale uses explicit mapping first and falls back to locale prefix', () => {
  expect(getLanguageKeyFromLocale('pt-BR')).toBe('pt')
  expect(getLanguageKeyFromLocale('es-ES')).toBe('es')
  expect(getLanguageKeyFromLocale('it-IT')).toBe('it')
  expect(getLanguageKeyFromLocale(undefined)).toBe('en')
})

test('applyLocaleMetadataToFormData keeps the form data in sync with the context locale', () => {
  const formData = createBaseFormData()

  const nextFormData = applyLocaleMetadataToFormData(formData, 'fr-FR')

  expect(nextFormData.language).toBe('fr')
  expect(nextFormData.defaultLocale).toBe('fr-FR')
  expect(nextFormData.name).toBe(formData.name)
  expect(nextFormData.startDateTime).toBe(formData.startDateTime)
})

test('buildCreateModeLocaleSwitchFormData resets locale-specific draft fields but preserves global setup', () => {
  const formData = createBaseFormData()

  const nextFormData = buildCreateModeLocaleSwitchFormData(formData, 'es-ES')

  expect(nextFormData.language).toBe('es')
  expect(nextFormData.defaultLocale).toBe('es-ES')
  expect(nextFormData.name).toBe('')
  expect(nextFormData.description).toBe('')
  expect(nextFormData.eventDetails).toBe('')
  expect(nextFormData.shortDescription).toBe('')
  expect(nextFormData.rsvpDescription).toBe('')
  expect(nextFormData.communityForumUrl).toBe('')
  expect(nextFormData.communityTopicUrl).toBeNull()
  expect(nextFormData.secondaryLinkTitle).toBe('')
  expect(nextFormData.promotionalItems).toEqual([])
  expect(nextFormData.agendaItems).toEqual([])
  expect(nextFormData.agenda).toEqual([])
  expect(nextFormData.venue?.venueName).toBe(formData.venue?.venueName)
  expect(nextFormData.venue?.placeId).toBe(formData.venue?.placeId)
  expect(nextFormData.venue?.additionalInformation).toBe('')
  expect(nextFormData.profiles?.[0].speakerId).toBe(formData.profiles?.[0].speakerId)
  expect(nextFormData.profiles?.[0].title).toBe('')
  expect(nextFormData.profiles?.[0].bio).toBeUndefined()
  expect(nextFormData.sponsors?.[0].partnerName).toBe(formData.sponsors?.[0].partnerName)
  expect(nextFormData.sponsors?.[0].info).toBeUndefined()
  expect(nextFormData.enTitle).toBe(formData.enTitle)
  expect(nextFormData.startDateTime).toBe(formData.startDateTime)
  expect(nextFormData.timezone).toBe(formData.timezone)
  expect(nextFormData.tags).toEqual(formData.tags)
  expect(nextFormData.localizations).toBeUndefined()
  expect(nextFormData.localizationOverrides).toBeUndefined()
})

test('buildLocaleSwitchResult keeps create-mode switches dirty and edit-mode switches clean', () => {
  const createModeResult = buildLocaleSwitchResult(createBaseFormData(), 'fr-FR', null)
  const editModeResult = buildLocaleSwitchResult(
    createBaseFormData(),
    'es-ES',
    createEventResponse()
  )

  expect(createModeResult.isDirty).toBe(true)
  expect(createModeResult.formData.language).toBe('fr')
  expect(editModeResult.isDirty).toBe(false)
  expect(editModeResult.formData.language).toBe('es')
})

test('buildLocaleSwitchFormData remaps edit-mode content from the API response', () => {
  const dirtyFormData = createBaseFormData()
  dirtyFormData.name = 'Unsaved local draft title'
  dirtyFormData.shortDescription = 'Unsaved local draft short description'
  dirtyFormData.language = 'en'
  dirtyFormData.defaultLocale = 'en-US'

  const nextFormData = buildLocaleSwitchFormData(
    dirtyFormData,
    'es-ES',
    createEventResponse()
  )
  const firstPromotionalItem = nextFormData.promotionalItems?.[0]

  expect(nextFormData.language).toBe('es')
  expect(nextFormData.defaultLocale).toBe('es-ES')
  expect(nextFormData.name).toBe('Titulo en espanol')
  expect(nextFormData.shortDescription).toBe('Resumen en espanol')
  expect(nextFormData.description).toBe('Detalles en espanol')
  expect(nextFormData.rsvpDescription).toBe('RSVP en espanol')
  expect(nextFormData.communityForumUrl).toBe('https://community.adobe.com/espanol-topic')
  expect(nextFormData.secondaryLinkTitle).toBe('CTA en espanol')
  expect(nextFormData.agendaItems?.[0].title).toBe('Apertura')
  expect(
    typeof firstPromotionalItem === 'string' ? firstPromotionalItem : firstPromotionalItem?.title
  ).toBe('Promo en espanol')
  expect(nextFormData.venue?.venueName).toBe('Madrid Creative Center')
  expect(nextFormData.venue?.additionalInformation).toBe('Trae una identificacion valida.')
  expect(nextFormData.enTitle).toBe('Canonical English title')
  expect(nextFormData.cloudType).toBe('ExperienceCloud')
  expect(nextFormData.timezone).toBe('Europe/Madrid')
})
