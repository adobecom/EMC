import type { Session } from '../../../types/sessions'

/** Structural subset of SessionTimeInfo needed to resolve the registration flag */
export interface AutoRegistrationSource {
  isAutoRegistrationEnabled?: boolean
}

/**
 * Structural subset of SessionFormData read by the diff helpers below.
 * Deliberately not imported from SessionForm.tsx: that file imports values
 * from this module, so importing its types back here would create a cycle
 * and pull the @react-spectrum/s2 type graph into every ts-jest run.
 * Assignability from the real SessionFormData is enforced at the Sessions.tsx
 * call sites.
 */
export interface SessionFormDiffInput {
  name?: string
  description?: string
  startDateTime: string
  endDateTime: string
  tags?: string[]
  isAutoRegistrationEnabled?: boolean
  attendeeLimit?: number
  locationId?: string
  speakerIds?: string[]
  originalSpeakerIds?: string[]
}

/**
 * Single source of truth for the tri-state isAutoRegistrationEnabled flag.
 * Per MWPW-201876: an absent flag means "Registration required" (false) —
 * never default it to true. SessionForm.tsx and Sessions.tsx previously used
 * opposite defaults for the same missing-field case, which silently defeated
 * the session-time change-detection gate on the first save.
 */
export function resolveIsAutoRegistrationEnabled(
  source: AutoRegistrationSource | null | undefined,
): boolean {
  return source?.isAutoRegistrationEnabled ?? false
}

export function serializeTagsForApi(tags: string[] | undefined): string {
  return (tags ?? []).join(',')
}

function normalizeOptionalString(value: string | undefined): string {
  return (value ?? '').trim()
}

function normalizeOptionalNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function normalizeIdList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))].sort()
}

export function getNormalizedSessionFields(session: Session) {
  return {
    name: normalizeOptionalString(session.name),
    description: normalizeOptionalString(session.description),
    tags: serializeTagsForApi(session.tags),
  }
}

export function getNormalizedSessionFieldsFromForm(data: SessionFormDiffInput) {
  return {
    name: normalizeOptionalString(data.name),
    description: normalizeOptionalString(data.description),
    tags: serializeTagsForApi(data.tags),
  }
}

export function getNormalizedSessionTimeFields(session: Session) {
  const isAutoRegistrationEnabled = resolveIsAutoRegistrationEnabled(session.sessionTime)
  return {
    startDateTime: session.startDateTime,
    endDateTime: session.endDateTime,
    isAutoRegistrationEnabled,
    attendeeLimit: isAutoRegistrationEnabled
      ? undefined
      : normalizeOptionalNumber(session.sessionTime?.attendeeLimit),
    locationId: session.locationId ?? undefined,
  }
}

export function getNormalizedSessionTimeFieldsFromForm(data: SessionFormDiffInput) {
  const isAutoRegistrationEnabled = resolveIsAutoRegistrationEnabled(data)
  return {
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    isAutoRegistrationEnabled,
    attendeeLimit: isAutoRegistrationEnabled
      ? undefined
      : normalizeOptionalNumber(data.attendeeLimit),
    locationId: data.locationId ?? undefined,
  }
}

export function hasSessionFieldChanges(session: Session, data: SessionFormDiffInput): boolean {
  const current = getNormalizedSessionFields(session)
  const next = getNormalizedSessionFieldsFromForm(data)
  return (
    current.name !== next.name ||
    current.description !== next.description ||
    current.tags !== next.tags
  )
}

export function hasSessionTimeFieldChanges(session: Session, data: SessionFormDiffInput): boolean {
  const current = getNormalizedSessionTimeFields(session)
  const next = getNormalizedSessionTimeFieldsFromForm(data)
  return (
    current.startDateTime !== next.startDateTime ||
    current.endDateTime !== next.endDateTime ||
    current.isAutoRegistrationEnabled !== next.isAutoRegistrationEnabled ||
    current.attendeeLimit !== next.attendeeLimit ||
    current.locationId !== next.locationId
  )
}

export function hasSessionSpeakersChanges(data: SessionFormDiffInput): boolean {
  const current = normalizeIdList(data.originalSpeakerIds)
  const next = normalizeIdList(data.speakerIds)
  if (current.length !== next.length) return true
  return current.some((id, index) => id !== next[index])
}
