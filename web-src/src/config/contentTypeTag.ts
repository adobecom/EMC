/**
 * Derive the caas:content-type tag CaaS will carry for an event, for display only.
 *
 * The tag is applied downstream at CaaS-publish time by events-platform-hh-webhooks
 * (EVENT_TYPE_CONTENT_TAG_MAP in its actions/constants.js) and never persisted, so
 * GET /events can't return it and EMC re-derives it instead (MWPW-201126). Nothing here
 * is ever sent on save. Since this restates a rule rather than reading back state, it is
 * only as accurate as its agreement with the backend map — present it as the rule for
 * the event's format, not as a verified fact.
 *
 * caasService.js computes two fields differently: `contentType` is always the
 * eventType-derived tag, while `tags` (via buildXdmTags) lets an explicit
 * caas:content-type/* tag win. We surface the derived tag, which always applies.
 */

import { EventTag } from '../types/domain'
import { CONTENT_TYPE_TAGS, CONTENT_TYPE_TAG_FALLBACK, EVENT_TYPES } from './constants'

const CONTENT_TYPE_PREFIX = 'caas:content-type/'

export interface ResolvedContentTypeTag {
  /** Display label, e.g. "In-Person Event" */
  title: string
  /** Full CaaS tag id, e.g. "caas:content-type/in-person-event" */
  caasId: string
  /** True when eventType was unmapped and the caas:content-type/event fallback applied. */
  isFallback: boolean
  /** Format label for prose, e.g. "Webinar". Returned so it can't drift from caasId. */
  formatLabel?: string
  /**
   * An explicit caas:content-type/* tag on the event, when it differs from the derived
   * tag. buildXdmTags strips all content-type tags and prepends only the resolved one,
   * so this REPLACES the derived tag in `tags` — they never both appear — while
   * `contentType` stays derived.
   */
  manualOverride?: { title: string; caasId: string }
}

/** Derived tag for a form-level event type. Undefined when unmapped. */
function derivedTagForEventType(
  eventType?: string | null
): { title: string; caasId: string; formatLabel: string } | undefined {
  // Normalized because the API sends PascalCase and the form uses kebab-case.
  switch (eventType?.trim().toLowerCase()) {
    case 'webinar':
      return { ...CONTENT_TYPE_TAGS[EVENT_TYPES.WEBINAR], formatLabel: 'Webinar' }
    case 'in-person':
    case 'inperson':
      return { ...CONTENT_TYPE_TAGS[EVENT_TYPES.IN_PERSON], formatLabel: 'In-person' }
    default:
      // Hybrid and unset fall through to the fallback; the backend has no Hybrid entry either.
      return undefined
  }
}

/** Readable label for a tag id, e.g. "caas:content-type/white-paper" -> "White Paper". */
function titleForCaasId(caasId: string, fallbackName?: string): string {
  const known = [...Object.values(CONTENT_TYPE_TAGS), CONTENT_TYPE_TAG_FALLBACK]
    .find((tag) => tag.caasId === caasId)
  if (known) return known.title

  // A name already resolved from the Chimera taxonomy beats the raw path segment.
  if (fallbackName && !fallbackName.includes('/')) return fallbackName

  const segment = caasId.slice(CONTENT_TYPE_PREFIX.length)
  if (!segment) return CONTENT_TYPE_TAG_FALLBACK.title

  return segment
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/** True for a tag inside the caas:content-type/* namespace, excluding the bare prefix. */
function isContentTypeTag(tag: EventTag): boolean {
  const caasId = tag.caasId?.trim()
  return Boolean(caasId && caasId.startsWith(CONTENT_TYPE_PREFIX) && caasId.length > CONTENT_TYPE_PREFIX.length)
}

/**
 * Resolve the content-type tag that applies to an event's format.
 * 'hybrid' and undefined are tolerated and resolve to the fallback.
 */
export function resolveContentTypeTag(
  eventType?: string | null,
  selectedTags: EventTag[] = []
): ResolvedContentTypeTag {
  const mapped = derivedTagForEventType(eventType)
  const derived = mapped ?? CONTENT_TYPE_TAG_FALLBACK

  const manual = selectedTags.find(isContentTypeTag)
  const manualCaasId = manual?.caasId?.trim()
  const manualOverride = manualCaasId && manualCaasId !== derived.caasId
    ? { title: titleForCaasId(manualCaasId, manual?.name), caasId: manualCaasId }
    : undefined

  return {
    title: derived.title,
    caasId: derived.caasId,
    isFallback: !mapped,
    ...(mapped ? { formatLabel: mapped.formatLabel } : {}),
    ...(manualOverride ? { manualOverride } : {}),
  }
}
