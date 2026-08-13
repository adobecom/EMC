import { SeriesTemplate } from '../types/domain'
import {
  findSeriesTemplate,
  templateSupportsEventType,
  templateSupportedRsvpTypes,
} from './templateCapabilities'

function makeTemplate(overrides: Partial<SeriesTemplate> = {}): SeriesTemplate {
  return {
    'template-path': '/event-libs/assets/templates/dx-in-person/base-template',
    'template-name': 'Base Template',
    'template-image': 'https://example.com/image.png',
    'supported-event-type': 'InPerson',
    ...overrides,
  }
}

test('findSeriesTemplate matches by template-path and returns undefined when absent', () => {
  const template = makeTemplate()
  expect(findSeriesTemplate(template['template-path'], [template])).toBe(template)
  expect(findSeriesTemplate('/unknown-path', [template])).toBeUndefined()
})

test('templateSupportsEventType allows Hybrid templates for any event type', () => {
  const template = makeTemplate({ 'supported-event-type': 'Hybrid' })
  expect(templateSupportsEventType(template['template-path'], 'in-person', [template])).toBe(true)
  expect(templateSupportsEventType(template['template-path'], 'webinar', [template])).toBe(true)
})

test('templateSupportsEventType rejects a mismatched non-Hybrid event type', () => {
  const template = makeTemplate({ 'supported-event-type': 'Webinar' })
  expect(templateSupportsEventType(template['template-path'], 'in-person', [template])).toBe(false)
  expect(templateSupportsEventType(template['template-path'], 'webinar', [template])).toBe(true)
})

test('templateSupportsEventType fails open when the template is not in the config', () => {
  expect(templateSupportsEventType('/unknown-path', 'webinar', [])).toBe(true)
})

test('templateSupportedRsvpTypes fails open to both types when template is unknown', () => {
  expect(templateSupportedRsvpTypes('/unknown-path', [])).toEqual(['ESP', 'Marketo'])
})

test('templateSupportedRsvpTypes fails open to both types when the field is not yet backfilled', () => {
  const template = makeTemplate()
  expect(templateSupportedRsvpTypes(template['template-path'], [template])).toEqual(['ESP', 'Marketo'])
})

test('templateSupportedRsvpTypes honors an explicit Marketo-only restriction', () => {
  const template = makeTemplate({ 'supported-rsvp-types': 'Marketo' })
  expect(templateSupportedRsvpTypes(template['template-path'], [template])).toEqual(['Marketo'])
})

test('templateSupportedRsvpTypes honors an explicit ESP-only restriction', () => {
  const template = makeTemplate({ 'supported-rsvp-types': 'ESP' })
  expect(templateSupportedRsvpTypes(template['template-path'], [template])).toEqual(['ESP'])
})
