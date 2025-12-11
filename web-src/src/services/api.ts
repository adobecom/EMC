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

// ============================================================================
// TYPES
// ============================================================================

interface ErrorResponse {
  status: number | string
  error: any
}

interface SuccessResponse {
  ok: boolean
}

interface ImageUploadConfig {
  targetUrl: string
  altText?: string
  type: string
}

export interface UploadProgressTracker {
  progress: number
}

interface ScheduleData {
  pageUrl: string
  publishDate?: string
  unpublishDate?: string
  [key: string]: any
}

interface ApiServiceConfig {
  headers?: Record<string, string>
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateString(value: any, name: string): void {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${name}`)
  }
}

function validateObject(value: any, name: string): void {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid ${name}`)
  }
}

// ============================================================================
// API SERVICE CLASS
// ============================================================================

class ApiService {
  private config: ApiServiceConfig
  private actionUrls: Record<string, string>
  
  /**
   * Dry-run mode: when enabled, POST/PUT/DELETE calls are logged but not executed
   * Enable via console: apiService.enableDryRun() or window.enableDryRun()
   */
  private static dryRunMode = false

  constructor(config: ApiServiceConfig = {}) {
    this.config = config
    this.actionUrls = {}
  }
  
  /**
   * Enable dry-run mode - POST/PUT/DELETE calls will be logged but not executed
   */
  static enableDryRun(): void {
    ApiService.dryRunMode = true
    console.log('%c🔒 DRY-RUN MODE ENABLED', 'background: #ff9800; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;')
    console.log('   POST, PUT, and DELETE calls will be logged but not sent to the backend.')
    console.log('   To disable: apiService.disableDryRun() or window.disableDryRun()')
  }
  
  /**
   * Disable dry-run mode - resume normal API calls
   */
  static disableDryRun(): void {
    ApiService.dryRunMode = false
    console.log('%c🔓 DRY-RUN MODE DISABLED', 'background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;')
    console.log('   API calls will now be sent to the backend normally.')
  }
  
  /**
   * Check if dry-run mode is enabled
   */
  static isDryRunEnabled(): boolean {
    return ApiService.dryRunMode
  }
  
  /**
   * Instance method wrappers for static methods
   */
  enableDryRun(): void { ApiService.enableDryRun() }
  disableDryRun(): void { ApiService.disableDryRun() }
  isDryRunEnabled(): boolean { return ApiService.isDryRunEnabled() }
  
