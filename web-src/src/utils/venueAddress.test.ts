import { AddressComponent } from '../types/domain'
import {
  areAddressComponentsEqual,
  getAddressComponentLabel,
  getAddressOverrideError,
  isProtectedAddressComponent,
} from './venueAddress'

const components: AddressComponent[] = [
  { longName: '24th Floor', shortName: '24th Floor', types: ['subpremise'] },
  { longName: '1540', shortName: '1540', types: ['street_number'] },
  { longName: 'Broadway', shortName: 'Broadway', types: ['route'] },
  { longName: 'New York', shortName: 'New York', types: ['locality', 'political'] },
  { longName: 'New York', shortName: 'NY', types: ['administrative_area_level_1', 'political'] },
  { longName: '10036', shortName: '10036', types: ['postal_code'] },
]

test('labels known and unknown component types', () => {
  expect(getAddressComponentLabel(['subpremise'])).toBe('Unit / floor')
  expect(getAddressComponentLabel(['locality', 'political'])).toBe('City')
  expect(getAddressComponentLabel(['political', 'colloquial_area'])).toBe('Colloquial area')
  expect(getAddressComponentLabel([])).toBe('Address component')
})

test('protects city, state, country and postal code from removal', () => {
  expect(isProtectedAddressComponent(components[0])).toBe(false)
  expect(isProtectedAddressComponent(components[3])).toBe(true)
  expect(isProtectedAddressComponent(components[5])).toBe(true)
})

test('compares components by editable fields only', () => {
  const withLanguage = components.map(c => ({ ...c, languageCode: 'en' }))
  expect(areAddressComponentsEqual(components, withLanguage)).toBe(true)
  expect(areAddressComponentsEqual(components, components.slice(1))).toBe(false)
  const edited = components.map((c, i) => (i === 2 ? { ...c, longName: 'Bway' } : c))
  expect(areAddressComponentsEqual(components, edited)).toBe(false)
  expect(areAddressComponentsEqual(undefined, undefined)).toBe(true)
  expect(areAddressComponentsEqual(components, undefined)).toBe(false)
})

test('validates overridden address', () => {
  expect(getAddressOverrideError('1540 Broadway, New York, NY 10036, USA', components)).toBeNull()
  expect(getAddressOverrideError('  ', components)).toBe('The venue address cannot be empty.')
  const emptyFloor = components.map((c, i) => (i === 0 ? { ...c, longName: '' } : c))
  expect(getAddressOverrideError('1540 Broadway', emptyFloor)).toContain('Remove it instead')
  const emptyCity = components.map((c, i) => (i === 3 ? { ...c, shortName: '' } : c))
  expect(getAddressOverrideError('1540 Broadway', emptyCity)).toBe('The venue address "City" cannot be empty.')
})
