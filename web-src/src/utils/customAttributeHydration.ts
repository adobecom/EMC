/*
* <license header>
*/

import type { CustomAttributeConfig } from '../types/configApi'
import type {
  HydratedCustomAttributeGroup,
  ResourceCustomAttribute,
  StoredCustomAttribute,
} from '../types/customAttributes'

/** Returns whether a custom attribute already contains resolved display values. */
export function isHydratedCustomAttribute(
  attribute: ResourceCustomAttribute
): attribute is HydratedCustomAttributeGroup {
  return 'values' in attribute && Array.isArray(attribute.values)
}

/** Returns whether at least one custom attribute still requires Config-backed hydration. */
export function hasStoredCustomAttributes(
  customAttributes?: readonly ResourceCustomAttribute[]
): boolean {
  return customAttributes?.some(attribute => !isHydratedCustomAttribute(attribute)) ?? false
}

function createHydratedGroup(config: CustomAttributeConfig): HydratedCustomAttributeGroup {
  return {
    attributeId: config.attributeId!,
    attribute: config.name,
    name: config.name,
    label: config.label,
    inputType: config.inputType,
    enabled: config.enabled,
    ...(config.isRequired !== undefined ? { isRequired: config.isRequired } : {}),
    values: [],
  }
}

function addStoredValue(
  group: HydratedCustomAttributeGroup,
  storedAttribute: StoredCustomAttribute,
  config: CustomAttributeConfig
): void {
  const isSelect = config.inputType === 'single-select' || config.inputType === 'multi-select'

  if (isSelect && storedAttribute.valueId) {
    const configuredValue = config.values.find(value =>
      value.valueId === storedAttribute.valueId || value.value === storedAttribute.valueId
    )
    if (configuredValue) {
      group.values.push({
        ...configuredValue,
        valueId: configuredValue.valueId ?? storedAttribute.valueId,
      })
    }
  } else if (storedAttribute.value !== undefined) {
    group.values.push({
      valueId: '',
      value: storedAttribute.value,
    })
  }
}

/**
 * Resolves stored custom-attribute IDs and free-form values using scope Config metadata.
 * Already-hydrated groups are preserved to support either ESP/EMC deployment order.
 */
export function hydrateCustomAttributes(
  customAttributes: readonly ResourceCustomAttribute[] | undefined,
  configAttributes: readonly CustomAttributeConfig[]
): HydratedCustomAttributeGroup[] {
  if (!customAttributes?.length) return []

  const configById = new Map(
    configAttributes
      .filter(config => config.attributeId)
      .map(config => [config.attributeId!, config])
  )
  const hydratedById = new Map<string, HydratedCustomAttributeGroup>()

  for (const attribute of customAttributes) {
    if (isHydratedCustomAttribute(attribute)) {
      const attributeName = attribute.attribute || attribute.name || attribute.label || ''
      hydratedById.set(attribute.attributeId, {
        ...attribute,
        attribute: attributeName,
        name: attributeName,
        values: attribute.values.map(value => ({
          ...value,
          valueId: value.valueId ?? '',
        })),
      })
      continue
    }

    const config = configById.get(attribute.attributeId)
    if (!config || config.enabled === false) continue

    let group = hydratedById.get(attribute.attributeId)
    if (!group) {
      group = createHydratedGroup(config)
      hydratedById.set(attribute.attributeId, group)
    }
    addStoredValue(group, attribute, config)
  }

  return Array.from(hydratedById.values())
}
