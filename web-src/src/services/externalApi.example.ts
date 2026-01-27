/* 
* External API Service Example
* 
* This is an example implementation showing how to use the dev token system
* to make external API calls similar to the previous app's external API controller.
* 
* Usage:
*   import { externalApi } from '../services/externalApi.example'
*   const events = await externalApi.getEvents()
*/

import { tokenStorage } from './tokenStorage'
import { constructRequestHeaders, safeFetch } from './requestHelpers'
import { getCurrentEnvironment, getApiHost } from '../config/constants'

/**
 * External API Service
 * Provides methods for calling external APIs with proper authentication
 */
class ExternalApiService {
  /**
   * Get the auth token
   * @throws Error if no valid token is found
   */
  private getAuthToken(): string {
    const token = tokenStorage.getValidToken()
    
    if (!token) {
      throw new Error('No valid authentication token. Please add a dev token via the UI.')
    }
    
    return token
  }

  /**
   * Make a request to the external API
   */
  private async request<T>(
    service: 'esp' | 'esl',
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const token = this.getAuthToken()
    const headers = constructRequestHeaders(token)
    const env = getCurrentEnvironment()
    const host = getApiHost(service, env)
    const url = `${host}${path}`

    const options: RequestInit = {
      method,
      headers: headers as any
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await safeFetch(url, options)

      // Handle 204 No Content
      if (response.status === 204) {
        return { ok: true } as T
      }

      const data = await response.json()

      if (!response.ok) {
        console.error(`API Error: ${response.status}`, data)
        return { status: response.status, error: data } as T
      }

      return data
    } catch (error) {
      console.error('API Request failed:', error)
      throw error
    }
  }

  /**
   * Get all events
   */
  async getEvents(): Promise<any> {
    return this.request('esp', '/v1/events', 'GET')
  }

  /**
   * Get a specific event
   */
  async getEvent(eventId: string): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    const url = `/v1/events/${encodeURIComponent(eventId)}`
    
    // Fetch event with related data
    const [event, speakers, sponsors, venues] = await Promise.all([
      this.request<Record<string, any>>('esp', url, 'GET'),
      this.request<{ speakers?: any[] }>('esp', `${url}/speakers`, 'GET'),
      this.request<{ sponsors?: any[] }>('esp', `${url}/sponsors`, 'GET'),
      this.request<{ venues?: any[] }>('esp', `${url}/venues`, 'GET')
    ])

    return {
      ...event,
      speakers: speakers.speakers || [],
      sponsors: sponsors.sponsors || [],
      venue: venues.venues?.[0] || null
    }
  }

  /**
   * Create an event
   */
  async createEvent(eventData: any, locale: string): Promise<any> {
    const payload = {
      ...eventData,
      liveUpdate: false,
      published: false,
      defaultLocale: locale
    }
    
    return this.request('esl', '/v1/events', 'POST', payload)
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, eventData: any, policies?: any): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    const payload = {
      ...eventData,
      ...policies
    }
    
    return this.request('esl', `/v1/events/${eventId}`, 'PUT', payload)
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    return this.request('esl', `/v1/events/${eventId}`, 'DELETE')
  }

  /**
   * Get all series
   */
  async getAllSeries(): Promise<any> {
    return this.request('esp', '/v1/series', 'GET')
  }

  /**
   * Get a specific series
   */
  async getSeriesById(seriesId: string): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}`, 'GET')
  }

  /**
   * Create a series
   */
  async createSeries(seriesData: any): Promise<any> {
    const payload = {
      ...seriesData,
      seriesStatus: 'draft'
    }
    
    return this.request('esp', '/v1/series', 'POST', payload)
  }

  /**
   * Update a series
   */
  async updateSeries(seriesId: string, seriesData: any): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}`, 'PUT', seriesData)
  }

  /**
   * Delete a series
   */
  async deleteSeries(seriesId: string): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}`, 'DELETE')
  }

  /**
   * Get locales
   */
  async getLocales(): Promise<any> {
    return this.request('esp', '/v1/locales', 'GET')
  }

  /**
   * Get clouds
   */
  async getClouds(): Promise<any> {
    const result = await this.request<{ clouds?: any[] }>('esp', '/v1/clouds', 'GET')
    return result.clouds
  }

  /**
   * Get a specific cloud
   */
  async getCloud(cloudType: string): Promise<any> {
    if (!cloudType) throw new Error('Invalid cloud type')
    
    return this.request('esp', `/v1/clouds/${cloudType}`, 'GET')
  }

  /**
   * Update a cloud
   */
  async updateCloud(cloudType: string, cloudData: any): Promise<any> {
    if (!cloudType) throw new Error('Invalid cloud type')
    
    return this.request('esp', `/v1/clouds/${cloudType}`, 'PUT', cloudData)
  }

  /**
   * Get speakers for a series
   */
  async getSpeakers(seriesId: string): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}/speakers`, 'GET')
  }

  /**
   * Create a speaker
   */
  async createSpeaker(seriesId: string, profile: any): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}/speakers`, 'POST', profile)
  }

  /**
   * Update a speaker
   */
  async updateSpeaker(seriesId: string, profile: any): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    if (!profile.speakerId) throw new Error('Invalid speaker ID')
    
    return this.request('esp', `/v1/series/${seriesId}/speakers/${profile.speakerId}`, 'PUT', profile)
  }

  /**
   * Add speaker to event
   */
  async addSpeakerToEvent(eventId: string, speakerData: any): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    return this.request('esp', `/v1/events/${eventId}/speakers`, 'POST', speakerData)
  }

  /**
   * Remove speaker from event
   */
  async removeSpeakerFromEvent(eventId: string, speakerId: string): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    if (!speakerId) throw new Error('Invalid speaker ID')
    
    return this.request('esp', `/v1/events/${eventId}/speakers/${speakerId}`, 'DELETE')
  }

  /**
   * Get sponsors for a series
   */
  async getSponsors(seriesId: string): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}/sponsors`, 'GET')
  }

  /**
   * Create a sponsor
   */
  async createSponsor(seriesId: string, sponsorData: any): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}/sponsors`, 'POST', sponsorData)
  }

  /**
   * Update a sponsor
   */
  async updateSponsor(seriesId: string, sponsorId: string, sponsorData: any): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    if (!sponsorId) throw new Error('Invalid sponsor ID')
    
    return this.request('esp', `/v1/series/${seriesId}/sponsors/${sponsorId}`, 'PUT', sponsorData)
  }

  /**
   * Add sponsor to event
   */
  async addSponsorToEvent(eventId: string, sponsorData: any): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    return this.request('esp', `/v1/events/${eventId}/sponsors`, 'POST', sponsorData)
  }

  /**
   * Remove sponsor from event
   */
  async removeSponsorFromEvent(eventId: string, sponsorId: string): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    if (!sponsorId) throw new Error('Invalid sponsor ID')
    
    return this.request('esp', `/v1/events/${eventId}/sponsors/${sponsorId}`, 'DELETE')
  }

  /**
   * Create a venue
   */
  async createVenue(eventId: string, venueData: any): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    return this.request('esl', `/v1/events/${eventId}/venues`, 'POST', venueData)
  }

  /**
   * Update a venue
   */
  async updateVenue(eventId: string, venueId: string, venueData: any): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    if (!venueId) throw new Error('Invalid venue ID')
    
    return this.request('esl', `/v1/events/${eventId}/venues/${venueId}`, 'PUT', venueData)
  }

  /**
   * Get event images
   */
  async getEventImages(eventId: string): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    return this.request('esp', `/v1/events/${eventId}/images`, 'GET')
  }

  /**
   * Get event history
   */
  async getEventHistory(eventId: string): Promise<any> {
    if (!eventId) throw new Error('Invalid event ID')
    
    return this.request('esp', `/v1/events/${eventId}/history`, 'GET')
  }

  /**
   * Get series history
   */
  async getSeriesHistory(seriesId: string): Promise<any> {
    if (!seriesId) throw new Error('Invalid series ID')
    
    return this.request('esp', `/v1/series/${seriesId}/history`, 'GET')
  }
}

// Export singleton instance
export const externalApi = new ExternalApiService()
export default externalApi

/**
 * USAGE EXAMPLES:
 * 
 * // In a component:
 * import { externalApi } from '../services/externalApi.example'
 * 
 * async function loadEvents() {
 *   try {
 *     const result = await externalApi.getEvents()
 *     console.log('Events:', result.events)
 *   } catch (error) {
 *     console.error('Failed to load events:', error)
 *     // Handle error - maybe show token dialog?
 *   }
 * }
 * 
 * async function createNewEvent() {
 *   const eventData = {
 *     title: 'My Event',
 *     description: 'Event description',
 *     // ... other fields
 *   }
 *   
 *   const result = await externalApi.createEvent(eventData, 'en_US')
 *   if (result.error) {
 *     console.error('Failed to create event:', result.error)
 *   } else {
 *     console.log('Event created:', result)
 *   }
 * }
 */

