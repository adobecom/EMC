/* 
* <license header>
*/

import actionWebInvoke from '../utils'
import {
  Organization,
  Team,
  Series,
  SeriesFormData,
  SeriesApiResponse,
  Event,
  EventFormData,
  EventApiResponse,
  Session,
  Registration,
  Venue,
  EventHistoryResponse,
  ApiResponse,
  ApiListResponse
} from '../types/domain'
import { getSeriesListMock, getEventsListMock } from '../mocks'
import { tokenStorage } from './tokenStorage'
import { constructRequestHeaders, safeFetch } from './requestHelpers'
import { getCurrentEnvironment, getApiHost, SUPPORTED_CLOUDS } from '../config/constants'

/**
 * Generic error response type
 */
interface ErrorResponse {
  status: number | string
  error: any
}

/**
 * Success response for operations
 */
interface SuccessResponse {
  ok: boolean
}

/**
 * Image upload configuration
 */
interface ImageUploadConfig {
  targetUrl: string
  altText?: string
  type: string
}

/**
 * Image upload progress tracker
 */
export interface UploadProgressTracker {
  progress: number
}

/**
 * API Service Layer
 * Centralized service for all external API calls
 */

interface ApiServiceConfig {
  baseUrl?: string
  headers?: Record<string, string>
}

class ApiService {
  private config: ApiServiceConfig
  private actionUrls: Record<string, string>

  constructor(config: ApiServiceConfig = {}) {
    this.config = config
    this.actionUrls = {}
  }

  /**
   * Set the backend action URLs (loaded from config.json)
   */
  setActionUrls(urls: Record<string, string>): void {
    this.actionUrls = urls
  }

  /**
   * Set authentication headers
   */
  setAuthHeaders(token?: string, org?: string): void {
    this.config.headers = {
      ...this.config.headers,
      ...(token && { authorization: `Bearer ${token}` }),
      ...(org && { 'x-gw-ims-org-id': org })
    }
  }

  /**
   * Generic API call method
   */
  private async callAction<T>(
    actionName: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    const actionUrl = this.actionUrls[actionName]
    if (!actionUrl) {
      throw new Error(`Action '${actionName}' not found in configuration`)
    }

    const response = await actionWebInvoke(
      actionUrl,
      this.config.headers || {},
      params,
      { method }
    )

    return response as T
  }

  /**
   * Generic external API call wrapper
   * Handles token validation, environment detection, and error handling
   */
  private async callExternalApi<T = any>(
    service: 'esp' | 'esl',
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    options?: {
      operationName?: string
      transformResponse?: (data: any) => T
      shouldReturnFullResponse?: boolean
    }
  ): Promise<T | ErrorResponse> {
    const operationName = options?.operationName || `${method} ${endpoint}`
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn(`⚠️ No valid authentication token for ${operationName}`)
      return { status: 'No Token', error: 'No valid authentication token' }
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, method)
      const host = getApiHost(service, env)
      const url = `${host}${endpoint}`

      const response = await safeFetch(url, {
        method,
        headers: headers as any,
        ...(body && { body: JSON.stringify(body) })
      })

