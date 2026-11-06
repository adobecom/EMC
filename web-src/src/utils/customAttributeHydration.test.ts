/*
* <license header>
*/

import type { CustomAttributeConfig } from '../types/configApi'
import type { HydratedCustomAttributeGroup } from '../types/customAttributes'
import {
  hasStoredCustomAttributes,
  hydrateCustomAttributes,
} from './customAttributeHydration'

const CONFIG_ATTRIBUTES: CustomAttributeConfig[] = [
  {
    attributeId: 'audience',
    name: 'Audience',
    label: 'Audience',
    inputType: 'multi-select',
    enabled: true,
    values: [
      { valueId: 'developer', value: 'developer', label: 'Developer', ordinal: 0 },
      { valueId: 'designer', value: 'designer', label: 'Designer', ordinal: 1 },
    ],
  },
  {
    attributeId: 'notes',
    name: 'Notes',
    label: 'Notes',
    inputType: 'text',
    enabled: true,
    values: [],
  },
  {
    attributeId: 'disabled',
    name: 'Disabled',
    label: 'Disabled',
    inputType: 'single-select',
    enabled: false,
    values: [
      { valueId: 'hidden', value: 'hidden', label: 'Hidden', ordinal: 0 },
    ],
  },
]

describe('hydrateCustomAttributes', () => {
  it('groups stored select values using scope config metadata', () => {
    const result = hydrateCustomAttributes(
      [
        { attributeId: 'audience', valueId: 'designer' },
        { attributeId: 'audience', valueId: 'developer' },
      ],
      CONFIG_ATTRIBUTES
    )

    expect(result).toEqual([
      {
        attributeId: 'audience',
        attribute: 'Audience',
        name: 'Audience',
        label: 'Audience',
        inputType: 'multi-select',
        enabled: true,
        values: [
          { valueId: 'designer', value: 'designer', label: 'Designer', ordinal: 1 },
          { valueId: 'developer', value: 'developer', label: 'Developer', ordinal: 0 },
        ],
      },
    ])
  })

  it('hydrates free-form text and excludes missing or disabled attributes', () => {
    const result = hydrateCustomAttributes(
      [
        { attributeId: 'notes', value: 'Bring a laptop' },
        { attributeId: 'disabled', valueId: 'hidden' },
        { attributeId: 'missing', valueId: 'unknown' },
      ],
      CONFIG_ATTRIBUTES
    )

    expect(result).toEqual([
      {
        attributeId: 'notes',
        attribute: 'Notes',
        name: 'Notes',
        label: 'Notes',
        inputType: 'text',
        enabled: true,
        values: [
          { valueId: '', value: 'Bring a laptop' },
        ],
      },
    ])
  })

  it('preserves an already hydrated response during a rolling deployment', () => {
    const hydrated: HydratedCustomAttributeGroup[] = [
      {
        attributeId: 'audience',
        attribute: 'Audience',
        name: 'Audience',
        label: 'Audience',
        inputType: 'single-select',
        enabled: true,
        values: [
          { valueId: 'developer', value: 'developer', label: 'Developer' },
        ],
      },
    ]

    expect(hasStoredCustomAttributes(hydrated)).toBe(false)
    expect(hydrateCustomAttributes(hydrated, [])).toEqual(hydrated)
  })

  it('detects stored entries that still need hydration', () => {
    expect(hasStoredCustomAttributes([
      { attributeId: 'audience', valueId: 'developer' },
    ])).toBe(true)
  })
})
