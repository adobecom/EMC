/*
* <license header>
*/

import {
  toIntegrationDashboardItem,
  mergeIntegrationDetail,
  toWriteBody,
} from './integrationMappers'
import type { IntegrationSummary, IntegrationApiResponse } from '../../types/webhookApi'

describe('toIntegrationDashboardItem', () => {
  it('flattens a summary into a dashboard row with the detail fields left undefined', () => {
    const summary: IntegrationSummary = {
      integrationId: 'int-1',
      scopeId: 'scope-1',
      name: 'My Hook',
      enabled: true,
      trigger: { resource: 'event', operation: 'update' },
    }

    const result = toIntegrationDashboardItem(summary)

    expect(result).toEqual({
      integrationId: 'int-1',
      scopeId: 'scope-1',
      name: 'My Hook',
      enabled: true,
      triggerResource: 'event',
      triggerOperation: 'update',
    })
    expect(result.connectionType).toBeUndefined()
    expect(result.conditionCount).toBeUndefined()
    expect(result.endpoint).toBeUndefined()
  })

  it('defaults triggerResource to an empty string and triggerOperation to update when trigger is missing', () => {
    const summary = {
      integrationId: 'int-1',
      scopeId: 'scope-1',
      name: 'My Hook',
      enabled: true,
      trigger: undefined as any,
    }

    const result = toIntegrationDashboardItem(summary)

    expect(result.triggerResource).toBe('')
    expect(result.triggerOperation).toBe('update')
  })
})

describe('mergeIntegrationDetail', () => {
  const baseItem = toIntegrationDashboardItem({
    integrationId: 'int-1',
    scopeId: 'scope-1',
    name: 'My Hook',
    enabled: true,
    trigger: { resource: 'event', operation: 'update' },
  })

  const rawResponse: IntegrationApiResponse = {
    integrationId: 'int-1',
    scopeId: 'scope-1',
    name: 'My Hook',
    enabled: true,
    trigger: { resource: 'event', operation: 'update' },
    conditions: [{ propertyPath: 'event.title', operator: 'eq', value: 'Adobe Summit' }],
    action: { endpoint: 'https://example.com/hook', data: { objects: ['event'] } },
    connection: { type: 'generic', secrets: {} },
    retryPolicy: { maxAttempts: 3, backoffSeconds: [30, 120, 600] },
    creationTime: 1700000000000,
    modificationTime: 1700000001000,
  }

  it('fills in the detail fields the summary omits, preserving the existing row fields', () => {
    const result = mergeIntegrationDetail(baseItem, rawResponse)

    expect(result).toEqual({
      ...baseItem,
      connectionType: 'generic',
      conditionCount: 1,
      endpoint: 'https://example.com/hook',
      creationTime: 1700000000000,
      modificationTime: 1700000001000,
    })
  })

  it('defaults connectionType to generic and conditionCount to 0 when absent', () => {
    const result = mergeIntegrationDetail(baseItem, {
      ...rawResponse,
      connection: { type: undefined as any, secrets: {} },
      conditions: [],
    })

    expect(result.connectionType).toBe('generic')
    expect(result.conditionCount).toBe(0)
  })

  it('defaults endpoint to an empty string when the action is missing an endpoint', () => {
    const result = mergeIntegrationDetail(baseItem, {
      ...rawResponse,
      action: { endpoint: undefined as any, data: { objects: [] } },
    })

    expect(result.endpoint).toBe('')
  })
})

describe('toWriteBody', () => {
  const rawResponse: IntegrationApiResponse = {
    integrationId: 'int-1',
    scopeId: 'scope-1',
    name: 'My Hook',
    enabled: true,
    trigger: { resource: 'event', operation: 'update' },
    conditions: [{ propertyPath: 'event.title', operator: 'eq', value: 'Adobe Summit' }],
    action: { endpoint: 'https://example.com/hook', data: { objects: ['event', 'series'] } },
    connection: { type: 'generic', secrets: { hmacKey: { isSet: true } }, hmac: { enabled: true, headerName: 'X-Signature' } },
    retryPolicy: { maxAttempts: 3, backoffSeconds: [30, 120, 600] },
    creationTime: 1700000000000,
    modificationTime: 1700000001000,
  }

  it('builds a write body matching the source record, with secrets replaced by an empty object', () => {
    const result = toWriteBody(rawResponse)

    expect(result).toEqual({
      name: 'My Hook',
      enabled: true,
      trigger: { resource: 'event', operation: 'update' },
      conditions: [{ propertyPath: 'event.title', operator: 'eq', value: 'Adobe Summit' }],
      action: { endpoint: 'https://example.com/hook', data: { objects: ['event', 'series'] } },
      connection: { type: 'generic', secrets: {}, hmac: { enabled: true, headerName: 'X-Signature' } },
      retryPolicy: { maxAttempts: 3, backoffSeconds: [30, 120, 600] },
    })
  })

  it('never carries a secret value through, even if one were present on the source (defense in depth)', () => {
    const result = toWriteBody(rawResponse)

    // secrets is genuinely {} -- not just missing values, no keys at all -- so there is no
    // path for a previously-set secret's value to leak back out through this function
    expect(result.connection.secrets).toEqual({})
    expect(Object.keys(result.connection.secrets)).toHaveLength(0)
  })

  it('omits transforms and hmac when the source has none', () => {
    const result = toWriteBody({
      ...rawResponse,
      action: { endpoint: 'https://example.com/hook', data: { objects: ['event'] } },
      connection: { type: 'generic', secrets: {} },
    })

    expect(result.action.data).not.toHaveProperty('transforms')
    expect(result.connection).not.toHaveProperty('hmac')
  })

  it('applies overrides on top of the mapped body (e.g. the enable/disable toggle)', () => {
    const result = toWriteBody(rawResponse, { enabled: false })

    expect(result.enabled).toBe(false)
    expect(result.name).toBe('My Hook')
  })

  it('deep-copies conditions, action.data.objects, and retryPolicy.backoffSeconds so mutating the result cannot mutate the source', () => {
    const result = toWriteBody(rawResponse)

    result.conditions[0].value = 'mutated'
    result.action.data.objects.push('speaker')
    result.retryPolicy.backoffSeconds.push(9999)

    expect(rawResponse.conditions[0].value).toBe('Adobe Summit')
    expect(rawResponse.action.data.objects).toEqual(['event', 'series'])
    expect(rawResponse.retryPolicy.backoffSeconds).toEqual([30, 120, 600])
  })
})
