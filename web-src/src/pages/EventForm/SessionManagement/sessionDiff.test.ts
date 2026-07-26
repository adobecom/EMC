import type { Session } from '../../../types/sessions'
import {
  getNormalizedSessionTimeFields,
  getNormalizedSessionTimeFieldsFromForm,
  hasSessionFieldChanges,
  hasSessionSpeakersChanges,
  hasSessionTimeFieldChanges,
  resolveIsAutoRegistrationEnabled,
  SessionFormDiffInput,
} from './sessionDiff'

const makeSession = (over: Partial<Session> = {}): Session => ({
  id: 's1',
  name: 'Session Title',
  description: 'Session description',
  startDateTime: '2026-01-01T09:00:00',
  endDateTime: '2026-01-01T10:00:00',
  tags: [],
  ...over,
})

const makeForm = (over: Partial<SessionFormDiffInput> = {}): SessionFormDiffInput => ({
  name: 'Session Title',
  description: 'Session description',
  startDateTime: '2026-01-01T09:00:00',
  endDateTime: '2026-01-01T10:00:00',
  tags: [],
  ...over,
})

describe('resolveIsAutoRegistrationEnabled', () => {
  it('defaults undefined source to false', () => {
    expect(resolveIsAutoRegistrationEnabled(undefined)).toBe(false)
  })

  it('defaults null source to false', () => {
    expect(resolveIsAutoRegistrationEnabled(null)).toBe(false)
  })

  it('defaults a source with the field absent to false', () => {
    expect(resolveIsAutoRegistrationEnabled({})).toBe(false)
  })

  it('returns explicit false as false', () => {
    expect(resolveIsAutoRegistrationEnabled({ isAutoRegistrationEnabled: false })).toBe(false)
  })

  it('returns explicit true as true', () => {
    expect(resolveIsAutoRegistrationEnabled({ isAutoRegistrationEnabled: true })).toBe(true)
  })
})

describe('hasSessionTimeFieldChanges', () => {
  it('MWPW-201876 regression: absent flag flipped to Automatic in the form is detected as a change', () => {
    const session = makeSession({ sessionTime: { sessionTimeId: 't1' } })
    const form = makeForm({ isAutoRegistrationEnabled: true })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })

  it('absent flag re-selected as Registration required is not a spurious change', () => {
    const session = makeSession({ sessionTime: { sessionTimeId: 't1' } })
    const form = makeForm({ isAutoRegistrationEnabled: false })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(false)
  })

  it('explicit false to true is a change', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: false } })
    const form = makeForm({ isAutoRegistrationEnabled: true })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })

  it('explicit true to false is a change', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: true } })
    const form = makeForm({ isAutoRegistrationEnabled: false })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })

  it('unchanged true reports no change', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: true } })
    const form = makeForm({ isAutoRegistrationEnabled: true })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(false)
  })

  it('unchanged false reports no change', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: false } })
    const form = makeForm({ isAutoRegistrationEnabled: false })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(false)
  })

  it('absent flag flipped to Automatic alongside a time change is still detected (the reported workaround)', () => {
    const session = makeSession({ sessionTime: { sessionTimeId: 't1' } })
    const form = makeForm({ isAutoRegistrationEnabled: true, startDateTime: '2026-01-01T11:00:00' })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })

  it('endDateTime-only change is detected', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: true } })
    const form = makeForm({ isAutoRegistrationEnabled: true, endDateTime: '2026-01-01T12:00:00' })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })

  it('locationId-only change is detected', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: true }, locationId: 'loc-1' })
    const form = makeForm({ isAutoRegistrationEnabled: true, locationId: 'loc-2' })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })
})

