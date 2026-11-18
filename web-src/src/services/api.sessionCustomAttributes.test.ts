/*
* <license header>
*/

import type { HydratedCustomAttributeGroup } from '../types/customAttributes'
import { apiService } from './api'

interface ApiServiceInternals {
  callExternalApi: jest.Mock
}

describe('ApiService session custom attributes', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('includes hydrated custom attributes in the session PUT payload', async () => {
    const customAttributes: HydratedCustomAttributeGroup[] = [
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
      {
        attributeId: 'notes',
        attribute: 'Notes',
        name: 'Notes',
        label: 'Notes',
        inputType: 'text',
        enabled: true,
        values: [
          {
            valueId: '',
            value: 'Bring a laptop',
          },
        ],
      },
    ]
    const callExternalApi = jest.spyOn(
      apiService as unknown as ApiServiceInternals,
      'callExternalApi'
    ).mockResolvedValue({sessionId: 'session-1'})

    await apiService.updateSession('session-1', 'event-1', {
      name: 'Session title',
      description: 'Session description',
      customAttributes,
    })

    expect(callExternalApi).toHaveBeenCalledWith(
      'esp',
      '/v1/sessions/session-1',
      'PUT',
      expect.objectContaining({
        customAttributes: [
          {
            attributeId: 'audience',
            valueId: 'developer',
          },
          {
            attributeId: 'notes',
            value: 'Bring a laptop',
          },
        ],
      }),
      expect.objectContaining({
        operationName: 'updateSession',
      })
    )
  })
})
