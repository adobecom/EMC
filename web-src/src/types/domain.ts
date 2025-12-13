/* 
* <license header>
*/

/**
 * Domain model type definitions
 */

// Organization and Team types
export interface Organization {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  imsOrgId?: string
}

export interface Team {
  id: string
  name: string
  description?: string
  organizationId: string
  createdAt: string
  updatedAt: string
  memberCount?: number
}

// Series types
export interface Series {
  id: string
  name: string
  description?: string
  organizationId: string
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface SeriesFormData {
  name: string
  description?: string
  organizationId: string
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  metadata?: Record<string, any>
}

// Series API Response types (from backend)
export interface TargetCms {
  provider: string
  instance: string
  code: string
}

export interface SeriesApiResponse {
  seriesId: string
  seriesName: string
  seriesDescription?: string
  seriesStatus: 'published' | 'draft' | 'archived'
  cloudType: string
  targetCms: TargetCms
  templateId: string
  externalThemeId?: string
  susiContextId?: string // SSO context ID
  relatedDomain?: string // Related domain for the series
  contentRoot?: string // Content root path
  createdBy?: string
  modifiedBy?: string
  creationTime: number
  modificationTime: number
}

// Event image types
export interface EventImage {
  imageKind: 'event-card-image' | 'event-hero-image' | 'venue-image' | string
  imageUrl?: string
  imageId?: string
  altText?: string
  [key: string]: any
}

// Venue types
export interface VenueCoordinates {
  lat: number
  lon: number
}

export interface VenueAddressComponent {
  longName: string
  shortName: string
  types: string[]
  languageCode?: string
}

// Venue localization data
export interface VenueLocalization {
  additionalInformation?: string
  [key: string]: any
}

export interface Venue {
  venueId: string
  venueName: string
  placeId?: string
  formattedAddress?: string
  addressComponents?: VenueAddressComponent[]
  coordinates?: VenueCoordinates
  gmtOffset?: number
  additionalInformation?: string // Localizable
  localizations?: Record<string, VenueLocalization>
  localizationOverrides?: Record<string, any>
  // Convenience fields (derived from addressComponents)
  address?: string
  city?: string
  state?: string
  stateCode?: string
  country?: string
  countryCode?: string
  postalCode?: string
  mapUrl?: string
  creationTime?: number
  modificationTime?: number
  [key: string]: any
}

// Event history types
export interface HistoryUser {
  id: string
  name: string
  email: string
  type: 'user' | string
}

export interface HistoryDiff {
  added?: Record<string, any>
  deleted?: Record<string, any>
  updated?: Record<string, any>
}

export interface HistoryRecord {
  resourceType: string
  resourceId: string
  changeType: string
  timestamp: number
  user: HistoryUser
  resourceSubtype?: string
  resourceSubtypeId?: string
  imageKind?: string
  diff?: HistoryDiff
  resource?: Record<string, any>
  creationTime: number
  modificationTime: number
}

export interface EventHistoryResponse {
  history: HistoryRecord[]
  count: number
  nextPageToken?: string
}

// Agenda item from API
export interface AgendaDataItem {
  startTime: string
  description?: string
  title: string
}

// Video data from API
export interface VideoData {
  url?: string
}

// Registration config from API
export interface RegistrationData {
  type?: string
  formData?: string
}

// Marketo integration data from API
export interface MarketoIntegrationData {
  eventType?: string
  salesforceCampaignId?: string
  mczProgramName?: string
  coMarketingPartner?: string
  eventPoi?: string
}

// CTA (Call-to-Action) item
export interface CtaItem {
  label?: string
  url?: string
  type?: string
}

// Promotional item
export interface PromotionalItem {
  title?: string
  description?: string
  url?: string
  imageUrl?: string
}

// Event API Response types (from backend)
export interface EventApiResponse {
  eventId: string
  title?: string // Localizable
  enTitle?: string // English title for URL/reference
  description?: string // Localizable - rich text for event page
  eventDetails?: string // Localizable - additional event details
  seriesId?: string
  cloudType?: string
  eventType?: string
  published: boolean
  startDate?: string
  endDate?: string
  localStartDate?: string
  localEndDate?: string
  localStartTime?: string
  localEndTime?: string
  timezone?: string
  duration?: number
  attendeeLimit?: number
  attendeeCount?: number
  waitlistAttendeeCount?: number
  hostEmail?: string
  isPrivate?: boolean
  allowWaitlisting?: boolean
  allowGuestRegistration?: boolean
  tags?: string
  topics?: string[]
  detailPagePath?: string
  externalEventId?: string
  creationTime?: number
  modificationTime?: number
  createdBy?: string
  modifiedBy?: string
  localizationOverrides?: Record<string, any>
  localizations?: Record<string, EventLocalization>
  venue?: Record<string, any>
  agenda?: AgendaDataItem[] // Localizable array
  rsvpFormFields?: Record<string, any>
  rsvpDescription?: string // Localizable
  video?: VideoData
  registration?: RegistrationData
  marketoIntegration?: MarketoIntegrationData
  liveUpdate?: boolean
  forceSpWrite?: boolean
  defaultLocale?: string
  showSponsors?: boolean
  showAgendaPostEvent?: boolean
  showVenuePostEvent?: boolean
  showVenueAdditionalInfoPostEvent?: boolean
  useLegacyDetailPagePath?: boolean
  communityTopicUrl?: string // URL for community forum topic
  cta?: CtaItem[] // Localizable call-to-action items
  promotionalItems?: PromotionalItem[] // Localizable promotional content
  gmtOffset?: number
  localStartTimeMillis?: number
  localEndTimeMillis?: number
  images?: EventImage[]
  speakers?: any[]
  sponsors?: any[]
  // Add any other fields as optional
  [key: string]: any
}

// Event localization data
export interface EventLocalization {
  title?: string
  description?: string
  eventDetails?: string
  rsvpDescription?: string
  agenda?: AgendaDataItem[]
  cta?: CtaItem[]
  promotionalItems?: PromotionalItem[]
  [key: string]: any
}

// Enhanced Event type for dashboard display
export interface EventDashboardItem {
  eventId: string
  eventName: string
  seriesId?: string
  seriesName?: string
  cloudType?: string
  eventType?: string
  published: boolean
  startDate?: string
  localStartDate?: string
  localStartTime?: string
  localStartTimeMillis?: number
  timezone?: string
  attendeeLimit?: number
  attendeeCount?: number
  hostEmail?: string
  creationTime?: number
  modificationTime?: number
  publishTime?: number
  createdBy?: string
  modifiedBy?: string
  venueName?: string
  language?: string
  thumbnail?: string
  contributor?: string
  detailPagePath?: string
  defaultLocale?: string
}

// Enhanced Series type for dashboard display
export interface SeriesDashboardItem {
  seriesId: string
  seriesName: string
  seriesDescription?: string
  seriesStatus: 'published' | 'draft' | 'archived' | 'unknown'
  cloudType: string
  creationTime: number
  modificationTime: number
  createdBy?: string
  modifiedBy?: string
  eventCount?: number
}

// Event types
export interface Event {
  id: string
  name: string
  description?: string
  seriesId: string
  organizationId: string
  startDateTime: string
  endDateTime: string
  location?: string
  capacity?: number
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'
  registrationOpen: boolean
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Tag/Topic types for event categorization
export interface EventTag {
  name: string
  caasId?: string
}

export interface EventTagGroup {
  groupName: string
  tags: EventTag[]
}

// CAAS Tag API Response types
export interface CaasTag {
  path: string
  tagID: string
  name: string
  title: string
  description?: string
  tagImage?: string
  tags?: Record<string, CaasTag>
  [key: string]: any // For localized titles like title.ja, title.de, etc.
}

export interface CaasNamespace {
  name: string
  title: string
  description: string
  path: string
  tags: Record<string, CaasTag>
}

export interface CaasTagsResponse {
  namespaces: Record<string, CaasNamespace>
}

// Speaker/Host profile types
// Per OpenAPI SocialLink schema: serviceName and link are required
export type SocialServiceName = 'YouTube' | 'LinkedIn' | 'Web' | 'X' | 'TikTok' | 'Instagram' | 'Facebook' | 'Pinterest'

export interface SocialLink {
  serviceName: SocialServiceName
  link: string
}

// Internal form representation (before API transformation)
export interface SocialLinkFormData {
  platform?: string // Display name for UI
  url: string // User input
}

// Speaker role types for events
export type SpeakerType = 
  | 'host'
  | 'presenter'
  | 'speaker'
  | 'guest-speaker'
  | 'keynote'
  | 'judge'
  | 'portfolio-reviewer'
  | 'career-advisor'
  | 'product-demonstrator'

export interface ProfileData {
  type: SpeakerType
  speakerId?: string // Series-level speaker ID
  firstName: string
  lastName: string
  title: string // Localizable
  bio?: string // Localizable
  imageUrl?: string
  imageId?: string
  socialLinks?: SocialLinkFormData[] // Form representation (url, platform)
  localizations?: Record<string, SpeakerLocalization>
  // State flags
  isSaved?: boolean // Speaker has been saved to series
  isFromSeries?: boolean // Speaker was selected from series autocomplete
  ordinal?: number // Order in event
  modificationTime?: number // For API updates
  creationTime?: number
}

// Speaker localization data
export interface SpeakerLocalization {
  title?: string
  bio?: string
  [key: string]: any
}

// Series-level speaker data from API (matches v1 SPEAKER_DATA_FILTER)
// Per OpenAPI: socialLinks uses SocialLink schema with serviceName + link
export interface SeriesSpeaker {
  speakerId: string
  firstName: string
  lastName: string
  title?: string // Localizable
  bio?: string // Localizable
  socialLinks?: SocialLink[] // API format: { serviceName, link }
  photo?: {
    imageId: string
    imageUrl: string
  }
  localizations?: Record<string, SpeakerLocalization>
  creationTime?: number
  modificationTime?: number
}

// Sponsor localization data
export interface SponsorLocalization {
  info?: string
  [key: string]: any
}

// Series-level sponsor data from API (matches v1 SPONSOR_DATA_FILTER)
export interface SeriesSponsor {
  sponsorId: string
  name: string
  info?: string // Localizable description/info about sponsor
  link?: string // External URL (v1 uses 'link', some places use 'externalUrl')
  externalUrl?: string // Alias for link
  // API returns image data under 'image' property
  image?: {
    imageId: string
    imageUrl: string
    altText?: string
  }
  logo?: {
    imageId: string
    imageUrl: string
  }
  localizations?: Record<string, SponsorLocalization>
  creationTime?: number
  modificationTime?: number
}

// Sponsor type enum per OpenAPI SponsorType schema
export type SponsorType = 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Engagement' | 'Partner'

// Sponsor/Partner types for form
export interface SponsorData {
  id: string
  sponsorId?: string  // Series-level sponsor ID if saved
  partnerName: string
  partnerUrl: string
  info?: string // Localizable description
  type?: SponsorType // Event-level sponsor type
  imageUrl?: string
  imageId?: string
  isSaved?: boolean
  isFromSeries?: boolean  // True if selected from series autocomplete
  localizations?: Record<string, SponsorLocalization>
  modificationTime?: number
}

// Image types for events
export interface EventImageData {
  imageKind: 'event-card-image' | 'event-hero-image' | 'venue-image' | string
  imageUrl?: string
  imageId?: string
  altText?: string
}

// Venue data types
// Address component per OpenAPI AddressComponent schema
// Note: Uses camelCase (longName, shortName) - converted from Google Places snake_case
export interface AddressComponent {
  longName: string
  shortName: string
  types: string[]
}

export interface VenueData {
  venueName: string
  formattedAddress?: string
  placeId?: string
  coordinates?: {
    lat: number
    lon: number
  }
  gmtOffset?: number
  addressComponents?: AddressComponent[] // Required by OpenAPI for venue creation
  additionalInformation?: string
  venueImageUrl?: string
  venueImageId?: string
  showVenuePostEvent?: boolean
  showAdditionalInfoPostEvent?: boolean
}

// Comprehensive Event Form Data
export interface EventFormData {
  // Step 1: Basic Info
  cloudType: 'CreativeCloud' | 'ExperienceCloud'
  eventType: 'in-person' | 'webinar'
  seriesId: string
  organizationId: string
  name: string // Title (localizable)
  enTitle?: string // English title for URL/reference
  urlTitle?: string // English title for page URL
  description?: string // Rich text description for event page (localizable)
  eventDetails?: string // Additional event details (localizable)
  shortDescription?: string // Plain text for Events Hub/SEO (160 chars max)
  language: string
  defaultLocale?: string
  isPrivate: boolean
  
