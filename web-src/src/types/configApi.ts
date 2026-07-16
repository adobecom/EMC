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

export type RsvpFieldType = 'text' | 'email' | 'phone' | 'number' | 'date' | 'url' | 'text-area' | 'select' | 'checkbox'

/** Render-style hint for `select`/`checkbox` fields. ESP's ScopeConfigRsvpField
 *  already stores this as a free-form string (openapi.json) — no BE change needed.
 *  `select` fields use 'dropdown' (default) | 'radio'; `checkbox` fields use
 *  'checkbox' (default, flat checkbox list) | 'dropdown' (compact multi-select
 *  dropdown widget). The attendee-facing renderer (event-libs' events-form.js)
 *  remaps its dispatch type based on this value. */
export type RsvpDisplayAs = 'dropdown' | 'radio' | 'checkbox'

export type CustomAttributeInputType = 'text' | 'single-select' | 'multi-select'

// ============================================================================
// RSVP Form Field Models
// ============================================================================

/** A single option in a select/checkbox RSVP field.
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
  default: string
  displayAs?: RsvpDisplayAs
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

export interface LocalesSlice {
  locales?: Locale[]
}

export interface RsvpSlice {
  rsvpFormFields?: RsvpFormField[]
  localizations?: Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>
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
  rsvp?: RsvpSlice
  locales?: LocalesSlice
  customAttributes?: CustomAttributeConfig[]
}

/** Type aliases for slice-narrowed views. These are NOT separate configs — the
 *  same `ScopeConfig` may satisfy multiple of these at once. */
export type RsvpScopeConfig = ScopeConfig & {
  rsvp: RsvpSlice & { rsvpFormFields: RsvpFormField[] }
}

export type LocalesScopeConfig = ScopeConfig & {
  locales: LocalesSlice
}

export type CustomAttributesScopeConfig = ScopeConfig & {
  customAttributes: CustomAttributeConfig[]
}

export const hasRsvpSlice = (c: ScopeConfig | null | undefined): c is RsvpScopeConfig =>
  !!c && Array.isArray(c.rsvp?.rsvpFormFields)

export const hasLocalesSlice = (c: ScopeConfig | null | undefined): c is LocalesScopeConfig =>
  !!c && c.locales != null && Array.isArray(c.locales.locales)

export const hasAttributesSlice = (c: ScopeConfig | null | undefined): c is CustomAttributesScopeConfig =>
  !!c && Array.isArray(c.customAttributes)

// ============================================================================
// Custom Attribute Models
// ============================================================================

export interface CustomAttributeValue {
  valueId?: string
  value: string
  label: string
  ordinal?: number
}

export interface CustomAttributeConfig {
  attributeId?: string
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

/** Upsert body for PUT /scopes/{id}/config — partial slice fields; server assigns configId. */
export type ScopeConfigUpsertBody = Partial<Omit<ScopeConfig, 'configId' | 'creationTime' | 'modificationTime' | 'scopeId'>>

// ============================================================================
// Response Envelopes
// ============================================================================

export interface ConfigListResponse {
  configs: ScopeConfig[]
  count: number
  nextPageToken?: string | null
}
