/*
* <license header>
*/

/**
 * Tests for the webhook-integrations methods on ApiService/cachedApi.
 *
 * safeFetch is the real network boundary (it depends on `window.location`, which doesn't
 * exist in this repo's node test environment) -- mocked here so the rest of api.ts's own
 * logic (URL construction via getApiHost, header construction via constructRequestHeaders,
 * pagination via fetchAllPages, response/error shaping) runs for real and is what's under
 * test, not just re-asserting a mock's return value.
 */

jest.mock('./requestHelpers', () => ({
  ...jest.requireActual('./requestHelpers'),
  safeFetch: jest.fn()
}))

import { apiService, cachedApi } from './api'
import { safeFetch } from './requestHelpers'
import { getApiHost } from '../config/constants'
import type { IntegrationWriteBody } from '../types/webhookApi'

const mockSafeFetch = safeFetch as jest.MockedFunction<typeof safeFetch>
const ESP_HOST = getApiHost('esp', 'dev')

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

describe('apiService webhook integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    apiService.setAuthHeaders('test-token', 'test-org')
    apiService.setGroupId(null)
  })

  describe('getIntegrations', () => {
    it('builds the scope-scoped list URL and returns the items array', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ items: [{ integrationId: 'int-1' }] }))

      const result = await apiService.getIntegrations('scope-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations`,
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual([{ integrationId: 'int-1' }])
    })

    it('encodes a scopeId containing special characters', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ items: [] }))

      await apiService.getIntegrations('scope/with slash')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope%2Fwith%20slash/integrations`,
        expect.anything()
      )
    })

    it('follows next-page-token across multiple pages', async () => {
      mockSafeFetch
        .mockResolvedValueOnce(jsonResponse({ items: [{ integrationId: 'int-1' }], nextPageToken: 'page-2' }))
        .mockResolvedValueOnce(jsonResponse({ items: [{ integrationId: 'int-2' }] }))

      const result = await apiService.getIntegrations('scope-1')

      expect(mockSafeFetch).toHaveBeenCalledTimes(2)
      expect(mockSafeFetch.mock.calls[1][0]).toBe(`${ESP_HOST}/v1/scopes/scope-1/integrations?next-page-token=page-2`)
      expect(result).toEqual([{ integrationId: 'int-1' }, { integrationId: 'int-2' }])
    })

    it('returns an ErrorResponse when the request fails, without throwing', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, 404))

      const result = await apiService.getIntegrations('scope-1')

      expect(result).toEqual({ status: 404, error: { message: 'nope' } })
    })
  })

  describe('getIntegrationById', () => {
    it('builds the detail URL and returns the full response', async () => {
      const integration = { integrationId: 'int-1', scopeId: 'scope-1', name: 'My Hook' }
      mockSafeFetch.mockResolvedValueOnce(jsonResponse(integration))

      const result = await apiService.getIntegrationById('scope-1', 'int-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1`,
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(integration)
    })
  })

  describe('createIntegration', () => {
    it('POSTs the serialized body to the scope-scoped create endpoint', async () => {
      const data: IntegrationWriteBody = {
        name: 'My Hook',
        trigger: { resource: 'event', operation: 'update' },
        action: { endpoint: 'https://example.com/hook', data: { objects: ['event'] } }
      } as IntegrationWriteBody
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ integrationId: 'int-1', ...data }, 201))

      const result = await apiService.createIntegration('scope-1', data)

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify(data) })
      )
      expect((result as any).integrationId).toBe('int-1')
    })

    it('includes the content-type header for a body-carrying request', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({}))

      await apiService.createIntegration('scope-1', {} as IntegrationWriteBody)

      const [, options] = mockSafeFetch.mock.calls[0]
      expect((options.headers as Record<string, string>)['content-type']).toBe('application/json')
    })
  })

  describe('updateIntegration', () => {
    it('PUTs to the specific integration URL', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ integrationId: 'int-1' }))

      await apiService.updateIntegration('scope-1', 'int-1', { name: 'Renamed' } as IntegrationWriteBody)

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1`,
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) })
      )
    })
  })

  describe('deleteIntegration', () => {
    it('DELETEs and treats a 204 as success with no body parsing', async () => {
      mockSafeFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const result = await apiService.deleteIntegration('scope-1', 'int-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1`,
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result).toEqual({ ok: true })
    })
  })

  describe('pingIntegration', () => {
    it('POSTs to the ping action endpoint with no body', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ success: true, statusCode: 200 }))

      const result = await apiService.pingIntegration('scope-1', 'int-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1/actions/ping`,
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toEqual({ success: true, statusCode: 200 })
    })
  })

  describe('getDeliveries', () => {
    it('builds the deliveries list URL with the default page-size param', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ items: [{ deliveryId: 'd-1' }] }))

      const result = await apiService.getDeliveries('scope-1', 'int-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1/deliveries?page-size=50`,
        expect.anything()
      )
      expect(result).toEqual([{ deliveryId: 'd-1' }])
    })
  })

  describe('getDeliveryById', () => {
    it('builds the specific delivery URL', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ deliveryId: 'd-1', status: 'success' }))

      const result = await apiService.getDeliveryById('scope-1', 'int-1', 'd-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1/deliveries/d-1`,
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual({ deliveryId: 'd-1', status: 'success' })
    })
  })

  describe('redeliverDelivery', () => {
    it('POSTs to the redeliver action endpoint', async () => {
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({ deliveryId: 'd-2', status: 'success' }))

      const result = await apiService.redeliverDelivery('scope-1', 'int-1', 'd-1')

      expect(mockSafeFetch).toHaveBeenCalledWith(
        `${ESP_HOST}/v1/scopes/scope-1/integrations/int-1/deliveries/d-1/actions/redeliver`,
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toEqual({ deliveryId: 'd-2', status: 'success' })
    })
  })

  describe('auth/error boundaries shared by every integration method', () => {
    it('returns a No Token error and never calls safeFetch when no auth header is set', async () => {
      apiService.setAuthHeaders(undefined, undefined)
      // clear out the header entirely rather than leaving a stale Bearer token from beforeEach
      ;(apiService as any).config = {}

      const result = await apiService.getIntegrations('scope-1')

      expect(result).toEqual({ status: 'No Token', error: 'No valid authentication token' })
      expect(mockSafeFetch).not.toHaveBeenCalled()
    })

    it('returns a Network Error result rather than throwing when safeFetch rejects', async () => {
      mockSafeFetch.mockRejectedValueOnce(new Error('fetch failed'))

      const result = await apiService.getIntegrationById('scope-1', 'int-1')

      expect(result).toEqual({ status: 'Network Error', error: 'fetch failed' })
    })

    it('includes the RBAC group header when a group id is active', async () => {
      apiService.setGroupId('group-1')
      mockSafeFetch.mockResolvedValueOnce(jsonResponse({}))

      await apiService.getIntegrationById('scope-1', 'int-1')

      const [, options] = mockSafeFetch.mock.calls[0]
      expect((options.headers as Record<string, string>)['x-adobe-esp-group-id']).toBe('group-1')
    })
  })
})

