export interface Session {
  id: string
  name: string
  description?: string
  startDateTime: string
  endDateTime: string
  capacity?: number
  tags?: string[]
  locationId?: string
}