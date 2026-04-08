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
  CustomAttributeConfig,
  CustomAttributeValue,
  CustomAttributeInputType,
  RsvpFieldType,
  RsvpDisplayAs,
} from '../../types/configApi'
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

const RSVP_DISPLAY_AS_OPTIONS: { key: RsvpDisplayAs; label: string }[] = [
  { key: 'dropdown', label: 'Dropdown' },
  { key: 'radio', label: 'Radio' },
  { key: 'checkbox', label: 'Checkbox' },
]

const ATTRIBUTE_INPUT_TYPES: { key: CustomAttributeInputType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'boolean', label: 'Boolean' },
  { key: 'single-select', label: 'Single Select' },
  { key: 'multi-select', label: 'Multi Select' },
]

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
  const [activeTab, setActiveTab] = useState<string>('rsvp')

  // ============================================================================
  // RSVP DIALOG STATE
  // ============================================================================

  const [isRsvpFormOpen, setIsRsvpFormOpen] = useState(false)
  const [editingRsvpConfig, setEditingRsvpConfig] = useState<RsvpScopeConfig | null>(null)
  const [rsvpFormFields, setRsvpFormFields] = useState<RsvpFormField[]>([])
  const [rsvpLocalizations, setRsvpLocalizations] = useState<Record<string, { rsvpFormFields: RsvpFormFieldLocaleOverride[] }>>({})
  const [rsvpLocaleEditing, setRsvpLocaleEditing] = useState<string | null>(null)
  const [rsvpConfigToDelete, setRsvpConfigToDelete] = useState<ScopeConfig | null>(null)

  // Expandable state for RSVP fields table
  const [expandedFieldKeys, setExpandedFieldKeys] = useState<Set<string>>(new Set())

  // ============================================================================
  // LOCALES DIALOG STATE
  // ============================================================================

  const [isLocalesFormOpen, setIsLocalesFormOpen] = useState(false)
  const [editingLocalesConfig, setEditingLocalesConfig] = useState<LocalesScopeConfig | null>(null)
  const [localeEntries, setLocaleEntries] = useState<Array<{ code: string; name: string; urlCode: string }>>([])
  const [localesToDelete, setLocalesToDelete] = useState<ScopeConfig | null>(null)

  // ============================================================================
  // CUSTOM ATTRIBUTE DIALOG STATE
  // ============================================================================

  const [isAttrFormOpen, setIsAttrFormOpen] = useState(false)
  const [editingAttr, setEditingAttr] = useState<CustomAttributeConfig | null>(null)
  const [attrFormName, setAttrFormName] = useState('')
  const [attrFormInputType, setAttrFormInputType] = useState<CustomAttributeInputType>('text')
  const [attrFormValues, setAttrFormValues] = useState<CustomAttributeValue[]>([])
  const [attrFormEnabled, setAttrFormEnabled] = useState(true)
  const [attrToDelete, setAttrToDelete] = useState<CustomAttributeConfig | null>(null)

  // Expandable state for attributes table
  const [expandedAttrKeys, setExpandedAttrKeys] = useState<Set<string>>(new Set())

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

  const rsvpConfig = useMemo(
    () => configs.find((c): c is RsvpScopeConfig => c.type === 'rsvp') || null,
    [configs]
  )
  const localesConfig = useMemo(
    () => configs.find((c): c is LocalesScopeConfig => c.type === 'locales') || null,
    [configs]
  )
  const customAttrsConfig = useMemo(
    () => configs.find((c): c is CustomAttributesScopeConfig => c.type === 'custom-attributes') || null,
    [configs]
  )
  const customAttributes = useMemo(
    () => customAttrsConfig?.attributes || [],
    [customAttrsConfig]
  )
  // Available locales for RSVP localization (from sibling locales config or fallback)
  const availableLocales = useMemo(() => {
    if (localesConfig) {
      return Object.entries(localesConfig.localeNames).map(([code, name]) => ({ code, name }))
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
      const result = await apiService.getConfigsForScope(selectedScopeId)
      if (!('error' in result)) setConfigs(result)
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
    setRsvpLocaleEditing(null)
    setIsRsvpFormOpen(true)
  }, [])

  const openRsvpEdit = useCallback((config: RsvpScopeConfig) => {
    setEditingRsvpConfig(config)
    setRsvpFormFields([...config.rsvpFormFields])
    setRsvpLocalizations(config.localizations ? JSON.parse(JSON.stringify(config.localizations)) : {})
    setRsvpLocaleEditing(null)
    setIsRsvpFormOpen(true)
  }, [])

  const handleSaveRsvpConfig = useCallback(async () => {
    if (!selectedScopeId) return
    const validFields = rsvpFormFields.filter(f => f.field.trim() && f.label.trim())
    if (validFields.length === 0) {
      toast.error('At least one field with a name and label is required')
      return
    }

    setIsSaving(true)
    try {
      if (editingRsvpConfig) {
        const result = await apiService.updateConfig(selectedScopeId, editingRsvpConfig.configId, {
          ...editingRsvpConfig,
          rsvpFormFields: validFields,
          localizations: rsvpLocalizations,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This config was modified by someone else. Refresh and try again.'
            : 'Failed to update RSVP config')
          return
        }
        toast.success('RSVP config updated')
      } else {
        const result = await apiService.createConfig(selectedScopeId, {
          type: 'rsvp',
          rsvpFormFields: validFields,
          localizations: rsvpLocalizations,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'An RSVP config already exists for this scope'
            : 'Failed to create RSVP config')
          return
        }
        toast.success('RSVP config created')
      }
      setIsRsvpFormOpen(false)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save RSVP config')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, rsvpFormFields, rsvpLocalizations, editingRsvpConfig, apiService, toast, loadConfigs])

  const handleDeleteConfig = useCallback(async (config: ScopeConfig) => {
    if (!selectedScopeId) return
    setIsSaving(true)
    try {
      const result = await apiService.deleteConfig(selectedScopeId, config.configId)
      if ('error' in result) {
        toast.error('Failed to delete config')
        return
      }
      toast.success('Config deleted')
      setRsvpConfigToDelete(null)
      setLocalesToDelete(null)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete config')
    } finally {
      setIsSaving(false)
    }
  }, [apiService, selectedScopeId, toast, loadConfigs])

  // ============================================================================
  // LOCALES CONFIG CRUD
  // ============================================================================

  const openLocalesCreate = useCallback(() => {
    setEditingLocalesConfig(null)
    setLocaleEntries([{ code: 'en-US', name: 'English, United States', urlCode: '' }])
    setIsLocalesFormOpen(true)
  }, [])

  const openLocalesEdit = useCallback((config: LocalesScopeConfig) => {
    setEditingLocalesConfig(config)
    const entries = Object.entries(config.localeNames).map(([code, name]) => ({
      code,
      name,
      urlCode: config.localeUrlCodes[code] || '',
    }))
    setLocaleEntries(entries.length > 0 ? entries : [{ code: '', name: '', urlCode: '' }])
    setIsLocalesFormOpen(true)
  }, [])

  const handleSaveLocalesConfig = useCallback(async () => {
    if (!selectedScopeId) return
    const validEntries = localeEntries.filter(e => e.code.trim() && e.name.trim())
    if (validEntries.length === 0) {
      toast.error('At least one locale entry is required')
      return
    }

    const localeNames: Record<string, string> = {}
    const localeUrlCodes: Record<string, string> = {}
    for (const entry of validEntries) {
      localeNames[entry.code.trim()] = entry.name.trim()
      localeUrlCodes[entry.code.trim()] = entry.urlCode.trim()
    }

    setIsSaving(true)
    try {
      if (editingLocalesConfig) {
        const result = await apiService.updateConfig(selectedScopeId, editingLocalesConfig.configId, {
          ...editingLocalesConfig,
          localeNames,
          localeUrlCodes,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This config was modified by someone else. Refresh and try again.'
            : 'Failed to update locales config')
          return
        }
        toast.success('Locales config updated')
      } else {
        const result = await apiService.createConfig(selectedScopeId, {
          type: 'locales',
          localeNames,
          localeUrlCodes,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'A locales config already exists for this scope'
            : 'Failed to create locales config')
          return
        }
        toast.success('Locales config created')
      }
      setIsLocalesFormOpen(false)
      setIsSaving(false)
      await loadConfigs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save locales config')
    } finally {
      setIsSaving(false)
    }
  }, [selectedScopeId, localeEntries, editingLocalesConfig, apiService, toast, loadConfigs])

  // ============================================================================
  // CUSTOM ATTRIBUTE CRUD
  // ============================================================================

  const openAttrCreate = useCallback(() => {
    setEditingAttr(null)
    setAttrFormName('')
    setAttrFormInputType('text')
    setAttrFormValues([])
    setAttrFormEnabled(true)
    setIsAttrFormOpen(true)
  }, [])

  const openAttrEdit = useCallback((attr: CustomAttributeConfig) => {
    setEditingAttr(attr)
    setAttrFormName(attr.name)
    setAttrFormInputType(attr.inputType)
    setAttrFormValues([...attr.values])
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
      inputType: attrFormInputType,
      enabled: attrFormEnabled,
      values: attrFormValues
        .filter(v => v.value.trim())
        .map((v, i) => ({
          valueId: v.valueId || generateUUID(),
          value: v.value.trim(),
          displayOrder: i,
        })),
    }

    setIsSaving(true)
    try {
      if (customAttrsConfig) {
        const updatedAttributes = editingAttr
          ? customAttrsConfig.attributes.map(a =>
              a.attributeId === editingAttr.attributeId ? newAttr : a
            )
          : [...customAttrsConfig.attributes, newAttr]

        const result = await apiService.updateConfig(selectedScopeId, customAttrsConfig.configId, {
          ...customAttrsConfig,
          attributes: updatedAttributes,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This config was modified by someone else. Refresh and try again.'
            : `Failed to ${editingAttr ? 'update' : 'create'} custom attribute`)
          return
        }
      } else {
        const result = await apiService.createConfig(selectedScopeId, {
          type: 'custom-attributes',
          attributes: [newAttr],
        })
        if ('error' in result) {
          toast.error('Failed to create custom attribute')
          return
        }
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
  }, [selectedScopeId, attrFormName, attrFormInputType, attrFormValues, attrFormEnabled, editingAttr, customAttrsConfig, apiService, toast, loadConfigs])

  const handleDeleteAttr = useCallback(async (attr: CustomAttributeConfig) => {
    if (!selectedScopeId || !customAttrsConfig) return
    setIsSaving(true)
    try {
      const remaining = customAttrsConfig.attributes.filter(a => a.attributeId !== attr.attributeId)

      if (remaining.length === 0) {
        const result = await apiService.deleteConfig(selectedScopeId, customAttrsConfig.configId)
        if ('error' in result) {
          toast.error('Failed to delete custom attribute')
          return
        }
      } else {
        const result = await apiService.updateConfig(selectedScopeId, customAttrsConfig.configId, {
          ...customAttrsConfig,
          attributes: remaining,
        })
        if ('error' in result) {
          toast.error('Failed to delete custom attribute')
          return
        }
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
  // RSVP LOCALIZATION HELPERS
  // ============================================================================

  const getLocaleOverrides = useCallback((locale: string): RsvpFormFieldLocaleOverride[] => {
    return rsvpLocalizations[locale]?.rsvpFormFields || []
  }, [rsvpLocalizations])

  const setLocaleOverrideField = useCallback((locale: string, fieldName: string, prop: 'label' | 'placeholder', value: string) => {
    setRsvpLocalizations(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      if (!copy[locale]) copy[locale] = { rsvpFormFields: [] }
      const fields = copy[locale].rsvpFormFields as RsvpFormFieldLocaleOverride[]
      const existing = fields.find(f => f.field === fieldName)
      if (existing) {
        existing[prop] = value || undefined
      } else {
        fields.push({ field: fieldName, [prop]: value || undefined })
      }
      // Remove entries with no overrides
      copy[locale].rsvpFormFields = fields.filter(
        (f: RsvpFormFieldLocaleOverride) => f.label || f.placeholder || (f.options && f.options.length > 0)
      )
      if (copy[locale].rsvpFormFields.length === 0) delete copy[locale]
      return copy
    })
  }, [])

  const setLocaleOverrideOptions = useCallback((locale: string, fieldName: string, optionsStr: string) => {
    setRsvpLocalizations(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      if (!copy[locale]) copy[locale] = { rsvpFormFields: [] }
      const fields = copy[locale].rsvpFormFields as RsvpFormFieldLocaleOverride[]
      const existing = fields.find(f => f.field === fieldName)
      const options = optionsStr ? optionsStr.split('\n').map(o => o.trim()).filter(Boolean) : undefined
      if (existing) {
        existing.options = options
      } else {
        fields.push({ field: fieldName, options })
      }
      copy[locale].rsvpFormFields = fields.filter(
        (f: RsvpFormFieldLocaleOverride) => f.label || f.placeholder || (f.options && f.options.length > 0)
      )
      if (copy[locale].rsvpFormFields.length === 0) delete copy[locale]
      return copy
    })
  }, [])

  // ============================================================================
  // RSVP TABLE COLUMNS (for display)
  // ============================================================================

  const rsvpFieldsForTable = useMemo(() => {
    if (!rsvpConfig) return []
    return rsvpConfig.rsvpFormFields.map((f, i) => ({
      ...f,
      _key: `${f.field}-${i}`,
    }))
  }, [rsvpConfig])

  const rsvpFieldColumns = useMemo(() => [
    { key: 'field', name: 'FIELD NAME', width: 160, sortable: true },
    { key: 'label', name: 'LABEL', width: 160, sortable: true },
    {
      key: 'type',
      name: 'TYPE',
      width: 120,
      sortable: true,
      render: (item: RsvpFormField & { _key: string }) => (
        <Badge variant="informative">{item.type}</Badge>
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
        <Text>{item.displayAs || '-'}</Text>
      ),
    },
  ], [])

  const renderRsvpExpandedContent = useCallback((item: RsvpFormField & { _key: string }) => {
    const locales = Object.keys(rsvpConfig?.localizations || {})
    return (
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
        {item.options.length > 0 && (
          <div>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>Options:</Text>
            <div className={style({ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 })}>
              {item.options.map((opt, i) => (
                <Badge key={i} variant="neutral">{opt}</Badge>
              ))}
            </div>
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
                const overrides = rsvpConfig?.localizations[locale]?.rsvpFormFields || []
                const override = overrides.find(o => o.field === item.field)
                if (!override) return null
                return (
                  <div key={locale} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                    <Badge variant="informative">{locale}</Badge>
                    {override.label && <Text>Label: {override.label}</Text>}
                    {override.placeholder && <Text>Placeholder: {override.placeholder}</Text>}
                    {override.options && <Text>Options: {override.options.join(', ')}</Text>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {!item.options.length && !item.rules && !item.default && locales.length === 0 && (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)', fontSize: 13 }}>
            No additional details
          </Text>
        )}
      </div>
    )
  }, [rsvpConfig])

  // ============================================================================
  // CUSTOM ATTRIBUTES TABLE
  // ============================================================================

  const isOwnAttrsConfig = customAttrsConfig?.scopeId === selectedScopeId

  const attrColumns = useMemo(() => [
    { key: 'name', name: 'NAME', width: 200, sortable: true },
    {
      key: 'enabled',
      name: 'ENABLED',
      width: 100,
      sortable: true,
      render: (item: CustomAttributeConfig) => (
        <Badge variant={item.enabled ? 'positive' : 'neutral'}>
          {item.enabled ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'inputType',
      name: 'INPUT TYPE',
      width: 140,
      sortable: true,
      render: (item: CustomAttributeConfig) => (
        <Badge variant="informative">{item.inputType}</Badge>
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
    if (item.values.length === 0) {
      return (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)', fontSize: 13, padding: 8 }}>
          No values defined (free-form input)
        </Text>
      )
    }
    return (
      <div className={style({ display: 'flex', flexWrap: 'wrap', gap: 8 })} style={{ padding: 8 }}>
        {item.values
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((v, i) => (
            <Badge key={v.valueId || i} variant="neutral">{v.value}</Badge>
          ))}
      </div>
    )
  }, [])

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

        <Divider />

        {/* Tab content */}
        {selectedScopeId ? (
          <Tabs aria-label="Configuration types" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
            <TabList>
              <Tab id="rsvp">RSVP Fields</Tab>
              <Tab id="locales">Locale Mapping</Tab>
              <Tab id="attributes">Custom Attributes</Tab>
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
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>URL Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(localesConfig.localeNames).map(([code, name]) => (
                            <tr key={code} style={{ borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
                              <td style={{ padding: '10px 16px' }}>
                                <Badge variant="informative">{code}</Badge>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <Text>{name}</Text>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <Text>{localesConfig.localeUrlCodes[code] || '(default)'}</Text>
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
                      <Button
                        variant="secondary"
                        size="S"
                        onPress={() => setRsvpFormFields(prev => [...prev, createEmptyRsvpField()])}
                      >
                        <Add />
                        <Text>Add Field</Text>
                      </Button>
                    </div>
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                      {rsvpFormFields.map((field, index) => (
                        <div
                          key={index}
                          style={{
                            padding: 16,
                            border: '1px solid var(--spectrum-global-color-gray-300)',
                            borderRadius: 8,
                            backgroundColor: 'var(--spectrum-global-color-gray-100)',
                          }}
                        >
                          <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 })}>
                            <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13 }}>Field {index + 1}</Text>
                            <ActionButton
                              isQuiet
                              aria-label="Remove field"
                              onPress={() => setRsvpFormFields(prev => prev.filter((_, i) => i !== index))}
                              isDisabled={rsvpFormFields.length <= 1}
                            >
                              <RemoveCircle />
                            </ActionButton>
                          </div>
                          <div className={style({ display: 'grid', gap: 12 })} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
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
                              label="Label"
                              value={field.label}
                              onChange={(v) => setRsvpFormFields(prev => {
                                const copy = [...prev]
                                copy[index] = { ...copy[index], label: v }
                                return copy
                              })}
                              isRequired
                            />
                            <TextField
                              label="Placeholder"
                              value={field.placeholder}
                              onChange={(v) => setRsvpFormFields(prev => {
                                const copy = [...prev]
                                copy[index] = { ...copy[index], placeholder: v }
                                return copy
                              })}
                            />
                            <Picker
                              label="Type"
                              selectedKey={field.type}
                              onSelectionChange={(key) => setRsvpFormFields(prev => {
                                const copy = [...prev]
                                copy[index] = { ...copy[index], type: key as RsvpFieldType }
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
                                selectedKey={field.displayAs || 'dropdown'}
                                onSelectionChange={(key) => setRsvpFormFields(prev => {
                                  const copy = [...prev]
                                  copy[index] = { ...copy[index], displayAs: key as RsvpDisplayAs }
                                  return copy
                                })}
                              >
                                {RSVP_DISPLAY_AS_OPTIONS.map(o => (
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
                          {(field.type === 'select' || field.type === 'multi-select') && (
                            <div style={{ marginTop: 12 }}>
                              <TextField
                                label="Options (one per line)"
                                value={field.options.join('\n')}
                                onChange={(v) => setRsvpFormFields(prev => {
                                  const copy = [...prev]
                                  copy[index] = {
                                    ...copy[index],
                                    options: v.split('\n').map(o => o.trim()).filter(Boolean),
                                  }
                                  return copy
                                })}
                                styles={style({ width: '[100%]' })}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Localizations */}
                  <div>
                    <Text UNSAFE_style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>Localizations</Text>
                    <div className={style({ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 16 })}>
                      <Picker
                        label="Select locale to edit"
                        selectedKey={rsvpLocaleEditing}
                        onSelectionChange={(key) => setRsvpLocaleEditing(key as string | null)}
                        styles={style({ width: 280 })}
                      >
                        {availableLocales.map(l => (
                          <PickerItem key={l.code} id={l.code} textValue={`${l.name} (${l.code})`}>
                            <Text slot="label">{l.name} ({l.code})</Text>
                          </PickerItem>
                        ))}
                      </Picker>
                    </div>
                    {rsvpLocaleEditing && (
                      <div
                        style={{
                          padding: 16,
                          border: '1px solid var(--spectrum-global-color-gray-300)',
                          borderRadius: 8,
                          backgroundColor: 'var(--spectrum-global-color-gray-100)',
                        }}
                      >
                        <Text UNSAFE_style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                          Localizations for {rsvpLocaleEditing}
                        </Text>
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
                          {rsvpFormFields.filter(f => f.field.trim()).map((field, i) => {
                            const overrides = getLocaleOverrides(rsvpLocaleEditing!)
                            const override = overrides.find(o => o.field === field.field)
                            return (
                              <div
                                key={`${field.field}-${i}`}
                                className={style({ display: 'flex', gap: 12, alignItems: 'end' })}
                                style={{ flexWrap: 'wrap' }}
                              >
                                <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13, minWidth: 120 }}>
                                  {field.field}:
                                </Text>
                                <TextField
                                  label="Label"
                                  value={override?.label || ''}
                                  onChange={(v) => setLocaleOverrideField(rsvpLocaleEditing!, field.field, 'label', v)}
                                  styles={style({ width: 200 })}
                                />
                                <TextField
                                  label="Placeholder"
                                  value={override?.placeholder || ''}
                                  onChange={(v) => setLocaleOverrideField(rsvpLocaleEditing!, field.field, 'placeholder', v)}
                                  styles={style({ width: 200 })}
                                />
                                {(field.type === 'select' || field.type === 'multi-select') && (
                                  <TextField
                                    label="Options (one per line)"
                                    value={override?.options?.join('\n') || ''}
                                    onChange={(v) => setLocaleOverrideOptions(rsvpLocaleEditing!, field.field, v)}
                                    styles={style({ width: 200 })}
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
                      onPress={() => setLocaleEntries(prev => [...prev, { code: '', name: '', urlCode: '' }])}
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
                          label="URL Code"
                          value={entry.urlCode}
                          onChange={(v) => setLocaleEntries(prev => {
                            const copy = [...prev]
                            copy[index] = { ...copy[index], urlCode: v }
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
        <Dialog>
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
                        <Text UNSAFE_style={{ fontWeight: 700 }}>Values</Text>
                        <Button
                          variant="secondary"
                          size="S"
                          onPress={() => setAttrFormValues(prev => [...prev, {
                            value: '',
                            displayOrder: prev.length,
                          }])}
                        >
                          <Add />
                          <Text>Add Value</Text>
                        </Button>
                      </div>
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                        {attrFormValues.map((val, index) => (
                          <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                            <TextField
                              label={`Value ${index + 1}`}
                              value={val.value}
                              onChange={(v) => setAttrFormValues(prev => {
                                const copy = [...prev]
                                copy[index] = { ...copy[index], value: v }
                                return copy
                              })}
                              styles={style({ flexGrow: 1, width: '[100%]' })}
                            />
                            <ActionButton
                              isQuiet
                              aria-label="Remove value"
                              onPress={() => setAttrFormValues(prev =>
                                prev.filter((_, i) => i !== index).map((v, i) => ({ ...v, displayOrder: i }))
                              )}
                            >
                              <RemoveCircle />
                            </ActionButton>
                          </div>
                        ))}
                        {attrFormValues.length === 0 && (
                          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)', fontSize: 13 }}>
                            No values yet. Add values for users to select from.
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
          onPrimaryAction={() => { if (rsvpConfigToDelete) handleDeleteConfig(rsvpConfigToDelete) }}
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
          onPrimaryAction={() => { if (localesToDelete) handleDeleteConfig(localesToDelete) }}
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
