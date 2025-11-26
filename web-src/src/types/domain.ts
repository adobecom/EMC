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
  relatedDomain?: string
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

export interface Venue {
  placeId?: string
  venueName: string
  formattedAddress?: string
  addressComponents?: VenueAddressComponent[]
  coordinates?: VenueCoordinates
  gmtOffset?: number
  localizations?: Record<string, any>
  localizationOverrides?: Record<string, any>
  additionalInformation?: string
  venueId: string
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

// Event API Response types (from backend)
export interface EventApiResponse {
  eventId: string
  enTitle?: string
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
  localizationOverrides?: Record<string, any>
  localizations?: Record<string, any>
  venue?: Record<string, any>
  agenda?: any[]
  rsvpFormFields?: Record<string, any>
  video?: Record<string, any>
  marketoIntegration?: Record<string, any>
  liveUpdate?: boolean
  forceSpWrite?: boolean
  defaultLocale?: string
  showSponsors?: boolean
  showAgendaPostEvent?: boolean
  showVenuePostEvent?: boolean
  showVenueAdditionalInfoPostEvent?: boolean
  gmtOffset?: number
  localStartTimeMillis?: number
  localEndTimeMillis?: number
  images?: EventImage[]
  // Add any other fields as optional
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
export interface SocialLink {
  platform?: string
  url: string
}

export interface ProfileData {
  type: 'speaker' | 'host'
  firstName: string
  lastName: string
  title: string
  bio?: string
  imageUrl?: string
  imageId?: string
  socialLinks?: SocialLink[]
}

// Sponsor/Partner types
export interface SponsorData {
  id: string
  partnerName: string
  partnerUrl: string
  imageUrl?: string
  imageId?: string
  isSaved?: boolean
}

// Image types for events
export interface EventImageData {
  imageKind: 'event-card-image' | 'event-hero-image' | 'venue-image' | 'venue-map-image' | string
  imageUrl?: string
  imageId?: string
  altText?: string
}

// Venue data types
export interface VenueData {
  venueName: string
  formattedAddress?: string
  placeId?: string
  coordinates?: {
    lat: number
    lon: number
  }
  gmtOffset?: number
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
  seriesId: string
  organizationId: string
  name: string
  urlTitle?: string // English title for page URL
  description?: string // Rich text description for event page
  shortDescription?: string // Plain text for Events Hub/SEO (160 chars max)
  language: string
  isPrivate: boolean
  
  // Step 2: Tags & Topics
  tags?: EventTag[]
  
  // Step 3: Date & Time
  startDateTime: string
  endDateTime: string
  timezone?: string
  
  // Step 4: Venue
  venue?: VenueData
  
  // Step 5: Attendance & Registration
  capacity?: number
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled'
  registrationOpen: boolean
  allowWaitlist?: boolean
  allowGuestRegistration?: boolean
  hostEmail?: string
  rsvpDescription?: string
  // Registration fields configuration
  registrationType?: 'ESP' | 'Marketo'
  marketoFormUrl?: string
  visibleRsvpFields?: string[]
  requiredRsvpFields?: string[]
  
  // Step 6: Images
  images?: EventImageData[]
  
  // Step 7: Speakers & Hosts
  profiles?: ProfileData[]
  
  // Additional metadata
  communityForumUrl?: string
  secondaryLinkTitle?: string
  agendaItems?: AgendaItem[]
  showAgendaPostEvent?: boolean
  sponsors?: SponsorData[]
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

