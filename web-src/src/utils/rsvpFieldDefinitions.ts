/*
* <license header>
*/

import type { RsvpFormField, RsvpFieldType } from '../types/configApi'
import type { RsvpConfigField } from '../types/attendee'
import type { RsvpFieldOptionSelectionState } from '../types/domain'
import { rsvpConfigUiLabel } from './rsvpConfigLabels'

const toUpperWords = (input: string): string =>
  input.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()

const LEGACY_EXCLUDED_TYPES = new Set(['submit', 'button', 'hidden'])

function inferFieldType(raw: string | undefined): RsvpFieldType {
  const t = (raw || 'text').toLowerCase().replace(/\s+/g, '')
  if (t === 'select') return 'select'
  if (t === 'checkbox') return 'checkbox'
  if (t === 'email') return 'email'
  if (t === 'phone' || t === 'tel') return 'phone'
  return 'text'
}

function parseLegacyOptions(optionsStr: string | undefined): { value: string; label: string }[] {
  if (!optionsStr || typeof optionsStr !== 'string') return []
  return optionsStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map((label, i) => ({
      value: `opt_${i}_${label.replace(/\s+/g, '_').slice(0, 40)}`,
      label
    }))
}

/**
 * Map external cloud JSON RSVP rows to the same shape used by scope RSVP configs.
 */
export function mapLegacyRsvpConfigToFormFields(rows: RsvpConfigField[]): RsvpFormField[] {
  return rows
    .filter(r => {
      const f = r.Field?.trim()
      if (!f) return false
      const ty = (r.Type || '').toLowerCase()
      return !LEGACY_EXCLUDED_TYPES.has(ty)
    })
    .map(r => {
      const type = inferFieldType(r.Type)
      const options = type === 'select' || type === 'checkbox'
        ? parseLegacyOptions(r.Options)
        : []
      return {
        field: r.Field.trim(),
        label: rsvpConfigUiLabel(r, toUpperWords),
        placeholder: (r.Placeholder && r.Placeholder.trim()) || '',
        type,
        required: r.Required === 'x' || r.Required === 'X',
        options,
        default: '',
      } satisfies RsvpFormField
    })
}

export function defaultOptionSelectionFromField(field: RsvpFormField): RsvpFieldOptionSelectionState {
  const order = (field.options || []).map(o => o.value)
  return { order, disabledValues: [] }
}

/**
 * Reconcile stored selections with the current field definition (handles config edits).
 */
export function mergeOptionSelectionWithField(
  field: RsvpFormField,
  stored: RsvpFieldOptionSelectionState | undefined
): RsvpFieldOptionSelectionState {
  const defaults = defaultOptionSelectionFromField(field)
  const validVals = new Set((field.options || []).map(o => o.value))
  if (validVals.size === 0) return defaults

  if (!stored) return defaults

  const order = stored.order.filter(v => validVals.has(v))
  for (const v of defaults.order) {
    if (!order.includes(v)) order.push(v)
  }
  const disabledValues = stored.disabledValues.filter(v => validVals.has(v))
  return { order, disabledValues }
}

export function isSelectableField(
  field: RsvpFormField
): field is RsvpFormField & { options: NonNullable<RsvpFormField['options']> } {
  return (field.type === 'select' || field.type === 'checkbox') && (field.options?.length ?? 0) > 0
}
