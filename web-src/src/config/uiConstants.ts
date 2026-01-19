/**
 * UI-focused constants used across components and contexts.
 * Keep grouped by feature to make maintenance easier.
 */

import type { AttendeeColumnConfig } from '../types/attendee'
import type { SpeakerType, SponsorType } from '../types/domain'

export const EVENT_FORM_LIMITS = {
  venueNameMaxLength: 80,
  eventTitleMaxLength: 80,
  shortDescriptionMaxLength: 160,
} as const

export const EVENT_FORM_OPTIONS = {
  languages: [
    { key: 'en', label: 'English' },
    { key: 'es', label: 'Spanish' },
    { key: 'fr', label: 'French' },
    { key: 'de', label: 'German' },
    { key: 'ja', label: 'Japanese' },
    { key: 'ko', label: 'Korean' },
    { key: 'pt', label: 'Portuguese' },
    { key: 'zh', label: 'Chinese' },
  ],
} as const

export const MARKETO_OPTIONS = {
  eventTypes: [
    { key: 'no-integration', label: 'No Marketo integration' },
    { key: 'DX NA/ROW', label: 'DX NA/ROW' },
    { key: 'DX APAC', label: 'DX APAC' },
    { key: 'DX EMEA', label: 'DX EMEA' },
    { key: 'DX Japan', label: 'DX Japan' },
    { key: 'DX LATAM', label: 'DX LATAM' },
  ],
  eventPois: [
    { key: 'no-poi', label: 'No Event POI' },
    { key: 'Adobe Analytics', label: 'Adobe Analytics' },
    { key: 'Adobe Audience Manager', label: 'Adobe Audience Manager' },
    { key: 'Adobe Campaign', label: 'Adobe Campaign' },
    { key: 'Adobe Commerce', label: 'Adobe Commerce' },
    { key: 'Adobe Creative Cloud®', label: 'Adobe Creative Cloud®' },
    { key: 'Adobe Experience Manager', label: 'Adobe Experience Manager' },
    { key: 'Adobe Experience Manager Assets', label: 'Adobe Experience Manager Assets' },
    { key: 'Adobe Experience Manager Forms', label: 'Adobe Experience Manager Forms' },
    { key: 'Adobe Experience Manager Sites', label: 'Adobe Experience Manager Sites' },
    { key: 'Adobe Experience Platform', label: 'Adobe Experience Platform' },
    { key: 'Adobe Journey Optimizer', label: 'Adobe Journey Optimizer' },
    { key: 'Adobe Sign', label: 'Adobe Sign' },
    { key: 'Adobe Target', label: 'Adobe Target' },
    { key: 'Customer Journey Analytics', label: 'Customer Journey Analytics' },
    { key: 'Experience Platform Launch', label: 'Experience Platform Launch' },
    { key: 'Intelligent Services', label: 'Intelligent Services' },
    { key: 'Marketo® Engage', label: 'Marketo® Engage' },
    { key: 'Real-Time CDP', label: 'Real-Time CDP' },
    { key: 'Workfront', label: 'Workfront' },
  ],
} as const

export const ATTENDEE_FILTERS = {
  excludedFields: ['firstName', 'lastName', 'name', 'email', 'attendeeId'],
} as const

export const ATTENDEE_TABLE = {
  stickyColumns: ['registrationStatus', 'checkedIn'],
  nameFields: ['firstName', 'lastName'],
  excludedFieldTypes: ['submit', 'button', 'hidden'],
  labelOverrides: {
    registrationStatus: 'RSVP Status',
    checkedIn: 'Checked In',
    email: 'Email',
    mobilePhone: 'Phone',
    companyName: 'Company',
    jobTitle: 'Job Title',
    industry: 'Industry',
    countryRegion: 'Country/Region',
  },
  columnWidths: {
    name: 200,
    email: 250,
    phone: 150,
    company: 200,
    default: 150,
    sticky: 130,
  },
} as const

export const ATTENDEE_DEFAULT_COLUMNS: AttendeeColumnConfig[] = [
  { key: 'name', label: 'Name', type: 'text', fallback: '-', width: 200, sortable: true },
  { key: 'email', label: 'Email', type: 'text', fallback: '-', width: 250, sortable: true },
  { key: 'mobilePhone', label: 'Phone', type: 'text', fallback: '-', width: 150, sortable: true },
  { key: 'companyName', label: 'Company', type: 'text', fallback: '-', width: 200, sortable: true },
  { key: 'registrationStatus', label: 'RSVP Status', type: 'text', fallback: 'registered', width: 130, sortable: true, isSticky: true },
  { key: 'checkedIn', label: 'Checked In', type: 'text', fallback: '-', width: 130, sortable: true, isSticky: true },
]

export const IMAGE_UPLOAD = {
  validTypes: ['jpeg', 'jpg', 'png', 'svg'],
  acceptedFileTypes: '.jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml',
} as const

export type ValidImageType = typeof IMAGE_UPLOAD.validTypes[number]

export const SPEAKER_OPTIONS: { key: SpeakerType; label: string }[] = [
  { key: 'host', label: 'Host' },
  { key: 'presenter', label: 'Presenter' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'guest-speaker', label: 'Guest Speaker' },
  { key: 'keynote', label: 'Keynote' },
  { key: 'judge', label: 'Judge' },
  { key: 'portfolio-reviewer', label: 'Portfolio Reviewer' },
  { key: 'career-advisor', label: 'Career Advisor' },
  { key: 'product-demonstrator', label: 'Product Demonstrator' },
]

export const SPEAKER_TYPE_API_MAP: Record<string, string> = {
  host: 'Host',
  presenter: 'Presenter',
  speaker: 'Speaker',
  'guest-speaker': 'GuestSpeaker',
  keynote: 'Keynote',
  judge: 'Judge',
  'portfolio-reviewer': 'PortfolioReviewer',
  'career-advisor': 'CareerAdvisor',
  'product-demonstrator': 'ProductDemonstrator',
  Host: 'Host',
  Presenter: 'Presenter',
  Speaker: 'Speaker',
  GuestSpeaker: 'GuestSpeaker',
  Keynote: 'Keynote',
  Judge: 'Judge',
  PortfolioReviewer: 'PortfolioReviewer',
  CareerAdvisor: 'CareerAdvisor',
  ProductDemonstrator: 'ProductDemonstrator',
}

export const SPONSOR_OPTIONS: { key: SponsorType; label: string }[] = [
  { key: 'Diamond', label: 'Diamond' },
  { key: 'Platinum', label: 'Platinum' },
  { key: 'Gold', label: 'Gold' },
  { key: 'Silver', label: 'Silver' },
  { key: 'Bronze', label: 'Bronze' },
  { key: 'Engagement', label: 'Engagement' },
  { key: 'Partner', label: 'Partner' },
]

export const AGENDA_LIMITS = {
  collapsedDescriptionMaxLength: 80,
} as const

export const TOAST_LIMITS = {
  defaultDurationMs: 5000,
  errorDurationMs: 8000,
  maxToasts: 5,
} as const
