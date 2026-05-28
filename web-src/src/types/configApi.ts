/**
 * Scope Configs & Custom Attributes API type definitions
 *
 * Types matching the ESP scope config endpoints.
 *
 * NOTE: ESP enforces ONE config per scope. The single config can carry any
 * combination of slice fields (rsvpFormFields, locales, attributes). The
 * `type` discriminator is legacy and no longer required — slices are detected
 * by field presence. Saving from any tab should PUT to the existing config
 * (merging slices) or POST a new one if none exists.
 */

// ============================================================================
// Enums & Primitives
// ============================================================================

export type ConfigType = 'rsvp' | 'locales' | 'customAttributes'

export type RsvpFieldType = 'text' | 'email' | 'phone' | 'select' | 'multi-select'

export type RsvpDisplayAs = 'dropdown' | 'radio' | 'checkbox' | ''

export type CustomAttributeInputType = 'text' | 'boolean' | 'single-select' | 'multi-select'

// ============================================================================
// RSVP Form Field Models
// ============================================================================

/** A single option in a select/multi-select RSVP field.
 *  `value` is the locale-independent DB key; `label` is the display text shown to users. */
export interface RsvpOption {
  value: string
  label: string
}

export interface RsvpFormField {
  field: string
  label: string
  placeholder: string
  type: RsvpFieldType
  required: boolean
  options: RsvpOption[]
  rules: string
  default: string
  displayAs: RsvpDisplayAs
}

/** Partial RSVP field for localization overrides (only translatable properties).
 *  Option overrides match base options by `value` and translate `label` only. */
export interface RsvpFormFieldLocaleOverride {
  field: string
  label?: string
  placeholder?: string
  options?: RsvpOption[]
}

// ============================================================================
// Scope Config Model
// ============================================================================

/** A single locale entry on the locales slice. `folder` is the URL path
 *  segment (empty string = default/root). */
export interface Locale {
  code: string
  name: string
  folder: string
}

/** Unified scope config — ESP stores at most one config per scope, with any
 *  combination of slice fields. Each tab in the UI edits one slice. */
export interface ScopeConfig {
  configId: string
  scopeId: string
  creationTime?: number
  modificationTime: number
  /** Legacy discriminator — written by older versions of EMC. Newer PUTs drop it. */
  type?: ConfigType
  label?: string
  // RSVP slice
  rsvpFormFields?: RsvpFormField[]
  localizations?: Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>
  // Locales slice
  locales?: Locale[]
  // Custom attributes slice
  attributes?: CustomAttributeConfig[]
}

/** Type aliases for slice-narrowed views. These are NOT separate configs — the
 *  same `ScopeConfig` may satisfy multiple of these at once. */
export type RsvpScopeConfig = ScopeConfig & {
  rsvpFormFields: RsvpFormField[]
  localizations?: Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>
}

export type LocalesScopeConfig = ScopeConfig & {
  locales: Locale[]
}

export type CustomAttributesScopeConfig = ScopeConfig & {
  attributes: CustomAttributeConfig[]
}

export const hasRsvpSlice = (c: ScopeConfig | null | undefined): c is RsvpScopeConfig =>
  !!c && Array.isArray(c.rsvpFormFields)

export const hasLocalesSlice = (c: ScopeConfig | null | undefined): c is LocalesScopeConfig =>
  !!c && Array.isArray(c.locales)

export const hasAttributesSlice = (c: ScopeConfig | null | undefined): c is CustomAttributesScopeConfig =>
  !!c && Array.isArray(c.attributes)

// ============================================================================
// Custom Attribute Models
// ============================================================================

export interface CustomAttributeValue {
  valueId?: string
  value: string
  label: string
  displayOrder: number
}

export interface CustomAttributeConfig {
  attributeId: string
  label?: string
  name: string
  inputType: CustomAttributeInputType
  enabled: boolean
  isRequired?: boolean
  values: CustomAttributeValue[]
}

// ============================================================================
// Request Bodies
// ============================================================================

/** POST body: at least one slice's fields. `type` is optional (legacy). */
export type ConfigCreateBody = Partial<Omit<ScopeConfig, 'configId' | 'creationTime' | 'modificationTime' | 'scopeId'>>

/** PUT body: full config minus identity/timestamp fields. `type` should be omitted. */
export type ConfigUpdateBody = Omit<ScopeConfig, 'configId' | 'creationTime'> & { configId?: string; creationTime?: number }

// ============================================================================
// Response Envelopes
// ============================================================================

export interface ConfigListResponse {
  configs: ScopeConfig[]
  count: number
  nextPageToken?: string | null
}