      // Handle 204 No Content responses (successful deletes)
      if (response.status === 204) {
        return { ok: true } as any
      }

      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ Failed: ${operationName}. Status: ${response.status}`, data)
        return { status: response.status, error: data }
      }

      // Transform response if needed
      if (options?.transformResponse) {
        return options.transformResponse(data)
      }

      return options?.shouldReturnFullResponse ? data : (data.espProvider || data)
    } catch (error) {
      console.error(`❌ Failed: ${operationName}:`, error)
      return { status: 'Network Error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Fetch with dependent data (for operations that need to fetch related data first)
   */
  private async callExternalApiWithDependency<T = any>(
    service: 'esp' | 'esl',
    endpoint: string,
    method: 'PUT',
    body: any,
    getDependentData: () => Promise<any | ErrorResponse>,
    mergeDependentData: (body: any, dependentData: any) => any,
    operationName: string
  ): Promise<T | ErrorResponse> {
    // Get dependent data first
    const dependentData = await getDependentData()
    
    if ('error' in dependentData) {
      console.error(`❌ Failed to get dependent data for ${operationName}:`, dependentData)
      return dependentData
    }

    // Merge dependent data into body
    const mergedBody = mergeDependentData(body, dependentData)

    // Make the actual call
    return this.callExternalApi<T>(service, endpoint, method, mergedBody, { operationName })
  }

  // Organization APIs
  async getOrganizations(): Promise<ApiListResponse<Organization>> {
    return this.callAction<ApiListResponse<Organization>>('getOrganizations')
  }

  async getOrganization(id: string): Promise<ApiResponse<Organization>> {
    return this.callAction<ApiResponse<Organization>>('getOrganization', { id })
  }

  async createOrganization(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Organization>> {
    return this.callAction<ApiResponse<Organization>>('createOrganization', data)
  }

  async updateOrganization(id: string, data: Partial<Organization>): Promise<ApiResponse<Organization>> {
    return this.callAction<ApiResponse<Organization>>('updateOrganization', { id, ...data })
  }

  async deleteOrganization(id: string): Promise<ApiResponse<void>> {
    return this.callAction<ApiResponse<void>>('deleteOrganization', { id })
  }

  // Team APIs
  async getTeams(organizationId?: string): Promise<ApiListResponse<Team>> {
    return this.callAction<ApiListResponse<Team>>('getTeams', { organizationId })
  }

  async getTeam(id: string): Promise<ApiResponse<Team>> {
    return this.callAction<ApiResponse<Team>>('getTeam', { id })
  }

  async createTeam(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Team>> {
    return this.callAction<ApiResponse<Team>>('createTeam', data)
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<ApiResponse<Team>> {
    return this.callAction<ApiResponse<Team>>('updateTeam', { id, ...data })
  }

  async deleteTeam(id: string): Promise<ApiResponse<void>> {
    return this.callAction<ApiResponse<void>>('deleteTeam', { id })
  }

  // Series APIs
  async getSeries(organizationId?: string): Promise<ApiListResponse<Series>> {
    return this.callAction<ApiListResponse<Series>>('getSeries', { organizationId })
  }

  async getSeriesById(id: string): Promise<ApiResponse<Series>> {
    return this.callAction<ApiResponse<Series>>('getSeriesById', { id })
  }

  async createSeries(data: SeriesFormData): Promise<ApiResponse<Series>> {
    return this.callAction<ApiResponse<Series>>('createSeries', data)
  }

  async updateSeries(id: string, data: Partial<SeriesFormData>): Promise<ApiResponse<Series>> {
    return this.callAction<ApiResponse<Series>>('updateSeries', { id, ...data })
  }

  async deleteSeries(id: string): Promise<ApiResponse<void>> {
    return this.callAction<ApiResponse<void>>('deleteSeries', { id })
  }

  /**
   * Get series list from external API
   * Uses the dev token system for authentication
   */
  async getSeriesList(): Promise<SeriesApiResponse[]> {
    // Check if we have a valid token
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token. Using mock data.')
      console.log('💡 Click the "Dev Token" button to add a token for real API access')
      
      // Fall back to mock data
      try {
        const data = await getSeriesListMock()
        console.log('📦 Using mock series data:', data.length, 'items')
        return data
      } catch (error) {
        console.error('Error fetching mock series:', error)
        return []
      }
    }

    // Use real API with token
    try {
      const env = getCurrentEnvironment()
      console.log(`🔄 Fetching series from real API (${env} environment)...`)
      
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)
      const url = `${host}/v1/series`

      const response = await safeFetch(url, {
        method: 'GET',
        headers: headers as any
      })

      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data)
        throw new Error(`API returned ${response.status}`)
      }

      // The API returns { series: [...] }
      const series = data.series || []
      console.log('✅ Successfully loaded series from API:', series.length, 'items')
      
      return series
    } catch (error) {
      console.error('❌ Error fetching series from API:', error)
      console.log('📦 Falling back to mock data')
      
      // Fall back to mock data on error
      try {
        const data = await getSeriesListMock()
        return data
      } catch (mockError) {
        console.error('Error fetching mock series:', mockError)
        return []
      }
    }
  }

  // Event APIs
  async getEvents(seriesId?: string, organizationId?: string): Promise<ApiListResponse<Event>> {
    return this.callAction<ApiListResponse<Event>>('getEvents', { seriesId, organizationId })
  }

  /**
   * Get events list from external API
   * Uses the dev token system for authentication
   */
  async getEventsList(): Promise<EventApiResponse[]> {
    // Check if we have a valid token
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token. Using mock data.')
      console.log('💡 Click the "Dev Token" button to add a token for real API access')
      
      // Fall back to mock data
      try {
        const data = await getEventsListMock()
        console.log('📦 Using mock events data:', data.length, 'items')
        return data
      } catch (error) {
        console.error('Error fetching mock events:', error)
        return []
      }
    }

    // Use real API with token
    try {
      const env = getCurrentEnvironment()
      console.log(`🔄 Fetching events from real API (${env} environment)...`)
      
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)
      const url = `${host}/v1/events`

      const response = await safeFetch(url, {
        method: 'GET',
        headers: headers as any
      })

      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data)
        throw new Error(`API returned ${response.status}`)
      }

      // The API returns { events: [...] }
      const events = data.events || []
      console.log('✅ Successfully loaded events from API:', events.length, 'items')
      
      return events
    } catch (error) {
      console.error('❌ Error fetching events from API:', error)
      console.log('📦 Falling back to mock data')
      
      // Fall back to mock data on error
      try {
        const data = await getEventsListMock()
        return data
      } catch (mockError) {
        console.error('Error fetching mock events:', mockError)
        return []
      }
    }
  }


  async getEvent(id: string): Promise<ApiResponse<Event>> {
    return this.callAction<ApiResponse<Event>>('getEvent', { id })
  }

  async createEvent(data: EventFormData): Promise<ApiResponse<Event>> {
    return this.callAction<ApiResponse<Event>>('createEvent', data)
  }

  async updateEvent(id: string, data: Partial<EventFormData>): Promise<ApiResponse<Event>> {
    return this.callAction<ApiResponse<Event>>('updateEvent', { id, ...data })
  }

  async deleteEvent(id: string): Promise<ApiResponse<void>> {
    return this.callAction<ApiResponse<void>>('deleteEvent', { id })
  }

  /**
   * Fetch event images for enrichment
   * Used by the data enrichment service for thumbnails
   */
  async getEventImagesBatch(eventIds: string[]): Promise<Map<string, EventApiResponse>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, EventApiResponse>()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token for event images')
      return results
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      // Fetch all event images in parallel
      const promises = eventIds.map(async (eventId) => {
        try {
          const url = `${host}/v1/events/${eventId}/images`
          const response = await safeFetch(url, {
            method: 'GET',
            headers: headers as any
          })

          if (response.ok) {
            const data = await response.json()
            
            // Create event object with images for extraction
            const eventData: EventApiResponse = {
              eventId,
              published: false,
              images: data.images || (Array.isArray(data) ? data : [])
            }
            
            return { eventId, data: eventData }
          }
          return null
        } catch (error) {
          console.error(`Error fetching images for event ${eventId}:`, error)
          return null
        }
      })

      const responses = await Promise.all(promises)
      
      responses.forEach((result) => {
        if (result && result.data) {
          results.set(result.eventId, result.data)
        }
      })
      
    } catch (error) {
      console.error('Error fetching event images batch:', error)
    }

    return results
  }

  /**
   * Fetch event venues for enrichment
   * Used by the data enrichment service for venue information
   */
  async getEventVenuesBatch(eventIds: string[]): Promise<Map<string, Venue[]>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, Venue[]>()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token for event venues')
      return results
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      // Fetch all event venues in parallel
      const promises = eventIds.map(async (eventId) => {
        try {
          const url = `${host}/v1/events/${eventId}/venues`
          const response = await safeFetch(url, {
            method: 'GET',
            headers: headers as any
          })

          if (response.ok) {
            const data = await response.json()
            return { eventId, venues: data.venues || [] }
          }
          // 404 means no venue found, which is valid
          if (response.status === 404) {
            return { eventId, venues: [] }
          }
          return null
        } catch (error) {
          console.error(`Error fetching venues for event ${eventId}:`, error)
          return null
        }
      })

      const responses = await Promise.all(promises)
      
      responses.forEach((result) => {
        if (result) {
          results.set(result.eventId, result.venues)
        }
      })
      
    } catch (error) {
      console.error('Error fetching event venues batch:', error)
    }

    return results
  }

  /**
   * Fetch series details for enrichment
   * Used by the data enrichment service for series information
   */
  async getSeriesBatch(seriesIds: string[]): Promise<Map<string, SeriesApiResponse>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, SeriesApiResponse>()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token for series')
      return results
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      // Fetch all series in parallel
      const promises = seriesIds.map(async (seriesId) => {
        try {
          const url = `${host}/v1/series/${seriesId}`
          const response = await safeFetch(url, {
            method: 'GET',
            headers: headers as any
          })

          if (response.ok) {
            const data = await response.json()
            return { seriesId, series: data }
          }
          // 404 means series not found
          if (response.status === 404) {
            return null
          }
          return null
        } catch (error) {
          console.error(`Error fetching series ${seriesId}:`, error)
          return null
        }
      })

      const responses = await Promise.all(promises)
      
      responses.forEach((result) => {
        if (result) {
          results.set(result.seriesId, result.series)
        }
      })
      
    } catch (error) {
      console.error('Error fetching series batch:', error)
    }

    return results
  }

  /**
   * Fetch event history for enrichment
   * Used by the data enrichment service for creator, modifier, and published at information
   */
  async getEventHistoryBatch(eventIds: string[]): Promise<Map<string, EventHistoryResponse>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, EventHistoryResponse>()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token for event history')
      return results
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      // Fetch all event histories in parallel
      const promises = eventIds.map(async (eventId) => {
        try {
          const url = `${host}/v1/events/${eventId}/history`
          const response = await safeFetch(url, {
            method: 'GET',
            headers: headers as any
          })

          if (response.ok) {
            const data = await response.json()
            return { eventId, history: data }
          }
          // 404 means no history found
          if (response.status === 404) {
            return { eventId, history: { history: [], count: 0 } }
          }
          return null
        } catch (error) {
          console.error(`Error fetching history for event ${eventId}:`, error)
          return null
        }
      })

      const responses = await Promise.all(promises)
      
      responses.forEach((result) => {
        if (result) {
          results.set(result.eventId, result.history)
        }
      })
      
    } catch (error) {
      console.error('Error fetching event history batch:', error)
    }

    return results
  }

  // Session APIs
  async getSessions(eventId?: string): Promise<ApiListResponse<Session>> {
    return this.callAction<ApiListResponse<Session>>('getSessions', { eventId })
  }

  async getSession(id: string): Promise<ApiResponse<Session>> {
    return this.callAction<ApiResponse<Session>>('getSession', { id })
  }

  async createSession(data: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Session>> {
    return this.callAction<ApiResponse<Session>>('createSession', data)
  }

  async updateSession(id: string, data: Partial<Session>): Promise<ApiResponse<Session>> {
    return this.callAction<ApiResponse<Session>>('updateSession', { id, ...data })
  }

  async deleteSession(id: string): Promise<ApiResponse<void>> {
    return this.callAction<ApiResponse<void>>('deleteSession', { id })
  }

  // Registration APIs
  async getRegistrations(eventId: string): Promise<ApiListResponse<Registration>> {
    return this.callAction<ApiListResponse<Registration>>('getRegistrations', { eventId })
  }

  async getRegistration(id: string): Promise<ApiResponse<Registration>> {
    return this.callAction<ApiResponse<Registration>>('getRegistration', { id })
  }

  async createRegistration(data: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Registration>> {
    return this.callAction<ApiResponse<Registration>>('createRegistration', data)
  }

  async updateRegistration(id: string, data: Partial<Registration>): Promise<ApiResponse<Registration>> {
    return this.callAction<ApiResponse<Registration>>('updateRegistration', { id, ...data })
  }

  async deleteRegistration(id: string): Promise<ApiResponse<void>> {
    return this.callAction<ApiResponse<void>>('deleteRegistration', { id })
  }

  // ============================================================================
  // EXTERNAL API METHODS (Real Adobe Events APIs)
  // Following the pattern established by getEventsList() and getSeriesList()
  // ============================================================================

  /**
   * Get locales from external API
   */
  async getLocales(): Promise<any | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/locales', 'GET', undefined, {
      operationName: 'getLocales',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Delete image
   */
  async deleteImage(config: ImageUploadConfig, imageId: string): Promise<SuccessResponse | ErrorResponse> {
    if (!imageId || typeof imageId !== 'string') throw new Error('Invalid image ID')
    if (!config || typeof config !== 'object') throw new Error('Invalid image configs')

    return this.callExternalApi('esp', `${config.targetUrl}/${imageId}`, 'DELETE', undefined, {
      operationName: 'deleteImage'
    })
  }

  /**
   * Create venue for an event
   */
  async createVenue(eventId: string, venueData: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!venueData || typeof venueData !== 'object') throw new Error('Invalid venue data')

    return this.callExternalApi('esl', `/v1/events/${eventId}/venues`, 'POST', venueData, {
      operationName: 'createVenue'
    })
  }

  /**
   * Replace venue for an event
   */
  async replaceVenue(eventId: string, venueId: string, venueData: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!venueId || typeof venueId !== 'string') throw new Error('Invalid venue ID')
    if (!venueData || typeof venueData !== 'object') throw new Error('Invalid venue data')

    return this.callExternalApi('esl', `/v1/events/${eventId}/venues/${venueId}`, 'PUT', venueData, {
      operationName: 'replaceVenue'
    })
  }

  /**
   * Get clouds list
   */
  async getClouds(): Promise<any[] | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/clouds', 'GET', undefined, {
      operationName: 'getClouds',
      transformResponse: (data) => data.clouds
    })
  }

  /**
   * Get a single cloud by type
   */
  async getCloud(cloudType: string): Promise<any | ErrorResponse> {
    if (!cloudType || typeof cloudType !== 'string') throw new Error('Invalid cloud ID')

    return this.callExternalApi('esp', `/v1/clouds/${cloudType}`, 'GET', undefined, {
      operationName: 'getCloud',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update cloud
   */
  async updateCloud(cloudType: string, cloudData: any): Promise<any | ErrorResponse> {
    if (!cloudType || typeof cloudType !== 'string') throw new Error('Invalid cloud Type')
    if (!cloudData || typeof cloudData !== 'object') throw new Error('Invalid cloud data')

    return this.callExternalApi('esp', `/v1/clouds/${cloudType}`, 'PUT', cloudData, {
      operationName: 'updateCloud',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Create event
   */
  async createEventExternal(payload: any, locale: string): Promise<any | ErrorResponse> {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid event payload')
    if (!locale || typeof locale !== 'string') throw new Error('Invalid locale')

    const requestData = {
      ...payload,
      liveUpdate: false,
      published: false,
      defaultLocale: locale,
    }

    return this.callExternalApi('esl', '/v1/events', 'POST', requestData, {
      operationName: 'createEvent'
    })
  }

  /**
   * Update event
   */
  async updateEventExternal(eventId: string, payload: any, policies = { forceSpWrite: false, liveUpdate: false }): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!payload || typeof payload !== 'object') throw new Error('Invalid event payload')

    const finalPayload = { ...payload, ...policies }

    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT', finalPayload, {
      operationName: `updateEvent(${eventId})`
    })
  }

  /**
   * Publish event
   */
  async publishEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!payload || typeof payload !== 'object') throw new Error('Invalid event payload')

    const requestData = {
      ...payload,
      published: true,
      liveUpdate: true,
      forceSpWrite: false,
    }

    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT', requestData, {
      operationName: `publishEvent(${eventId})`
    })
  }

  /**
   * Unpublish event
   */
  async unpublishEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!payload || typeof payload !== 'object') throw new Error('Invalid event payload')

    const requestData = {
      ...payload,
      published: false,
      liveUpdate: true,
      forceSpWrite: false,
    }

    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT', requestData, {
      operationName: `unpublishEvent(${eventId})`
    })
  }

  /**
   * Preview event
   */
  async previewEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!payload || typeof payload !== 'object') throw new Error('Invalid event payload')

    const requestData = {
      ...payload,
      liveUpdate: false,
      forceSpWrite: true,
    }

    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT', requestData, {
      operationName: `previewEvent(${eventId})`
    })
  }

  /**
   * Delete event
   */
  async deleteEventExternal(eventId: string): Promise<SuccessResponse | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'DELETE', undefined, {
      operationName: `deleteEvent(${eventId})`
    })
  }

  /**
   * Get full event details with speakers, sponsors, and venues
   */
  async getEventFull(eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid eventId')

    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token for getEvent')
      return { status: 'No Token', error: 'No valid authentication token' }
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)
      const url = `${host}/v1/events/${encodeURIComponent(eventId)}`

      const [eventResp, speakersResp, sponsorsResp, venuesResp] = await Promise.all([
        safeFetch(url, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/speakers`, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/sponsors`, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/venues`, { method: 'GET', headers: headers as any }),
      ])

      let data: any = {}

      if (eventResp.ok) {
        const eventData = await eventResp.json()
        data = eventData
      } else {
        console.error(`❌ Failed to get event ${eventId}. Status: ${eventResp.status}`)
      }

      if (speakersResp.ok) {
        const speakersData = await speakersResp.json()
        const sortedSpeakers = speakersData.speakers.sort((a: any, b: any) => a.ordinal - b.ordinal)
        data.speakers = sortedSpeakers
      } else {
        console.error(`❌ Failed to get speakers for event ${eventId}. Status: ${speakersResp.status}`)
      }

      if (sponsorsResp.ok) {
        const sponsorsData = await sponsorsResp.json()
        data.sponsors = sponsorsData.sponsors
      } else {
        console.error(`❌ Failed to get sponsors for event ${eventId}. Status: ${sponsorsResp.status}`)
      }

      if (venuesResp.ok) {
        const venuesData = await venuesResp.json()
        data.venue = venuesData.venues?.[0]
      } else {
        console.error(`❌ Failed to get venues for event ${eventId}. Status: ${venuesResp.status}`)
      }

      if (!eventResp.ok) {
        return { status: eventResp.status, error: 'Failed to get event details' }
      }

      return data
    } catch (error) {
      console.error(`❌ Failed to get details for event ${eventId}:`, error)
      return { status: 'Network Error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get event venue
   */
  async getEventVenue(eventId: string): Promise<any | null | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid eventId')

    return this.callExternalApi('esp', `/v1/events/${eventId}/venues`, 'GET', undefined, {
      operationName: 'getEventVenue',
      transformResponse: (data) => data.venues?.[0] || null
    })
  }

  /**
   * Create speaker for a series
   */
  async createSpeaker(profile: any, seriesId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!profile || typeof profile !== 'object') throw new Error('Invalid speaker profile')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers`, 'POST', profile, {
      operationName: 'createSpeaker',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update speaker for a series
   */
  async updateSpeaker(profile: any, seriesId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!profile || typeof profile !== 'object') throw new Error('Invalid speaker profile')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${profile.speakerId}`, 'PUT', profile, {
      operationName: 'updateSpeaker',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get speaker details from series
   */
  async getSpeaker(seriesId: string, speakerId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!speakerId || typeof speakerId !== 'string') throw new Error('Invalid speaker ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${speakerId}`, 'GET', undefined, {
      operationName: 'getSpeaker',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get speakers for a series
   */
  async getSpeakers(seriesId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers`, 'GET', undefined, {
      operationName: 'getSpeakers',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Add speaker to event
   */
  async addSpeakerToEvent(speakerData: any, eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!speakerData || typeof speakerData !== 'object') throw new Error('Invalid speaker data')

    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers`, 'POST', speakerData, {
      operationName: 'addSpeakerToEvent',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get event speakers
   */
  async getEventSpeakers(eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers`, 'GET', undefined, {
      operationName: 'getEventSpeakers',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get single event speaker
   */
  async getEventSpeaker(eventId: string, speakerId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!speakerId || typeof speakerId !== 'string') throw new Error('Invalid speaker ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers/${speakerId}`, 'GET', undefined, {
      operationName: 'getEventSpeaker',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update speaker in event
   */
  async updateSpeakerInEvent(speakerData: any, speakerId: string, eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!speakerId || typeof speakerId !== 'string') throw new Error('Invalid speaker ID')
    if (!speakerData || typeof speakerData !== 'object') throw new Error('Invalid speaker data')

    return this.callExternalApiWithDependency(
      'esp',
      `/v1/events/${eventId}/speakers/${speakerId}`,
      'PUT',
      speakerData,
      () => this.getEventSpeaker(eventId, speakerId),
      (body, dependentData) => ({
        ...body,
        modificationTime: dependentData.modificationTime
      }),
      'updateSpeakerInEvent'
    )
  }

  /**
   * Remove speaker from event
   */
  async removeSpeakerFromEvent(speakerId: string, eventId: string): Promise<SuccessResponse | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!speakerId || typeof speakerId !== 'string') throw new Error('Invalid speaker ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers/${speakerId}`, 'DELETE', undefined, {
      operationName: 'removeSpeakerFromEvent'
    })
  }

  /**
   * Create sponsor for a series
   */
  async createSponsor(sponsorData: any, seriesId: string, locale: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!sponsorData || typeof sponsorData !== 'object') throw new Error('Invalid sponsor data')
    if (!locale || typeof locale !== 'string') throw new Error('Invalid locale')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors`, 'POST', sponsorData, {
      operationName: 'createSponsor',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update sponsor for a series
   */
  async updateSponsor(sponsorData: any, sponsorId: string, seriesId: string, locale: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!sponsorId || typeof sponsorId !== 'string') throw new Error('Invalid sponsor ID')
    if (!sponsorData || typeof sponsorData !== 'object') throw new Error('Invalid sponsor data')
    if (!locale || typeof locale !== 'string') throw new Error('Invalid locale')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}`, 'PUT', sponsorData, {
      operationName: 'updateSponsor',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get sponsor from series
   */
  async getSponsor(seriesId: string, sponsorId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!sponsorId || typeof sponsorId !== 'string') throw new Error('Invalid sponsor ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}`, 'GET', undefined, {
      operationName: 'getSponsor',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get sponsors for a series
   */
  async getSponsors(seriesId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors`, 'GET', undefined, {
      operationName: 'getSponsors',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Add sponsor to event
   */
  async addSponsorToEvent(sponsorData: any, eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!sponsorData || typeof sponsorData !== 'object') throw new Error('Invalid sponsor data')

    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors`, 'POST', sponsorData, {
      operationName: 'addSponsorToEvent',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get event sponsor
   */
  async getEventSponsor(eventId: string, sponsorId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!sponsorId || typeof sponsorId !== 'string') throw new Error('Invalid sponsor ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors/${sponsorId}`, 'GET', undefined, {
      operationName: 'getEventSponsor',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update sponsor in event
   */
  async updateSponsorInEvent(sponsorData: any, sponsorId: string, eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!sponsorId || typeof sponsorId !== 'string') throw new Error('Invalid sponsor ID')
    if (!sponsorData || typeof sponsorData !== 'object') throw new Error('Invalid sponsor data')

    return this.callExternalApiWithDependency(
      'esp',
      `/v1/events/${eventId}/sponsors/${sponsorId}`,
      'PUT',
      sponsorData,
      () => this.getEventSponsor(eventId, sponsorId),
      (body, dependentData) => ({
        ...body,
        modificationTime: dependentData.modificationTime
      }),
      'updateSponsorInEvent'
    )
  }

  /**
   * Remove sponsor from event
   */
  async removeSponsorFromEvent(sponsorId: string, eventId: string): Promise<SuccessResponse | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!sponsorId || typeof sponsorId !== 'string') throw new Error('Invalid sponsor ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors/${sponsorId}`, 'DELETE', undefined, {
      operationName: 'removeSponsorFromEvent'
    })
  }

  /**
   * Get sponsor images
   */
  async getSponsorImages(seriesId: string, sponsorId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!sponsorId || typeof sponsorId !== 'string') throw new Error('Invalid sponsor ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}/images`, 'GET', undefined, {
      operationName: 'getSponsorImages',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Create series
   */
  async createSeriesExternal(seriesData: any): Promise<any | ErrorResponse> {
    if (!seriesData || typeof seriesData !== 'object') throw new Error('Invalid series data')

    const requestData = { ...seriesData, seriesStatus: 'draft' }
    
    return this.callExternalApi('esp', '/v1/series', 'POST', requestData, {
      operationName: 'createSeries',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get series by ID
   */
  async getSeriesByIdExternal(seriesId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'GET', undefined, {
      operationName: `getSeriesById(${seriesId})`,
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update series
   */
  async updateSeriesExternal(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!seriesData || typeof seriesData !== 'object') throw new Error('Invalid series data')

    const requestData = { ...seriesData, seriesId }
    
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT', requestData, {
      operationName: `updateSeries(${seriesId})`,
      shouldReturnFullResponse: true
    })
  }

  /**
   * Publish series
   */
  async publishSeries(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!seriesData || typeof seriesData !== 'object') throw new Error('Invalid series data')

    const requestData = { ...seriesData, seriesId, seriesStatus: 'published' }
    
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT', requestData, {
      operationName: `publishSeries(${seriesId})`,
      shouldReturnFullResponse: true
    })
  }

  /**
   * Unpublish series
   */
  async unpublishSeries(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!seriesData || typeof seriesData !== 'object') throw new Error('Invalid series data')

    const requestData = { ...seriesData, seriesId, seriesStatus: 'draft' }
    
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT', requestData, {
      operationName: `unpublishSeries(${seriesId})`,
      shouldReturnFullResponse: true
    })
  }

  /**
   * Archive series
   */
  async archiveSeries(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!seriesData || typeof seriesData !== 'object') throw new Error('Invalid series data')

    const requestData = { ...seriesData, seriesId, seriesStatus: 'archived' }
    
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT', requestData, {
      operationName: `archiveSeries(${seriesId})`,
      shouldReturnFullResponse: true
    })
  }

  /**
   * Delete series
   */
  async deleteSeriesExternal(seriesId: string): Promise<SuccessResponse | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'DELETE', undefined, {
      operationName: `deleteSeries(${seriesId})`
    })
  }

  /**
   * Create attendee for an event
   */
  async createAttendee(eventId: string, attendeeData: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!attendeeData || typeof attendeeData !== 'object') throw new Error('Invalid attendee data')

    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees`, 'POST', attendeeData, {
      operationName: 'createAttendee',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Update attendee
   */
  async updateAttendee(eventId: string, attendeeId: string, attendeeData: any): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!attendeeId || typeof attendeeId !== 'string') throw new Error('Invalid attendee ID')
    if (!attendeeData || typeof attendeeData !== 'object') throw new Error('Invalid attendee data')

    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees/${attendeeId}`, 'PUT', attendeeData, {
      operationName: 'updateAttendee',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Remove attendee from event
   */
  async removeAttendeeFromEvent(eventId: string, attendeeId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!attendeeId || typeof attendeeId !== 'string') throw new Error('Invalid attendee ID')

    return this.callExternalApi('esl', `/v1/events/${eventId}/attendees/${attendeeId}`, 'DELETE', undefined, {
      operationName: 'removeAttendeeFromEvent',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get event attendees
   */
  async getEventAttendees(eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees`, 'GET', undefined, {
      operationName: 'getEventAttendees',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get all event attendees with pagination
   */
  async getAllEventAttendees(eventId: string): Promise<any[] | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

    const recurGetAttendees = async (fullAttendeeArr: any[] = [], nextPageToken: string | null = null): Promise<any[] | ErrorResponse> => {
      const endpoint = nextPageToken 
        ? `/v1/events/${eventId}/attendees?nextPageToken=${nextPageToken}` 
        : `/v1/events/${eventId}/attendees`
      
      const result = await this.callExternalApi<any>('esp', endpoint, 'GET', undefined, {
        operationName: 'getAllEventAttendees (paginated)',
        shouldReturnFullResponse: true
      })

      if ('error' in result) {
        return result
      }

      if (result.nextPageToken) {
        return recurGetAttendees(fullAttendeeArr.concat(result.attendees), result.nextPageToken)
      }

      return fullAttendeeArr.concat(result.attendees || [])
    }

    return recurGetAttendees()
  }

  /**
   * Get single attendee
   */
  async getAttendee(eventId: string, attendeeId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')
    if (!attendeeId || typeof attendeeId !== 'string') throw new Error('Invalid attendee ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees/${attendeeId}`, 'GET', undefined, {
      operationName: 'getAttendee',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get event images
   */
  async getEventImages(eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/images`, 'GET', undefined, {
      operationName: 'getEventImages',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get event history
   */
  async getEventHistory(eventId: string): Promise<any | ErrorResponse> {
    if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

    return this.callExternalApi('esp', `/v1/events/${eventId}/history`, 'GET', undefined, {
      operationName: 'getEventHistory',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Get series history
   */
  async getSeriesHistory(seriesId: string): Promise<any | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/history`, 'GET', undefined, {
      operationName: 'getSeriesHistory',
      shouldReturnFullResponse: true
    })
  }

  /**
   * Delete speaker image
   */
  async deleteSpeakerImage(speakerId: string, seriesId: string, imageId: string): Promise<SuccessResponse | ErrorResponse> {
    if (!seriesId || typeof seriesId !== 'string') throw new Error('Invalid series ID')
    if (!speakerId || typeof speakerId !== 'string') throw new Error('Invalid speaker ID')
    if (!imageId || typeof imageId !== 'string') throw new Error('Invalid image ID')

    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${speakerId}/images/${imageId}`, 'DELETE', undefined, {
      operationName: 'deleteSpeakerImage'
    })
  }

  /**
   * Fetch RSVP form configs
   * Note: This fetches from static JSON files, not the API
   */
  async fetchRsvpFormConfigs(): Promise<any[]> {
    try {
      const configs = await Promise.all(
        SUPPORTED_CLOUDS.map(async ({ id }) => {
          try {
            const response = await fetch(`/ecc/system/rsvp-config-sheets/${id.toLowerCase()}.json`)
            const config = response.ok ? await response.json() : null
            return { cloudType: id, config }
          } catch (error) {
            console.error(`Failed to fetch RSVP config for ${id}:`, error)
            return { cloudType: id, config: null }
          }
        })
      )
      return configs
    } catch (error) {
      console.error('❌ Failed to fetch RSVP form configs:', error)
      return []
    }
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService

