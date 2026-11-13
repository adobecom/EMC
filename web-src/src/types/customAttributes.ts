/*
* <license header>
*/

import type { CustomAttributeInputType } from './configApi'

export interface StoredCustomAttribute {
  attributeId: string
  valueId?: string
  value?: string
}

export interface HydratedCustomAttributeValue {
  valueId: string
  value: string
  label?: string
  ordinal?: number
}

export interface HydratedCustomAttributeGroup {
  attributeId: string
  attribute: string
  name: string
  label?: string
  inputType: CustomAttributeInputType
  enabled: boolean
  isRequired?: boolean
  values: HydratedCustomAttributeValue[]
}

export type ResourceCustomAttribute = StoredCustomAttribute | HydratedCustomAttributeGroup
