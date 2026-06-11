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
import { hasRsvpSlice, hasLocalesSlice, hasAttributesSlice } from '../../types/configApi'
import { ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import { useHasPermission } from '../../hooks/useHasPermission'
import { generateUUID } from '../../services/requestHelpers'
import { SUPPORTED_SPEAKER_LOCALES, SPEAKER_LOCALE_LABELS } from '../../config/localeMapping'

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
  { key: 'multi-select', label: 'Multi-Select' },
]

function getDisplayAsOptions(type: RsvpFieldType): { key: RsvpDisplayAs; label: string }[] {
  if (type === 'select') return [
    { key: '' as RsvpDisplayAs, label: 'Default' },
    { key: 'dropdown', label: 'Dropdown' },
    { key: 'radio', label: 'Radio' },
  ]
  if (type === 'multi-select') return [
    { key: '' as RsvpDisplayAs, label: 'Default' },
    { key: 'dropdown', label: 'Dropdown' },
    { key: 'checkbox', label: 'Checkbox' },
  ]
  return []
}

const ATTRIBUTE_INPUT_TYPES: { key: CustomAttributeInputType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'boolean', label: 'Boolean' },
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
    rules: '',
    default: '',
    displayAs: '',
  }
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
  // Per-option inline editing (keyed by field.field name)
  const [pendingOptionEdits, setPendingOptionEdits] = useState<Record<string, RsvpOption[]>>({})
  const [savingOptionKey, setSavingOptionKey] = useState<string | null>(null)

  // Expandable state for RSVP fields table
  const [expandedFieldKeys, setExpandedFieldKeys] = useState<Set<string>>(new Set())

  // ============================================================================
  // LOCALES DIALOG STATE
  // ============================================================================

  const [isLocalesFormOpen, setIsLocalesFormOpen] = useState(false)
  const [editingLocalesConfig, setEditingLocalesConfig] = useState<LocalesScopeConfig | null>(null)
  const [localeEntries, setLocaleEntries] = useState<Array<{ code: string; name: string; folder: string }>>([])
  const [localesToDelete, setLocalesToDelete] = useState<ScopeConfig | null>(null)

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
  const [attrToDelete, setAttrToDelete] = useState<CustomAttributeConfig | null>(null)

  // Expandable state for attributes table
  const [expandedAttrKeys, setExpandedAttrKeys] = useState<Set<string>>(new Set())
  // Per-value inline editing for attributes table (keyed by attributeId)
  const [pendingAttrValueEdits, setPendingAttrValueEdits] = useState<Record<string, CustomAttributeValue[]>>({})
  const [savingAttrValueKey, setSavingAttrValueKey] = useState<string | null>(null)

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
  const customAttributes = useMemo<CustomAttributeConfig[]>(
    () => customAttrsConfig?.customAttributes || [],
    [customAttrsConfig]
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
    setExpandedAttrKeys(new Set())
    setPendingOptionEdits({})
    setPendingAttrValueEdits({})
    setActiveLocale(null)
  }, [selectedScopeId])

  // Discard any pending option edits when the config reloads (save or refresh)
  useEffect(() => {
    setPendingOptionEdits({})
  }, [rsvpConfig])

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

  const handleSaveRsvpConfig = useCallback(async () => {
    if (!selectedScopeId) return
    const validFields = rsvpFormFields.filter(f => f.field.trim() && f.label.trim())
    if (validFields.length === 0) {
      toast.error('At least one field with a name and label is required')
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
  }, [selectedScopeId, rsvpFormFields, rsvpLocalizations, editingRsvpConfig, scopeConfig, ownsConfig, apiService, toast, loadConfigs])

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

  const handleSaveFieldEdit = useCallback(async () => {
    if (!selectedScopeId || !rsvpConfig || editingFieldDialog == null) return
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
          displayAs: editingFieldForm.displayAs,
          rules: editingFieldForm.rules,
          default: editingFieldForm.default,
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
  }, [selectedScopeId, rsvpConfig, editingFieldDialog, editingFieldForm, activeLocale, apiService, toast, loadConfigs])

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

  const handleSaveFieldOptions = useCallback(async (fieldName: string) => {
    if (!selectedScopeId || !rsvpConfig) return
    const newOptions = (pendingOptionEdits[fieldName] ?? []).filter(o => o.value.trim())
    setSavingOptionKey(fieldName)
    try {
      let result
      if (activeLocale) {
        const updatedLocalizations: Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }> =
          rsvpConfig.rsvp?.localizations ? JSON.parse(JSON.stringify(rsvpConfig.rsvp.localizations)) : {}
        if (!updatedLocalizations[activeLocale]) updatedLocalizations[activeLocale] = { rsvpFormFields: [] }
        const fields = updatedLocalizations[activeLocale].rsvpFormFields
        const existing = fields.find(f => f.field === fieldName)
        if (existing) existing.options = newOptions.length ? newOptions : undefined
        else fields.push({ field: fieldName, options: newOptions.length ? newOptions : undefined })
        updatedLocalizations[activeLocale].rsvpFormFields = fields.filter(
          f => f.label || f.placeholder || (f.options && f.options.length > 0)
        )
        if (updatedLocalizations[activeLocale].rsvpFormFields.length === 0) delete updatedLocalizations[activeLocale]
        result = await apiService.upsertConfig(selectedScopeId, buildPutBody(rsvpConfig, {
          rsvp: { ...rsvpConfig.rsvp, localizations: updatedLocalizations },
        }))
      } else {
        const updatedFields = rsvpConfig.rsvp.rsvpFormFields.map(f =>
          f.field === fieldName ? { ...f, options: newOptions } : f
        )
        result = await apiService.upsertConfig(selectedScopeId, buildPutBody(rsvpConfig, {
          rsvp: { ...rsvpConfig.rsvp, rsvpFormFields: updatedFields },
        }))
      }
      if ('error' in result) {
        toast.error('Failed to save options')
        return
      }
      toast.success('Options saved')
      setPendingOptionEdits(prev => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save options')
    } finally {
      setSavingOptionKey(null)
    }
  }, [selectedScopeId, rsvpConfig, pendingOptionEdits, activeLocale, apiService, toast, loadConfigs])

  const handleSaveAttrValues = useCallback(async (attributeId: string) => {
    if (!selectedScopeId || !customAttrsConfig) return
    const newValues = (pendingAttrValueEdits[attributeId] ?? [])
      .filter(v => v.value.trim())
      .map((v, i) => ({
        valueId: v.valueId || generateUUID(),
        value: v.value.trim(),
        label: (v.label ?? '').trim() || v.value.trim(),
        ordinal: i,
      }))
    setSavingAttrValueKey(attributeId)
    try {
      const updatedAttributes = customAttrsConfig.customAttributes.map(a =>
        a.attributeId === attributeId ? { ...a, values: newValues } : a
      )
      const result = await apiService.upsertConfig(selectedScopeId, buildPutBody(customAttrsConfig, {
        customAttributes: updatedAttributes,
      }))
      if ('error' in result) {
        toast.error('Failed to save values')
        return
      }
      toast.success('Values saved')
      setPendingAttrValueEdits(prev => {
        const next = { ...prev }
        delete next[attributeId]
        return next
      })
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save values')
    } finally {
      setSavingAttrValueKey(null)
    }
  }, [selectedScopeId, customAttrsConfig, pendingAttrValueEdits, apiService, toast, loadConfigs])

  /** Deletes a slice from the scope's single config. If any other slice remains,
   *  the config is PUT with the slice's fields cleared; otherwise the whole
   *  config is DELETEd. */
  const deleteSlice = useCallback(async (
    config: ScopeConfig,
    sliceKind: 'rsvp' | 'locales' | 'customAttributes',
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

    const newAttr: CustomAttributeConfig = {
      attributeId: editingAttr?.attributeId || generateUUID(),
      name: attrFormName.trim(),
      label: attrFormLabel.trim() || undefined,
      inputType: attrFormInputType,
      enabled: attrFormEnabled,
      values: attrFormValues
        .filter(v => v.value.trim())
        .map((v, i) => ({
          valueId: v.valueId || generateUUID(),
          value: v.value.trim(),
          label: (v.label ?? '').trim() || v.value.trim(),
          ordinal: i,
        })),
    }

    setIsSaving(true)
    try {
      let body
      if (scopeConfig && ownsConfig) {
        const existingAttrs = customAttrsConfig?.customAttributes ?? []
        const updatedAttributes = editingAttr
          ? existingAttrs.map(a => a.attributeId === editingAttr.attributeId ? newAttr : a)
          : [...existingAttrs, newAttr]
        body = buildPutBody(scopeConfig, { customAttributes: updatedAttributes })
      } else {
        body = { customAttributes: [newAttr] }
      }
      const result = await apiService.upsertConfig(selectedScopeId, body)
      if ('error' in result) {
        toast.error(`Failed to ${editingAttr ? 'update' : 'create'} custom attribute`)
        return
      }
      toast.success(`Custom attribute ${editingAttr ? 'updated' : 'created'}`)
      setIsAttrFormOpen(false)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save custom attribute')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, attrFormName, attrFormLabel, attrFormInputType, attrFormValues, attrFormEnabled, editingAttr, customAttrsConfig, scopeConfig, ownsConfig, apiService, toast, loadConfigs])

  const handleDeleteAttr = useCallback(async (attr: CustomAttributeConfig) => {
    if (!selectedScopeId || !customAttrsConfig) return
    setIsSaving(true)
    try {
      const remaining = customAttrsConfig.customAttributes.filter(a => a.attributeId !== attr.attributeId)
      let result
      if (remaining.length === 0) {
        const stripped: ScopeConfig = { ...customAttrsConfig }
        delete stripped.customAttributes
        result = await apiService.upsertConfig(selectedScopeId, buildPutBody(stripped, {}))
      } else {
        result = await apiService.upsertConfig(selectedScopeId, buildPutBody(customAttrsConfig, {
          customAttributes: remaining,
        }))
      }
      if ('error' in result) {
        toast.error('Failed to delete custom attribute')
        return
      }
      toast.success('Custom attribute deleted')
      setAttrToDelete(null)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete custom attribute')
    } finally {
      setIsSaving(false)
    }
  }, [apiService, selectedScopeId, customAttrsConfig, toast, loadConfigs])

  // ============================================================================
  // RSVP FIELD HELPERS
  // ============================================================================

  const handleToggleFieldExpand = useCallback((key: string) => {
    setExpandedFieldKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleToggleAttrExpand = useCallback((key: string) => {
    setExpandedAttrKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])


  // ============================================================================
  // RSVP TABLE COLUMNS (for display)
  // ============================================================================

  const rsvpFieldsForTable = useMemo(() => {
    if (!rsvpConfig) return []
    return rsvpConfig.rsvp.rsvpFormFields.map((f, i) => ({
      ...f,
      _key: `${f.field}-${i}`,
    }))
  }, [rsvpConfig])

  const isOwnRsvpConfig = rsvpConfig?.scopeId === selectedScopeId

  const rsvpFieldActions = useMemo(() => {
    if (!canWriteConfig || !isOwnRsvpConfig) return []
    return [
      {
        icon: 'edit' as const,
        label: 'Edit field',
        onAction: (item: RsvpFormField & { _key: string }) => openFieldEdit(item),
      },
      {
        icon: 'delete' as const,
        label: 'Delete field',
        onAction: (item: RsvpFormField & { _key: string }) => {
          const index = rsvpConfig?.rsvp.rsvpFormFields.findIndex(f => f.field === item.field) ?? -1
          if (index !== -1) setFieldToDelete({ field: item, index })
        },
      },
    ]
  }, [canWriteConfig, isOwnRsvpConfig, openFieldEdit, rsvpConfig])

  const rsvpFieldColumns = useMemo(() => [
    { key: 'field', name: 'FIELD NAME', width: 160, sortable: true },
    {
      key: 'label',
      name: 'LABEL',
      width: 160,
      sortable: true,
      render: (item: RsvpFormField & { _key: string }) => {
        const override = activeLocale
          ? rsvpConfig?.rsvp?.localizations?.[activeLocale]?.rsvpFormFields?.find(f => f.field === item.field)
          : null
        const localeLabel = override?.label
        return localeLabel
          ? <Text>{localeLabel}</Text>
          : <Text UNSAFE_style={{ color: activeLocale ? 'var(--spectrum-global-color-gray-600)' : undefined, fontStyle: activeLocale ? 'italic' : undefined }}>{item.label}</Text>
      },
    },
    {
      key: 'type',
      name: 'TYPE',
      width: 120,
      sortable: true,
      render: (item: RsvpFormField & { _key: string }) => (
        <div className={style({ display: 'flex', alignItems: 'start' })}>
          <Badge variant="neutral">{item.type}</Badge>
        </div>
      ),
    },
    {
      key: 'required',
      name: 'REQUIRED',
      width: 100,
      sortable: false,
      render: (item: RsvpFormField & { _key: string }) => (
        <Text>{item.required ? 'Yes' : 'No'}</Text>
      ),
    },
    {
      key: 'options',
      name: 'OPTIONS',
      width: 100,
      sortable: false,
      render: (item: RsvpFormField & { _key: string }) => (
        <Text>{item.options.length > 0 ? `${item.options.length} options` : '-'}</Text>
      ),
    },
    {
      key: 'displayAs',
      name: 'DISPLAY AS',
      width: 120,
      sortable: false,
      render: (item: RsvpFormField & { _key: string }) => (
        <Text>
          {(item.type === 'select' || item.type === 'multi-select') && item.displayAs
            ? item.displayAs
            : '-'}
        </Text>
      ),
    },
  ], [activeLocale, rsvpConfig])

  const renderRsvpExpandedContent = useCallback((item: RsvpFormField & { _key: string }) => {
    const locales = Object.keys(rsvpConfig?.rsvp?.localizations || {})
    const isSelectType = item.type === 'select' || item.type === 'multi-select'
    const pendingOpts = pendingOptionEdits[item.field]
    const isEditing = pendingOpts !== undefined
    const displayOpts = isEditing ? pendingOpts : item.options
    const canEdit = canWriteConfig && isOwnRsvpConfig

    return (
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
        {isSelectType && (
          <div>
            {/* Options section header */}
            <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
              <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>
                Options ({displayOpts.length}):
              </Text>
              <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                {isEditing ? (
                  <>
                    <ActionButton
                      isQuiet
                      size="S"
                      onPress={() => setPendingOptionEdits(prev => {
                        const next = { ...prev }
                        delete next[item.field]
                        return next
                      })}
                    >
                      <RotateCCW />
                      <Text>Discard</Text>
                    </ActionButton>
                    <Button
                      variant="accent"
                      size="S"
                      isDisabled={savingOptionKey === item.field}
                      onPress={() => handleSaveFieldOptions(item.field)}
                    >
                      <Text>Save Options</Text>
                    </Button>
                  </>
                ) : canEdit && (
                  <ActionButton
                    isQuiet
                    size="S"
                    onPress={() => setPendingOptionEdits(prev => ({ ...prev, [item.field]: [...item.options] }))}
                  >
                    <EditIcon />
                    <Text>Edit Options</Text>
                  </ActionButton>
                )}
              </div>
            </div>
            {/* Options list */}
            {displayOpts.length > 0 ? (
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, paddingX: 12, paddingY: 8, backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })}>
                {displayOpts.map((opt, i) => (
                  <div key={i} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                    <TextField
                      label="Value"
                      value={opt.value}
                      isReadOnly={!isEditing}
                      onChange={(v) => setPendingOptionEdits(prev => {
                        const opts = [...(prev[item.field] ?? [])]
                        opts[i] = { ...opts[i], value: v }
                        return { ...prev, [item.field]: opts }
                      })}
                      styles={style({ flexGrow: 1 })}
                    />
                    <TextField
                      label="Label"
                      value={opt.label}
                      isReadOnly={!isEditing}
                      onChange={(v) => setPendingOptionEdits(prev => {
                        const opts = [...(prev[item.field] ?? [])]
                        opts[i] = { ...opts[i], label: v }
                        return { ...prev, [item.field]: opts }
                      })}
                      styles={style({ flexGrow: 1 })}
                    />
                    {isEditing && (
                      <ActionButton
                        isQuiet
                        aria-label="Delete option"
                        onPress={() => setPendingOptionEdits(prev => ({
                          ...prev,
                          [item.field]: (prev[item.field] ?? []).filter((_, oi) => oi !== i),
                        }))}
                      >
                        <RemoveCircle />
                      </ActionButton>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div className={style({ display: 'flex', justifyContent: 'end', marginTop: 4 })}>
                    <ActionButton
                      isQuiet
                      size="S"
                      onPress={() => setPendingOptionEdits(prev => ({
                        ...prev,
                        [item.field]: [...(prev[item.field] ?? []), { value: '', label: '' }],
                      }))}
                    >
                      <Add />
                      <Text>Add Option</Text>
                    </ActionButton>
                  </div>
                )}
              </div>
            ) : (
              <Text UNSAFE_style={{ fontSize: 13, color: 'var(--spectrum-global-color-gray-700)', fontStyle: 'italic' }}>
                {isEditing ? 'No options — add one above.' : 'No options defined.'}
              </Text>
            )}
          </div>
        )}
        {item.rules && (
          <div>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>Rules: </Text>
            <Text>{item.rules}</Text>
          </div>
        )}
        {item.default && (
          <div>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>Default: </Text>
            <Text>{item.default}</Text>
          </div>
        )}
        {locales.length > 0 && (
          <div>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>Localizations:</Text>
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 })}>
              {locales.map(locale => {
                const overrides = rsvpConfig?.rsvp?.localizations?.[locale]?.rsvpFormFields || []
                const override = overrides.find((o: RsvpFormFieldLocaleOverride) => o.field === item.field)
                if (!override) return null
                return (
                  <div key={locale} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                    <div className={style({ display: 'flex', alignItems: 'start' })}><Badge variant="neutral">{locale}</Badge></div>
                    {override.label && <Text>Label: {override.label}</Text>}
                    {override.placeholder && <Text>Placeholder: {override.placeholder}</Text>}
                    {override.options && <Text>Options: {override.options.map((o: RsvpOption) => o.label || o.value).join(', ')}</Text>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {!isSelectType && !item.rules && !item.default && locales.length === 0 && (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)', fontSize: 13 }}>
            No additional details
          </Text>
        )}
      </div>
    )
  }, [rsvpConfig, pendingOptionEdits, savingOptionKey, canWriteConfig, isOwnRsvpConfig, setPendingOptionEdits, handleSaveFieldOptions])

  const isRsvpFieldExpandable = useCallback((item: RsvpFormField & { _key: string }) => {
    const isSelectType = item.type === 'select' || item.type === 'multi-select'
    if (isSelectType) return true
    if (item.rules) return true
    if (item.default) return true
    const hasLocaleOverride = Object.values(rsvpConfig?.rsvp?.localizations || {}).some(
      loc => loc.rsvpFormFields.some(f => f.field === item.field)
    )
    return hasLocaleOverride
  }, [rsvpConfig])

  // ============================================================================
  // CUSTOM ATTRIBUTES TABLE
  // ============================================================================

  const isOwnAttrsConfig = customAttrsConfig?.scopeId === selectedScopeId

  const attrColumns = useMemo(() => [
    { key: 'name', name: 'NAME', width: 200, sortable: true },
    {
      key: 'label',
      name: 'LABEL',
      width: 200,
      sortable: true,
      render: (item: CustomAttributeConfig) => (
        <Text>{item.label || '-'}</Text>
      ),
    },
    {
      key: 'enabled',
      name: 'ENABLED',
      width: 100,
      sortable: true,
      render: (item: CustomAttributeConfig) => (
        <div className={style({ display: 'flex', alignItems: 'start' })}>
          <Badge variant={item.enabled ? 'positive' : 'neutral'}>
            {item.enabled ? 'Yes' : 'No'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'inputType',
      name: 'INPUT TYPE',
      width: 140,
      sortable: true,
      render: (item: CustomAttributeConfig) => (
        <div className={style({ display: 'flex', alignItems: 'start' })}>
          <Badge variant="neutral">{item.inputType}</Badge>
        </div>
      ),
    },
    {
      key: 'values',
      name: 'VALUES',
      width: 100,
      sortable: false,
      render: (item: CustomAttributeConfig) => (
        <Text>{item.values.length > 0 ? `${item.values.length} values` : '-'}</Text>
      ),
    },
    {
      key: 'scopeId',
      name: 'SCOPE',
      width: 120,
      sortable: false,
      render: () => {
        const configScopeId = customAttrsConfig?.scopeId
        const scope = configScopeId ? scopes.find(s => s.scopeId === configScopeId) : null
        return scope ? (
          <Badge variant={SCOPE_TYPE_VARIANTS[scope.type] || 'neutral'}>{scope.name}</Badge>
        ) : configScopeId ? (
          <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-700)' }}>
            {configScopeId.substring(0, 8)}...
          </Text>
        ) : (
          <Text>-</Text>
        )
      },
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 100,
      sortable: false,
      render: (item: CustomAttributeConfig) => (
        <div className={style({ display: 'flex', gap: 8, justifyContent: 'end' })}>
          {canWriteConfig && isOwnAttrsConfig && (
            <ActionButton isQuiet aria-label="Edit attribute" onPress={() => openAttrEdit(item)}>
              <EditIcon />
            </ActionButton>
          )}
          {canDeleteConfig && isOwnAttrsConfig && (
            <ActionButton isQuiet aria-label="Delete attribute" onPress={() => setAttrToDelete(item)}>
              <RemoveCircle />
            </ActionButton>
          )}
        </div>
      ),
    },
  ], [scopes, customAttrsConfig, isOwnAttrsConfig, canWriteConfig, canDeleteConfig, openAttrEdit])

  const renderAttrExpandedContent = useCallback((item: CustomAttributeConfig) => {
    const pendingVals = pendingAttrValueEdits[item.attributeId]
    const isEditing = pendingVals !== undefined
    const displayVals = isEditing ? pendingVals : [...item.values].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    const canEdit = canWriteConfig && isOwnAttrsConfig

    return (
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
        <div>
          {/* Values section header */}
          <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>
              Values ({displayVals.length}):
            </Text>
            <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
              {isEditing ? (
                <>
                  <ActionButton
                    isQuiet
                    size="S"
                    onPress={() => setPendingAttrValueEdits(prev => {
                      const next = { ...prev }
                      delete next[item.attributeId]
                      return next
                    })}
                  >
                    <RotateCCW />
                    <Text>Discard</Text>
                  </ActionButton>
                  <Button
                    variant="accent"
                    size="S"
                    isDisabled={savingAttrValueKey === item.attributeId}
                    onPress={() => handleSaveAttrValues(item.attributeId)}
                  >
                    <Text>Save Values</Text>
                  </Button>
                </>
              ) : canEdit && (
                <ActionButton
                  isQuiet
                  size="S"
                  onPress={() => setPendingAttrValueEdits(prev => ({
                    ...prev,
                    [item.attributeId]: [...item.values].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)).map(v => ({ ...v, label: v.label ?? '' })),
                  }))}
                >
                  <EditIcon />
                  <Text>Edit Values</Text>
                </ActionButton>
              )}
            </div>
          </div>
          {/* Values list */}
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, paddingX: 12, paddingY: 8, backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm' })}>
            {displayVals.map((v, i) => (
              <div key={v.valueId || i} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                <TextField
                  label="Value"
                  value={v.value}
                  isReadOnly={!isEditing}
                  onChange={(val) => setPendingAttrValueEdits(prev => {
                    const vals = [...(prev[item.attributeId] ?? [])]
                    vals[i] = { ...vals[i], value: val }
                    return { ...prev, [item.attributeId]: vals }
                  })}
                  styles={style({ flexGrow: 1 })}
                />
                <TextField
                  label="Label"
                  value={v.label ?? ''}
                  isReadOnly={!isEditing}
                  onChange={(val) => setPendingAttrValueEdits(prev => {
                    const vals = [...(prev[item.attributeId] ?? [])]
                    vals[i] = { ...vals[i], label: val }
                    return { ...prev, [item.attributeId]: vals }
                  })}
                  styles={style({ flexGrow: 1 })}
                />
                {isEditing && (
                  <ActionButton
                    isQuiet
                    aria-label="Delete value"
                    onPress={() => setPendingAttrValueEdits(prev => ({
                      ...prev,
                      [item.attributeId]: (prev[item.attributeId] ?? []).filter((_, vi) => vi !== i),
                    }))}
                  >
                    <RemoveCircle />
                  </ActionButton>
                )}
              </div>
            ))}
            {isEditing && (
              <div className={style({ display: 'flex', justifyContent: 'end', marginTop: 4 })}>
                <ActionButton
                  isQuiet
                  size="S"
                  onPress={() => setPendingAttrValueEdits(prev => ({
                    ...prev,
                    [item.attributeId]: [...(prev[item.attributeId] ?? []), { valueId: '', value: '', label: '', ordinal: (prev[item.attributeId] ?? []).length }],
                  }))}
                >
                  <Add />
                  <Text>Add Value</Text>
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }, [pendingAttrValueEdits, savingAttrValueKey, canWriteConfig, isOwnAttrsConfig, setPendingAttrValueEdits, handleSaveAttrValues])

  // ============================================================================
  // LOADING OVERLAY
  // ============================================================================

  const { loadingOverlayVisible, savingOverlayVisible } = useMemo(() => {
    const isBlockingDialogOpen =
      isRsvpFormOpen || isLocalesFormOpen || isAttrFormOpen ||
      rsvpConfigToDelete != null || localesToDelete != null || attrToDelete != null
    return {
      loadingOverlayVisible: (isLoadingScopes || isLoadingConfigs) && !isSaving,
      savingOverlayVisible: isSaving && !isBlockingDialogOpen,
    }
  }, [
    isRsvpFormOpen, isLocalesFormOpen, isAttrFormOpen,
    rsvpConfigToDelete, localesToDelete, attrToDelete,
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
              <Tab id="rsvp" isDisabled>RSVP Fields</Tab>
              <Tab id="locales">Locale Mapping</Tab>
              <Tab id="attributes" isDisabled>Custom Attributes</Tab>
            </TabList>

            {/* ── RSVP Fields Tab ── */}
            <TabPanel id="rsvp">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
                {rsvpConfig ? (
                  <ResourceDashboardLayout
                    title="RSVP Form Fields"
                    totalCount={rsvpFieldsForTable.length}
                    error={null}
                    data={rsvpFieldsForTable}
                    columns={rsvpFieldColumns}
                    actions={rsvpFieldActions}
                    getItemKey={(item) => item._key}
                    createButton={canWriteConfig ? (
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
                    ) : undefined}
                    onRefresh={loadConfigs}
                    emptyStateTitle="No Fields"
                    emptyStateDescription="This RSVP config has no form fields"
                    searchPlaceholder="Search fields..."
                    searchKeys={['field', 'label', 'type']}
                    renderExpandedContent={renderRsvpExpandedContent}
                    expandedKeys={expandedFieldKeys}
                    onToggleExpand={handleToggleFieldExpand}
                    isRowExpandable={isRsvpFieldExpandable}
                    toolbarEnd={
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
                    }
                  />
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

            {/* ── Custom Attributes Tab ── */}
            <TabPanel id="attributes">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
                <ResourceDashboardLayout
                  title="Custom Attributes"
                  totalCount={customAttributes.length}
                  error={null}
                  data={customAttributes}
                  columns={attrColumns}
                  getItemKey={(item) => item.attributeId}
                  createButton={canWriteConfig ? (
                    <Button variant="accent" onPress={openAttrCreate}>
                      <Add />
                      <Text>Create Attribute</Text>
                    </Button>
                  ) : undefined}
                  onRefresh={loadConfigs}
                  emptyStateIllustration={<GearSettingIllustration aria-hidden />}
                  emptyStateTitle="No Custom Attributes"
                  emptyStateDescription="Create custom attributes to add additional fields to events"
                  searchPlaceholder="Search attributes..."
                  searchKeys={['name', 'inputType']}
                  renderExpandedContent={renderAttrExpandedContent}
                  expandedKeys={expandedAttrKeys}
                  onToggleExpand={handleToggleAttrExpand}
                  isRowExpandable={(item: CustomAttributeConfig) => item.values.length > 0}
                />
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
                    <Picker
                      label="Type"
                      selectedKey={editingFieldForm.type}
                      onSelectionChange={(key) => setEditingFieldForm(prev => {
                        const newType = key as RsvpFieldType
                        const needsReset =
                          (newType === 'multi-select' && prev.displayAs === 'radio') ||
                          (newType === 'select' && prev.displayAs === 'checkbox')
                        return {
                          ...prev,
                          type: newType,
                          displayAs: needsReset ? '' : prev.displayAs,
                          options: (newType === 'text' || newType === 'email' || newType === 'phone') ? [] : prev.options,
                        }
                      })}
                    >
                      {RSVP_FIELD_TYPES.map(t => (
                        <PickerItem key={t.key} id={t.key}>{t.label}</PickerItem>
                      ))}
                    </Picker>
                    {(editingFieldForm.type === 'select' || editingFieldForm.type === 'multi-select') && (
                      <Picker
                        label="Display As"
                        selectedKey={editingFieldForm.displayAs || ''}
                        onSelectionChange={(key) => setEditingFieldForm(prev => ({ ...prev, displayAs: key as RsvpDisplayAs }))}
                      >
                        {getDisplayAsOptions(editingFieldForm.type).map(o => (
                          <PickerItem key={o.key || '__default'} id={o.key}>{o.label}</PickerItem>
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
                  {(editingFieldForm.type === 'select' || editingFieldForm.type === 'multi-select') && (
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
                  isDisabled={!editingFieldForm.field.trim() || !editingFieldForm.label.trim() || isSaving}
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
                      {!(activeLocale && editingRsvpConfig) && (
                        <Button
                          variant="secondary"
                          size="S"
                          onPress={() => {
                            const newIndex = rsvpFormFields.length
                            setRsvpFormFields(prev => [...prev, createEmptyRsvpField()])
                            setExpandedRsvpDialogFields(prev => new Set([...prev, newIndex]))
                          }}
                        >
                          <Add />
                          <Text>Add Field</Text>
                        </Button>
                      )}
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
                        const hasOptions = field.type === 'select' || field.type === 'multi-select'
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
                                  <Picker
                                    label="Type"
                                    selectedKey={field.type}
                                    onSelectionChange={(key) => setRsvpFormFields(prev => {
                                      const copy = [...prev]
                                      const newType = key as RsvpFieldType
                                      const needsReset =
                                        (newType === 'multi-select' && copy[index].displayAs === 'radio') ||
                                        (newType === 'select' && copy[index].displayAs === 'checkbox')
                                      copy[index] = {
                                        ...copy[index],
                                        type: newType,
                                        displayAs: needsReset ? '' : copy[index].displayAs,
                                        options: (newType === 'text' || newType === 'email' || newType === 'phone') ? [] : copy[index].options,
                                      }
                                      return copy
                                    })}
                                  >
                                    {RSVP_FIELD_TYPES.map(t => (
                                      <PickerItem key={t.key} id={t.key}>{t.label}</PickerItem>
                                    ))}
                                  </Picker>
                                  {(field.type === 'select' || field.type === 'multi-select') && (
                                    <Picker
                                      label="Display As"
                                      selectedKey={field.displayAs || ''}
                                      onSelectionChange={(key) => setRsvpFormFields(prev => {
                                        const copy = [...prev]
                                        copy[index] = { ...copy[index], displayAs: key as RsvpDisplayAs }
                                        return copy
                                      })}
                                    >
                                      {getDisplayAsOptions(field.type).map(o => (
                                        <PickerItem key={o.key || '__default'} id={o.key}>{o.label}</PickerItem>
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
                                {(field.type === 'select' || field.type === 'multi-select') && (
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
                  </div>

                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveRsvpConfig}
                  isDisabled={isSaving || rsvpFormFields.filter(f => f.field.trim() && f.label.trim()).length === 0}
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
                    description="Display label shown to users. Falls back to Name if empty."
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
                      // Clear values when switching to non-select types
                      if (key === 'text' || key === 'boolean') {
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
        isOpen={!!attrToDelete}
        onOpenChange={(open) => !open && setAttrToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Custom Attribute"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => { if (attrToDelete) handleDeleteAttr(attrToDelete) }}
          onCancel={() => setAttrToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete attribute <strong>{attrToDelete?.name}</strong>? This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      {/* Loading overlays */}
      <BlurredLoadingOverlay visible={loadingOverlayVisible} message="Loading configurations..." />
      <BlurredLoadingOverlay visible={savingOverlayVisible} message="Saving..." />
    </div>
  )
}

export default ConfigManagement
