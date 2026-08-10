/*
* <license header>
*/

import { SeriesTemplate } from '../types/domain'

export function findSeriesTemplate(templateId: string, templates: SeriesTemplate[]): SeriesTemplate | undefined {
  return templates.find(t => t['template-path'] === templateId)
}

/**
 * Map form event type to API event type format
 */
export function mapEventTypeToApiFormat(type: string): string {
  const mapping: Record<string, string> = {
    'in-person': 'InPerson',
    'webinar': 'Webinar',
    'hybrid': 'Hybrid'
  }
  return mapping[type] || type
}

/**
 * Check if a series template supports the given event type
 */
export function templateSupportsEventType(templateId: string, currentEventType: string, templates: SeriesTemplate[]): boolean {
  const apiEventType = mapEventTypeToApiFormat(currentEventType)
  const template = findSeriesTemplate(templateId, templates)

  if (!template) {
    // Backward compatibility: allow if template not in config
    return true
  }

  const supportedType = template['supported-event-type']
  if (supportedType === 'Hybrid') return true
  return supportedType === apiEventType
}

/**
 * RSVP types a template supports. Missing template/field fails open to both,
 * so un-backfilled rows in the externally-hosted JSON keep today's behavior.
 */
export function templateSupportedRsvpTypes(templateId: string, templates: SeriesTemplate[]): ('ESP' | 'Marketo')[] {
  const template = findSeriesTemplate(templateId, templates)
  const types = template?.['supported-rsvp-types']
  if (!template || types === undefined) return ['ESP', 'Marketo']
  return types
}