  // Step 2: Tags & Topics
  tags?: EventTag[]
  topics?: string[]
  
  // Step 3: Date & Time
  startDateTime: string
  endDateTime: string
  localStartDate?: string
  localEndDate?: string
  localStartTime?: string
  localEndTime?: string
  timezone?: string
  
  // Step 4: Venue
  venue?: VenueData
  showVenuePostEvent?: boolean
  showVenueAdditionalInfoPostEvent?: boolean
  
  // Step 5: Attendance & Registration
  capacity?: number
  attendeeLimit?: number
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'
  registrationOpen: boolean
  allowWaitlist?: boolean
  allowWaitlisting?: boolean // Alias
  allowGuestRegistration?: boolean
  hostEmail?: string
  rsvpDescription?: string // Localizable
  // Registration fields configuration
  registrationType?: 'ESP' | 'Marketo'
  registration?: RegistrationData
  marketoFormUrl?: string
  marketoIntegration?: MarketoIntegrationData
  rsvpFormFields?: Record<string, any>
  visibleRsvpFields?: string[]
  requiredRsvpFields?: string[]
  
  // Step 6: Images
  images?: EventImageData[]
  
  // Step 7: Speakers & Hosts
  profiles?: ProfileData[]
  
  // Step 8: Video/Webinar
  video?: VideoData
  
