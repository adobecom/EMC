export interface SessionTimeInfo {
  sessionTimeId?: string
  startTimeMillis?: number
  endTimeMillis?: number
  attendeeLimit?: number
  isAutoRegistrationEnabled?: boolean
  locationId?: string
  creationTime?: number
  modificationTime?: number
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