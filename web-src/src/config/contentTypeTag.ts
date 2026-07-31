/**
 * Derive the caas:content-type tag that CaaS will carry for an event, for display only.
 *
 * This tag is NOT stored on the event. It is derived downstream at CaaS-publish time by
 * events-platform-hh-webhooks (EVENT_TYPE_CONTENT_TAG_MAP in its actions/constants.js;
 * EMC's local copy is CONTENT_TYPE_TAGS in constants.ts), so GET /events never returns
 * it and EMC has nothing to read back. To give creators visible confirmation that their
 * event is categorized correctly (MWPW-201126), we restate the backend's rule here.
 * Nothing resolved by this module is ever sent on save.
 *
 * Because this is a restatement rather than a read-back, it is only as accurate as its
 * agreement with the backend map. Callers should present the result as the rule that
 * applies to the event's format, not as a verified fact about stored data.
 *
 * Backend shape being mirrored (caasService.js formatEventXdm):
 *   - `contentType` (line 126) is ALWAYS the eventType-derived tag
 *   - `tags` (line 133, via buildXdmTags) additionally honors an explicit
 *     caas:content-type/* tag already on the event
 * The two can therefore disagree for a manually-tagged event; the derived tag below is
 * the one that always applies, so it is what we surface.
 */

import { EventTag } from '../types/domain'
import { CONTENT_TYPE_TAGS, CONTENT_TYPE_TAG_FALLBACK, EVENT_TYPES } from './constants'

/** Namespace prefix identifying a content-type tag. */
const CONTENT_TYPE_PREFIX = 'caas:content-type/'

export interface ResolvedContentTypeTag {
  /** Human-readable label for the chip, e.g. "In-Person Event" */
  title: string
  /** Full CaaS tag id, e.g. "caas:content-type/in-person-event" */
  caasId: string
  /** True when eventType had no mapping and the caas:content-type/event fallback applied. */
  isFallback: boolean
  /**
   * Label for the event format this tag was derived from, e.g. "Webinar", for callers
   * that describe the rule in prose. Undefined when the fallback applied. Returned here
   * so it cannot drift from `caasId` by being re-derived at the call site.
   */
  formatLabel?: string
  /**
   * An explicit caas:content-type/* tag the user put on the event, when present and
   * different from the derived tag.
   *
   * buildXdmTags strips every caas:content-type/* tag and prepends only the resolved
   * one, so this tag REPLACES the derived tag in the CaaS `tags` array — they do not
   * both appear. Meanwhile `contentType` stays the derived value. Surfacing this lets
   * the UI explain the split accurately instead of implying a clean override.
   */
  manualOverride?: { title: string; caasId: string }
}

/** Look up the derived tag for a form-level event type. Undefined when unmapped. */
function derivedTagForEventType(
  eventType?: string | null
): { title: string; caasId: string; formatLabel: string } | undefined {
  // Normalized so 'Webinar' / ' webinar ' behave the same as 'webinar'. The API returns
  // PascalCase eventType and the form uses kebab-case, so both reach this code.
  switch (eventType?.trim().toLowerCase()) {
    case 'webinar':
      return { ...CONTENT_TYPE_TAGS[EVENT_TYPES.WEBINAR], formatLabel: 'Webinar' }
    case 'in-person':
    case 'inperson':
      return { ...CONTENT_TYPE_TAGS[EVENT_TYPES.IN_PERSON], formatLabel: 'In-person' }
    default:
      // Hybrid, unset, and anything unmapped fall through to the backend's fallback.
      // The backend map has no Hybrid entry either.
      return undefined
  }
}

/**
 * Turn a content-type tag id into a readable label, preferring a known title and
 * otherwise title-casing the last path segment
 * (e.g. "caas:content-type/white-paper" -> "White Paper").
 */
function titleForCaasId(caasId: string, fallbackName?: string): string {
  const known = [...Object.values(CONTENT_TYPE_TAGS), CONTENT_TYPE_TAG_FALLBACK]
    .find((tag) => tag.caasId === caasId)
  if (known) return known.title

  // Prefer a name already resolved from the Chimera taxonomy, if it looks like a label
  // rather than a raw path segment.
  if (fallbackName && !fallbackName.includes('/')) return fallbackName

  const segment = caasId.slice(CONTENT_TYPE_PREFIX.length)
  if (!segment) return CONTENT_TYPE_TAG_FALLBACK.title

  return segment
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/** True when the tag is in the caas:content-type/* namespace (and not the bare namespace). */
function isContentTypeTag(tag: EventTag): boolean {
  const caasId = tag.caasId?.trim()
  return Boolean(caasId && caasId.startsWith(CONTENT_TYPE_PREFIX) && caasId.length > CONTENT_TYPE_PREFIX.length)
}

/**
 * Resolve the content-type tag that applies to an event's format.
 *
 * @param eventType - form-level event type ('in-person' | 'webinar'; 'hybrid' and
 *                    undefined are tolerated and resolve to the fallback)
 * @param selectedTags - the event's current tags, used to detect a manual override
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
