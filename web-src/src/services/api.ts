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
  Registration,
  Venue,
  EventHistoryResponse,
  ApiResponse,
  ApiListResponse
} from '../types/domain'
import { tokenStorage } from './tokenStorage'
import { constructRequestHeaders, safeFetch, setUploadGroupId } from './requestHelpers'
import { getCurrentEnvironment, getApiHost, SUPPORTED_CLOUDS } from '../config/constants'
import { env } from '../config/env'
import { apiCache } from './cacheUtils'
import { deduplicateBy } from '../utils/deduplication'
import { prepareEslEventPutPayload } from '../utils/dataFilters'
import type {
  RBACApiScope,
  RBACApiGroup,
  RBACApiRole,
  RBACPermission,
  ScopeUser,
  ScopeCreateBody,
  GroupCreateBody,
  GroupUpdateBody,
  ScopeUserCreateBody,
  ScopeUserUpdateBody,
  RoleCreateBody,
  ScopeChildListResponse,
  ScopeParentRef,
  PermissionsListResponse,
  ScopeType,
} from '../types/rbacApi'

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

export type PingResult =
  | { ok: true }
  | { ok: false; reason: 'auth'; status: number }
  | { ok: false; reason: 'network' }
  | { ok: false; reason: 'no-token' }

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
  private activeGroupId: string | null = null
  private onStaleGroup: (() => void) | null = null
  private staleGroupCooldown = false

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
  }
  
  /**
   * Disable dry-run mode - resume normal API calls
   */
  static disableDryRun(): void {
    ApiService.dryRunMode = false
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
    _method: string,
    _url: string,
    _body?: any,
    _operationName?: string
  ): void {
    // Dry-run: no logging
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
   * Set the active RBAC group ID. When set, all ESP requests
   * include the x-adobe-esp-group-id header (unless skipGroupHeader is used).
   */
  setGroupId(groupId: string | null): void {
    this.activeGroupId = groupId
    // Keep requestHelpers in sync for XHR-based uploads
    setUploadGroupId(groupId)
  }

  getGroupId(): string | null {
    return this.activeGroupId
  }

  /**
   * Register a callback for stale-group 403 recovery.
   * GroupContext uses this to auto-refresh groups on permission errors.
   */
  setOnStaleGroup(callback: (() => void) | null): void {
    this.onStaleGroup = callback
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

  async getAllEventSessions(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/sessions?eventId=${encodeURIComponent(eventId)}`, 'GET', undefined, {
      operationName: 'getAllEventSessions',
      shouldReturnFullResponse: true,
    })
  }

  async getSingleSession(id: string): Promise<any | ErrorResponse> {
    validateString(id, 'session ID')
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(id)}`, 'GET', undefined, {
      operationName: 'getSingleSession',
      shouldReturnFullResponse: true,
    })
  }

  async createSession(eventId: string, data: Record<string, unknown>): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(data, 'session data')
    const sessionCode = (String(data.name ?? '').replace(/\s+/g, '-').toLowerCase()).substring(0, 50) || 'session'
    const tagsStr = typeof data.tags === 'string' ? data.tags.trim() : ''
    const body: Record<string, unknown> = {
      eventId,
      enTitle: data.name ?? '',
      title: data.name ?? '',
      description: data.description ?? '',
      sessionCode,
      sessionType: 'Session',
      published: false,
    }
    if (tagsStr.length > 0) {
      body.tags = tagsStr
    }
    return this.callExternalApi('esp', '/v1/sessions', 'POST', body, {
      operationName: 'createSession',
      shouldReturnFullResponse: true,
    })
  }

  async updateSession(id: string, eventId: string, data: Record<string, unknown>): Promise<any | ErrorResponse> {
    validateString(id, 'session ID')
    validateString(eventId, 'event ID')
    validateObject(data, 'session data')
    const sessionCode = (String(data.name ?? '').replace(/\s+/g, '-').toLowerCase()).substring(0, 50) || 'session'
    const now = Date.now()
    const tagsStr = typeof data.tags === 'string' ? data.tags.trim() : ''
    const body: Record<string, unknown> = {
      sessionId: id,
      eventId,
      enTitle: data.name ?? '',
      title: data.name ?? '',
      description: data.description ?? '',
      sessionCode,
      sessionType: 'Session',
      published: false,
      creationTime: (data.creationTime as number) ?? now,
      modificationTime: (data.modificationTime as number) ?? now,
    }
    if (tagsStr.length > 0) {
      body.tags = tagsStr
    }
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(id)}`, 'PUT', body, {
      operationName: 'updateSession',
      shouldReturnFullResponse: true,
    })
  }

  async deleteSession(id: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(id, 'session ID')
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(id)}`, 'DELETE', undefined, {
      operationName: 'deleteSession',
    })
  }

  // Session Time APIs

  async getSessionTimes(sessionId?: string): Promise<any | ErrorResponse> {
    const endpoint = sessionId
      ? `/v1/session-times?sessionId=${encodeURIComponent(sessionId)}`
      : '/v1/session-times'
    return this.callExternalApi('esp', endpoint, 'GET', undefined, {
      operationName: 'getSessionTimes',
      shouldReturnFullResponse: true,
    })
  }

  async getSessionTime(id: string): Promise<any | ErrorResponse> {
    validateString(id, 'session time ID')
    return this.callExternalApi('esp', `/v1/session-times/${encodeURIComponent(id)}`, 'GET', undefined, {
      operationName: 'getSessionTime',
      shouldReturnFullResponse: true,
    })
  }

  async createSessionTime(data: Record<string, unknown>): Promise<any | ErrorResponse> {
    validateObject(data, 'session time data')
    return this.callExternalApi('esp', '/v1/session-times', 'POST', data, {
      operationName: 'createSessionTime',
      shouldReturnFullResponse: true,
    })
  }

  async updateSessionTime(id: string, data: Record<string, unknown>): Promise<any | ErrorResponse> {
    validateString(id, 'session time ID')
    validateObject(data, 'session time data')
    const now = Date.now()
    const body = {
      ...data,
      sessionTimeId: id,
      creationTime: (data.creationTime as number) ?? now,
      modificationTime: (data.modificationTime as number) ?? now,
    }
    return this.callExternalApi('esp', `/v1/session-times/${encodeURIComponent(id)}`, 'PUT', body, {
      operationName: 'updateSessionTime',
      shouldReturnFullResponse: true,
    })
  }

  async deleteSessionTime(id: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(id, 'session time ID')
    return this.callExternalApi('esp', `/v1/session-times/${encodeURIComponent(id)}`, 'DELETE', undefined, {
      operationName: 'deleteSessionTime',
    })
  }

  /** GET /v1/session-times/{timeId}/attendees */
  async getSessionTimeAttendees(timeId: string): Promise<any | ErrorResponse> {
    validateString(timeId, 'session time ID')
    return this.callExternalApi('esp', `/v1/session-times/${encodeURIComponent(timeId)}/attendees`, 'GET', undefined, {
      operationName: 'getSessionTimeAttendees',
      shouldReturnFullResponse: true,
    })
  }

  /** GET /v1/sessions/{sessionId}/speakers */
  async getSessionSpeakers(sessionId: string): Promise<any | ErrorResponse> {
    validateString(sessionId, 'session ID')
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(sessionId)}/speakers`, 'GET', undefined, {
      operationName: 'getSessionSpeakers',
      shouldReturnFullResponse: true,
    })
  }

  /** POST /v1/sessions/{sessionId}/speakers - body: { speakerId, speakerType (PascalCase), ordinal } */
  async addSessionSpeaker(
    sessionId: string,
    body: { speakerId: string; speakerType: string; ordinal: number }
  ): Promise<any | ErrorResponse> {
    validateString(sessionId, 'session ID')
    validateObject(body, 'speaker data')
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(sessionId)}/speakers`, 'POST', body, {
      operationName: 'addSessionSpeaker',
      shouldReturnFullResponse: true,
    })
  }

  /** PUT /v1/sessions/{sessionId}/speakers/{speakerId} - body: { speakerId, speakerType, ordinal, modificationTime } */
  async updateSessionSpeaker(
    sessionId: string,
    speakerId: string,
    body: { speakerId: string; speakerType: string; ordinal: number; modificationTime: number }
  ): Promise<any | ErrorResponse> {
    validateString(sessionId, 'session ID')
    validateString(speakerId, 'speaker ID')
    validateObject(body, 'speaker data')
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(sessionId)}/speakers/${encodeURIComponent(speakerId)}`, 'PUT', body, {
      operationName: 'updateSessionSpeaker',
      shouldReturnFullResponse: true,
    })
  }

  /** DELETE /v1/sessions/{sessionId}/speakers/{speakerId} */
  async deleteSessionSpeaker(
    sessionId: string,
    speakerId: string
  ): Promise<SuccessResponse | ErrorResponse> {
    validateString(sessionId, 'session ID')
    validateString(speakerId, 'speaker ID')
    return this.callExternalApi('esp', `/v1/sessions/${encodeURIComponent(sessionId)}/speakers/${encodeURIComponent(speakerId)}`, 'DELETE', undefined, {
      operationName: 'deleteSessionSpeaker',
    })
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
   * Get the current auth token.
   * When dev token mode is enabled (?devtokenmode=true on an allowed host): 1) tokenStorage 2) configured headers.
   * Otherwise: only configured headers (IMS from shell/standalone).
   */
  private getAuthToken(): string | null {
    if (env.isDevTokenModeEnabled()) {
      const storedToken = tokenStorage.getValidToken()
      if (storedToken) return storedToken
    }

    const authHeader = this.config.headers?.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7) // Remove "Bearer " prefix
    }

    return null
  }

  /**
   * Get the auth token for use by components that make direct API calls (e.g. uploads, external APIs).
   * Uses the same logic as getAuthToken (dev token only when ?devtokenmode=true).
   */
  getAuthTokenForExternalUse(): string | null {
    return this.getAuthToken()
  }

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
      skipGroupHeader?: boolean
    }
  ): Promise<T | ErrorResponse> {
    const operationName = options?.operationName || `${method} ${endpoint}`
    const token = this.getAuthToken()
    
    if (!token) {
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
      // RequestHeaders interface is narrower than Record<string,string>; widen for dynamic header injection below
      const headers: Record<string, string> = constructRequestHeaders(token, method) as unknown as Record<string, string>

      // Inject RBAC group header for ESP requests
      if (this.activeGroupId && !options?.skipGroupHeader) {
        headers['x-adobe-esp-group-id'] = this.activeGroupId
      }

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

        // Stale-group recovery: 403 likely means the user's group membership changed.
        // Cooldown prevents infinite loops (e.g. if getRoleById also returns 403).
        if (response.status === 403 && this.onStaleGroup && !this.staleGroupCooldown) {
          this.staleGroupCooldown = true
          setTimeout(() => { this.staleGroupCooldown = false }, 5000)
          this.onStaleGroup()
        }

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

  /**
   * Fetch all pages of a paginated list endpoint.
   * Uses iterative loop (not recursion) to avoid stack overflow.
   * Backend returns nextPageToken in response; pass it back as next-page-token (kebab-case) URL param.
   */
  private async fetchAllPages<T = any>(options: {
    service: 'esp' | 'esl'
    baseEndpoint: string
    listKey: string
    baseParams?: Record<string, string>
    operationName?: string
    maxPages?: number
    skipGroupHeader?: boolean
  }): Promise<T[] | ErrorResponse> {
    const {
      service,
      baseEndpoint,
      listKey,
      baseParams = {},
      operationName = `fetchAllPages(${baseEndpoint})`,
      maxPages = 100,
      skipGroupHeader
    } = options

    const items: T[] = []
    let nextPageToken: string | null = null
    let pageCount = 0

    while (pageCount < maxPages) {
      const params = new URLSearchParams(baseParams)
      if (nextPageToken) {
        params.set('next-page-token', nextPageToken)
      }
      const queryString = params.toString()
      const endpoint = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint

      const result = await this.callExternalApi<any>(service, endpoint, 'GET', undefined, {
        operationName: `${operationName} (page ${pageCount + 1})`,
        shouldReturnFullResponse: true,
        skipGroupHeader
      })

      if ('error' in result) {
        return result
      }

      const pageItems = result[listKey]
      if (Array.isArray(pageItems)) {
        items.push(...pageItems)
      }

      nextPageToken = result.nextPageToken || null
      if (!nextPageToken) {
        break
      }
      pageCount++
    }

    if (pageCount >= maxPages && nextPageToken) {
      // Hit maxPages limit - some data may be truncated
    }

    return items
  }

  // ============================================================================
  // SERIES EXTERNAL APIs
  // ============================================================================

  /**
   * Get series list from ESP API with token authentication
   */
  async getSeriesList(): Promise<SeriesApiResponse[]> {
    const token = this.getAuthToken()

    if (!token) {
      return []
    }

    const result = await this.fetchAllPages<SeriesApiResponse>({
      service: 'esp',
      baseEndpoint: '/v1/series',
      listKey: 'series',
      operationName: 'getSeriesList'
    })

    if ('error' in result) {
      console.error(`❌ API Error:`, result)
      throw new Error(`API returned ${result.status}`)
    }

    return result
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
   * Fetch series history in batch for enrichment
   */
  async getSeriesHistoryBatch(seriesIds: string[]): Promise<Map<string, EventHistoryResponse>> {
    const token = this.getAuthToken()
    const results = new Map<string, EventHistoryResponse>()
    
    if (!token) {
      return results
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      if (this.activeGroupId) {
        (headers as any)['x-adobe-esp-group-id'] = this.activeGroupId
      }
      const host = getApiHost('esp', env)

      const promises = seriesIds.map(async (seriesId) => {
        try {
          const url = `${host}/v1/series/${seriesId}/history`
          const response = await safeFetch(url, {
            method: 'GET',
            headers: headers as any
          })

          if (response.ok) {
            const data = await response.json()
            return { seriesId, history: data }
          }
          return null
        } catch (error) {
          console.error(`Error fetching series history ${seriesId}:`, error)
          return null
        }
      })

      const responses = await Promise.all(promises)
      responses.forEach((result) => {
        if (result) {
          results.set(result.seriesId, result.history)
        }
      })
    } catch (error) {
      console.error('Error fetching series history batch:', error)
    }

    return results
  }

  /**
   * Fetch series details for enrichment
   */
  async getSeriesBatch(seriesIds: string[]): Promise<Map<string, SeriesApiResponse>> {
    const token = this.getAuthToken()
    const results = new Map<string, SeriesApiResponse>()
    
    if (!token) {
      return results
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      if (this.activeGroupId) {
        (headers as any)['x-adobe-esp-group-id'] = this.activeGroupId
      }
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
   * Get events list from ESP API with token authentication
   */
  async getEventsList(): Promise<EventApiResponse[]> {
    const token = this.getAuthToken()

    if (!token) {
      return []
    }

    const result = await this.fetchAllPages<EventApiResponse>({
      service: 'esp',
      baseEndpoint: '/v1/events',
      listKey: 'events',
      operationName: 'getEventsList'
    })

    if ('error' in result) {
      console.error(`❌ API Error:`, result)
      throw new Error(`API returned ${result.status}`)
    }

    return result
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
    const body = prepareEslEventPutPayload(payload)
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...body, ...policies },
      { operationName: `updateEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  async publishEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    const body = prepareEslEventPutPayload(payload)
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...body, published: true, liveUpdate: true, forceSpWrite: false },
      { operationName: `publishEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  async unpublishEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    const body = prepareEslEventPutPayload(payload)
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...body, published: false, liveUpdate: true, forceSpWrite: false },
      { operationName: `unpublishEvent(${eventId})`, shouldReturnFullResponse: true }
    )
  }

  async previewEvent(eventId: string, payload: any): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'event payload')
    const body = prepareEslEventPutPayload(payload)
    return this.callExternalApi('esl', `/v1/events/${eventId}`, 'PUT',
      { ...body, liveUpdate: false, forceSpWrite: true },
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

    const token = this.getAuthToken()
    if (!token) {
      return { status: 'No Token', error: 'No valid authentication token' }
    }

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      if (this.activeGroupId) {
        (headers as any)['x-adobe-esp-group-id'] = this.activeGroupId
      }
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
            } catch (_err) {
              // Hydration failed - use event-level data
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
            } catch (_err) {
              // Hydration failed - use event-level data
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
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/events/${eventId}/images`,
      listKey: 'images',
      operationName: 'getEventImages'
    })
    if ('error' in result) return result
    return { images: result }
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
    const token = this.getAuthToken()
    const results = new Map<string, EventApiResponse>()
    
    if (!token) return results

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      if (this.activeGroupId) {
        (headers as any)['x-adobe-esp-group-id'] = this.activeGroupId
      }
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
    const token = this.getAuthToken()
    const results = new Map<string, Venue[]>()
    
    if (!token) return results

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      if (this.activeGroupId) {
        (headers as any)['x-adobe-esp-group-id'] = this.activeGroupId
      }
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
    const token = this.getAuthToken()
    const results = new Map<string, EventHistoryResponse>()
    
    if (!token) return results

    try {
      const env = getCurrentEnvironment()
      const headers = constructRequestHeaders(token, 'GET')
      if (this.activeGroupId) {
        (headers as any)['x-adobe-esp-group-id'] = this.activeGroupId
      }
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
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/series/${seriesId}/speakers`,
      listKey: 'speakers',
      operationName: 'getSpeakers'
    })
    if ('error' in result) return result
    return { speakers: result }
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
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/events/${eventId}/speakers`,
      listKey: 'speakers',
      operationName: 'getEventSpeakers'
    })
    if ('error' in result) return result
    return { speakers: result }
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
      (body, dependentData) => ({
        speakerId: body.speakerId ?? dependentData.speakerId,
        speakerType: body.speakerType ?? dependentData.speakerType,
        ordinal: body.ordinal ?? dependentData.ordinal,
        creationTime: dependentData.creationTime,
        modificationTime: dependentData.modificationTime,
      }),
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

  /**
   * Delete a speaker from a series
   * Note: This does NOT automatically remove the speaker from events
   */
  async deleteSpeaker(speakerId: string, seriesId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(speakerId, 'speaker ID')
    return this.callExternalApi('esp', `/v1/series/${seriesId}/speakers/${speakerId}`, 'DELETE', undefined,
      { operationName: `deleteSpeaker(${speakerId})` }
    )
  }

  /**
   * Get all events that a speaker is assigned to
   * Uses the /speakers/{speakerId}/events endpoint
   */
  async getEventsBySpeakerId(speakerId: string): Promise<any | ErrorResponse> {
    validateString(speakerId, 'speaker ID')
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/speakers/${speakerId}/events`,
      listKey: 'events',
      operationName: `getEventsBySpeakerId(${speakerId})`
    })
    if ('error' in result) return result
    return { events: result }
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
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/series/${seriesId}/sponsors`,
      listKey: 'sponsors',
      operationName: 'getSponsors'
    })
    if ('error' in result) return result
    return { sponsors: result }
  }

  async addSponsorToEvent(sponsorData: any, eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(sponsorData, 'sponsor data')
    return this.callExternalApi('esp', `/v1/events/${eventId}/sponsors`, 'POST', sponsorData,
      { operationName: 'addSponsorToEvent', shouldReturnFullResponse: true }
    )
  }

  async getEventSponsors(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/events/${eventId}/sponsors`,
      listKey: 'sponsors',
      operationName: 'getEventSponsors'
    })
    if ('error' in result) return result
    return { sponsors: result }
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

  async deleteSponsorImage(seriesId: string, sponsorId: string, imageId: string): Promise<any | ErrorResponse> {
    validateString(seriesId, 'series ID')
    validateString(sponsorId, 'sponsor ID')
    validateString(imageId, 'image ID')
    return this.callExternalApi(
      'esp',
      `/v1/series/${seriesId}/sponsors/${sponsorId}/images/${imageId}`,
      'DELETE',
      undefined,
      { operationName: 'deleteSponsorImage', shouldReturnFullResponse: true }
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

  async listVenueLocations(venueId: string): Promise<any | ErrorResponse> {
    validateString(venueId, 'venue ID')
    return this.callExternalApi('esp', `/v1/venues/${encodeURIComponent(venueId)}/locations`, 'GET', undefined,
      { operationName: 'listVenueLocations', shouldReturnFullResponse: true }
    )
  }

  async createVenueLocation(venueId: string, locationData: any): Promise<any | ErrorResponse> {
    validateString(venueId, 'venue ID')
    validateObject(locationData, 'location data')
    return this.callExternalApi('esp', `/v1/venues/${encodeURIComponent(venueId)}/locations`, 'POST', locationData,
      { operationName: 'createVenueLocation', shouldReturnFullResponse: true }
    )
  }

  async deleteVenueLocation(venueId: string, locationId: string): Promise<any | ErrorResponse> {
    validateString(venueId, 'venue ID')
    validateString(locationId, 'location ID')
    return this.callExternalApi('esp', `/v1/venues/${encodeURIComponent(venueId)}/locations/${encodeURIComponent(locationId)}`, 'DELETE', undefined,
      { operationName: 'deleteVenueLocation' }
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
    const result = await this.fetchAllPages<any>({
      service: 'esp',
      baseEndpoint: `/v1/events/${eventId}/attendees`,
      listKey: 'attendees',
      operationName: 'getEventAttendees'
    })
    if ('error' in result) return result
    return { attendees: result }
  }

  async getAttendee(eventId: string, attendeeId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(attendeeId, 'attendee ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/attendees/${attendeeId}`, 'GET', undefined,
      { operationName: 'getAttendee', shouldReturnFullResponse: true }
    )
  }

  /**
   * Get all event attendees with pagination.
   *
   * The GET attendees endpoint does not return registrationStatus on each
   * attendee object. Instead, the `?type=` query param filters by registration
   * type. We query `type=registered`, `type=waitlisted`, and `type=declined`,
   * hydrate each attendee with the appropriate registrationStatus, and merge
   * the results.
   */
  async getAllEventAttendees(eventId: string): Promise<any[] | ErrorResponse> {
    validateString(eventId, 'event ID')

    const fetchByType = async (type: 'registered' | 'waitlisted' | 'declined'): Promise<any[] | ErrorResponse> => {
      const result = await this.fetchAllPages<any>({
        service: 'esp',
        baseEndpoint: `/v1/events/${eventId}/attendees`,
        listKey: 'attendees',
        baseParams: { type },
        operationName: `getAllEventAttendees (type=${type})`
      })

      if ('error' in result) {
        return result
      }

      return result.map((attendee: any) => ({
        ...attendee,
        registrationStatus: type
      }))
    }

    const [registered, waitlisted, declined] = await Promise.all([
      fetchByType('registered'),
      fetchByType('waitlisted'),
      fetchByType('declined')
    ])

    // If all errored, return the first error
    if ('error' in registered && 'error' in waitlisted && 'error' in declined) {
      return registered
    }

    const registeredList = 'error' in registered ? [] : registered
    const waitlistedList = 'error' in waitlisted ? [] : waitlisted
    const declinedList = 'error' in declined ? [] : declined

    return registeredList.concat(waitlistedList).concat(declinedList)
  }

  // ============================================================================
  // HEALTH / PING
  // ============================================================================

  /**
   * Ping ESP to verify API reachability and token validity.
   * Uses GET /v1/users/me/groups which validates the token and confirms
   * the user exists in the RBAC system without requiring any group header.
   */
  async pingEsp(): Promise<PingResult> {
    const token = this.getAuthToken()
    if (!token) {
      return { ok: false, reason: 'no-token' }
    }

    try {
      const result = await this.callExternalApi('esp', '/v1/users/me/groups', 'GET', undefined,
        { operationName: 'pingEsp (via groups)', shouldReturnFullResponse: true }
      )
      if ('error' in result) {
        const status = typeof result.status === 'number' ? result.status : 0
        if (status === 401 || status === 403) {
          return { ok: false, reason: 'auth', status }
        }
        return { ok: false, reason: 'network' }
      }
      return { ok: true }
    } catch {
      return { ok: false, reason: 'network' }
    }
  }

  // ============================================================================
  // CLOUD & LOCALE APIs
  // ============================================================================

  async getLocales(): Promise<any | ErrorResponse> {
    return this.callExternalApi('esp', '/v1/locales', 'GET', undefined,
      { operationName: 'getLocales', shouldReturnFullResponse: true }
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
    const token = this.getAuthToken()
    
    if (!token) {
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
      if (this.activeGroupId) {
        xhr.setRequestHeader('x-adobe-esp-group-id', this.activeGroupId)
      }

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
    return this.callExternalApi('esp', '/v1/publishing-profiles', 'POST',
      { ...profileData, status: 'active' },
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

    // Always use the server's current modificationTime so PUT succeeds (stale client ref or
    // cached GET responses otherwise cause 409 conflict).
    const latest = await this.getPublishingProfile(profileId)
    let modificationTime = profileData.modificationTime
    if (
      latest &&
      typeof latest === 'object' &&
      !('error' in latest) &&
      typeof (latest as { modificationTime?: unknown }).modificationTime === 'number'
    ) {
      modificationTime = (latest as { modificationTime: number }).modificationTime
    }

    return this.callExternalApi('esp', `/v1/publishing-profiles/${profileId}`, 'PUT',
      { ...profileData, profileId, status: 'active', modificationTime },
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

  // --------------------------------------------------------------------------
  // Campaigns
  // --------------------------------------------------------------------------

  async getEventCampaigns(eventId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/campaigns`, 'GET', undefined,
      { operationName: 'getEventCampaigns', shouldReturnFullResponse: true }
    )
  }

  async getCampaign(eventId: string, campaignId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(campaignId, 'campaign ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/campaigns/${campaignId}`, 'GET', undefined,
      { operationName: 'getCampaign', shouldReturnFullResponse: true }
    )
  }

  async createCampaign(eventId: string, payload: Record<string, unknown>): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateObject(payload, 'campaign payload')
    return this.callExternalApi('esp', `/v1/events/${eventId}/campaigns`, 'POST', payload,
      { operationName: 'createCampaign', shouldReturnFullResponse: true }
    )
  }

  async updateCampaign(eventId: string, campaignId: string, payload: Record<string, unknown>): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(campaignId, 'campaign ID')
    validateObject(payload, 'campaign payload')
    return this.callExternalApi('esp', `/v1/events/${eventId}/campaigns/${campaignId}`, 'PUT', payload,
      { operationName: 'updateCampaign', shouldReturnFullResponse: true }
    )
  }

  async deleteCampaign(eventId: string, campaignId: string): Promise<any | ErrorResponse> {
    validateString(eventId, 'event ID')
    validateString(campaignId, 'campaign ID')
    return this.callExternalApi('esp', `/v1/events/${eventId}/campaigns/${campaignId}`, 'DELETE', undefined,
      { operationName: 'deleteCampaign', shouldReturnFullResponse: true }
    )
  }

  // ============================================================================
  // RBAC EXTERNAL APIs (Scopes, Groups, Roles, Permissions)
  // ============================================================================

  /**
   * Get the current user's group memberships.
   * This endpoint does NOT require x-adobe-esp-group-id.
   */
  async getMyGroups(): Promise<RBACApiGroup[] | ErrorResponse> {
    return this.fetchAllPages<RBACApiGroup>({
      service: 'esp',
      baseEndpoint: '/v1/users/me/groups',
      listKey: 'groups',
      operationName: 'getMyGroups',
      skipGroupHeader: true
    })
  }

  // --- Scopes ---

  async getScopes(type?: string): Promise<RBACApiScope[] | ErrorResponse> {
    const baseParams: Record<string, string> = {}
    if (type) baseParams.type = type
    return this.fetchAllPages<RBACApiScope>({
      service: 'esp',
      baseEndpoint: '/v1/scopes',
      listKey: 'scopes',
      baseParams,
      operationName: 'getScopes'
    })
  }

  async getScopeById(scopeId: string): Promise<RBACApiScope | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    return this.callExternalApi<RBACApiScope>('esp', `/v1/scopes/${scopeId}`, 'GET', undefined, {
      operationName: 'getScopeById',
      shouldReturnFullResponse: true
    })
  }

  async createScope(data: ScopeCreateBody): Promise<RBACApiScope | ErrorResponse> {
    validateObject(data, 'scope create body')
    return this.callExternalApi<RBACApiScope>('esp', '/v1/scopes', 'POST', data, {
      operationName: 'createScope',
      shouldReturnFullResponse: true
    })
  }

  async updateScope(scopeId: string, data: RBACApiScope): Promise<RBACApiScope | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateObject(data, 'scope update body')
    return this.callExternalApi<RBACApiScope>('esp', `/v1/scopes/${scopeId}`, 'PUT', data, {
      operationName: 'updateScope',
      shouldReturnFullResponse: true
    })
  }

  async deleteScope(scopeId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    return this.callExternalApi('esp', `/v1/scopes/${scopeId}`, 'DELETE', undefined, {
      operationName: 'deleteScope'
    })
  }

  async getScopeChildren(scopeId: string): Promise<ScopeChildListResponse | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    return this.callExternalApi<ScopeChildListResponse>('esp', `/v1/scopes/${scopeId}/children`, 'GET', undefined, {
      operationName: 'getScopeChildren',
      shouldReturnFullResponse: true
    })
  }

  async getScopeParent(scopeId: string): Promise<ScopeParentRef | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    return this.callExternalApi<ScopeParentRef>('esp', `/v1/scopes/${scopeId}/parent`, 'GET', undefined, {
      operationName: 'getScopeParent',
      shouldReturnFullResponse: true
    })
  }

  // --- Groups within a Scope ---

  async getGroupsForScope(scopeId: string): Promise<RBACApiGroup[] | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    return this.fetchAllPages<RBACApiGroup>({
      service: 'esp',
      baseEndpoint: `/v1/scopes/${scopeId}/groups`,
      listKey: 'groups',
      operationName: 'getGroupsForScope'
    })
  }

  async getGroupById(scopeId: string, groupId: string): Promise<RBACApiGroup | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    return this.callExternalApi<RBACApiGroup>('esp', `/v1/scopes/${scopeId}/groups/${groupId}`, 'GET', undefined, {
      operationName: 'getGroupById',
      shouldReturnFullResponse: true
    })
  }

  async createGroup(scopeId: string, data: GroupCreateBody): Promise<RBACApiGroup | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateObject(data, 'group create body')
    return this.callExternalApi<RBACApiGroup>('esp', `/v1/scopes/${scopeId}/groups`, 'POST', data, {
      operationName: 'createGroup',
      shouldReturnFullResponse: true
    })
  }

  async updateGroup(scopeId: string, groupId: string, data: GroupUpdateBody): Promise<RBACApiGroup | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    validateObject(data, 'group update body')
    return this.callExternalApi<RBACApiGroup>('esp', `/v1/scopes/${scopeId}/groups/${groupId}`, 'PUT', data, {
      operationName: 'updateGroup',
      shouldReturnFullResponse: true
    })
  }

  async deleteGroup(scopeId: string, groupId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    return this.callExternalApi('esp', `/v1/scopes/${scopeId}/groups/${groupId}`, 'DELETE', undefined, {
      operationName: 'deleteGroup'
    })
  }

  // --- Users within a Group ---

  async getGroupUsers(scopeId: string, groupId: string): Promise<ScopeUser[] | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    return this.fetchAllPages<ScopeUser>({
      service: 'esp',
      baseEndpoint: `/v1/scopes/${scopeId}/groups/${groupId}/users`,
      listKey: 'users',
      operationName: 'getGroupUsers'
    })
  }

  async addGroupUser(scopeId: string, groupId: string, data: ScopeUserCreateBody): Promise<ScopeUser | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    validateObject(data, 'user create body')
    return this.callExternalApi<ScopeUser>('esp', `/v1/scopes/${scopeId}/groups/${groupId}/users`, 'POST', data, {
      operationName: 'addGroupUser',
      shouldReturnFullResponse: true
    })
  }

  async updateGroupUser(scopeId: string, groupId: string, email: string, data: ScopeUserUpdateBody): Promise<ScopeUser | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    validateString(email, 'email')
    validateObject(data, 'user update body')
    return this.callExternalApi<ScopeUser>('esp', `/v1/scopes/${scopeId}/groups/${groupId}/users/${encodeURIComponent(email)}`, 'PUT', data, {
      operationName: 'updateGroupUser',
      shouldReturnFullResponse: true
    })
  }

  async removeGroupUser(scopeId: string, groupId: string, email: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(scopeId, 'scope ID')
    validateString(groupId, 'group ID')
    validateString(email, 'email')
    return this.callExternalApi('esp', `/v1/scopes/${scopeId}/groups/${groupId}/users/${encodeURIComponent(email)}`, 'DELETE', undefined, {
      operationName: 'removeGroupUser'
    })
  }

  // --- Roles ---

  async getRoles(scopeType?: ScopeType): Promise<RBACApiRole[] | ErrorResponse> {
    return this.fetchAllPages<RBACApiRole>({
      service: 'esp',
      baseEndpoint: '/v1/roles',
      listKey: 'roles',
      baseParams: scopeType ? { 'scope-type': scopeType } : undefined,
      operationName: 'getRoles'
    })
  }

  async getRoleById(roleId: string): Promise<RBACApiRole | ErrorResponse> {
    validateString(roleId, 'role ID')
    return this.callExternalApi<RBACApiRole>('esp', `/v1/roles/${roleId}`, 'GET', undefined, {
      operationName: 'getRoleById',
      shouldReturnFullResponse: true
    })
  }

  async createRole(data: RoleCreateBody): Promise<RBACApiRole | ErrorResponse> {
    validateObject(data, 'role create body')
    return this.callExternalApi<RBACApiRole>('esp', '/v1/roles', 'POST', data, {
      operationName: 'createRole',
      shouldReturnFullResponse: true
    })
  }

  async updateRole(roleId: string, data: RBACApiRole): Promise<RBACApiRole | ErrorResponse> {
    validateString(roleId, 'role ID')
    validateObject(data, 'role update body')
    return this.callExternalApi<RBACApiRole>('esp', `/v1/roles/${roleId}`, 'PUT', data, {
      operationName: 'updateRole',
      shouldReturnFullResponse: true
    })
  }

  async deleteRole(roleId: string): Promise<SuccessResponse | ErrorResponse> {
    validateString(roleId, 'role ID')
    return this.callExternalApi('esp', `/v1/roles/${roleId}`, 'DELETE', undefined, {
      operationName: 'deleteRole'
    })
  }

  async getRoleGroups(roleId: string): Promise<RBACApiGroup[] | ErrorResponse> {
    validateString(roleId, 'role ID')
    return this.fetchAllPages<RBACApiGroup>({
      service: 'esp',
      baseEndpoint: `/v1/roles/${roleId}/groups`,
      listKey: 'groups',
      operationName: 'getRoleGroups'
    })
  }

  async getPermissionsList(): Promise<RBACPermission[] | ErrorResponse> {
    const result = await this.callExternalApi<PermissionsListResponse>('esp', '/v1/roles/permissions', 'GET', undefined, {
      operationName: 'getPermissionsList',
      shouldReturnFullResponse: true
    })
    if ('error' in result) return result
    return result.permissions
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiService = new ApiService()
export default apiService

// ============================================================================
// CACHED API SERVICE
// ============================================================================

/**
 * Cached API Service - Wraps apiService with automatic caching and request deduplication
 * 
 * Uses the apiCache pattern from throttling.md:
 * - 10-second cache for GET requests (configurable via apiCache.setCacheTimeout)
 * - Request deduplication (multiple simultaneous calls = 1 API request)
 * - Pattern-based cache invalidation on mutations
 * 
 * Benefits:
 * - Multiple simultaneous calls = 1 API request (request deduplication)
 * - 10-second cache for GET requests
 * - Smart cache invalidation on mutations
 * 
 * @example
 * // Use for dashboard data loading
 * const events = await cachedApi.getEventsList()
 * const series = await cachedApi.getSeriesList()
 * 
 * // After mutations, cache is automatically invalidated
 * await cachedApi.deleteEvent(eventId) // Invalidates events cache
 */
export const cachedApi = {
  // === SERIES (GET Operations - Cached with Deduplication) ===
  getSeriesList: async () => {
    const result = await apiCache.get(() => apiService.getSeriesList())
    return deduplicateBy(result, (s) => s.seriesId, { 
      warnOnDuplicates: true, 
      logPrefix: 'cachedApi.getSeriesList' 
    })
  },
  getSeriesById: (id: string) => apiCache.get((seriesId: string) => apiService.getSeriesByIdExternal(seriesId), id),
  getSeriesFull: (id: string) => apiCache.get((seriesId: string) => apiService.getSeriesByIdExternal(seriesId), id),
  getSeriesHistory: (id: string) => apiCache.get((seriesId: string) => apiService.getSeriesHistory(seriesId), id),
  getSeriesHistoryBatch: async (ids: string[]) => {
    const result = await apiCache.get((seriesIds: string[]) => apiService.getSeriesHistoryBatch(seriesIds), ids)
    // Result is a Map<seriesId, EventHistoryResponse>, return as-is
    return result
  },
  getSeriesBatch: async (ids: string[]) => {
    const result = await apiCache.get((seriesIds: string[]) => apiService.getSeriesBatch(seriesIds), ids)
    // Result is a Map, convert to array for deduplication
    if (result instanceof Map) {
      const array = Array.from(result.values())
      return new Map(deduplicateBy(array, (s: any) => s.seriesId, { warnOnDuplicates: true }).map(s => [s.seriesId, s]))
    }
    return result
  },

  // === EVENTS (GET Operations - Cached with Deduplication) ===
  getEventsList: async () => {
    const result = await apiCache.get(() => apiService.getEventsList())
    return deduplicateBy(result, (e) => e.eventId, { 
      warnOnDuplicates: true, 
      logPrefix: 'cachedApi.getEventsList' 
    })
  },
  getEvent: (id: string) => apiCache.get((eventId: string) => apiService.getEventExternal(eventId), id),
  getEventFull: (id: string) => apiCache.get((eventId: string) => apiService.getEventFull(eventId), id),
  getEventImages: (id: string) => apiCache.get((eventId: string) => apiService.getEventImages(eventId), id),
  getEventImagesBatch: async (ids: string[]) => {
    const result = await apiCache.get((eventIds: string[]) => apiService.getEventImagesBatch(eventIds), ids)
    // Result is a Map, convert to array for deduplication
    if (result instanceof Map) {
      const array = Array.from(result.values())
      return new Map(deduplicateBy(array, (e: any) => e.eventId, { warnOnDuplicates: true }).map(e => [e.eventId, e]))
    }
    return result
  },
  getEventVenuesBatch: async (ids: string[]) => {
    const result = await apiCache.get((eventIds: string[]) => apiService.getEventVenuesBatch(eventIds), ids)
    // Result is a Map, return as-is (venues are already keyed by eventId)
    return result
  },
  getEventHistory: (id: string) => apiCache.get((eventId: string) => apiService.getEventHistory(eventId), id),
  getEventHistoryBatch: async (ids: string[]) => {
    const result = await apiCache.get((eventIds: string[]) => apiService.getEventHistoryBatch(eventIds), ids)
    // Result is a Map<eventId, EventHistoryResponse>, return as-is
    return result
  },

  // === SPEAKERS (GET Operations - Cached with Deduplication) ===
  getSpeakers: async (seriesId: string) => {
    const result = await apiCache.get((id: string) => apiService.getSpeakers(id), seriesId)
    if (result.speakers && Array.isArray(result.speakers)) {
      result.speakers = deduplicateBy(result.speakers, (s: any) => s.speakerId, { warnOnDuplicates: true })
    }
    return result
  },
  getSpeaker: (seriesId: string, speakerId: string) => apiCache.get((sId: string, spId: string) => apiService.getSpeaker(sId, spId), seriesId, speakerId),
  getEventSpeakers: async (eventId: string) => {
    const result = await apiCache.get((id: string) => apiService.getEventSpeakers(id), eventId)
    if (result.speakers && Array.isArray(result.speakers)) {
      result.speakers = deduplicateBy(result.speakers, (s: any) => s.speakerId, { warnOnDuplicates: true })
    }
    return result
  },
  getEventsBySpeakerId: (speakerId: string) => apiCache.get((id: string) => apiService.getEventsBySpeakerId(id), speakerId),

  // === ATTENDEES (GET Operations - Cached with Deduplication) ===
  getEventAttendees: async (eventId: string) => {
    const result = await apiCache.get((id: string) => apiService.getEventAttendees(id), eventId)
    if (result.attendees && Array.isArray(result.attendees)) {
      result.attendees = deduplicateBy(result.attendees, (a: any) => a.attendeeId, { 
        warnOnDuplicates: true,
        logPrefix: 'cachedApi.getEventAttendees'
      })
    }
    return result
  },
  getAllEventAttendees: async (eventId: string) => {
    const result = await apiCache.get((id: string) => apiService.getAllEventAttendees(id), eventId)
    if (!Array.isArray(result)) {
      console.error('[cachedApi.getAllEventAttendees] Expected array, got:', typeof result)
      return []
    }
    return deduplicateBy(result, (a: any) => a.attendeeId, { 
      warnOnDuplicates: true,
      logPrefix: 'cachedApi.getAllEventAttendees'
    })
  },
  getAttendee: (eventId: string, attendeeId: string) => apiCache.get((eId: string, aId: string) => apiService.getAttendee(eId, aId), eventId, attendeeId),

  // === SPONSORS (GET Operations - Cached with Deduplication) ===
  getSponsors: async (seriesId: string) => {
    const result = await apiCache.get((id: string) => apiService.getSponsors(id), seriesId)
    if (result.sponsors && Array.isArray(result.sponsors)) {
      result.sponsors = deduplicateBy(result.sponsors, (s: any) => s.sponsorId, { warnOnDuplicates: true })
    }
    return result
  },
  getSponsor: (seriesId: string, sponsorId: string) => apiCache.get((sId: string, spId: string) => apiService.getSponsor(sId, spId), seriesId, sponsorId),
  getEventSponsors: async (eventId: string) => {
    const result = await apiCache.get((id: string) => apiService.getEventSponsors(id), eventId)
    if (result.sponsors && Array.isArray(result.sponsors)) {
      result.sponsors = deduplicateBy(result.sponsors, (s: any) => s.sponsorId, { warnOnDuplicates: true })
    }
    return result
  },

  // === OTHER GET Operations (Cached) ===
  getLocales: () => apiCache.get(() => apiService.getLocales()),
  getPublishingProfiles: () => apiCache.get(() => apiService.getPublishingProfiles()),
  getPublishingProfile: (profileId: string) => apiCache.get((id: string) => apiService.getPublishingProfile(id), profileId),
  getEventPublishingProfile: (eventId: string) => apiCache.get((id: string) => apiService.getEventPublishingProfile(id), eventId),
  getCaasTags: () => apiService.getCaasTags(), // Already has internal caching

  // === MUTATIONS (with cache invalidation) ===
  
  // Series Mutations
  async createSeries(data: any) {
    const result = await apiService.createSeriesExternal(data)
    apiCache.invalidate('getSeriesList')
    if (result && typeof result === 'object' && !('error' in result)) {
      const id = (result as { seriesId?: string }).seriesId
      if (id) {
        apiCache.invalidate(id)
      }
    }
    return result
  },
  async updateSeries(seriesId: string, data: any) {
    const result = await apiService.updateSeriesExternal(seriesId, data)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSeriesList')
    return result
  },
  async publishSeries(seriesId: string, data: any) {
    const result = await apiService.publishSeries(seriesId, data)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSeriesList')
    return result
  },
  async unpublishSeries(seriesId: string, data: any) {
    const result = await apiService.unpublishSeries(seriesId, data)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSeriesList')
    return result
  },
  async archiveSeries(seriesId: string, data: any) {
    const result = await apiService.archiveSeries(seriesId, data)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSeriesList')
    return result
  },

  // Event Mutations
  async createEvent(data: any, locale: string) {
    const result = await apiService.createEventExternal(data, locale)
    apiCache.invalidate('getEventsList')
    return result
  },
  async updateEvent(eventId: string, data: any) {
    const result = await apiService.updateEventExternal(eventId, data)
    apiCache.invalidate(eventId)
    apiCache.invalidate('getEventsList')
    return result
  },
  async deleteEvent(eventId: string) {
    const result = await apiService.deleteEventExternal(eventId)
    apiCache.invalidate(eventId)
    apiCache.invalidate('getEventsList')
    return result
  },
  async publishEvent(eventId: string, data: any) {
    const result = await apiService.publishEvent(eventId, data)
    apiCache.invalidate(eventId)
    apiCache.invalidate('getEventsList')
    return result
  },
  async unpublishEvent(eventId: string, data: any) {
    const result = await apiService.unpublishEvent(eventId, data)
    apiCache.invalidate(eventId)
    apiCache.invalidate('getEventsList')
    return result
  },

  // Speaker Mutations
  async createSpeaker(data: any, seriesId: string) {
    const result = await apiService.createSpeaker(data, seriesId)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSpeakers')
    return result
  },
  async updateSpeaker(data: any, seriesId: string) {
    const result = await apiService.updateSpeaker(data, seriesId)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSpeakers')
    if (data.speakerId) apiCache.invalidate(data.speakerId)
    return result
  },
  async deleteSpeaker(speakerId: string, seriesId: string) {
    const result = await apiService.deleteSpeaker(speakerId, seriesId)
    apiCache.invalidate(seriesId)
    apiCache.invalidate(speakerId)
    apiCache.invalidate('getSpeakers')
    return result
  },

  async createSponsor(data: any, seriesId: string, locale: string) {
    const result = await apiService.createSponsor(data, seriesId, locale)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSponsors')
    return result
  },
  async deleteSponsorImage(seriesId: string, sponsorId: string, imageId: string) {
    const result = await apiService.deleteSponsorImage(seriesId, sponsorId, imageId)
    apiCache.invalidate(seriesId)
    apiCache.invalidate('getSponsors')
    return result
  },

  // Attendee Mutations
  async removeAttendeeFromEvent(eventId: string, attendeeId: string) {
    const result = await apiService.removeAttendeeFromEvent(eventId, attendeeId)
    apiCache.invalidate(eventId)
    apiCache.invalidate('getEventAttendees')
    apiCache.invalidate('getAllEventAttendees')
    return result
  },

  // === UTILITY METHODS ===
  
  /**
   * Clear all cached data - use on logout or major state change
   */
  clearCache: () => apiCache.clear(),
  
  /**
   * Invalidate specific cache entries by pattern
   * @param pattern - String pattern to match against cache keys
   */
  invalidateCache: (pattern: string) => apiCache.invalidate(pattern),
  
  /**
   * Get cache statistics for debugging
   */
  getCacheStats: () => apiCache.getStats(),
  
  /**
   * Set cache timeout in milliseconds
   */
  setCacheTimeout: (timeout: number) => apiCache.setCacheTimeout(timeout)
}

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
  (window as any).cachedApi = cachedApi;
  (window as any).apiCache = apiCache;
  (window as any).enableDryRun = () => apiService.enableDryRun();
  (window as any).disableDryRun = () => apiService.disableDryRun();
  (window as any).isDryRunEnabled = () => apiService.isDryRunEnabled();
  
  (window as any).clearApiCache = () => {
    apiCache.clear()
  }
  
  (window as any).getApiCacheStats = () => {
    return apiCache.getStats()
  }
  
  (window as any).resetCacheStats = () => {
    apiCache.resetStats()
  }
  
  // Dev mode cache inspector
  if (process.env.NODE_ENV === 'development') {
    (window as any).__CACHE_DEBUG__ = {
      stats: () => apiCache.getStats(),
      clear: () => apiCache.clear(),
      invalidate: (pattern: string) => apiCache.invalidate(pattern),
      inspect: (keyPattern: string) => {
        const stats = apiCache.getStats()
        return stats.keys.filter(k => k.includes(keyPattern))
      }
    }
  }
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