describe('cachedApi webhook integrations', () => {
  // cachedApi.getIntegrations/getIntegrationById/getDeliveries/getDeliveryById call
  // apiService through a reference bound once at module load (see boundGetIntegrations
  // etc. in api.ts), specifically so apiCache's function-identity-keyed cache/dedup works.
  // That means jest.spyOn(apiService, 'getIntegrations') can't intercept calls made
  // through it (the bound reference already closed over the real implementation before
  // any spy attaches) -- mock at the safeFetch boundary instead, same as the apiService
  // describe block above, so these tests exercise the real call chain end-to-end.
  beforeEach(() => {
    jest.clearAllMocks()
    apiService.setAuthHeaders('test-token', 'test-org')
    apiService.setGroupId(null)
  })

  it('getIntegrations dedupes concurrent calls into a single network request', async () => {
    mockSafeFetch.mockResolvedValueOnce(jsonResponse({ items: [{ integrationId: 'int-1' }] }))

    const [first, second] = await Promise.all([
      cachedApi.getIntegrations('scope-dedup-1'),
      cachedApi.getIntegrations('scope-dedup-1')
    ])

    expect(mockSafeFetch).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)
  })

  it('createIntegration invalidates the scope and getIntegrations caches', async () => {
    mockSafeFetch
      .mockResolvedValueOnce(jsonResponse({ items: [] })) // warm the cache
      .mockResolvedValueOnce(jsonResponse({ integrationId: 'int-1' }, 201)) // createIntegration
      .mockResolvedValueOnce(jsonResponse({ items: [{ integrationId: 'int-1' }] })) // post-invalidate

    await cachedApi.getIntegrations('scope-invalidate-1')
    await cachedApi.createIntegration('scope-invalidate-1', {} as IntegrationWriteBody)
    const result = await cachedApi.getIntegrations('scope-invalidate-1')

    // 3 calls, not 2: the cache entry for this scope must have been invalidated by the
    // create, so the second getIntegrations is a real network call, not a cache hit
    expect(mockSafeFetch).toHaveBeenCalledTimes(3)
    expect(result).toEqual([{ integrationId: 'int-1' }])
  })

  it('pingIntegration does not invalidate any cache (read-only diagnostic)', async () => {
    mockSafeFetch
      .mockResolvedValueOnce(jsonResponse({ items: [] })) // warm the cache
      .mockResolvedValueOnce(jsonResponse({ success: true, statusCode: 200 })) // ping

    await cachedApi.getIntegrations('scope-ping-1')
    await cachedApi.pingIntegration('scope-ping-1', 'int-1')
    await cachedApi.getIntegrations('scope-ping-1')

    // still 2 calls total (warm + ping) -- the second getIntegrations must be a cache hit,
    // not a 3rd network call, since ping has nothing to invalidate
    expect(mockSafeFetch).toHaveBeenCalledTimes(2)
  })
})
