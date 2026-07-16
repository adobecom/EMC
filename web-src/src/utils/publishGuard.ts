/*
 * Publish guard — validates all required fields across event form steps
 * before allowing publish. Returns structured missing-field info for the dialog.
 */

import type { EventFormData } from '../types/domain'
import type { CustomAttributeConfig } from '../types/configApi'

export interface MissingField {
  fieldLabel: string
  context?: string
}

export interface MissingFieldGroup {
  stepTitle: string
  fields: MissingField[]
}

export interface PublishGuardResult {
  valid: boolean
  missingByStep: MissingFieldGroup[]
}

export interface PublishGuardInput {
  formData: EventFormData
  hasVenue: boolean
}

export function validateForPublish({ formData, hasVenue }: PublishGuardInput): PublishGuardResult {
  const missingByStep: MissingFieldGroup[] = []

  // ── Step 1: Basic Info ──────────────────────────────────────────────
  const step1: MissingField[] = []

  if (!formData.seriesId) {
    step1.push({ fieldLabel: 'Series' })
  }
  if (!formData.name?.trim()) {
    step1.push({ fieldLabel: 'Event Title' })
  }
  if (!formData.language) {
    step1.push({ fieldLabel: 'Language' })
  }
  if (!formData.shortDescription?.trim()) {
    step1.push({ fieldLabel: 'Event Description for Events Hub and SEO' })
  }
  if (!formData.startDateTime) {
    step1.push({ fieldLabel: 'Start Date & Time' })
  }
  if (!formData.endDateTime) {
    step1.push({ fieldLabel: 'End Date & Time' })
  }
  if (!formData.timezone?.trim()) {
    step1.push({ fieldLabel: 'Timezone' })
  }
  if (hasVenue && !formData.venue?.placeId) {
    step1.push({ fieldLabel: 'Venue Location' })
  }

  if (step1.length > 0) {
    missingByStep.push({ stepTitle: 'Basic Info', fields: step1 })
  }

  // ── Step 3: Additional Content (required custom attributes) ─────────
  const configs: CustomAttributeConfig[] = formData._customAttributeConfigs ?? []
  const customValues = formData.customAttributes ?? []
  const step3: MissingField[] = []

  for (const cfg of configs) {
    if (!cfg.isRequired) continue

    const hasValue = customValues.some(
      v => v.attributeId === cfg.attributeId && v.value?.trim() !== ''
    )
    if (!hasValue) {
      step3.push({ fieldLabel: cfg.name })
    }
  }

  if (step3.length > 0) {
    missingByStep.push({ stepTitle: 'Additional Content', fields: step3 })
  }

  return {
    valid: missingByStep.length === 0,
    missingByStep,
  }
}
