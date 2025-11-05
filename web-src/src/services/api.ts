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
  SeriesDashboardItem,
  Event,
  EventFormData,
  EventApiResponse,
  EventDashboardItem,
  Session,
  Registration,
  ApiResponse,
  ApiListResponse
} from '../types/domain'
import { getSeriesListMock, getEventsListMock } from '../mocks'
import { tokenStorage } from './tokenStorage'
import { constructRequestHeaders, safeFetch } from './requestHelpers'
import { getCurrentEnvironment, getApiHost, ENVIRONMENTS } from '../config/constants'

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
      
      const headers = constructRequestHeaders(token)
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

  /**
   * Get series details with event count
   * This will be used to fetch individual series details including created/modified by
   */
  async getSeriesDetails(seriesId: string): Promise<SeriesDashboardItem | null> {
    // TODO: Implement when backend endpoint is ready
    console.log('getSeriesDetails not yet implemented for:', seriesId)
    return null
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
      
      const headers = constructRequestHeaders(token)
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


  /**
   * Get event details
   * This will be used to fetch individual event details including created/modified by
   */
  async getEventDetails(eventId: string): Promise<EventDashboardItem | null> {
    // TODO: Implement when backend endpoint is ready
    console.log('getEventDetails not yet implemented for:', eventId)
    return null
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
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService

