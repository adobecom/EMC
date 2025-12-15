/* 
* <license header>
*/

/**
 * Attendee-related type definitions
 * Aligned with ESP/ESL OpenAPI specification
 */

/**
 * Registration status enum (from OpenAPI RegistrationStatus)
 */
export type RegistrationStatus = 'registered' | 'waitlisted'

/**
 * Attendee data structure from ESP API
 * Based on OpenAPI EventAttendee and BaseAttendee schemas
 */
export interface Attendee {
  // Required fields
  attendeeId: string
  firstName: string
  lastName: string
  email: string
  registrationStatus: RegistrationStatus
  checkedIn: boolean

  // Optional fields from BaseAttendee
  eventId?: string
  externalAttendeeId?: string
  companyName?: string
  jobTitle?: string
  mobilePhone?: string
  businessPhone?: string
  countryRegion?: string
  zipPostalCode?: string
  industry?: string
  productsOfInterest?: string[]
  primaryProductOfInterest?: string
  companySize?: string
  organizationName?: string
  specialRequirements?: string
  title?: string
  website?: string
  employeesInOrganization?: string
  department?: string
  age?: string
  jobRole?: string
  jobLevel?: string
  contactMethods?: string[]
  isGuest?: boolean
  invitedBy?: string
  shareInfoWithPartners?: boolean
  ccSentiment?: string

  // Timestamps
  creationTime?: number
  modificationTime?: number

  // Allow dynamic fields from RSVP config
  [key: string]: any
}

/**
 * Attendee list response from API
 */
export interface AttendeeListResponse {
  attendees: Attendee[]
  count?: number
  nextPageToken?: string
  type?: string
}

/**
 * RSVP Config field structure from external JSON configs
 */
export interface RsvpConfigField {
  Field: string
  Type: string
  Label?: string
  Required?: string // 'x' if required
  Placeholder?: string
  Options?: string
}

/**
 * RSVP Config response structure
 */
export interface RsvpConfig {
  cloudType: string
  config: RsvpConfigField[] | null
}

/**
 * Column configuration for attendee table
 * Derived from RSVP config
 */
export interface AttendeeColumnConfig {
  key: string
  label: string
  type: string
  fallback: string
  isSticky?: boolean
  width?: number
  sortable?: boolean
}

/**
 * Filter state for attendee list
 * Maps field keys to arrays of selected filter values
 */
export interface AttendeeFilters {
  [fieldKey: string]: string[]
}

/**
 * Filter option for a single field
 */
export interface FilterOption {
  value: string
  label: string
  count?: number
}

/**
 * Filter menu configuration
 */
export interface FilterMenuConfig {
  key: string
  label: string
  options: FilterOption[]
}

/**
 * Attendee statistics
 */
export interface AttendeeStats {
  total: number
  registered: number
  waitlisted: number
  checkedIn: number
}

/**
 * Map registration status to display status for StatusBadge
 */
export function mapRegistrationStatusToDisplay(
  attendee: Attendee
): 'pending' | 'confirmed' | 'attended' | 'cancelled' {
  if (attendee.checkedIn) {
    return 'attended'
  }
  
  switch (attendee.registrationStatus) {
    case 'registered':
      return 'confirmed'
    case 'waitlisted':
      return 'pending'
    default:
      return 'pending'
  }
}

/**
 * Calculate attendee statistics from attendee list
 */
export function calculateAttendeeStats(attendees: Attendee[]): AttendeeStats {
  return {
    total: attendees.length,
    registered: attendees.filter(a => a.registrationStatus === 'registered' || !a.registrationStatus).length,
    waitlisted: attendees.filter(a => a.registrationStatus === 'waitlisted').length,
    checkedIn: attendees.filter(a => a.checkedIn === true).length
  }
}

/**
 * Get full name from attendee
 */
export function getAttendeeName(attendee: Attendee): string {
  const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(' ')
  return name || '-'
}

