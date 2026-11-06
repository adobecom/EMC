/*
* <license header>
*/

import type { ScopeConfig } from '../types/configApi'
import type { ResourceCustomAttribute } from '../types/customAttributes'
import { apiService } from './api'

interface TestResource extends Record<string, unknown> {
  seriesId?: string
  customAttributes?: ResourceCustomAttribute[]
}

interface ErrorResponse {
  status: number | string
  error: unknown
}

interface HydrationApi {
  hydrateResourceCustomAttributes<T extends TestResource>(
    resources: T[]
  ): Promise<T[] | ErrorResponse>
  clearCustomAttributeHydrationStore(seriesId?: string): void
}

const hydrationApi = apiService as unknown as HydrationApi

const CONFIG: ScopeConfig = {
  configId: 'config-1',
  scopeId: 'scope-1',
  modificationTime: 1,
  customAttributes: [
    {
      attributeId: 'audience',
      name: 'Audience',
      label: 'Audience',
      inputType: 'single-select',
      enabled: true,
      values: [
        {
          valueId: 'developer',
          value: 'developer',
          label: 'Developer',
        },
      ],
    },
  ],
}

describe('ApiService custom attribute hydration store', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    hydrationApi.clearCustomAttributeHydrationStore()
  })

  afterAll(() => {
    hydrationApi.clearCustomAttributeHydrationStore()
  })

  it('reuses series and custom attribute metadata across hydration calls', async () => {
    const getSeriesSpy = jest.spyOn(apiService, 'getSeriesByIdExternal').mockResolvedValue({
      seriesId: 'series-1',
      scopeId: 'scope-1',
    })
    const getConfigSpy = jest.spyOn(apiService, 'getConfig').mockResolvedValue(CONFIG)
    const resource = {
      eventId: 'event-1',
      seriesId: 'series-1',
      customAttributes: [
        {
          attributeId: 'audience',
          valueId: 'developer',
        },
      ],
    }

    const firstResult = await hydrationApi.hydrateResourceCustomAttributes([resource])
    const secondResult = await hydrationApi.hydrateResourceCustomAttributes([resource])

    expect(getSeriesSpy).toHaveBeenCalledTimes(1)
    expect(getConfigSpy).toHaveBeenCalledTimes(1)
    expect(firstResult).toEqual(secondResult)
    expect(firstResult).toEqual([
      {
        ...resource,
        customAttributes: [
          {
            attributeId: 'audience',
            attribute: 'Audience',
            name: 'Audience',
            label: 'Audience',
            inputType: 'single-select',
            enabled: true,
            values: [
              {
                valueId: 'developer',
                value: 'developer',
                label: 'Developer',
              },
            ],
          },
        ],
      },
    ])
  })

  it('deduplicates concurrent hydration requests for the same series', async () => {
    const getSeriesSpy = jest.spyOn(apiService, 'getSeriesByIdExternal').mockResolvedValue({
      seriesId: 'series-1',
      scopeId: 'scope-1',
    })
    const getConfigSpy = jest.spyOn(apiService, 'getConfig').mockResolvedValue(CONFIG)
    const resource = {
      sessionId: 'session-1',
      seriesId: 'series-1',
      customAttributes: [
        {
          attributeId: 'audience',
          valueId: 'developer',
        },
      ],
    }

    await Promise.all([
      hydrationApi.hydrateResourceCustomAttributes([resource]),
      hydrationApi.hydrateResourceCustomAttributes([resource]),
    ])

    expect(getSeriesSpy).toHaveBeenCalledTimes(1)
    expect(getConfigSpy).toHaveBeenCalledTimes(1)
  })
})
