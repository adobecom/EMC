/**
 * ConfigManagement — Admin page for managing scope-level configs
 * (RSVP form fields, locale mappings, custom attributes).
 *
 * Layout:
 *   1. Scope selector (ComboBox) + scope type badge
 *   2. Tab switcher: RSVP Fields | Locale Mapping | Custom Attributes
 *   3. Tab-specific content with tables, expandable rows, and CRUD dialogs
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Badge,
  Button,
  ButtonGroup,
  TextField,
  Picker,
  PickerItem,
  ComboBox,
  ComboBoxItem,
  Text,
  DialogTrigger,
  Dialog,
  Content,
  Heading,
  Switch as SpectrumSwitch,
  ActionButton,
  AlertDialog,
  Divider,
  TabList,
  TabPanel,
  Tabs,
  Tab,
  Checkbox,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import EditIcon from '@react-spectrum/s2/icons/Edit'
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import RotateCCW from '@react-spectrum/s2/icons/RotateCCW'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import GearSettingIllustration from '@react-spectrum/s2/illustrations/linear/GearSetting'
import { useApi } from '../../contexts/ApiContext'
import { useToast, useGroup } from '../../contexts'
import { IMS } from '../../types'
import type { RBACApiScope, ScopeType } from '../../types/rbacApi'
import type {
  ScopeConfig,
  RsvpScopeConfig,
  LocalesScopeConfig,
  DomainScopeConfig,
  CustomAttributesScopeConfig,
  RsvpFormField,
  RsvpFormFieldLocaleOverride,
  RsvpOption,
  CustomAttributeConfig,
  CustomAttributeValue,
  CustomAttributeInputType,
  RsvpFieldType,
  RsvpDisplayAs,
} from '../../types/configApi'
import { hasRsvpSlice, hasLocalesSlice, hasDomainSlice, hasAttributesSlice } from '../../types/configApi'
import { BlurredLoadingOverlay } from '../../components/shared'
import { useHasPermission } from '../../hooks/useHasPermission'
import { SUPPORTED_SPEAKER_LOCALES, SPEAKER_LOCALE_LABELS } from '../../config/localeMapping'
import { normalizeRelatedDomain } from '../../utils/seriesFormAutoCorrect'

interface ConfigManagementProps {
  ims: IMS
}

const SCOPE_TYPE_VARIANTS: Record<ScopeType, 'positive' | 'informative' | 'neutral'> = {
  platform: 'positive',
  org: 'informative',
  team: 'neutral',
}

const RSVP_FIELD_TYPES: { key: RsvpFieldType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'select', label: 'Select' },
  { key: 'checkbox', label: 'Checkbox' },
]

/** Render-style options for a `select`/`checkbox` RSVP field. The attendee-facing
 *  renderer (event-libs' events-form.js) remaps its dispatch type based on this
 *  value — see RsvpDisplayAs doc comment in types/configApi.ts.
 *  Note: `'dropdown'` means different widgets per type (single-select dropdown
 *  for `select`, multi-select dropdown for `checkbox`) — switching `type` while
 *  `displayAs` is `'dropdown'` intentionally carries the value over rather than
 *  resetting, since it's valid for both. */
function getDisplayAsOptions(type: RsvpFieldType): { key: RsvpDisplayAs; label: string }[] {
  if (type === 'select') return [
    { key: 'dropdown', label: 'Dropdown' },
    { key: 'radio', label: 'Radio' },
  ]
  if (type === 'checkbox') return [
    { key: 'checkbox', label: 'Checkbox' },
    { key: 'dropdown', label: 'Multi-select dropdown' },
  ]
  return []
}

/** Default `displayAs` for a given type — used when creating a field or when
 *  switching `type` away from a value the current `displayAs` isn't valid for. */
function getDefaultDisplayAs(type: RsvpFieldType): RsvpDisplayAs | undefined {
  const options = getDisplayAsOptions(type)
  return options.length > 0 ? options[0].key : undefined
}

export const ATTRIBUTE_INPUT_TYPES: { key: CustomAttributeInputType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'single-select', label: 'Single Select' },
  { key: 'multi-select', label: 'Multi Select' },
]

/** Build a PUT body that preserves all existing slices and merges in updates.
 *  Drops the legacy `type` discriminator — slices are detected by field presence. */
function buildPutBody(existing: ScopeConfig, updates: Partial<ScopeConfig>): ScopeConfig {
  const { type: _legacyType, ...rest } = existing
  return { ...rest, ...updates }
}

function createEmptyRsvpField(): RsvpFormField {
  return {
    field: '',
    label: '',
    placeholder: '',
    type: 'text',
    required: false,
    options: [],
    default: '',
  }
}

const CAMEL_CASE_PATTERN = /^[a-z][a-zA-Z0-9]*$/