  // Additional metadata
  communityTopicUrl?: string // URL for community forum topic
  communityForumUrl?: string // Alias
  secondaryLinkTitle?: string
  cta?: CtaItem[] // Localizable call-to-action items
  promotionalItems?: PromotionalItem[] // Localizable promotional content
  agendaItems?: AgendaItem[]
  agenda?: AgendaDataItem[] // API format
  showAgendaPostEvent?: boolean
  showSponsors?: boolean
  sponsors?: SponsorData[]
  useLegacyDetailPagePath?: boolean
  localizations?: Record<string, EventLocalization>
  localizationOverrides?: Record<string, any>
  metadata?: Record<string, any>
}

// Agenda Item
export interface AgendaItem {
  id: string
  startDateTime: string
  endDateTime: string
  title: string
  description?: string
}

// Session types
export interface Session {
  id: string
  name: string
  description?: string
  eventId: string
  startDateTime: string
  endDateTime: string
  speaker?: string
  location?: string
  capacity?: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Registration types
export interface Registration {
  id: string
  eventId: string
  sessionId?: string
  attendeeEmail: string
  attendeeName: string
  attendeePhone?: string
  registrationDate: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'attended'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Dashboard and list types
export interface ResourceSummary {
  series: Series[]
  events: Event[]
  sessions: Session[]
}

export interface PaginationParams {
  page: number
  pageSize: number
  totalCount?: number
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
  message?: string
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationParams
}

// Publishing Profile types (for Webinar metadata)
export interface PublishingProfile {
  profileId: string
  name: string
  description?: string
  metadata?: Record<string, string>
  status?: 'active' | 'inactive' | string
  creationTime: number
  modificationTime: number
}

export interface PublishingProfileFormData {
  name: string
  description?: string
  metadata?: Record<string, string>
  status?: string
}

