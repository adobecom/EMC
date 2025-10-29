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

