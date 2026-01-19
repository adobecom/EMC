/**
 * Default values and mappings for event data.
 */

export const EVENT_DEFAULTS = {
  defaultLocale: 'en-US',
  defaultTimezone: 'America/Los_Angeles',
  defaultStartTime: '09:00',
  defaultEndTime: '17:00',
} as const

export const EVENT_TYPE_API_MAP: Record<string, string> = {
  'in-person': 'InPerson',
  webinar: 'Webinar',
  hybrid: 'Hybrid',
  InPerson: 'InPerson',
  Webinar: 'Webinar',
  Hybrid: 'Hybrid',
}
