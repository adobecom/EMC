export interface SessionTimeInfo {
  sessionTimeId?: string
  startTimeMillis?: number
  endTimeMillis?: number
  timezone?: string
  attendeeLimit?: number
  attendeeCount?: number
  waitlistAttendeeCount?: number
  isFull?: boolean
  isAutoRegistrationEnabled?: boolean
  locationId?: string
  creationTime?: number
  modificationTime?: number
}

/** Attendee record returned by GET /v1/session-times/{timeId}/attendees */
export interface SessionTimeAttendee {
  attendeeId: string
  timeId: string
  registrationStatus: 'registered' | 'waitlisted'
  creationTime?: number
  modificationTime?: number
}

/** Flattened row for the Sessions registration tab DataTable */
export interface SessionRow {
  sessionId: string
  sessionTimeId: string
  name: string
  attendeeCount: number
  waitlistAttendeeCount: number
  attendeeLimit?: number
}

export interface Session {
  id: string
  name: string
  description?: string
  startDateTime: string
  endDateTime: string
  capacity?: number
  tags?: string[]
  locationId?: string
  /** Cached session-time data from list hydration — avoids refetch on expand */
  sessionTime?: SessionTimeInfo
}