  /**
   * Log a dry-run call with formatted output
   */
  private logDryRunCall(
    method: string,
    url: string,
    body?: any,
    operationName?: string
  ): void {
    console.group(`%c🔒 DRY-RUN: ${operationName || `${method} ${url}`}`, 'background: #ff9800; color: black; padding: 2px 6px; border-radius: 3px;')
    console.log('%cMethod:', 'font-weight: bold;', method)
    console.log('%cURL:', 'font-weight: bold;', url)
    if (body) {
      console.log('%cPayload:', 'font-weight: bold;')
      console.log(JSON.stringify(body, null, 2))
      console.log('%cRaw payload object:', 'font-weight: bold; color: #666;', body)
    }
    console.groupEnd()
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

  // ============================================================================
  // INTERNAL API METHODS (App Builder Actions)
  // ============================================================================

  /**
   * Generic App Builder action call
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

  // Series APIs (App Builder)
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

  // Event APIs (App Builder)
  async getEvents(seriesId?: string, organizationId?: string): Promise<ApiListResponse<Event>> {
    return this.callAction<ApiListResponse<Event>>('getEvents', { seriesId, organizationId })
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
  // EXTERNAL API METHODS (Adobe ESP/ESL APIs)
  // ============================================================================

  /**
   * Generic external API call wrapper
   * Handles token validation, environment detection, and error handling
   * 
   * When dry-run mode is enabled, POST/PUT/DELETE calls are logged but not executed
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

    const env = getCurrentEnvironment()
    const host = getApiHost(service, env)
    const url = `${host}${endpoint}`

    // DRY-RUN MODE: Log but don't execute mutating calls
    if (ApiService.dryRunMode && method !== 'GET') {
      this.logDryRunCall(method, url, body, operationName)
      
      // Return a mock success response
      return {
        ok: true,
        _dryRun: true,
        _message: 'This was a dry-run call. No data was sent to the server.',
        _method: method,
        _url: url,
        _body: body
      } as any
    }

    try {
      const headers = constructRequestHeaders(token, method)

      const response = await safeFetch(url, {
        method,
        headers: headers as any,
        ...(body && { body: JSON.stringify(body) })
      })

      // Handle 204 No Content (successful deletes)
      if (response.status === 204) {
        return { ok: true } as any
      }

      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ ${operationName} failed. Status: ${response.status}`, data)
        return { status: response.status, error: data }
      }

      // Transform response if needed
      if (options?.transformResponse) {
        return options.transformResponse(data)
      }

      return options?.shouldReturnFullResponse ? data : (data.espProvider || data)
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error)
      return { status: 'Network Error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Call external API with dependent data (for PUT operations that need existing data)
   */
  private async callWithDependency<T = any>(
    service: 'esp' | 'esl',
    endpoint: string,
    body: any,
    getDependentData: () => Promise<any | ErrorResponse>,
    mergeDependentData: (body: any, dependentData: any) => any,
    operationName: string
  ): Promise<T | ErrorResponse> {
    const dependentData = await getDependentData()
    
    if ('error' in dependentData) {
      console.error(`❌ Failed to get dependent data for ${operationName}:`, dependentData)
      return dependentData
    }

    const mergedBody = mergeDependentData(body, dependentData)
    return this.callExternalApi<T>(service, endpoint, 'PUT', mergedBody, { operationName })
  }

  // ============================================================================
  // SERIES EXTERNAL APIs
  // ============================================================================

  /**
   * Get series list from ESP API with token authentication and mock fallback
   */
  async getSeriesList(): Promise<SeriesApiResponse[]> {
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token. Using mock data.')
      console.log('💡 Click the "Dev Token" button to add a token for real API access')
      
      try {
        const data = await getSeriesListMock()
        console.log('📦 Using mock series data:', data.length, 'items')
        return data
      } catch (error) {
        console.error('Error fetching mock series:', error)
        return []
      }
    }

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

      const series = data.series || []
      console.log('✅ Successfully loaded series from API:', series.length, 'items')
      
      return series
    } catch (error) {
      console.error('❌ Error fetching series from API:', error)
      console.log('📦 Falling back to mock data')
      
      try {
        return await getSeriesListMock()
      } catch (mockError) {
        console.error('Error fetching mock series:', mockError)
        return []
      }
    }
  }

  async createSeriesExternal(seriesData: any): Promise<any | ErrorResponse> {
    validateObject(seriesData, 'series data')
    return this.callExternalApi('esp', '/v1/series', 'POST', 
      { ...seriesData, seriesStatus: 'draft' }, 
      { operationName: 'createSeries', shouldReturnFullResponse: true }
    )
  }

  async getSeriesByIdExternal(seriesId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'GET', undefined,
      { operationName: `getSeriesById(${seriesId})`, shouldReturnFullResponse: true }
    )
  }

  async updateSeriesExternal(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(seriesData, 'series data')
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT', 
      { ...seriesData, seriesId },
      { operationName: `updateSeries(${seriesId})`, shouldReturnFullResponse: true }
    )
  }

  async publishSeries(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(seriesData, 'series data')
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT',
      { ...seriesData, seriesId, seriesStatus: 'published' },
      { operationName: `publishSeries(${seriesId})`, shouldReturnFullResponse: true }
    )
  }

  async unpublishSeries(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(seriesData, 'series data')
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT',
      { ...seriesData, seriesId, seriesStatus: 'draft' },
      { operationName: `unpublishSeries(${seriesId})`, shouldReturnFullResponse: true }
    )
  }

  async archiveSeries(seriesId: string, seriesData: any): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(seriesData, 'series data')
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'PUT',
      { ...seriesData, seriesId, seriesStatus: 'archived' },
      { operationName: `archiveSeries(${seriesId})`, shouldReturnFullResponse: true }
    )
  }

  async deleteSeriesExternal(seriesId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(seriesId, 'series ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}`, 'DELETE', undefined,
      { operationName: `deleteSeries(${seriesId})` }
    )
  }

  async getSeriesHistory(seriesId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/history`, 'GET', undefined,
      { operationName: 'getSeriesHistory', shouldReturnFullResponse: true }
    )
  }

  /**
   * Fetch series details for enrichment
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

  // ============================================================================
  // EVENT EXTERNAL APIs
  // ============================================================================

  /**
   * Get events list from ESP API with token authentication and mock fallback
   */
  async getEventsList(): Promise<EventApiResponse[]> {
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token. Using mock data.')
      console.log('💡 Click the "Dev Token" button to add a token for real API access')
      
      try {
        const data = await getEventsListMock()
        console.log('📦 Using mock events data:', data.length, 'items')
        return data
      } catch (error) {
        console.error('Error fetching mock events:', error)
        return []
      }
    }

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

      const events = data.events || []
      console.log('✅ Successfully loaded events from API:', events.length, 'items')
      
      return events
    } catch (error) {
      console.error('❌ Error fetching events from API:', error)
      console.log('📦 Falling back to mock data')
      
      try {
        return await getEventsListMock()
      } catch (mockError) {
        console.error('Error fetching mock events:', mockError)
        return []
      }
    }
  }

  async createEventExternal(payload: any, locale: string): Promise<any | ErrorResponse> {
    validateObject(payload, 'event payload')
    validateString(locale, 'locale')
    return this.callExternalApi('esl', '/v1/events', 'POST',
      { ...payload, liveUpdate: false, published: false, defaultLocale: locale },
      { operationName: 'createEvent', shouldReturnFullResponse: true }
    )
  }

  async updateEventExternal(eventId: string, payload: any, policies = { forceSpWrite: false, liveUpdate: false }): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...payload, ...policies },
      { operationName: `updateEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  async publishEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...payload, published: true, liveUpdate: true, forceSpWrite: false },
      { operationName: `publishEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  async unpublishEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...payload, published: false, liveUpdate: true, forceSpWrite: false },
      { operationName: `unpublishEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  async previewEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...payload, liveUpdate: false, forceSpWrite: true },
      { operationName: `previewEvent(${eventId})` }
    )
  }

  async deleteEventExternal(eventId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'DELETE', undefined,
      { operationName: `deleteEvent(${eventId})` }
    )
  }

  /**
   * Get single event by ID
   */
  async getEventExternal(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}`, 'GET', undefined,
      { operationName: `getEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  /**
   * Get full event details with hydrated speakers, sponsors, and venues
   * Speakers and sponsors are hydrated from the series level for complete data
   */
  async getEventFull(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'eventId')

    const token = tokenStorage.getValidToken()
    if (!token) {
      console.warn('⚠️ No valid authentication token for getEventFull')
      return { status: 'No Token', error: 'No valid authentication token' }
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)
      const url = `${host}/v1/events/${encodeURIComponent(eventId)}`

      // First, get the event and event-level speakers/sponsors/venues/images
      const [eventResp, eventSpeakersResp, eventSponsorsResp, venuesResp, imagesResp] = await Promise.all([
        safeFetch(url, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/speakers`, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/sponsors`, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/venues`, { method: 'GET', headers: headers as any }),
        safeFetch(`${url}/images`, { method: 'GET', headers: headers as any }),
      ])

      let data: any = {}

      if (eventResp.ok) {
        data = await eventResp.json()
      } else {
        console.error(`❌ Failed to get event ${eventId}. Status: ${eventResp.status}`)
        return { status: eventResp.status, error: 'Failed to get event details' }
      }

      const seriesId = data.seriesId

      // Get event-level speaker/sponsor references
      let eventSpeakers: any[] = []
      let eventSponsors: any[] = []

      if (eventSpeakersResp.ok) {
        const speakersData = await eventSpeakersResp.json()
        eventSpeakers = speakersData.speakers || []
      }

      if (eventSponsorsResp.ok) {
        const sponsorsData = await eventSponsorsResp.json()
        eventSponsors = sponsorsData.sponsors || []
      }

      // Hydrate speakers from series level if we have a seriesId
      if (seriesId && eventSpeakers.length > 0) {
        const hydratedSpeakers = await Promise.all(
          eventSpeakers.map(async (eventSpeaker: any) => {
            const speakerId = eventSpeaker.speakerId
            if (!speakerId) return eventSpeaker

            try {
              const speakerUrl = `${host}/v1/series/${seriesId}/speakers/${speakerId}`
              const speakerResp = await safeFetch(speakerUrl, { method: 'GET', headers: headers as any })
              
              if (speakerResp.ok) {
                const fullSpeaker = await speakerResp.json()
                // Merge event-level data (like ordinal) with series-level data
                return { ...fullSpeaker, ...eventSpeaker, ...fullSpeaker }
              }
            } catch (err) {
              console.warn(`Failed to hydrate speaker ${speakerId}:`, err)
            }
            return eventSpeaker
          })
        )
        data.speakers = hydratedSpeakers.sort((a: any, b: any) => (a.ordinal || 0) - (b.ordinal || 0))
      } else {
        data.speakers = eventSpeakers
      }

      // Hydrate sponsors from series level if we have a seriesId
      if (seriesId && eventSponsors.length > 0) {
        const hydratedSponsors = await Promise.all(
          eventSponsors.map(async (eventSponsor: any) => {
            const sponsorId = eventSponsor.sponsorId
            if (!sponsorId) return eventSponsor

            try {
              const sponsorUrl = `${host}/v1/series/${seriesId}/sponsors/${sponsorId}`
              const sponsorResp = await safeFetch(sponsorUrl, { method: 'GET', headers: headers as any })
              
              if (sponsorResp.ok) {
                const fullSponsor = await sponsorResp.json()
                // Merge event-level data with series-level data
                return { ...fullSponsor, ...eventSponsor, ...fullSponsor }
              }
            } catch (err) {
              console.warn(`Failed to hydrate sponsor ${sponsorId}:`, err)
            }
            return eventSponsor
          })
        )
        data.sponsors = hydratedSponsors
      } else {
        data.sponsors = eventSponsors
      }

      // Get venue
      if (venuesResp.ok) {
        const venuesData = await venuesResp.json()
        data.venue = venuesData.venues?.[0]
      }

      // Get images
      if (imagesResp.ok) {
        const imagesData = await imagesResp.json()
        data.images = imagesData.images || []
      }

      return data
    } catch (error) {
      console.error(`❌ Failed to get details for event ${eventId}:`, error)
      return { status: 'Network Error', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getEventImages(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/images`, 'GET', undefined,
      { operationName: 'getEventImages', shouldReturnFullResponse: true }
    )
  }

  async getEventHistory(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/history`, 'GET', undefined,
      { operationName: 'getEventHistory', shouldReturnFullResponse: true }
    )
  }

  /**
   * Batch fetch event images for enrichment
   */
  async getEventImagesBatch(eventIds: string[]): Promise<Map<string, EventApiResponse>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, EventApiResponse>()
    
    if (!token) return results

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      const promises = eventIds.map(async (eventId) => {
        try {
          const url = `${host}/v1/events/${eventId}/images`
          const response = await safeFetch(url, { method: 'GET', headers: headers as any })

          if (response.ok) {
            const data = await response.json()
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
        if (result?.data) {
          results.set(result.eventId, result.data)
        }
      })
    } catch (error) {
      console.error('Error fetching event images batch:', error)
    }

    return results
  }

  /**
   * Batch fetch event venues for enrichment
   */
  async getEventVenuesBatch(eventIds: string[]): Promise<Map<string, Venue[]>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, Venue[]>()
    
    if (!token) return results

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      const promises = eventIds.map(async (eventId) => {
        try {
          const url = `${host}/v1/events/${eventId}/venues`
          const response = await safeFetch(url, { method: 'GET', headers: headers as any })

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
   * Batch fetch event history for enrichment
   */
  async getEventHistoryBatch(eventIds: string[]): Promise<Map<string, EventHistoryResponse>> {
    const token = tokenStorage.getValidToken()
    const results = new Map<string, EventHistoryResponse>()
    
    if (!token) return results

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      const host = getApiHost('esp', env)

      const promises = eventIds.map(async (eventId) => {
        try {
          const url = `${host}/v1/events/${eventId}/history`
          const response = await safeFetch(url, { method: 'GET', headers: headers as any })

          if (response.ok) {
            const data = await response.json()
            return { eventId, history: data }
          }
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

  // ============================================================================
  // SPEAKER APIs
  // ============================================================================

  async createSpeaker(profile: any, seriesId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(profile, 'speaker profile')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers`, 'POST', profile,
      { operationName: 'createSpeaker', shouldReturnFullResponse: true }
    )
  }

  async updateSpeaker(profile: any, seriesId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(profile, 'speaker profile')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${profile.speakerId}`, 'PUT', profile,
      { operationName: 'updateSpeaker', shouldReturnFullResponse: true }
    )
  }

  async getSpeaker(seriesId: string, speakerId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(speakerId, 'speaker ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${speakerId}`, 'GET', undefined,
      { operationName: 'getSpeaker', shouldReturnFullResponse: true }
    )
  }

  async getSpeakers(seriesId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers`, 'GET', undefined,
      { operationName: 'getSpeakers', shouldReturnFullResponse: true }
    )
  }

  async addSpeakerToEvent(speakerData: any, eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(speakerData, 'speaker data')
    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers`, 'POST', speakerData,
      { operationName: 'addSpeakerToEvent', shouldReturnFullResponse: true }
    )
  }

  async getEventSpeakers(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers`, 'GET', undefined,
      { operationName: 'getEventSpeakers', shouldReturnFullResponse: true }
    )
  }

  async getEventSpeaker(eventId: string, speakerId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(speakerId, 'speaker ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers/${speakerId}`, 'GET', undefined,
      { operationName: 'getEventSpeaker', shouldReturnFullResponse: true }
    )
  }

  async updateSpeakerInEvent(speakerData: any, speakerId: string, eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(speakerId, 'speaker ID')
    validateObject(speakerData, 'speaker data')
    return this.callWithDependency(
      'esp',
      `/v1/events/${eventId}/speakers/${speakerId}`,
      speakerData,
      () => this.getEventSpeaker(eventId, speakerId),
      (body, dependentData) => ({ ...body, modificationTime: dependentData.modificationTime }),
      'updateSpeakerInEvent'
    )
  }

  async removeSpeakerFromEvent(speakerId: string, eventId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(speakerId, 'speaker ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/speakers/${speakerId}`, 'DELETE', undefined,
      { operationName: 'removeSpeakerFromEvent' }
    )
  }

  async deleteSpeakerImage(speakerId: string, seriesId: string, imageId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(speakerId, 'speaker ID')
    validateString(imageId, 'image ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${speakerId}/images/${imageId}`, 'DELETE', undefined,
      { operationName: 'deleteSpeakerImage' }
    )
  }

  // ============================================================================
  // SPONSOR APIs
  // ============================================================================

  async createSponsor(sponsorData: any, seriesId: string, locale: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateObject(sponsorData, 'sponsor data')
    validateString(locale, 'locale')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors`, 'POST', sponsorData,
      { operationName: 'createSponsor', shouldReturnFullResponse: true }
    )
  }

  async updateSponsor(sponsorData: any, sponsorId: string, seriesId: string, locale: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(sponsorId, 'sponsor ID')
    validateObject(sponsorData, 'sponsor data')
    validateString(locale, 'locale')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}`, 'PUT', sponsorData,
      { operationName: 'updateSponsor', shouldReturnFullResponse: true }
    )
  }

  async getSponsor(seriesId: string, sponsorId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(sponsorId, 'sponsor ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}`, 'GET', undefined,
      { operationName: 'getSponsor', shouldReturnFullResponse: true }
    )
  }

  async getSponsors(seriesId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors`, 'GET', undefined,
      { operationName: 'getSponsors', shouldReturnFullResponse: true }
    )
  }

  async addSponsorToEvent(sponsorData: any, eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(sponsorData, 'sponsor data')
    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors`, 'POST', sponsorData,
      { operationName: 'addSponsorToEvent', shouldReturnFullResponse: true }
    )
  }

  async getEventSponsor(eventId: string, sponsorId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(sponsorId, 'sponsor ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors/${sponsorId}`, 'GET', undefined,
      { operationName: 'getEventSponsor', shouldReturnFullResponse: true }
    )
  }

  async updateSponsorInEvent(sponsorData: any, sponsorId: string, eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(sponsorId, 'sponsor ID')
    validateObject(sponsorData, 'sponsor data')
    return this.callWithDependency(
      'esp',
      `/v1/events/${eventId}/sponsors/${sponsorId}`,
      sponsorData,
      () => this.getEventSponsor(eventId, sponsorId),
      (body, dependentData) => ({ ...body, modificationTime: dependentData.modificationTime }),
      'updateSponsorInEvent'
    )
  }

  async removeSponsorFromEvent(sponsorId: string, eventId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(sponsorId, 'sponsor ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors/${sponsorId}`, 'DELETE', undefined,
      { operationName: 'removeSponsorFromEvent' }
    )
  }

  async getSponsorImages(seriesId: string, sponsorId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(sponsorId, 'sponsor ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}/images`, 'GET', undefined,
      { operationName: 'getSponsorImages', shouldReturnFullResponse: true }
    )
  }

  // ============================================================================
  // VENUE APIs
  // ============================================================================

  async createVenue(eventId: string, venueData: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(venueData, 'venue data')
    return this.callExternalApi('esl', `/v1/events/${eventId}/venues`, 'POST', venueData,
      { operationName: 'createVenue' }
    )
  }

  async replaceVenue(eventId: string, venueId: string, venueData: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(venueId, 'venue ID')
    validateObject(venueData, 'venue data')
    return this.callExternalApi('esl', `/v1/events/${eventId}/venues/${venueId}`, 'PUT', venueData,
      { operationName: 'replaceVenue' }
    )
  }

  async getEventVenue(eventId: string): Promise<any | null | ErrorResponse> {
    validateString(eventId, 'eventId')
    return this.callExternalApi('esp', `/v1/events/${eventId}/venues`, 'GET', undefined,
      { operationName: 'getEventVenue', transformResponse: (data) => data.venues?.[0] || null }
    )
  }

  // ============================================================================
  // ATTENDEE APIs
  // ============================================================================

  async createAttendee(eventId: string, attendeeData: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(attendeeData, 'attendee data')
    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees`, 'POST', attendeeData,
      { operationName: 'createAttendee', shouldReturnFullResponse: true }
    )
  }

  async updateAttendee(eventId: string, attendeeId: string, attendeeData: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(attendeeId, 'attendee ID')
    validateObject(attendeeData, 'attendee data')
    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees/${attendeeId}`, 'PUT', attendeeData,
      { operationName: 'updateAttendee', shouldReturnFullResponse: true }
    )
  }

  async removeAttendeeFromEvent(eventId: string, attendeeId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(attendeeId, 'attendee ID')
    return this.callExternalApi('esl', `/v1/events/${eventId}/attendees/${attendeeId}`, 'DELETE', undefined,
      { operationName: 'removeAttendeeFromEvent', shouldReturnFullResponse: true }
    )
  }

  async getEventAttendees(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees`, 'GET', undefined,
      { operationName: 'getEventAttendees', shouldReturnFullResponse: true }
    )
  }

  async getAttendee(eventId: string, attendeeId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(attendeeId, 'attendee ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees/${attendeeId}`, 'GET', undefined,
      { operationName: 'getAttendee', shouldReturnFullResponse: true }
    )
  }

  /**
   * Get all event attendees with pagination
   */
  async getAllEventAttendees(eventId: string): Promise<any[] | ErrorResponse> {
    validateString(eventId, 'event ID')

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

  // ============================================================================
  // CLOUD & LOCALE APIs
  // ============================================================================

  async getLocales(): Promise<any | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/locales', 'GET', undefined,
      { operationName: 'getLocales', shouldReturnFullResponse: true }
    )
  }

  async getClouds(): Promise<any[] | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/clouds', 'GET', undefined,
      { operationName: 'getClouds', transformResponse: (data) => data.clouds }
    )
  }

  async getCloud(cloudType: string): Promise<any | ErrorResponse> {
    validateString(cloudType, 'cloud ID')
    return this.callExternalApi('esp', `/v1/clouds/${cloudType}`, 'GET', undefined,
      { operationName: 'getCloud', shouldReturnFullResponse: true }
    )
  }

  async updateCloud(cloudType: string, cloudData: any): Promise<any | ErrorResponse> {
    validateString(cloudType, 'cloud Type')
    validateObject(cloudData, 'cloud data')
    return this.callExternalApi('esp', `/v1/clouds/${cloudType}`, 'PUT', cloudData,
      { operationName: 'updateCloud', shouldReturnFullResponse: true }
    )
  }

  // ============================================================================
  // IMAGE APIs
  // ============================================================================

  async deleteImage(config: ImageUploadConfig, imageId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(imageId, 'image ID')
    validateObject(config, 'image configs')
    return this.callExternalApi('esp', `${config.targetUrl}/${imageId}`, 'DELETE', undefined,
      { operationName: 'deleteImage' }
    )
  }

  /**
   * Upload an image via XHR with progress tracking
   * Supports both POST (new image) and PUT (update existing image)
   */
  async uploadImage(
    file: File,
    config: ImageUploadConfig,
    tracker?: UploadProgressTracker,
    imageId?: string
  ): Promise<any | ErrorResponse> {
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      console.warn('⚠️ No valid authentication token for uploadImage')
      return { status: 'No Token', error: 'No valid authentication token' }
    }

    const env = getCurrentEnvironment()
    const host = getApiHost('esp', env)
    const method = imageId ? 'PUT' : 'POST'
    const url = imageId ? `${host}${config.targetUrl}/${imageId}` : `${host}${config.targetUrl}`

    // DRY-RUN MODE: Log but don't execute image upload
    if (ApiService.dryRunMode) {
      this.logDryRunCall(method, url, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        config,
        imageId
      }, `uploadImage(${file.name})`)
      
      return {
        ok: true,
        _dryRun: true,
        _message: 'Image upload was logged but not sent (dry-run mode)',
        imageId: imageId || 'dry-run-mock-id'
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.open(method, url)
      xhr.setRequestHeader('x-image-alt-text', config.altText || '')
      xhr.setRequestHeader('x-image-kind', config.type)
      xhr.setRequestHeader('x-api-key', 'acom_event_service')
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('x-request-id', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

      if (tracker) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100
            tracker.progress = percentComplete
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const respJson = JSON.parse(xhr.responseText)
            resolve(respJson)
          } catch (e) {
            console.error('❌ Failed to parse image upload response:', e)
            reject({ status: xhr.status, error: 'Failed to parse response' })
          }
        } else {
          console.error(`❌ Unexpected image upload server response: ${xhr.status}`)
          reject({ status: xhr.status, error: `Upload failed with status: ${xhr.status}` })
        }
      }

      xhr.onerror = () => {
        console.error(`❌ Failed to upload image: ${xhr.statusText}`)
        reject({ status: 'Network Error', error: `Upload failed: ${xhr.statusText}` })
      }

      xhr.send(file)
    })
  }

  // ============================================================================
  // RSVP & TAGS APIs
  // ============================================================================

  /**
   * Fetch RSVP form configs from static JSON files
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

  /**
   * Fetch CAAS tags from Adobe Chimera API
   * This is a public endpoint that doesn't require authentication
   * 
   * Implements caching and promise deduplication to prevent redundant API calls
   */
  getCaasTags = (() => {
    let cache: any
    let promise: Promise<any> | null = null

    return (): Promise<any> => {
      // Return cached data if available
      if (cache) {
        return Promise.resolve(cache)
      }

      // Return existing promise if fetch is in progress
      if (!promise) {
        promise = fetch('https://www.adobe.com/chimera-api/tags')
          .then((resp) => {
            if (resp.ok) {
              return resp.json()
            }
            throw new Error('Failed to load tags')
          })
          .then((data) => {
            cache = data
            return data
          })
          .catch((err) => {
            console.error('❌ Failed to load CAAS tags:', err)
            // Log to lana if available
            if (typeof window !== 'undefined' && (window as any).lana) {
              (window as any).lana.log(`Failed to load CAAS tags: ${err}`)
            }
            throw err
          })
      }

      return promise
    }
  })()

  // ============================================================================
  // SCHEDULE APIs (Page Schedules)
  // ============================================================================

  async getSchedules(): Promise<any | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/page-schedules', 'GET', undefined,
      { operationName: 'getSchedules', shouldReturnFullResponse: true }
    )
  }

  async createSchedule(schedule: ScheduleData): Promise<any | ErrorResponse> {
    validateObject(schedule, 'schedule')
    return this.callExternalApi('esp', '/v1/page-schedules', 'POST', schedule,
      { operationName: 'createSchedule', shouldReturnFullResponse: true }
    )
  }

  async updateSchedule(scheduleId: string, schedule: ScheduleData): Promise<any | ErrorResponse> {
    validateString(scheduleId, 'schedule ID')
    validateObject(schedule, 'schedule')
    return this.callExternalApi('esp', `/v1/page-schedules/${scheduleId}`, 'PUT', schedule,
      { operationName: `updateSchedule(${scheduleId})`, shouldReturnFullResponse: true }
    )
  }

  async deleteSchedule(scheduleId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(scheduleId, 'schedule ID')
    return this.callExternalApi('esp', `/v1/page-schedules/${scheduleId}`, 'DELETE', undefined,
      { operationName: `deleteSchedule(${scheduleId})` }
    )
  }

  // ============================================================================
  // PUBLISHING PROFILES (for Webinar Metadata)
  // ============================================================================

  /**
   * Get all publishing profiles
   */
  async getPublishingProfiles(): Promise<any | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/publishing-profiles', 'GET', undefined,
      { operationName: 'getPublishingProfiles', shouldReturnFullResponse: true }
    )
  }

  /**
   * Get a single publishing profile by ID
   */
  async getPublishingProfile(profileId: string): Promise<any | ErrorResponse> {
    validateString(profileId, 'publishing profile ID')
    return this.callExternalApi('esp', `/v1/publishing-profiles/${profileId}`, 'GET', undefined,
      { operationName: `getPublishingProfile(${profileId})`, shouldReturnFullResponse: true }
    )
  }

  /**
   * Get the publishing profile for an event
   */
  async getEventPublishingProfile(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/publishing-profiles`, 'GET', undefined,
      { operationName: `getEventPublishingProfile(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  /**
   * Create a new publishing profile
   */
  async createPublishingProfile(profileData: {
    name: string
    description?: string
    metadata?: Record<string, string>
    status?: string
  }): Promise<any | ErrorResponse> {
    validateObject(profileData, 'profile data')
    if (!profileData.name || typeof profileData.name !== 'string') {
      throw new Error('Publishing profile name is required')
    }
    return this.callExternalApi('esp', '/v1/publishing-profiles', 'POST', profileData,
      { operationName: 'createPublishingProfile', shouldReturnFullResponse: true }
    )
  }

  /**
   * Update an existing publishing profile
   * Requires modificationTime for optimistic locking
   */
  async updatePublishingProfile(profileId: string, profileData: {
    name: string
    description?: string
    metadata?: Record<string, string>
    status?: string
    modificationTime: number
  }): Promise<any | ErrorResponse> {
    validateString(profileId, 'profile ID')
    validateObject(profileData, 'profile data')
    if (!profileData.name || typeof profileData.name !== 'string') {
      throw new Error('Publishing profile name is required')
    }
    if (!profileData.modificationTime || typeof profileData.modificationTime !== 'number') {
      throw new Error('Modification time is required for optimistic locking')
    }
    return this.callExternalApi('esp', `/v1/publishing-profiles/${profileId}`, 'PUT', 
      { ...profileData, profileId },
      { operationName: `updatePublishingProfile(${profileId})`, shouldReturnFullResponse: true }
    )
  }

  /**
   * Assign a publishing profile to an event
   */
  async assignPublishingProfileToEvent(eventId: string, profileId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(profileId, 'profile ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/publishing-profiles`, 'POST', { profileId },
      { operationName: `assignPublishingProfileToEvent(${eventId}, ${profileId})`, shouldReturnFullResponse: true }
    )
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiService = new ApiService()
export default apiService

// ============================================================================
// BROWSER CONSOLE HELPERS
// ============================================================================

/**
 * Expose dry-run mode controls on the window object for easy console access
 * 
 * Usage in browser console:
 *   enableDryRun()    - Enable dry-run mode (POST/PUT/DELETE logged but not sent)
 *   disableDryRun()   - Disable dry-run mode (resume normal operation)
 *   isDryRunEnabled() - Check if dry-run mode is active
 */
if (typeof window !== 'undefined') {
  (window as any).apiService = apiService;
  (window as any).enableDryRun = () => apiService.enableDryRun();
  (window as any).disableDryRun = () => apiService.disableDryRun();
  (window as any).isDryRunEnabled = () => apiService.isDryRunEnabled();
  
  // Log availability on load
  console.log(
    '%c🛠️ API Debug Mode Available',
    'color: #2196f3; font-weight: bold;',
    '\n   enableDryRun()  - Log POST/PUT/DELETE calls without sending',
    '\n   disableDryRun() - Resume normal API operation'
  )
}

/**
 * Deep get a tag by path array
 * Navigates through the nested tag structure using an array of paths
 */
export function deepGetTagByPath(pathArray: string[], index: number, tags: any = {}): any {
  let currentTag = tags
  pathArray.forEach((path, i) => {
    if (i <= index && path && currentTag?.tags) {
      currentTag = currentTag.tags[path]
    }
  })
  return currentTag
}

/**
 * Deep get a tag by tag ID
 * Converts a CAAS tag ID (e.g., "caas:product-categories/graphic-design")
 * into a path and navigates to that tag
 */
export function deepGetTagByTagID(tagID: string, tags: any = {}): any {
  const tagIDs = tagID.replace('caas:', '').split('/')
  let currentTag = tags
  tagIDs.forEach((tag) => {
    if (currentTag?.tags) {
      currentTag = currentTag.tags[tag]
    }
  })
  return currentTag
}
