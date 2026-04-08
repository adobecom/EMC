/**
 * Scope Configs & Custom Attributes API type definitions
 *
 * Types matching the ESP configs/custom-attributes endpoints.
 * Configs are scope-inherited (org -> team) and support three types:
 * rsvp, locales, and custom-attributes.
 */

// ============================================================================
// Enums & Primitives
// ============================================================================

export type ConfigType = 'rsvp' | 'locales' | 'custom-attributes'

export type RsvpFieldType = 'text' | 'email' | 'phone' | 'select' | 'multi-select'

export type RsvpDisplayAs = 'dropdown' | 'radio' | 'checkbox' | ''

export type CustomAttributeInputType = 'text' | 'boolean' | 'single-select' | 'multi-select'

// ============================================================================
// RSVP Form Field Models
// ============================================================================

export interface RsvpFormField {
  field: string
  label: string
  placeholder: string
  type: RsvpFieldType
  required: boolean
  options: string[]
  rules: string
  default: string
  displayAs: RsvpDisplayAs
}

/** Partial RSVP field for localization overrides (only translatable properties) */
export interface RsvpFormFieldLocaleOverride {
  field: string
  label?: string
  placeholder?: string
  options?: string[]
}

// ============================================================================
// Scope Config Models
// ============================================================================

interface ScopeConfigBase {
  configId: string
  type: ConfigType
  scopeId: string
  creationTime: number
  modificationTime: number
}

export interface RsvpScopeConfig extends ScopeConfigBase {
  type: 'rsvp'
  rsvpFormFields: RsvpFormField[]
  localizations: Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>
}

export interface LocalesScopeConfig extends ScopeConfigBase {
  type: 'locales'
  localeNames: Record<string, string>
  localeUrlCodes: Record<string, string>
}

export interface CustomAttributesScopeConfig extends ScopeConfigBase {
  type: 'custom-attributes'
  attributes: CustomAttributeConfig[]
}

export type ScopeConfig = RsvpScopeConfig | LocalesScopeConfig | CustomAttributesScopeConfig

// ============================================================================
// Custom Attribute Models
// ============================================================================

export interface CustomAttributeValue {
  valueId?: string
  value: string
  displayOrder: number
}

export interface CustomAttributeConfig {
  attributeId: string
  name: string
  inputType: CustomAttributeInputType
  enabled: boolean
  values: CustomAttributeValue[]
}

// ============================================================================
// Request Bodies
// ============================================================================

export interface RsvpConfigCreateBody {
  type: 'rsvp'
  rsvpFormFields: RsvpFormField[]
  localizations?: Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>
}

export interface LocalesConfigCreateBody {
  type: 'locales'
  localeNames: Record<string, string>
  localeUrlCodes: Record<string, string>
}

export interface CustomAttributesConfigCreateBody {
  type: 'custom-attributes'
  attributes: CustomAttributeConfig[]
}

export type ConfigCreateBody =
  | RsvpConfigCreateBody
  | LocalesConfigCreateBody
  | CustomAttributesConfigCreateBody

export type ConfigUpdateBody = ScopeConfig

// ============================================================================
// Response Envelopes
// ============================================================================

export interface ConfigListResponse {
  configs: ScopeConfig[]
  count: number
  nextPageToken?: string | null
}