/** Validates an RSVP field's Field Name: must be camelCase and unique among sibling fields. */
function getFieldNameError(name: string, siblingNames: string[]): string | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  if (!CAMEL_CASE_PATTERN.test(trimmed)) return 'Must be camelCase (e.g. firstName)'
  if (siblingNames.some(n => n === trimmed)) return 'Field name must be unique'
  return undefined
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConfigManagement: React.FC<ConfigManagementProps> = () => {
  const apiService = useApi()
  const toast = useToast()
  const { groups: userMemberGroups } = useGroup()

  // Permissions
  const canWriteConfig = useHasPermission('config', 'write')
  const canDeleteConfig = useHasPermission('config', 'delete')

  // ============================================================================
  // SCOPE STATE
  // ============================================================================

  const [scopes, setScopes] = useState<RBACApiScope[]>([])
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null)
  const [scopeFilterText, setScopeFilterText] = useState('')
  const [myScopesOnly, setMyScopesOnly] = useState(false)
  const [isLoadingScopes, setIsLoadingScopes] = useState(true)

  // ============================================================================
  // CONFIG STATE
  // ============================================================================

  const [configs, setConfigs] = useState<ScopeConfig[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('locales')

  // ============================================================================
  // RSVP DIALOG STATE
  // ============================================================================

  const [isRsvpFormOpen, setIsRsvpFormOpen] = useState(false)
  const [editingRsvpConfig, setEditingRsvpConfig] = useState<RsvpScopeConfig | null>(null)
  const [rsvpFormFields, setRsvpFormFields] = useState<RsvpFormField[]>([])
  const [rsvpLocalizations, setRsvpLocalizations] = useState<Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>>({})
  const [rsvpConfigToDelete, setRsvpConfigToDelete] = useState<ScopeConfig | null>(null)
  // Collapsible field cards in RSVP dialog
  const [expandedRsvpDialogFields, setExpandedRsvpDialogFields] = useState<Set<number>>(new Set([0]))
  // Active locale for the RSVP dashboard locale switcher
  const [activeLocale, setActiveLocale] = useState<string | null>(null)

  // Per-field inline actions
  const [editingFieldDialog, setEditingFieldDialog] = useState<{ field: RsvpFormField; index: number } | null>(null)
  const [editingFieldForm, setEditingFieldForm] = useState<RsvpFormField>(createEmptyRsvpField())
  const [fieldToDelete, setFieldToDelete] = useState<{ field: RsvpFormField; index: number } | null>(null)
  const [expandedFieldKeys, setExpandedFieldKeys] = useState<Set<string>>(new Set())
  const [expandedAttrKeys, setExpandedAttrKeys] = useState<Set<string>>(new Set())

  const handleAddRsvpField = () => {
    const newIndex = rsvpFormFields.length
    setRsvpFormFields(prev => [...prev, createEmptyRsvpField()])
    setExpandedRsvpDialogFields(prev => new Set([...prev, newIndex]))
  }

  // ============================================================================
  // LOCALES DIALOG STATE
  // ============================================================================

  const [isLocalesFormOpen, setIsLocalesFormOpen] = useState(false)
  const [editingLocalesConfig, setEditingLocalesConfig] = useState<LocalesScopeConfig | null>(null)
  const [localeEntries, setLocaleEntries] = useState<Array<{ code: string; name: string; folder: string }>>([])
  const [localesToDelete, setLocalesToDelete] = useState<ScopeConfig | null>(null)

  // ============================================================================
  // DOMAIN DIALOG STATE
  // ============================================================================

  const [isDomainFormOpen, setIsDomainFormOpen] = useState(false)
  const [editingDomainConfig, setEditingDomainConfig] = useState<DomainScopeConfig | null>(null)
  const [domainProdDomain, setDomainProdDomain] = useState('')
  const [domainStageDomain, setDomainStageDomain] = useState('')
  const [domainToDelete, setDomainToDelete] = useState<ScopeConfig | null>(null)

  // ============================================================================
  // CUSTOM ATTRIBUTE DIALOG STATE
  // ============================================================================

  const [isAttrFormOpen, setIsAttrFormOpen] = useState(false)
  const [editingAttr, setEditingAttr] = useState<CustomAttributeConfig | null>(null)
  const [attrFormName, setAttrFormName] = useState('')
  const [attrFormLabel, setAttrFormLabel] = useState('')
  const [attrFormInputType, setAttrFormInputType] = useState<CustomAttributeInputType>('text')
  const [attrFormValues, setAttrFormValues] = useState<CustomAttributeValue[]>([])
  const [attrFormEnabled, setAttrFormEnabled] = useState(true)
  const [attrToDelete, setAttrToDelete] = useState<string | null>(null)

  // Action state
  const [isSaving, setIsSaving] = useState(false)

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const selectedScope = useMemo(
    () => scopes.find(s => s.scopeId === selectedScopeId) || null,
    [scopes, selectedScopeId]
  )

  const scopeIdsImMemberOf = useMemo(() => {
    const ids = new Set<string>()
    for (const g of userMemberGroups) {
      if (g.scopeId) ids.add(g.scopeId)
    }
    return ids
  }, [userMemberGroups])

  // Filter to org/team scopes only (configs can't be at platform level)
  const scopesForPicker = useMemo(() => {
    let filtered = scopes.filter(s => s.type === 'org' || s.type === 'team')
    if (myScopesOnly) filtered = filtered.filter(s => scopeIdsImMemberOf.has(s.scopeId))
    return filtered
  }, [scopes, myScopesOnly, scopeIdsImMemberOf])

  const filteredScopes = useMemo(() => {
    const items = scopesForPicker.map(s => ({ id: s.scopeId, name: s.name, type: s.type }))
    if (!scopeFilterText) return items
    const lower = scopeFilterText.toLowerCase()
    return items.filter(s => s.name.toLowerCase().includes(lower) || s.type.toLowerCase().includes(lower))
  }, [scopesForPicker, scopeFilterText])

  // ESP enforces one config per scope. All three tabs read/write slices of this
  // single config; saves PUT to scopeConfig.configId when one exists.
  const scopeConfig = useMemo<ScopeConfig | null>(() => configs[0] || null, [configs])

  const rsvpConfig = useMemo<RsvpScopeConfig | null>(
    () => (hasRsvpSlice(scopeConfig) ? scopeConfig : null),
    [scopeConfig]
  )
  const localesConfig = useMemo<LocalesScopeConfig | null>(
    () => (hasLocalesSlice(scopeConfig) ? scopeConfig : null),
    [scopeConfig]
  )
  const domainConfig = useMemo<DomainScopeConfig | null>(
    () => (hasDomainSlice(scopeConfig) ? scopeConfig : null),
    [scopeConfig]
  )
  const customAttrsConfig = useMemo<CustomAttributesScopeConfig | null>(
    () => (hasAttributesSlice(scopeConfig) ? scopeConfig : null),
    [scopeConfig]
  )

  // Distinguishes own configs from inherited (ancestor-scope) configs. The user
  // can only PUT a config owned by the currently-selected scope; an inherited
  // config requires POST-to-create-own to "fork" it.
  const ownsConfig = useMemo(
    () => !!scopeConfig && scopeConfig.scopeId === selectedScopeId,
    [scopeConfig, selectedScopeId]
  )
  // Available locales for RSVP localization (from sibling locales config or fallback)
  const availableLocales = useMemo(() => {
    if (localesConfig) {
      return (localesConfig.locales.locales ?? []).map(l => ({ code: l.code, name: l.name }))
    }
    return SUPPORTED_SPEAKER_LOCALES.map(code => ({
      code,
      name: SPEAKER_LOCALE_LABELS[code] || code,
    }))
  }, [localesConfig])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadScopes = useCallback(async () => {
    setIsLoadingScopes(true)
    try {
      const result = await apiService.getScopes()
      if (!('error' in result)) setScopes(result)
    } catch {
      // Handled by consumers
    } finally {
      setIsLoadingScopes(false)
    }
  }, [apiService])

  const loadConfigs = useCallback(async () => {
    if (!selectedScopeId) {
      setConfigs([])
      return
    }
    setIsLoadingConfigs(true)
    try {
      const result = await apiService.getConfig(selectedScopeId)
      if (result === null) setConfigs([])
      else if (!('error' in result)) setConfigs([result])
    } catch {
      // Errors handled silently — consumer shows empty state
    } finally {
      setIsLoadingConfigs(false)
    }
  }, [apiService, selectedScopeId])

  useEffect(() => { loadScopes() }, [loadScopes])
  useEffect(() => { loadConfigs() }, [loadConfigs])

  // Clear state on scope change
  useEffect(() => {
    setExpandedFieldKeys(new Set())
    setActiveLocale(null)
  }, [selectedScopeId])

  // Drop scope selection if it falls outside the picker pool
  useEffect(() => {
    if (!selectedScopeId) return
    if (!scopesForPicker.some(s => s.scopeId === selectedScopeId)) {
      setSelectedScopeId(null)
    }
  }, [selectedScopeId, scopesForPicker])

  // ============================================================================
  // RSVP CONFIG CRUD
  // ============================================================================

  const openRsvpCreate = useCallback(() => {
    setEditingRsvpConfig(null)
    setRsvpFormFields([createEmptyRsvpField()])
    setRsvpLocalizations({})
    setExpandedRsvpDialogFields(new Set([0]))
    setIsRsvpFormOpen(true)
  }, [])

  const openRsvpEdit = useCallback((config: RsvpScopeConfig) => {
    setEditingRsvpConfig(config)
    setRsvpFormFields([...(config.rsvp?.rsvpFormFields ?? [])])
    setRsvpLocalizations(config.rsvp?.localizations ? JSON.parse(JSON.stringify(config.rsvp.localizations)) : {})
    setExpandedRsvpDialogFields(new Set([0]))
    setIsRsvpFormOpen(true)
  }, [])

  // Helpers for reading/writing locale overrides inside the RSVP dialog.
  // These use `activeLocale` (the table toolbar locale switcher) so the dialog
  // reflects whichever locale is selected on the page when it opens.
  const getDialogLocaleFieldValue = useCallback((fieldName: string, key: 'label' | 'placeholder'): string => {
    if (!activeLocale) return ''
    return rsvpLocalizations[activeLocale]?.rsvpFormFields?.find(f => f.field === fieldName)?.[key] ?? ''
  }, [activeLocale, rsvpLocalizations])

  const getDialogLocaleOptionLabel = useCallback((fieldName: string, optValue: string): string => {
    if (!activeLocale) return ''
    return rsvpLocalizations[activeLocale]?.rsvpFormFields?.find(f => f.field === fieldName)?.options?.find(o => o.value === optValue)?.label ?? ''
  }, [activeLocale, rsvpLocalizations])

  const setDialogLocaleFieldValue = useCallback((fieldName: string, updates: Partial<RsvpFormFieldLocaleOverride>) => {
    if (!activeLocale) return
    const locale = activeLocale
    setRsvpLocalizations(prev => {
      const localeData = { ...(prev[locale] ?? { rsvpFormFields: [] }) }
      const fields = [...localeData.rsvpFormFields]
      const idx = fields.findIndex(f => f.field === fieldName)
      const entry = { ...(idx >= 0 ? fields[idx] : { field: fieldName }), ...updates }
      if (idx >= 0) fields[idx] = entry
      else fields.push(entry)
      return { ...prev, [locale]: { rsvpFormFields: fields } }
    })
  }, [activeLocale])

  const setDialogLocaleOptionLabel = useCallback((fieldName: string, optValue: string, newLabel: string) => {
    if (!activeLocale) return
    const locale = activeLocale
    setRsvpLocalizations(prev => {
      const localeData = { ...(prev[locale] ?? { rsvpFormFields: [] }) }
      const fields = [...localeData.rsvpFormFields]
      const idx = fields.findIndex(f => f.field === fieldName)
      const existing = idx >= 0 ? fields[idx] : { field: fieldName }
      const baseField = rsvpFormFields.find(f => f.field === fieldName)
      const baseOptions = baseField?.options ?? []
      const currentOptions = existing.options ?? []
      const updatedOptions = baseOptions.map(o => {
        if (o.value === optValue) return { value: o.value, label: newLabel }
        const cur = currentOptions.find(co => co.value === o.value)
        return { value: o.value, label: cur?.label ?? '' }
      }).filter(o => o.label.trim())
      const entry = { ...existing, options: updatedOptions.length > 0 ? updatedOptions : undefined }
      if (idx >= 0) fields[idx] = entry
      else fields.push(entry)
      return { ...prev, [locale]: { rsvpFormFields: fields } }
    })
  }, [activeLocale, rsvpFormFields])

  const hasRsvpFieldNameErrors = useMemo(() => (
    rsvpFormFields.some((f, i) => !!getFieldNameError(f.field, rsvpFormFields.filter((_, si) => si !== i).map(sf => sf.field.trim())))
  ), [rsvpFormFields])

  const handleSaveRsvpConfig = useCallback(async () => {
    if (!selectedScopeId) return
    const validFields = rsvpFormFields.filter(f => f.field.trim() && f.label.trim())
    if (validFields.length === 0) {
      toast.error('At least one field with a name and label is required')
      return
    }
    if (hasRsvpFieldNameErrors) {
      toast.error('Fix field name errors before saving — names must be camelCase and unique')
      return
    }

    setIsSaving(true)
    try {
      const body = scopeConfig && ownsConfig
        ? buildPutBody(scopeConfig, { rsvp: { rsvpFormFields: validFields, localizations: rsvpLocalizations } })
        : { rsvp: { rsvpFormFields: validFields, localizations: rsvpLocalizations } }
      const result = await apiService.upsertConfig(selectedScopeId, body)
      if ('error' in result) {
        toast.error('Failed to save RSVP config')
        return
      }
      toast.success(editingRsvpConfig ? 'RSVP config updated' : 'RSVP config created')
      setIsRsvpFormOpen(false)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save RSVP config')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, rsvpFormFields, rsvpLocalizations, hasRsvpFieldNameErrors, editingRsvpConfig, scopeConfig, ownsConfig, apiService, toast, loadConfigs])

  const openFieldEdit = useCallback((item: RsvpFormField & { _key: string }) => {
    const index = rsvpConfig?.rsvp.rsvpFormFields.findIndex(f => f.field === item.field) ?? -1
    if (index === -1) return
    setEditingFieldDialog({ field: item, index })
    if (activeLocale) {
      const override = rsvpConfig?.rsvp?.localizations?.[activeLocale]?.rsvpFormFields?.find((f: RsvpFormFieldLocaleOverride) => f.field === item.field)
      // Non-translatable fields from base; translatable fields from locale override (blank if no override)
      setEditingFieldForm({
        ...item,
        label: override?.label ?? '',
        placeholder: override?.placeholder ?? '',
        options: item.options.map((o: RsvpOption) => ({
          value: o.value,
          label: override?.options?.find((oo: RsvpOption) => oo.value === o.value)?.label ?? '',
        })),
      })
    } else {
      setEditingFieldForm({ ...item })
    }
  }, [rsvpConfig, activeLocale])

  // Reference to the original base field used by handleSaveFieldEdit in locale mode
  // (captured at the time the dialog was opened, not reactive)
  const editingFieldBaseRef = React.useRef<RsvpFormField | null>(null)
  React.useEffect(() => {
    if (editingFieldDialog) {
      editingFieldBaseRef.current = rsvpConfig?.rsvp.rsvpFormFields[editingFieldDialog.index] ?? null
    } else {
      editingFieldBaseRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingFieldDialog])

  const editingFieldNameError = useMemo(() => {
    if (editingFieldDialog == null) return undefined
    const siblingNames = (rsvpConfig?.rsvp.rsvpFormFields ?? [])
      .filter((_, i) => i !== editingFieldDialog.index)
      .map(f => f.field.trim())
    return getFieldNameError(editingFieldForm.field, siblingNames)
  }, [editingFieldDialog, editingFieldForm.field, rsvpConfig])

  const handleSaveFieldEdit = useCallback(async () => {
    if (!selectedScopeId || !rsvpConfig || editingFieldDialog == null) return
    if (editingFieldNameError) {
      toast.error(editingFieldNameError)
      return
    }
    setIsSaving(true)
    try {
      let updatedFields = [...rsvpConfig.rsvp.rsvpFormFields]
      let updatedLocalizations = rsvpConfig.rsvp?.localizations
        ? JSON.parse(JSON.stringify(rsvpConfig.rsvp.localizations)) as Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>
        : {}

      if (activeLocale) {
        // Save non-translatable fields to the base field
        const baseField = editingFieldBaseRef.current ?? rsvpConfig.rsvp.rsvpFormFields[editingFieldDialog.index]
        updatedFields[editingFieldDialog.index] = {
          ...baseField,
          field: editingFieldForm.field,
          type: editingFieldForm.type,
          required: editingFieldForm.required,
          default: editingFieldForm.default,
          displayAs: editingFieldForm.displayAs,
          // base-level label/placeholder/options stay from baseField (not locale values)
        }
        // Save translatable fields to locale override
        const override: RsvpFormFieldLocaleOverride = {
          field: editingFieldForm.field,
          label: editingFieldForm.label || undefined,
          placeholder: editingFieldForm.placeholder || undefined,
          options: editingFieldForm.options.some(o => o.label.trim())
            ? editingFieldForm.options.filter(o => o.label.trim())
            : undefined,
        }
        if (!updatedLocalizations[activeLocale]) updatedLocalizations[activeLocale] = { rsvpFormFields: [] }
        const localeFields = updatedLocalizations[activeLocale].rsvpFormFields
        const existingIdx = localeFields.findIndex(f => f.field === override.field)
        if (existingIdx >= 0) localeFields[existingIdx] = override
        else localeFields.push(override)
        updatedLocalizations[activeLocale].rsvpFormFields = localeFields.filter(
          f => f.label || f.placeholder || (f.options && f.options.length > 0)
        )
        if (updatedLocalizations[activeLocale].rsvpFormFields.length === 0) delete updatedLocalizations[activeLocale]
      } else {
        updatedFields[editingFieldDialog.index] = editingFieldForm
      }

      const result = await apiService.upsertConfig(selectedScopeId, buildPutBody(rsvpConfig, {
        rsvp: { rsvpFormFields: updatedFields, localizations: updatedLocalizations },
      }))
      if ('error' in result) {
        toast.error('Failed to update field')
        return
      }
      toast.success('Field updated')
      setEditingFieldDialog(null)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update field')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, rsvpConfig, editingFieldDialog, editingFieldForm, editingFieldNameError, activeLocale, apiService, toast, loadConfigs])

  const handleDeleteField = useCallback(async () => {
    if (!selectedScopeId || !rsvpConfig || fieldToDelete == null) return
    const updatedFields = rsvpConfig.rsvp.rsvpFormFields.filter((_, i) => i !== fieldToDelete.index)
    setIsSaving(true)
    try {
      const result = await apiService.upsertConfig(selectedScopeId, buildPutBody(rsvpConfig, {
        rsvp: { rsvpFormFields: updatedFields },
      }))
      if ('error' in result) {
        toast.error('Failed to delete field')
        return
      }
      toast.success('Field deleted')
      setFieldToDelete(null)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete field')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, rsvpConfig, fieldToDelete, apiService, toast, loadConfigs])

  /** Deletes a slice from the scope's single config. If any other slice remains,
   *  the config is PUT with the slice's fields cleared; otherwise the whole
   *  config is DELETEd. */
  const deleteSlice = useCallback(async (
    config: ScopeConfig,
    sliceKind: 'rsvp' | 'locales' | 'domain' | 'customAttributes',
    label: string,
  ) => {
    if (!selectedScopeId) return
    setIsSaving(true)
    try {
      const stripped: ScopeConfig = { ...config }
      if (sliceKind === 'rsvp') {
        delete stripped.rsvp
      } else if (sliceKind === 'locales') {
        delete stripped.locales
      } else if (sliceKind === 'domain') {
        delete stripped.domain
      } else {
        delete stripped.customAttributes
      }

      const result = await apiService.upsertConfig(selectedScopeId, buildPutBody(stripped, {}))

      if ('error' in result) {
        toast.error(`Failed to delete ${label}`)
        return
      }
      toast.success(`${label} deleted`)
      setRsvpConfigToDelete(null)
      setLocalesToDelete(null)
      setAttrToDelete(null)
      setDomainToDelete(null)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${label}`)
    } finally {
      setIsSaving(false)
    }
  }, [apiService, selectedScopeId, toast, loadConfigs])

  // ============================================================================
  // LOCALES CONFIG CRUD
  // ============================================================================

  const openLocalesCreate = useCallback(() => {
    setEditingLocalesConfig(null)
    setLocaleEntries([{ code: 'en-US', name: 'English, United States', folder: '' }])
    setIsLocalesFormOpen(true)
  }, [])

  const openLocalesEdit = useCallback((config: LocalesScopeConfig) => {
    setEditingLocalesConfig(config)
    const entries = (config.locales.locales ?? []).map(l => ({
      code: l.code,
      name: l.name,
      folder: l.folder || '',
    }))
    setLocaleEntries(entries.length > 0 ? entries : [{ code: '', name: '', folder: '' }])
    setIsLocalesFormOpen(true)
  }, [])

  const handleSaveLocalesConfig = useCallback(async () => {
    if (!selectedScopeId) return
    const validEntries = localeEntries.filter(e => e.code.trim() && e.name.trim())
    if (validEntries.length === 0) {
      toast.error('At least one locale entry is required')
      return
    }

    const locales = validEntries.map(entry => ({
      code: entry.code.trim(),
      name: entry.name.trim(),
      folder: entry.folder.trim(),
    }))

    setIsSaving(true)
    try {
      const body = scopeConfig && ownsConfig
        ? buildPutBody(scopeConfig, { locales: { locales } })
        : { locales: { locales } }
      const result = await apiService.upsertConfig(selectedScopeId, body)
      if ('error' in result) {
        toast.error('Failed to save locales config')
        return
      }
      toast.success(editingLocalesConfig ? 'Locales config updated' : 'Locales config created')
      setIsLocalesFormOpen(false)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save locales config')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, localeEntries, editingLocalesConfig, scopeConfig, ownsConfig, apiService, toast, loadConfigs])

  // ============================================================================
  // DOMAIN CONFIG CRUD
  // ============================================================================

  const openDomainCreate = useCallback(() => {
    setEditingDomainConfig(null)
    setDomainProdDomain('')
    setDomainStageDomain('')
    setIsDomainFormOpen(true)
  }, [])

  const openDomainEdit = useCallback((config: DomainScopeConfig) => {
    setEditingDomainConfig(config)
    setDomainProdDomain(config.domain.prodDomain ?? '')
    setDomainStageDomain(config.domain.stageDomain ?? '')
    setIsDomainFormOpen(true)
  }, [])

  const handleSaveDomainConfig = useCallback(async () => {
    if (!selectedScopeId) return
    const prodDomain = normalizeRelatedDomain(domainProdDomain)
    const stageDomain = normalizeRelatedDomain(domainStageDomain)
    if (!prodDomain && !stageDomain) {
      toast.error('At least one of Prod Domain or Stage Domain is required')
      return
    }

    setIsSaving(true)
    try {
      const domain = {
        ...(prodDomain ? { prodDomain } : {}),
        ...(stageDomain ? { stageDomain } : {}),
      }
      const body = scopeConfig && ownsConfig
        ? buildPutBody(scopeConfig, { domain })
        : { domain }
      const result = await apiService.upsertConfig(selectedScopeId, body)
      if ('error' in result) {
        toast.error('Failed to save domain config')
        return
      }
      toast.success(editingDomainConfig ? 'Domain config updated' : 'Domain config created')
      setIsDomainFormOpen(false)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save domain config')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, domainProdDomain, domainStageDomain, editingDomainConfig, scopeConfig, ownsConfig, apiService, toast, loadConfigs])

  // ============================================================================
  // CUSTOM ATTRIBUTE CRUD
  // ============================================================================

  const openAttrCreate = useCallback(() => {
    setEditingAttr(null)
    setAttrFormName('')
    setAttrFormLabel('')
    setAttrFormInputType('text')
    setAttrFormValues([])
    setAttrFormEnabled(true)
    setIsAttrFormOpen(true)
  }, [])

  const openAttrEdit = useCallback((attr: CustomAttributeConfig) => {
    setEditingAttr(attr)
    setAttrFormName(attr.name)
    setAttrFormLabel(attr.label ?? '')
    setAttrFormInputType(attr.inputType)
    setAttrFormValues(attr.values.map(v => ({ ...v, label: v.label ?? '' })))
    setAttrFormEnabled(attr.enabled)
    setIsAttrFormOpen(true)
  }, [])

  const handleSaveAttr = useCallback(async () => {
    if (!selectedScopeId || !attrFormName.trim()) {
      toast.error('Name is required')
      return
    }

    const isSelectType = attrFormInputType === 'single-select' || attrFormInputType === 'multi-select'
    const attrConfig: CustomAttributeConfig = {
      ...(editingAttr?.attributeId ? { attributeId: editingAttr.attributeId } : {}),
      name: attrFormName.trim(),
      label: attrFormLabel.trim() || attrFormName.trim(),
      inputType: attrFormInputType,
      enabled: attrFormEnabled,
      values: isSelectType
        ? attrFormValues.filter(v => v.value.trim()).map((v, i) => ({
            ...(v.valueId ? { valueId: v.valueId } : {}),
            label: v.label,
            value: v.value,
            ordinal: i,
          }))
        : [],
    }

    setIsSaving(true)
    try {
      const existing = scopeConfig?.customAttributes ?? []
      const updatedAttrs = editingAttr
        ? existing.map(a => a.attributeId === attrConfig.attributeId ? attrConfig : a)
        : [...existing, attrConfig]
      const body = scopeConfig && ownsConfig
        ? buildPutBody(scopeConfig, { customAttributes: updatedAttrs })
        : { customAttributes: updatedAttrs }
      const result = await apiService.upsertConfig(selectedScopeId, body)
      if ('error' in result) {
        toast.error(`Failed to ${editingAttr ? 'update' : 'create'} custom attribute`)
        return
      }
      toast.success(`Custom attribute ${editingAttr ? 'updated' : 'created'}`)
      setIsAttrFormOpen(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save custom attribute')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, attrFormName, attrFormLabel, attrFormInputType, attrFormEnabled, attrFormValues, editingAttr, scopeConfig, ownsConfig, apiService, toast, loadConfigs])

  // ============================================================================
  // RSVP TABLE DATA
  // ============================================================================

  const rsvpFieldsForTable = useMemo(() => {
    if (!rsvpConfig) return []
    return rsvpConfig.rsvp.rsvpFormFields.map((f, i) => ({
      ...f,
      _key: `${f.field}-${i}`,
    }))
  }, [rsvpConfig])

  const isOwnRsvpConfig = rsvpConfig?.scopeId === selectedScopeId

  // ============================================================================
  // CUSTOM ATTRIBUTES TABLE
  // ============================================================================

  const isOwnAttrsConfig = customAttrsConfig?.scopeId === selectedScopeId

  // ============================================================================
  // LOADING OVERLAY
  // ============================================================================

  const { loadingOverlayVisible, savingOverlayVisible } = useMemo(() => {
    const isBlockingDialogOpen =
      isRsvpFormOpen || isLocalesFormOpen || isDomainFormOpen || isAttrFormOpen ||
      rsvpConfigToDelete != null || localesToDelete != null || domainToDelete != null || attrToDelete != null
    return {
      loadingOverlayVisible: (isLoadingScopes || isLoadingConfigs) && !isSaving,
      savingOverlayVisible: isSaving && !isBlockingDialogOpen,
    }
  }, [
    isRsvpFormOpen, isLocalesFormOpen, isDomainFormOpen, isAttrFormOpen,
    rsvpConfigToDelete, localesToDelete, domainToDelete, attrToDelete,
    isLoadingScopes, isLoadingConfigs,
    isSaving,
  ])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ padding: 32, maxWidth: 1400, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 32 })}>
        <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'start' })}>
          <Heading level={1}>Configuration Management</Heading>
          <SpectrumSwitch isSelected={myScopesOnly} onChange={setMyScopesOnly}>
            Show my scopes only
          </SpectrumSwitch>
        </div>

        {/* Scope selector */}
        <div>
          <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap' })}>
            <div className={style({ display: 'flex', alignItems: 'end', gap: 8 })}>
              <ComboBox
                label={`Select Scope (${filteredScopes.length} scope${filteredScopes.length === 1 ? '' : 's'} available)`}
                selectedKey={selectedScopeId}
                onSelectionChange={(key) => setSelectedScopeId(key as string | null)}
                onInputChange={setScopeFilterText}
                defaultItems={filteredScopes}
                styles={style({ width: 480 })}
                menuTrigger="input"
                menuWidth={480}
                allowsCustomValue={false}
              >
                {(item) => (
                  <ComboBoxItem id={item.id} textValue={item.name}>
                    <Text slot="label">{item.name}</Text>
                    <Text slot="description">{item.type}</Text>
                  </ComboBoxItem>
                )}
              </ComboBox>

              {selectedScope && (
                <div className={style({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 })}>
                  <Badge variant={SCOPE_TYPE_VARIANTS[selectedScope.type] || 'neutral'} UNSAFE_style={{ marginRight: 40 }}>
                    {selectedScope.type}
                  </Badge>
                  <Button
                    size="S"
                    variant="secondary"
                    onPress={() => {
                      setSelectedScopeId(null)
                      setScopeFilterText('')
                    }}
                  >
                    <RotateCCW />
                    <Text>Reset scope</Text>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Divider styles={style({ marginBottom: 56 })} />

        {/* Tab content */}
        {selectedScopeId ? (
          <Tabs aria-label="Configuration types" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
            <TabList>
              <Tab id="rsvp">RSVP Fields</Tab>
              <Tab id="locales">Locale Mapping</Tab>
              <Tab id="domain">Domain</Tab>
              <Tab id="attributes">Custom Attributes</Tab>
            </TabList>

            {/* ── RSVP Fields Tab ── */}
            <TabPanel id="rsvp">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
                {rsvpConfig ? (
                  <div>
                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 })}>
                      <Heading level={3}>RSVP Form Fields ({rsvpFieldsForTable.length})</Heading>
                      <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                        <Picker
                          aria-label="Locale"
                          selectedKey={activeLocale ?? ''}
                          onSelectionChange={(key) => setActiveLocale(key === '' ? null : key as string)}
                          styles={style({ width: 220 })}
                        >
                          <PickerItem key="" id="" textValue="Base (default)">
                            <Text slot="label">Base (default)</Text>
                          </PickerItem>
                          {availableLocales.map(l => (
                            <PickerItem key={l.code} id={l.code} textValue={`${l.name} (${l.code})`}>
                              <Text slot="label">{l.name} ({l.code})</Text>
                            </PickerItem>
                          ))}
                        </Picker>
                        {canWriteConfig && (
                          <ButtonGroup>
                            <Button variant="secondary" onPress={() => openRsvpEdit(rsvpConfig)}>
                              <EditIcon />
                              <Text>Edit Config</Text>
                            </Button>
                            {canDeleteConfig && (
                              <Button variant="secondary" onPress={() => setRsvpConfigToDelete(rsvpConfig)}>
                                <RemoveCircle />
                                <Text>Delete</Text>
                              </Button>
                            )}
                          </ButtonGroup>
                        )}
                      </div>
                    </div>
                    <div style={{ border: '1px solid var(--spectrum-global-color-gray-300)', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Field Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Label</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Type</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Required</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Options</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Default</th>
                            {isOwnRsvpConfig && (canWriteConfig || canDeleteConfig) && (
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }} />
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rsvpFieldsForTable.map((item) => {
                            const isExpandable = item.type === 'select' || item.type === 'checkbox'
                            const isExpanded = expandedFieldKeys.has(item._key)
                            const localeOverride = activeLocale
                              ? rsvpConfig.rsvp?.localizations?.[activeLocale]?.rsvpFormFields?.find(f => f.field === item.field)
                              : null
                            const colSpan = 6 + (isOwnRsvpConfig && (canWriteConfig || canDeleteConfig) ? 1 : 0)
                            return (
                              <React.Fragment key={item._key}>
                                <tr style={{ borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
                                  <td style={{ padding: '10px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {isExpandable && (
                                        <ActionButton
                                          isQuiet
                                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                          onPress={() => setExpandedFieldKeys(prev => {
                                            const next = new Set(prev)
                                            next.has(item._key) ? next.delete(item._key) : next.add(item._key)
                                            return next
                                          })}
                                        >
                                          <ChevronRight UNSAFE_style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                                        </ActionButton>
                                      )}
                                      <Text>{item.field}</Text>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 16px' }}>
                                    {localeOverride?.label
                                      ? <Text>{localeOverride.label}</Text>
                                      : <Text UNSAFE_style={{ color: activeLocale ? 'var(--spectrum-global-color-gray-600)' : undefined, fontStyle: activeLocale ? 'italic' : undefined }}>{item.label}</Text>
                                    }
                                  </td>
                                  <td style={{ padding: '10px 16px' }}>
                                    <Badge variant="neutral">{item.type}</Badge>
                                  </td>
                                  <td style={{ padding: '10px 16px' }}><Text>{item.required ? 'Yes' : 'No'}</Text></td>
                                  <td style={{ padding: '10px 16px' }}>
                                    <Text>{item.options.length > 0 ? `${item.options.length} options` : '—'}</Text>
                                  </td>
                                  <td style={{ padding: '10px 16px' }}><Text>{item.default || '—'}</Text></td>
                                  {isOwnRsvpConfig && (canWriteConfig || canDeleteConfig) && (
                                    <td style={{ padding: '10px 16px' }}>
                                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                        {canWriteConfig && (
                                          <ActionButton isQuiet aria-label="Edit field" onPress={() => openFieldEdit(item)}>
                                            <EditIcon />
                                          </ActionButton>
                                        )}
                                        {canDeleteConfig && (
                                          <ActionButton isQuiet aria-label="Delete field" onPress={() => {
                                            const index = rsvpConfig.rsvp.rsvpFormFields.findIndex(f => f.field === item.field)
                                            if (index !== -1) setFieldToDelete({ field: item, index })
                                          }}>
                                            <RemoveCircle />
                                          </ActionButton>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                                {isExpandable && isExpanded && (
                                  <tr style={{ borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
                                    <td colSpan={colSpan} style={{ padding: '12px 24px 16px 40px', backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
                                      {item.options.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                          <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>
                                            Options ({item.options.length})
                                          </Text>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {item.options.map(opt => (
                                              <Badge key={opt.value} variant="neutral">
                                                {localeOverride?.options?.find(o => o.value === opt.value)?.label || opt.label || opt.value}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <Text UNSAFE_style={{ fontSize: 13, color: 'var(--spectrum-global-color-gray-700)', fontStyle: 'italic' }}>
                                          No options defined.
                                        </Text>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 48,
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                      borderRadius: 8,
                      backgroundColor: 'var(--spectrum-global-color-gray-100)',
                      textAlign: 'center',
                    }}
                  >
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
                      No RSVP config for this scope.
                    </Text>
                    {canWriteConfig && (
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <Button variant="accent" onPress={openRsvpCreate}>
                          <Add />
                          <Text>Create RSVP Config</Text>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabPanel>

            {/* ── Locale Mapping Tab ── */}
            <TabPanel id="locales">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
                {localesConfig ? (
                  <div>
                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 })}>
                      <Heading level={3}>Locale Mapping</Heading>
                      <ButtonGroup>
                        {canWriteConfig && (
                          <Button variant="secondary" onPress={() => openLocalesEdit(localesConfig)}>
                            <EditIcon />
                            <Text>Edit</Text>
                          </Button>
                        )}
                        {canDeleteConfig && (
                          <Button variant="secondary" onPress={() => setLocalesToDelete(localesConfig)}>
                            <RemoveCircle />
                            <Text>Delete</Text>
                          </Button>
                        )}
                      </ButtonGroup>
                    </div>
                    <div style={{
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Locale Code</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Display Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Folder</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(localesConfig.locales.locales ?? []).map((l) => (
                            <tr key={l.code} style={{ borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
                              <td style={{ padding: '10px 16px' }}>
                                <Text>{l.code}</Text>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <Text>{l.name}</Text>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <Text>{l.folder || '(default)'}</Text>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 48,
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                      borderRadius: 8,
                      backgroundColor: 'var(--spectrum-global-color-gray-100)',
                      textAlign: 'center',
                    }}
                  >
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
                      No locales config for this scope.
                    </Text>
                    {canWriteConfig && (
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <Button variant="accent" onPress={openLocalesCreate}>
                          <Add />
                          <Text>Create Locales Config</Text>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabPanel>

            {/* ── Domain Tab ── */}
            <TabPanel id="domain">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
                {domainConfig ? (
                  <div>
                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 })}>
                      <Heading level={3}>Domain</Heading>
                      <ButtonGroup>
                        {canWriteConfig && (
                          <Button variant="secondary" onPress={() => openDomainEdit(domainConfig)}>
                            <EditIcon />
                            <Text>Edit</Text>
                          </Button>
                        )}
                        {canDeleteConfig && (
                          <Button variant="secondary" onPress={() => setDomainToDelete(domainConfig)}>
                            <RemoveCircle />
                            <Text>Delete</Text>
                          </Button>
                        )}
                      </ButtonGroup>
                    </div>
                    <div style={{
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Environment</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Domain</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
                            <td style={{ padding: '10px 16px' }}><Badge variant="positive">Prod</Badge></td>
                            <td style={{ padding: '10px 16px' }}><Text>{domainConfig.domain.prodDomain || '—'}</Text></td>
                          </tr>
                          <tr style={{ borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
                            <td style={{ padding: '10px 16px' }}><Badge variant="informative">Stage</Badge></td>
                            <td style={{ padding: '10px 16px' }}><Text>{domainConfig.domain.stageDomain || '—'}</Text></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 48,
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                      borderRadius: 8,
                      backgroundColor: 'var(--spectrum-global-color-gray-100)',
                      textAlign: 'center',
                    }}
                  >
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
                      No domain config for this scope. Series in this scope fall back to their own &quot;Related domain&quot; field.
                    </Text>
                    {canWriteConfig && (
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <Button variant="accent" onPress={openDomainCreate}>
                          <Add />
                          <Text>Create Domain Config</Text>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabPanel>

            {/* ── Custom Attributes Tab ── */}
            <TabPanel id="attributes">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 })}>
                {/* Header */}
                <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                  <Text UNSAFE_style={{ fontWeight: 700, fontSize: 16 }}>Custom Attribute</Text>
                  <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                    <ActionButton isQuiet aria-label="Refresh" onPress={loadConfigs}>
                      <RotateCCW />
                    </ActionButton>
                    {canWriteConfig && (
                      <Button variant="accent" onPress={openAttrCreate}>
                        <Add />
                        <Text>Create Attribute</Text>
                      </Button>
                    )}
                  </div>
                </div>

                {!customAttrsConfig || customAttrsConfig.customAttributes.length === 0 ? (
                  <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <GearSettingIllustration aria-hidden />
                    <Text UNSAFE_style={{ fontWeight: 600 }}>No Custom Attribute</Text>
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)', fontSize: 13 }}>
                      No custom attribute is configured for this scope
                    </Text>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--spectrum-global-color-gray-300)', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Label</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Input Type</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Enabled</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Values</th>
                          {isOwnAttrsConfig && canWriteConfig && (
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }} />
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {customAttrsConfig.customAttributes.map(attr => {
                          const isExpandable = attr.inputType === 'single-select' || attr.inputType === 'multi-select'
                          const attrId = attr.attributeId!
                          const isExpanded = expandedAttrKeys.has(attrId)
                          const colSpan = 5 + (isOwnAttrsConfig && canWriteConfig ? 1 : 0)
                          return (
                            <React.Fragment key={attrId}>
                              <tr style={{ borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
                                <td style={{ padding: '10px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {isExpandable && (
                                      <ActionButton
                                        isQuiet
                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                        onPress={() => setExpandedAttrKeys(prev => {
                                          const next = new Set(prev)
                                          next.has(attrId) ? next.delete(attrId) : next.add(attrId)
                                          return next
                                        })}
                                      >
                                        <ChevronRight UNSAFE_style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                                      </ActionButton>
                                    )}
                                    <Text>{attr.name}</Text>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 16px' }}><Text>{attr.label || '—'}</Text></td>
                                <td style={{ padding: '10px 16px' }}>
                                  <Badge variant="neutral">{attr.inputType}</Badge>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                  <Badge variant={attr.enabled ? 'positive' : 'negative'}>
                                    {attr.enabled ? 'Yes' : 'No'}
                                  </Badge>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                  <Text>{(attr.values?.length ?? 0) > 0
                                    ? `${attr.values.length} values`
                                    : '—'}
                                  </Text>
                                </td>
                                {isOwnAttrsConfig && canWriteConfig && (
                                  <td style={{ padding: '10px 16px' }}>
                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                      <ActionButton isQuiet aria-label="Edit attribute" onPress={() => openAttrEdit(attr)}>
                                        <EditIcon />
                                      </ActionButton>
                                    </div>
                                  </td>
                                )}
                              </tr>
                              {isExpandable && isExpanded && (
                                <tr style={{ borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
                                  <td colSpan={colSpan} style={{ padding: '12px 24px 16px 40px', backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
                                    {(attr.values?.length ?? 0) > 0 ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>
                                          Values ({attr.values.length})
                                        </Text>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                          {attr.values.map((v, i) => (
                                            <Badge key={v.valueId || v.value || i} variant="neutral">
                                              {v.label || v.value}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <Text UNSAFE_style={{ fontSize: 13, color: 'var(--spectrum-global-color-gray-700)', fontStyle: 'italic' }}>
                                        No values defined.
                                      </Text>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabPanel>
          </Tabs>
        ) : (
          <div
            style={{
              padding: 48,
              border: '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: 8,
              backgroundColor: 'var(--spectrum-global-color-gray-100)',
            }}
          >
            <Text UNSAFE_style={{ textAlign: 'center', color: 'var(--spectrum-global-color-gray-700)' }}>
              Select a scope above to manage its configurations.
            </Text>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Per-Field Edit Dialog */}
      <DialogTrigger
        isOpen={editingFieldDialog != null}
        onOpenChange={(open) => { if (!open) setEditingFieldDialog(null) }}
      >
        <div style={{ display: 'none' }} />
        <Dialog size="M">
          {({ close }) => (
            <>
              <Heading slot="title">Edit Field</Heading>
              <Content>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                  {activeLocale && (
                    <div className={style({ paddingX: 12, paddingY: 8, backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })}>
                      <Text UNSAFE_style={{ fontSize: 13 }}>
                        Locale: <strong>{activeLocale}</strong> — Label, Placeholder, and Option Labels save as locale overrides. All other fields update the base definition.
                      </Text>
                    </div>
                  )}
                  <div className={style({ display: 'grid', gap: 12 })} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                    <TextField
                      label="Field Name"
                      value={editingFieldForm.field}
                      onChange={(v) => setEditingFieldForm(prev => ({ ...prev, field: v }))}
                      isRequired
                      isInvalid={!!editingFieldNameError}
                      errorMessage={editingFieldNameError}
                    />
                    <TextField
                      label={activeLocale ? `Label (${activeLocale})` : 'Label'}
                      value={editingFieldForm.label}
                      onChange={(v) => setEditingFieldForm(prev => ({ ...prev, label: v }))}
                      isRequired={!activeLocale}
                    />
                    <TextField
                      label={activeLocale ? `Placeholder (${activeLocale})` : 'Placeholder'}
                      value={editingFieldForm.placeholder}
                      onChange={(v) => setEditingFieldForm(prev => ({ ...prev, placeholder: v }))}
                    />
                    {!activeLocale && (
                      <TextField
                        label="Default Value"
                        description="Pre-filled value shown to the user."
                        value={editingFieldForm.default}
                        onChange={(v) => setEditingFieldForm(prev => ({ ...prev, default: v }))}
                        UNSAFE_style={{ textAlign: 'left' }}
                      />
                    )}
                    <Picker
                      label="Type"
                      selectedKey={editingFieldForm.type}
                      onSelectionChange={(key) => setEditingFieldForm(prev => {
                        const newType = key as RsvpFieldType
                        const displayAsOptions = getDisplayAsOptions(newType)
                        const displayAsStillValid = displayAsOptions.some(o => o.key === prev.displayAs)
                        return {
                          ...prev,
                          type: newType,
                          options: (newType === 'text' || newType === 'email' || newType === 'phone') ? [] : prev.options,
                          displayAs: displayAsStillValid ? prev.displayAs : getDefaultDisplayAs(newType),
                        }
                      })}
                    >
                      {RSVP_FIELD_TYPES.map(t => (
                        <PickerItem key={t.key} id={t.key}>{t.label}</PickerItem>
                      ))}
                    </Picker>
                    {(editingFieldForm.type === 'select' || editingFieldForm.type === 'checkbox') && (
                      <Picker
                        label="Display As"
                        selectedKey={editingFieldForm.displayAs ?? getDefaultDisplayAs(editingFieldForm.type)}
                        onSelectionChange={(key) => setEditingFieldForm(prev => ({ ...prev, displayAs: key as RsvpDisplayAs }))}
                      >
                        {getDisplayAsOptions(editingFieldForm.type).map(o => (
                          <PickerItem key={o.key} id={o.key}>{o.label}</PickerItem>
                        ))}
                      </Picker>
                    )}
                  </div>
                  <Checkbox
                    isSelected={editingFieldForm.required}
                    onChange={(v) => setEditingFieldForm(prev => ({ ...prev, required: v }))}
                  >
                    Required
                  </Checkbox>
                  {(editingFieldForm.type === 'select' || editingFieldForm.type === 'checkbox') && (
                    <div>
                      <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                        <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>
                          Options{editingFieldForm.options.length > 0 ? ` (${editingFieldForm.options.length})` : ''}
                        </Text>
                      </div>
                      <div className={editingFieldForm.options.length > 0
                        ? style({ display: 'flex', flexDirection: 'column', gap: 8, paddingX: 12, paddingY: 8, backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })
                        : style({ display: 'flex', flexDirection: 'column', gap: 8 })
                      }>
                        {editingFieldForm.options.map((opt, optIdx) => (
                          <div key={optIdx} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                            <TextField
                              label="Value"
                              value={opt.value}
                              isReadOnly={!!activeLocale}
                              onChange={(v) => setEditingFieldForm(prev => {
                                const opts = [...prev.options]
                                opts[optIdx] = { ...opts[optIdx], value: v }
                                return { ...prev, options: opts }
                              })}
                              styles={style({ flexGrow: 1 })}
                            />
                            <TextField
                              label={activeLocale ? `Label (${activeLocale})` : 'Label'}
                              value={opt.label}
                              onChange={(v) => setEditingFieldForm(prev => {
                                const opts = [...prev.options]
                                opts[optIdx] = { ...opts[optIdx], label: v }
                                return { ...prev, options: opts }
                              })}
                              styles={style({ flexGrow: 1 })}
                            />
                            {!activeLocale && (
                              <ActionButton
                                isQuiet
                                aria-label="Remove option"
                                onPress={() => setEditingFieldForm(prev => ({
                                  ...prev,
                                  options: prev.options.filter((_, oi) => oi !== optIdx),
                                }))}
                              >
                                <RemoveCircle />
                              </ActionButton>
                            )}
                          </div>
                        ))}
                        {editingFieldForm.options.length === 0 && (
                          <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-700)', fontStyle: 'italic' }}>
                            No options defined.
                          </Text>
                        )}
                        {!activeLocale && (
                          <div className={style({ display: 'flex', justifyContent: 'end', marginTop: 4 })}>
                            <ActionButton
                              isQuiet
                              size="S"
                              onPress={() => setEditingFieldForm(prev => ({ ...prev, options: [...prev.options, { value: '', label: '' }] }))}
                            >
                              <Add />
                              <Text>Add Option</Text>
                            </ActionButton>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  isDisabled={!editingFieldForm.field.trim() || !editingFieldForm.label.trim() || !!editingFieldNameError || isSaving}
                  onPress={handleSaveFieldEdit}
                >
                  Save Field
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* RSVP Config Create/Edit Dialog */}
      <DialogTrigger isOpen={isRsvpFormOpen} onOpenChange={setIsRsvpFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog size="L">
          {({close}) => (
            <>
              <Heading slot="title">{editingRsvpConfig ? 'Edit RSVP Config' : 'Create RSVP Config'}</Heading>
              <Content>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 24 })}>
                  {/* Fields editor */}
                  <div>
                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 })}>
                      <Text UNSAFE_style={{ fontWeight: 700 }}>Form Fields</Text>
                    </div>
                    {(activeLocale && editingRsvpConfig) && (
                      <div className={style({ paddingX: 12, paddingY: 8, backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm', marginBottom: 12 })}>
                        <Text UNSAFE_style={{ fontSize: 13 }}>
                          Locale: <strong>{activeLocale}</strong> — Label, Placeholder, and Option Labels save as locale overrides. All other fields update the base definition.
                        </Text>
                      </div>
                    )}
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                      {rsvpFormFields.map((field, index) => {
                        const hasOptions = field.type === 'select' || field.type === 'checkbox'
                        const isCollapsible = hasOptions
                        const isExpanded = !isCollapsible || expandedRsvpDialogFields.has(index)
                        const toggleExpand = isCollapsible
                          ? () => setExpandedRsvpDialogFields(prev => {
                              const next = new Set(prev)
                              next.has(index) ? next.delete(index) : next.add(index)
                              return next
                            })
                          : undefined
                        return (
                          <div
                            key={index}
                            className={style({ backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })}
                          >
                            {/* Header (collapsible for select/multi-select, static otherwise) */}
                            <div
                              onClick={toggleExpand}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: isCollapsible ? 'pointer' : 'default' }}
                            >
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {isCollapsible && (
                                  <ChevronRight UNSAFE_style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                                )}
                                <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>{field.field || `Field ${index + 1}`}</Text>
                                <div className={style({ display: 'flex', alignItems: 'start' })}>
                                  <Badge variant="neutral">{field.type}</Badge>
                                </div>
                                {field.required && (
                                  <div className={style({ display: 'flex', alignItems: 'start' })}>
                                    <Badge variant="neutral">Required</Badge>
                                  </div>
                                )}
                              </div>
                              {!(activeLocale && editingRsvpConfig) && (
                                <ActionButton
                                  isQuiet
                                  aria-label="Remove field"
                                  onPress={(e) => { e.continuePropagation?.(); setRsvpFormFields(prev => prev.filter((_, i) => i !== index)) }}
                                  isDisabled={rsvpFormFields.length <= 1}
                                >
                                  <RemoveCircle />
                                </ActionButton>
                              )}
                            </div>
                            {/* Body — always shown for non-select types; toggled for select/multi-select */}
                            {isExpanded && (
                              <div style={{ padding: '0 12px 12px 12px', borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
                                <div className={style({ display: 'grid', gap: 12, marginTop: 12 })} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                  <TextField
                                    label="Field Name"
                                    value={field.field}
                                    onChange={(v) => setRsvpFormFields(prev => {
                                      const copy = [...prev]
                                      copy[index] = { ...copy[index], field: v }
                                      return copy
                                    })}
                                    isRequired
                                    isInvalid={!!getFieldNameError(field.field, rsvpFormFields.filter((_, i) => i !== index).map(f => f.field.trim()))}
                                    errorMessage={getFieldNameError(field.field, rsvpFormFields.filter((_, i) => i !== index).map(f => f.field.trim()))}
                                  />
                                  <TextField
                                    label={(activeLocale && editingRsvpConfig) ? `Label (${activeLocale})` : 'Label'}
                                    value={(activeLocale && editingRsvpConfig) ? getDialogLocaleFieldValue(field.field, 'label') : field.label}
                                    onChange={(activeLocale && editingRsvpConfig)
                                      ? (v) => setDialogLocaleFieldValue(field.field, { label: v || undefined })
                                      : (v) => setRsvpFormFields(prev => {
                                          const copy = [...prev]
                                          copy[index] = { ...copy[index], label: v }
                                          return copy
                                        })
                                    }
                                    isRequired={!(activeLocale && editingRsvpConfig)}
                                  />
                                  <TextField
                                    label={(activeLocale && editingRsvpConfig) ? `Placeholder (${activeLocale})` : 'Placeholder'}
                                    value={(activeLocale && editingRsvpConfig) ? getDialogLocaleFieldValue(field.field, 'placeholder') : field.placeholder}
                                    onChange={(activeLocale && editingRsvpConfig)
                                      ? (v) => setDialogLocaleFieldValue(field.field, { placeholder: v || undefined })
                                      : (v) => setRsvpFormFields(prev => {
                                          const copy = [...prev]
                                          copy[index] = { ...copy[index], placeholder: v }
                                          return copy
                                        })
                                    }
                                  />
                                  {!(activeLocale && editingRsvpConfig) && (
                                    <TextField
                                      label="Default Value"
                                      description="Pre-filled value shown to the user."
                                      value={field.default}
                                      onChange={(v) => setRsvpFormFields(prev => {
                                        const copy = [...prev]
                                        copy[index] = { ...copy[index], default: v }
                                        return copy
                                      })}
                                      UNSAFE_style={{ textAlign: 'left' }}
                                    />
                                  )}
                                  <Picker
                                    label="Type"
                                    selectedKey={field.type}
                                    onSelectionChange={(key) => setRsvpFormFields(prev => {
                                      const copy = [...prev]
                                      const newType = key as RsvpFieldType
                                      const displayAsOptions = getDisplayAsOptions(newType)
                                      const displayAsStillValid = displayAsOptions.some(o => o.key === copy[index].displayAs)
                                      copy[index] = {
                                        ...copy[index],
                                        type: newType,
                                        options: (newType === 'text' || newType === 'email' || newType === 'phone') ? [] : copy[index].options,
                                        displayAs: displayAsStillValid ? copy[index].displayAs : getDefaultDisplayAs(newType),
                                      }
                                      return copy
                                    })}
                                  >
                                    {RSVP_FIELD_TYPES.map(t => (
                                      <PickerItem key={t.key} id={t.key}>{t.label}</PickerItem>
                                    ))}
                                  </Picker>
                                  {(field.type === 'select' || field.type === 'checkbox') && (
                                    <Picker
                                      label="Display As"
                                      selectedKey={field.displayAs ?? getDefaultDisplayAs(field.type)}
                                      onSelectionChange={(key) => setRsvpFormFields(prev => {
                                        const copy = [...prev]
                                        copy[index] = { ...copy[index], displayAs: key as RsvpDisplayAs }
                                        return copy
                                      })}
                                    >
                                      {getDisplayAsOptions(field.type).map(o => (
                                        <PickerItem key={o.key} id={o.key}>{o.label}</PickerItem>
                                      ))}
                                    </Picker>
                                  )}
                                </div>
                                <div className={style({ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' })}>
                                  <Checkbox
                                    isSelected={field.required}
                                    onChange={(v) => setRsvpFormFields(prev => {
                                      const copy = [...prev]
                                      copy[index] = { ...copy[index], required: v }
                                      return copy
                                    })}
                                  >
                                    Required
                                  </Checkbox>
                                </div>
                                {(field.type === 'select' || field.type === 'checkbox') && (
                                  <div className={style({ marginTop: 12 })}>
                                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                                      <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>
                                        Options{field.options.length > 0 ? ` (${field.options.length})` : ''}
                                      </Text>
                                      {!(activeLocale && editingRsvpConfig) && (
                                        <ActionButton
                                          isQuiet
                                          size="S"
                                          onPress={() => setRsvpFormFields(prev => {
                                            const copy = [...prev]
                                            copy[index] = { ...copy[index], options: [...copy[index].options, { value: '', label: '' }] }
                                            return copy
                                          })}
                                        >
                                          <Add />
                                          <Text>Add Option</Text>
                                        </ActionButton>
                                      )}
                                    </div>
                                    <div
                                      className={field.options.length > 0
                                        ? style({ display: 'flex', flexDirection: 'column', gap: 8, paddingX: 12, paddingY: 8, backgroundColor: 'layer-2', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })
                                        : style({ display: 'flex', flexDirection: 'column', gap: 8 })
                                      }
                                    >
                                      {field.options.map((opt, optIdx) => (
                                        <div key={optIdx} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                                          <TextField
                                            label="Value"
                                            value={opt.value}
                                            isReadOnly={!!(activeLocale && editingRsvpConfig)}
                                            onChange={(v) => setRsvpFormFields(prev => {
                                              const copy = [...prev]
                                              const opts = [...copy[index].options]
                                              opts[optIdx] = { ...opts[optIdx], value: v }
                                              copy[index] = { ...copy[index], options: opts }
                                              return copy
                                            })}
                                            styles={style({ flexGrow: 1 })}
                                          />
                                          <TextField
                                            label={(activeLocale && editingRsvpConfig) ? `Label (${activeLocale})` : 'Label'}
                                            value={(activeLocale && editingRsvpConfig) ? getDialogLocaleOptionLabel(field.field, opt.value) : opt.label}
                                            onChange={(activeLocale && editingRsvpConfig)
                                              ? (v) => setDialogLocaleOptionLabel(field.field, opt.value, v)
                                              : (v) => setRsvpFormFields(prev => {
                                                  const copy = [...prev]
                                                  const opts = [...copy[index].options]
                                                  opts[optIdx] = { ...opts[optIdx], label: v }
                                                  copy[index] = { ...copy[index], options: opts }
                                                  return copy
                                                })
                                            }
                                            styles={style({ flexGrow: 1 })}
                                          />
                                          {!(activeLocale && editingRsvpConfig) && (
                                            <ActionButton
                                              isQuiet
                                              aria-label="Remove option"
                                              onPress={() => setRsvpFormFields(prev => {
                                                const copy = [...prev]
                                                copy[index] = {
                                                  ...copy[index],
                                                  options: copy[index].options.filter((_, oi) => oi !== optIdx),
                                                }
                                                return copy
                                              })}
                                            >
                                              <RemoveCircle />
                                            </ActionButton>
                                          )}
                                        </div>
                                      ))}
                                      {field.options.length === 0 && (
                                        <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-700)', fontStyle: 'italic' }}>
                                          No options yet — click &quot;Add Option&quot; above.
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {!(activeLocale && editingRsvpConfig) && (
                      <Button
                        variant="secondary"
                        size="S"
                        onPress={handleAddRsvpField}
                        UNSAFE_style={{ width: '100%', marginTop: 8, borderStyle: 'dashed' }}
                      >
                        <Add />
                        <Text>Add Field</Text>
                      </Button>
                    )}
                  </div>

                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveRsvpConfig}
                  isDisabled={isSaving || rsvpFormFields.filter(f => f.field.trim() && f.label.trim()).length === 0 || hasRsvpFieldNameErrors}
                >
                  {editingRsvpConfig ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Locales Config Create/Edit Dialog */}
      <DialogTrigger isOpen={isLocalesFormOpen} onOpenChange={setIsLocalesFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog>
          {({close}) => (
            <>
              <Heading slot="title">{editingLocalesConfig ? 'Edit Locales Config' : 'Create Locales Config'}</Heading>
              <Content>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                  <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                    <Text UNSAFE_style={{ fontWeight: 700 }}>Locale Entries</Text>
                    <Button
                      variant="secondary"
                      size="S"
                      onPress={() => setLocaleEntries(prev => [...prev, { code: '', name: '', folder: '' }])}
                    >
                      <Add />
                      <Text>Add Locale</Text>
                    </Button>
                  </div>
                  {localeEntries.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        padding: 12,
                        border: '1px solid var(--spectrum-global-color-gray-300)',
                        borderRadius: 8,
                      }}
                    >
                      <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 })}>
                        <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>Locale {index + 1}</Text>
                        <ActionButton
                          isQuiet
                          aria-label="Remove locale"
                          onPress={() => setLocaleEntries(prev => prev.filter((_, i) => i !== index))}
                          isDisabled={localeEntries.length <= 1}
                        >
                          <RemoveCircle />
                        </ActionButton>
                      </div>
                      <div className={style({ display: 'flex', gap: 12 })} style={{ flexWrap: 'wrap' }}>
                        <TextField
                          label="Locale Code"
                          value={entry.code}
                          onChange={(v) => setLocaleEntries(prev => {
                            const copy = [...prev]
                            copy[index] = { ...copy[index], code: v }
                            return copy
                          })}
                          styles={style({ width: 140 })}
                          isRequired
                        />
                        <TextField
                          label="Display Name"
                          value={entry.name}
                          onChange={(v) => setLocaleEntries(prev => {
                            const copy = [...prev]
                            copy[index] = { ...copy[index], name: v }
                            return copy
                          })}
                          styles={style({ width: 220 })}
                          isRequired
                        />
                        <TextField
                          label="Folder"
                          value={entry.folder}
                          onChange={(v) => setLocaleEntries(prev => {
                            const copy = [...prev]
                            copy[index] = { ...copy[index], folder: v.toLowerCase() }
                            return copy
                          })}
                          styles={style({ width: 100 })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveLocalesConfig}
                  isDisabled={isSaving || localeEntries.filter(e => e.code.trim() && e.name.trim()).length === 0}
                >
                  {editingLocalesConfig ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Domain Config Create/Edit Dialog */}
      <DialogTrigger isOpen={isDomainFormOpen} onOpenChange={setIsDomainFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog>
          {({close}) => (
            <>
              <Heading slot="title">{editingDomainConfig ? 'Edit Domain Config' : 'Create Domain Config'}</Heading>
              <Content>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                  <TextField
                    label="Prod Domain"
                    description="Production host used to build the event detail-page URL, e.g. https://www.adobe.com"
                    value={domainProdDomain}
                    onChange={setDomainProdDomain}
                    onBlur={() => setDomainProdDomain(prev => normalizeRelatedDomain(prev))}
                    styles={style({ width: '[100%]' })}
                  />
                  <TextField
                    label="Stage Domain"
                    description="Stage host used for Preview links, e.g. https://www.stage.adobe.com"
                    value={domainStageDomain}
                    onChange={setDomainStageDomain}
                    onBlur={() => setDomainStageDomain(prev => normalizeRelatedDomain(prev))}
                    styles={style({ width: '[100%]' })}
                  />
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveDomainConfig}
                  isDisabled={isSaving || (!domainProdDomain.trim() && !domainStageDomain.trim())}
                >
                  {editingDomainConfig ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Custom Attribute Create/Edit Dialog */}
      <DialogTrigger isOpen={isAttrFormOpen} onOpenChange={setIsAttrFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog size="L">
          {({close}) => (
            <>
              <Heading slot="title">{editingAttr ? 'Edit Custom Attribute' : 'Create Custom Attribute'}</Heading>
              <Content>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                  <TextField
                    label="Name"
                    value={attrFormName}
                    onChange={setAttrFormName}
                    styles={style({ width: '[100%]' })}
                    isRequired
                    autoFocus
                  />
                  <TextField
                    label="Label"
                    description="Display label shown to users. Defaults to Name if empty."
                    value={attrFormLabel}
                    onChange={setAttrFormLabel}
                    styles={style({ width: '[100%]' })}
                  />
                  <SpectrumSwitch isSelected={attrFormEnabled} onChange={setAttrFormEnabled}>
                    Enabled
                  </SpectrumSwitch>
                  <Picker
                    label="Input Type"
                    selectedKey={attrFormInputType}
                    onSelectionChange={(key) => {
                      setAttrFormInputType(key as CustomAttributeInputType)
                      if (key === 'text') {
                        setAttrFormValues([])
                      }
                    }}
                    styles={style({ width: '[100%]' })}
                  >
                    {ATTRIBUTE_INPUT_TYPES.map(t => (
                      <PickerItem key={t.key} id={t.key}>{t.label}</PickerItem>
                    ))}
                  </Picker>

                  {(attrFormInputType === 'single-select' || attrFormInputType === 'multi-select') && (
                    <div>
                      <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                        <Text UNSAFE_style={{ fontWeight: 700 }}>
                          Values{attrFormValues.length > 0 ? ` (${attrFormValues.length})` : ''}
                        </Text>
                        <ActionButton
                          isQuiet
                          size="S"
                          onPress={() => setAttrFormValues(prev => [...prev, {
                            valueId: '',
                            value: '',
                            label: '',
                            ordinal: prev.length,
                          }])}
                        >
                          <Add />
                          <Text>Add Value</Text>
                        </ActionButton>
                      </div>
                      <div className={attrFormValues.length > 0
                        ? style({ display: 'flex', flexDirection: 'column', gap: 8, paddingX: 12, paddingY: 8, backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })
                        : style({ display: 'flex', flexDirection: 'column', gap: 8 })
                      }>
                        {attrFormValues.map((val, index) => (
                          <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                            <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)', minWidth: 22, textAlign: 'right' }}>
                              {index + 1}.
                            </Text>
                            <TextField
                              label="Value"
                              value={val.value}
                              onChange={(v) => setAttrFormValues(prev => {
                                const copy = [...prev]
                                copy[index] = { ...copy[index], value: v }
                                return copy
                              })}
                              styles={style({ flexGrow: 1 })}
                            />
                            <TextField
                              label="Label"
                              value={val.label ?? ''}
                              onChange={(v) => setAttrFormValues(prev => {
                                const copy = [...prev]
                                copy[index] = { ...copy[index], label: v }
                                return copy
                              })}
                              styles={style({ flexGrow: 1 })}
                            />
                            <ActionButton
                              isQuiet
                              aria-label="Remove value"
                              onPress={() => setAttrFormValues(prev =>
                                prev.filter((_, i) => i !== index).map((v, i) => ({ ...v, ordinal: i }))
                              )}
                            >
                              <RemoveCircle />
                            </ActionButton>
                          </div>
                        ))}
                        {attrFormValues.length === 0 && (
                          <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-700)', fontStyle: 'italic' }}>
                            No values yet — click &quot;Add Value&quot; above.
                          </Text>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveAttr}
                  isDisabled={!attrFormName.trim() || isSaving}
                >
                  {editingAttr ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Per-Field Delete Confirmation */}
      <DialogTrigger
        isOpen={!!fieldToDelete}
        onOpenChange={(open) => !open && setFieldToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Field"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={handleDeleteField}
        >
          Delete field <strong>{fieldToDelete?.field.field}</strong>? This will remove it from all events using this RSVP config and cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      {/* Delete Confirmations */}
      <DialogTrigger
        isOpen={!!rsvpConfigToDelete}
        onOpenChange={(open) => !open && setRsvpConfigToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete RSVP Config"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => { if (rsvpConfigToDelete) deleteSlice(rsvpConfigToDelete, 'rsvp', 'RSVP config') }}
          onCancel={() => setRsvpConfigToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete the RSVP config for this scope? This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      <DialogTrigger
        isOpen={!!localesToDelete}
        onOpenChange={(open) => !open && setLocalesToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Locales Config"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => { if (localesToDelete) deleteSlice(localesToDelete, 'locales', 'Locales config') }}
          onCancel={() => setLocalesToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete the locales config for this scope? This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      <DialogTrigger
        isOpen={!!domainToDelete}
        onOpenChange={(open) => !open && setDomainToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Domain Config"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => { if (domainToDelete) deleteSlice(domainToDelete, 'domain', 'Domain config') }}
          onCancel={() => setDomainToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete the domain config for this scope? Series will fall back to their own &quot;Related domain&quot; field. This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      <DialogTrigger
        isOpen={!!attrToDelete}
        onOpenChange={(open) => !open && setAttrToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Custom Attribute"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={async () => {
            if (!customAttrsConfig || !attrToDelete || !selectedScopeId) return
            setIsSaving(true)
            try {
              const updatedAttrs = customAttrsConfig.customAttributes.map(a =>
                a.attributeId === attrToDelete ? { ...a, enabled: false } : a
              )
              const body = buildPutBody(customAttrsConfig, { customAttributes: updatedAttrs })
              const result = await apiService.upsertConfig(selectedScopeId, body)
              if ('error' in result) { toast.error('Failed to delete Custom Attribute'); return }
              toast.success('Custom Attribute deleted')
              setAttrToDelete(null)
              await loadConfigs()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to delete Custom Attribute')
            } finally {
              setIsSaving(false)
            }
          }}
          onCancel={() => setAttrToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete attribute <strong>{customAttrsConfig?.customAttributes.find(a => a.attributeId === attrToDelete)?.name ?? attrToDelete}</strong>? It will be hidden from all event forms. This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      {/* Loading overlays */}
      <BlurredLoadingOverlay visible={loadingOverlayVisible} message="Loading configurations..." />
      <BlurredLoadingOverlay visible={savingOverlayVisible} message="Saving..." />
    </div>
  )
}

export default ConfigManagement
