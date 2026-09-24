/*
* <license header>
*/

jest.mock('../services/api', () => ({
  apiService: {
    getAllEventAttendees: jest.fn(),
  },
  cachedApi: {
    getEventsList: jest.fn(),
  },
}))

import { apiService, cachedApi } from '../services/api'
import { apiCache } from '../services/cacheUtils'
import { getDashboardDataSource } from './dashboardDataSources'

const mockGetAllEventAttendees = apiService.getAllEventAttendees as jest.Mock
const mockGetEventsList = cachedApi.getEventsList as jest.Mock

const attendeesDataSource = getDashboardDataSource('attendees')!

describe('attendeesDataSource', () => {
  beforeEach(() => {
    apiCache.clear()
    mockGetAllEventAttendees.mockReset()
    mockGetEventsList.mockReset()
  })

  describe('normalize', () => {
    it('derives __ts from creationTime', () => {
      const normalized = attendeesDataSource.normalize({ attendeeId: 'a1', creationTime: 1700000000000 })
      expect(normalized.__ts).toBe(1700000000000)
      expect(normalized.attendeeId).toBe('a1')
    })

    it('returns null __ts when creationTime is missing/unparseable', () => {
      expect(attendeesDataSource.normalize({ attendeeId: 'a1' }).__ts).toBeNull()
      expect(attendeesDataSource.normalize({ attendeeId: 'a1', creationTime: 'not-a-date' }).__ts).toBeNull()
    })
  })

  describe('checkedInRate metric', () => {
    const checkedInRate = attendeesDataSource.metrics.find((metric) => metric.field === 'checkedInRate')!

    it('computes 1 for checked-in attendees', () => {
      expect(checkedInRate.compute!({ __ts: null, checkedIn: true })).toBe(1)
    })

    it('computes 0 for non-checked-in attendees', () => {
      expect(checkedInRate.compute!({ __ts: null, checkedIn: false })).toBe(0)
    })

    it('returns null when checkedIn is missing', () => {
      expect(checkedInRate.compute!({ __ts: null })).toBeNull()
    })
  })

  describe('fetch (fanout)', () => {
    it('stamps eventId/seriesId onto every attendee row and flattens across events', async () => {
      mockGetEventsList.mockResolvedValue([
        { eventId: 'e1', seriesId: 's1' },
        { eventId: 'e2', seriesId: 's2' },
      ])
      mockGetAllEventAttendees.mockImplementation(async (eventId: string) => [
        { attendeeId: `${eventId}-a1`, registrationStatus: 'registered' },
      ])

      const rows = await attendeesDataSource.fetch()

      expect(rows).toEqual([
        { attendeeId: 'e1-a1', registrationStatus: 'registered', eventId: 'e1', seriesId: 's1' },
        { attendeeId: 'e2-a1', registrationStatus: 'registered', eventId: 'e2', seriesId: 's2' },
      ])
      expect(mockGetAllEventAttendees).toHaveBeenCalledWith('e1')
      expect(mockGetAllEventAttendees).toHaveBeenCalledWith('e2')
    })

    it('drops rows for an event whose attendee fetch errors, without failing the whole fetch', async () => {
      mockGetEventsList.mockResolvedValue([
        { eventId: 'e1', seriesId: 's1' },
        { eventId: 'e2', seriesId: 's2' },
      ])
      mockGetAllEventAttendees.mockImplementation(async (eventId: string) => {
        if (eventId === 'e1') return { error: 'boom' }
        return [{ attendeeId: `${eventId}-a1`, registrationStatus: 'registered' }]
      })

      const rows = await attendeesDataSource.fetch()

      expect(rows).toEqual([{ attendeeId: 'e2-a1', registrationStatus: 'registered', eventId: 'e2', seriesId: 's2' }])
    })

    it('caches the whole aggregate fetch as a single entry (dedupes a second call)', async () => {
      mockGetEventsList.mockResolvedValue([{ eventId: 'e1', seriesId: 's1' }])
      mockGetAllEventAttendees.mockResolvedValue([{ attendeeId: 'e1-a1', registrationStatus: 'registered' }])

      await attendeesDataSource.fetch()
      await attendeesDataSource.fetch()

      expect(mockGetEventsList).toHaveBeenCalledTimes(1)
      expect(mockGetAllEventAttendees).toHaveBeenCalledTimes(1)
    })
  })
})
