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

export interface EventFormData {
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