describe('attendeeLimit normalization consistency', () => {
  it('regression: an absent flag with a stored limit agrees with a matching form baseline', () => {
    const session = makeSession({ sessionTime: { attendeeLimit: 50 } })
    expect(getNormalizedSessionTimeFields(session).attendeeLimit).toBe(50)

    const form = makeForm({ isAutoRegistrationEnabled: false, attendeeLimit: 50 })
    expect(hasSessionTimeFieldChanges(session, form)).toBe(false)
  })

  it('switching to Automatic drops the limit and reports a change', () => {
    const session = makeSession({ sessionTime: { attendeeLimit: 50 } })
    const form = makeForm({ isAutoRegistrationEnabled: true, attendeeLimit: undefined })
    expect(getNormalizedSessionTimeFieldsFromForm(form).attendeeLimit).toBeUndefined()
    expect(hasSessionTimeFieldChanges(session, form)).toBe(true)
  })

  it('a stale limit on an Automatic session-time is ignored', () => {
    const session = makeSession({ sessionTime: { isAutoRegistrationEnabled: true, attendeeLimit: 50 } })
    expect(getNormalizedSessionTimeFields(session).attendeeLimit).toBeUndefined()
  })

  it('the session and form normalizers agree on both fields for an absent flag with a stored limit', () => {
    const session = makeSession({ sessionTime: { attendeeLimit: 50 } })
    const form = makeForm({ isAutoRegistrationEnabled: undefined, attendeeLimit: 50 })
    const current = getNormalizedSessionTimeFields(session)
    const next = getNormalizedSessionTimeFieldsFromForm(form)
    expect(current.isAutoRegistrationEnabled).toBe(next.isAutoRegistrationEnabled)
    expect(current.attendeeLimit).toBe(next.attendeeLimit)
  })
})

describe('hasSessionFieldChanges', () => {
  it('detects a name change', () => {
    expect(hasSessionFieldChanges(makeSession(), makeForm({ name: 'New Title' }))).toBe(true)
  })

  it('detects a description change', () => {
    expect(hasSessionFieldChanges(makeSession(), makeForm({ description: 'New description' }))).toBe(true)
  })

  it('detects an added tag', () => {
    expect(hasSessionFieldChanges(makeSession({ tags: [] }), makeForm({ tags: ['a'] }))).toBe(true)
  })

  it('ignores whitespace-only differences in name and description', () => {
    const session = makeSession({ name: 'Title', description: 'Description' })
    const form = makeForm({ name: '  Title  ', description: '  Description  ' })
    expect(hasSessionFieldChanges(session, form)).toBe(false)
  })

  it('reports no change for identical values', () => {
    expect(hasSessionFieldChanges(makeSession(), makeForm())).toBe(false)
  })

  it('detects a tag reorder', () => {
    const session = makeSession({ tags: ['a', 'b'] })
    const form = makeForm({ tags: ['b', 'a'] })
    expect(hasSessionFieldChanges(session, form)).toBe(true)
  })
})

describe('hasSessionSpeakersChanges', () => {
  it('detects an added speaker', () => {
    const form = makeForm({ originalSpeakerIds: ['sp1'], speakerIds: ['sp1', 'sp2'] })
    expect(hasSessionSpeakersChanges(form)).toBe(true)
  })

  it('detects a removed speaker', () => {
    const form = makeForm({ originalSpeakerIds: ['sp1', 'sp2'], speakerIds: ['sp1'] })
    expect(hasSessionSpeakersChanges(form)).toBe(true)
  })

  it('ignores a reorder-only change', () => {
    const form = makeForm({ originalSpeakerIds: ['sp1', 'sp2'], speakerIds: ['sp2', 'sp1'] })
    expect(hasSessionSpeakersChanges(form)).toBe(false)
  })

  it('ignores a duplicate id in speakerIds', () => {
    const form = makeForm({ originalSpeakerIds: ['sp1'], speakerIds: ['sp1', 'sp1'] })
    expect(hasSessionSpeakersChanges(form)).toBe(false)
  })

  it('reports no change when both lists are empty', () => {
    const form = makeForm({ originalSpeakerIds: [], speakerIds: [] })
    expect(hasSessionSpeakersChanges(form)).toBe(false)
  })
})
