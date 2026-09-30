import { AddressComponent } from '../types/domain'

/**
 * Address component types that must stay on the venue (they drive city /
 * state / country / postal code on the venue record). They can be edited
 * but not removed.
 */
export const PROTECTED_ADDRESS_COMPONENT_TYPES = [
  'locality',
  'postal_town',
  'administrative_area_level_1',
  'country',
  'postal_code',
]

const ADDRESS_COMPONENT_TYPE_LABELS: Record<string, string> = {
  street_number: 'Street number',
  route: 'Street',
  subpremise: 'Unit / floor',
  premise: 'Building',
  establishment: 'Establishment',
  neighborhood: 'Neighborhood',
  sublocality_level_1: 'Neighborhood',
  sublocality: 'Neighborhood',
  locality: 'City',
  postal_town: 'City',
  administrative_area_level_2: 'County',
  administrative_area_level_1: 'State / province',
  country: 'Country',
  postal_code: 'Postal code',
  postal_code_suffix: 'Postal code suffix',
}

export function getAddressComponentLabel(types: string[] = []): string {
  const known = types.find(type => ADDRESS_COMPONENT_TYPE_LABELS[type])
  if (known) return ADDRESS_COMPONENT_TYPE_LABELS[known]
  const first = types.find(type => type !== 'political') || types[0]
  if (!first) return 'Address component'
  const words = first.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function isProtectedAddressComponent(component: AddressComponent): boolean {
  return (component.types || []).some(type => PROTECTED_ADDRESS_COMPONENT_TYPES.includes(type))
}

/**
 * Compares the user-editable parts of address components (longName,
 * shortName, types). Extra fields returned by the API (e.g. languageCode)
 * are ignored.
 */
export function areAddressComponentsEqual(
  a: AddressComponent[] | undefined,
  b: AddressComponent[] | undefined
): boolean {
  if (!a || !b) return a === b
  if (a.length !== b.length) return false
  return a.every((component, index) => {
    const other = b[index]
    return component.longName === other.longName
      && component.shortName === other.shortName
      && (component.types || []).join('|') === (other.types || []).join('|')
  })
}

/**
 * Returns an error message when an overridden address is not submittable,
 * or null when it is valid.
 */
export function getAddressOverrideError(
  formattedAddress: string | undefined,
  addressComponents: AddressComponent[] | undefined
): string | null {
  if (!formattedAddress?.trim()) {
    return 'The venue address cannot be empty.'
  }
  const emptyComponent = (addressComponents || []).find(c => !c.longName?.trim() || !c.shortName?.trim())
  if (emptyComponent) {
    const label = getAddressComponentLabel(emptyComponent.types)
    return isProtectedAddressComponent(emptyComponent)
      ? `The venue address "${label}" cannot be empty.`
      : `The venue address "${label}" cannot be empty. Remove it instead.`
  }
  return null
}
