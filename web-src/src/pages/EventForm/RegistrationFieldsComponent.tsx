/*
* <license header>
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TextField,
  RadioGroup,
  Radio,
  Text,
  Switch,
  ActionButton,
} from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import { HeadingWithTooltip } from '../../components/shared'
import { COLORS, SURFACES } from '../../styles/designSystem'
import OpenIn from '@react-spectrum/s2/icons/OpenIn'
import Move from '@react-spectrum/s2/icons/Move'
import ListBulleted from '@react-spectrum/s2/icons/ListBulleted'
import { useGroup } from '../../contexts/GroupContext'
import { cachedApi } from '../../services/api'
import { configService } from '../../services/configService'
import { hasRsvpConfig } from '../../config/externalConfigs'
import type { RsvpFormField, RsvpScopeConfig } from '../../types/configApi'
import type { RsvpFieldOptionSelectionState } from '../../types/domain'
import {
  mapLegacyRsvpConfigToFormFields,
  mergeOptionSelectionWithField,
  defaultOptionSelectionFromField,
  isSelectableField,
} from '../../utils/rsvpFieldDefinitions'

/**
 * Extended field with display info
 */
interface DisplayField {
  fieldName: string
  label: string
  isMandated: boolean
  originalIndex: number
}

export type RsvpFieldSourceMode = 'scope' | 'legacy'

interface RegistrationFieldsComponentProps {
  isExperienceCloud: boolean
  eventType: 'InPerson' | 'Virtual'
  cloudType: string
  visibleFields: string[]
  requiredFields: string[]
  registrationType: 'ESP' | 'Marketo'
  marketoFormUrl?: string
  rsvpOptionSelections: Record<string, RsvpFieldOptionSelectionState>
  onVisibleFieldsChange: (fields: string[]) => void
  onRequiredFieldsChange: (fields: string[]) => void
  onRegistrationTypeChange: (type: 'ESP' | 'Marketo') => void
  onMarketoFormUrlChange: (url: string) => void
  /** Pass `null` for a field key to remove stored option state */
  onRsvpOptionSelectionsChange: (patch: Record<string, RsvpFieldOptionSelectionState | null>) => void
}

export const RegistrationFieldsComponent: React.FC<RegistrationFieldsComponentProps> = ({
  isExperienceCloud,
  eventType,
  cloudType,
  visibleFields,
  requiredFields,
  registrationType,
  marketoFormUrl = '',
  rsvpOptionSelections,
  onVisibleFieldsChange,
  onRequiredFieldsChange,
  onRegistrationTypeChange,
  onMarketoFormUrlChange,
  onRsvpOptionSelectionsChange,
}) => {
  const { activeGroup } = useGroup()
  const [fields, setFields] = useState<RsvpFormField[]>([])
  const [fieldSourceMode, setFieldSourceMode] = useState<RsvpFieldSourceMode>('scope')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [optionDrag, setOptionDrag] = useState<{ fieldName: string; index: number } | null>(null)
  const [optionDragOver, setOptionDragOver] = useState<{ fieldName: string; index: number } | null>(null)

  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())

  const applyOptionPatch = useCallback((patch: Record<string, RsvpFieldOptionSelectionState | null>) => {
    onRsvpOptionSelectionsChange(patch)
  }, [onRsvpOptionSelectionsChange])

  useEffect(() => {
    const scopeId = activeGroup?.scopeId
    const cloudForLegacy = hasRsvpConfig(cloudType) ? cloudType : 'CreativeCloud'

    const loadFields = async () => {
      try {
        setLoading(true)
        let nextFields: RsvpFormField[] = []
        let mode: RsvpFieldSourceMode = 'legacy'

        if (scopeId) {
          const result = await cachedApi.getConfigsForScope(scopeId, 'rsvp')
          if (!('error' in result)) {
            const rsvpConfig = result.find(c => c.type === 'rsvp') as RsvpScopeConfig | undefined
            const scopeFields = rsvpConfig?.rsvpFormFields ?? []
            if (scopeFields.length > 0) {
              nextFields = scopeFields
              mode = 'scope'
            }
          } else {
            console.warn('Scope RSVP config request failed; falling back to legacy JSON if available.', result)
          }
        }

        if (nextFields.length === 0 && hasRsvpConfig(cloudForLegacy)) {
          const legacyRows = await configService.getRsvpConfig(cloudForLegacy)
          nextFields = mapLegacyRsvpConfigToFormFields(legacyRows)
          mode = 'legacy'
        }

        setFields(nextFields)
        setFieldSourceMode(mode)
        setError(null)
      } catch (err) {
        setError('Failed to load registration field configurations')
        console.error('Error loading RSVP configs:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFields()
  }, [activeGroup?.scopeId, cloudType])

  const validFields = useMemo(() => fields.filter(f => f.field), [fields])
  const mandatedFieldNames = useMemo(() => validFields.filter(f => f.required).map(f => f.field), [validFields])

  const allDisplayFields: DisplayField[] = validFields.map((f, idx) => ({
    fieldName: f.field,
    label: f.label,
    isMandated: f.required,
    originalIndex: idx
  }))

  const sortedDisplayFields = [...allDisplayFields].sort((a, b) => {
    const aIsSelected = visibleFields.includes(a.fieldName)
    const bIsSelected = visibleFields.includes(b.fieldName)

    if (aIsSelected && !bIsSelected) return -1
    if (!aIsSelected && bIsSelected) return 1

    if (aIsSelected && bIsSelected) {
      return visibleFields.indexOf(a.fieldName) - visibleFields.indexOf(b.fieldName)
    }

    return a.originalIndex - b.originalIndex
  })

  const getFieldDef = useCallback(
    (fieldName: string) => fields.filter(f => f.field).find(f => f.field === fieldName),
    [fields]
  )

  const getEffectiveOptionState = useCallback((fieldName: string): RsvpFieldOptionSelectionState | null => {
    const def = getFieldDef(fieldName)
    if (!def || !isSelectableField(def)) return null
    return mergeOptionSelectionWithField(def, rsvpOptionSelections[fieldName])
  }, [getFieldDef, rsvpOptionSelections])

  useEffect(() => {
    if (mandatedFieldNames.length === 0) return

    const missingVisibleMandated = mandatedFieldNames.filter((f) => !visibleFields.includes(f))
    if (missingVisibleMandated.length > 0) {
      const newVisibleFields = [...visibleFields, ...missingVisibleMandated]
      onVisibleFieldsChange(newVisibleFields)

      const missingRequiredMandated = mandatedFieldNames.filter((f) => !requiredFields.includes(f))
      if (missingRequiredMandated.length > 0) {
        const newRequiredFields = newVisibleFields.filter((f) =>
          requiredFields.includes(f) || missingRequiredMandated.includes(f)
        )
        onRequiredFieldsChange(newRequiredFields)
      }
    } else {
      const missingRequiredMandated = mandatedFieldNames.filter((f) => !requiredFields.includes(f))
      if (missingRequiredMandated.length > 0) {
        const newRequiredFields = visibleFields.filter((f) =>
          requiredFields.includes(f) || missingRequiredMandated.includes(f)
        )
        onRequiredFieldsChange(newRequiredFields)
      }
    }
  }, [mandatedFieldNames, visibleFields, requiredFields, onVisibleFieldsChange, onRequiredFieldsChange])

  const handleDragStart = (e: React.DragEvent, displayIndex: number) => {
    const field = sortedDisplayFields[displayIndex]
    if (!visibleFields.includes(field.fieldName)) return

    setExpandedOptions(new Set())
    setOptionDrag(null)
    setOptionDragOver(null)
    setDraggedIndex(displayIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(displayIndex))
  }

  const handleDragOver = (e: React.DragEvent, displayIndex: number) => {
    e.preventDefault()
    const field = sortedDisplayFields[displayIndex]
    if (!visibleFields.includes(field.fieldName)) return

    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== displayIndex) {
      setDragOverIndex(displayIndex)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropDisplayIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropDisplayIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const draggedField = sortedDisplayFields[draggedIndex]
    const dropField = sortedDisplayFields[dropDisplayIndex]

    if (!visibleFields.includes(draggedField.fieldName) || !visibleFields.includes(dropField.fieldName)) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newVisibleFields = [...visibleFields]
    const draggedVisibleIdx = newVisibleFields.indexOf(draggedField.fieldName)
    const dropVisibleIdx = newVisibleFields.indexOf(dropField.fieldName)

    const [removed] = newVisibleFields.splice(draggedVisibleIdx, 1)
    newVisibleFields.splice(dropVisibleIdx, 0, removed)

    onVisibleFieldsChange(newVisibleFields)

    const newRequiredFields = newVisibleFields.filter((f) => requiredFields.includes(f))
    onRequiredFieldsChange(newRequiredFields)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleVisibleToggle = (fieldName: string, checked: boolean) => {
    if (checked) {
      const newVisibleFields = [...visibleFields, fieldName]
      onVisibleFieldsChange(newVisibleFields)
      const newRequiredFields = newVisibleFields.filter((f) => requiredFields.includes(f))
      if (newRequiredFields.length !== requiredFields.length ||
          !newRequiredFields.every((f, i) => f === requiredFields[i])) {
        onRequiredFieldsChange(newRequiredFields)
      }
      const def = getFieldDef(fieldName)
      if (fieldSourceMode === 'scope' && def && isSelectableField(def)) {
        applyOptionPatch({ [fieldName]: defaultOptionSelectionFromField(def) })
      }
    } else {
      onVisibleFieldsChange(visibleFields.filter((f) => f !== fieldName))
      onRequiredFieldsChange(requiredFields.filter((f) => f !== fieldName))
      applyOptionPatch({ [fieldName]: null })
      setExpandedOptions(prev => { const next = new Set(prev); next.delete(fieldName); return next })
    }
  }

  const handleRequiredToggle = (fieldName: string, checked: boolean) => {
    if (checked) {
      const newVisible = visibleFields.includes(fieldName) ? visibleFields : [...visibleFields, fieldName]
      onVisibleFieldsChange(newVisible)
      const newRequired = newVisible.filter((f) => requiredFields.includes(f) || f === fieldName)
      onRequiredFieldsChange(newRequired)
      const def = getFieldDef(fieldName)
      if (fieldSourceMode === 'scope' && def && isSelectableField(def) && !rsvpOptionSelections[fieldName]) {
        applyOptionPatch({ [fieldName]: defaultOptionSelectionFromField(def) })
      }
    } else {
      onRequiredFieldsChange(requiredFields.filter((f) => f !== fieldName))
    }
  }

  const handleOptionEnabledToggle = (fieldName: string, optionValue: string, enabled: boolean) => {
    const def = getFieldDef(fieldName)
    if (!def || !isSelectableField(def)) return

    const cur = mergeOptionSelectionWithField(def, rsvpOptionSelections[fieldName])
    const disabled = new Set(cur.disabledValues)
    if (enabled) {
      disabled.delete(optionValue)
    } else {
      disabled.add(optionValue)
    }

    const enabledCount = cur.order.filter(v => !disabled.has(v)).length
    if (enabledCount === 0) {
      handleVisibleToggle(fieldName, false)
      return
    }

    applyOptionPatch({
      [fieldName]: { order: [...cur.order], disabledValues: Array.from(disabled) }
    })
  }

  const handleOptionDragStart = (e: React.DragEvent, fieldName: string, displayIdx: number) => {
    setOptionDrag({ fieldName, index: displayIdx })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${fieldName}:${displayIdx}`)
  }

  const handleOptionDragOver = (e: React.DragEvent, fieldName: string, displayIdx: number) => {
    e.stopPropagation()
    e.preventDefault()
    if (!optionDrag || optionDrag.fieldName !== fieldName) return
    e.dataTransfer.dropEffect = 'move'
    if (optionDrag.index !== displayIdx) {
      setOptionDragOver({ fieldName, index: displayIdx })
    }
  }

  const handleOptionDragLeave = () => {
    setOptionDragOver(null)
  }

  const handleOptionDrop = (e: React.DragEvent, fieldName: string, dropIdx: number) => {
    e.stopPropagation()
    e.preventDefault()
    if (!optionDrag || optionDrag.fieldName !== fieldName) {
      setOptionDrag(null)
      setOptionDragOver(null)
      return
    }
    const def = getFieldDef(fieldName)
    if (!def || !isSelectableField(def)) {
      setOptionDrag(null)
      setOptionDragOver(null)
      return
    }

    const cur = mergeOptionSelectionWithField(def, rsvpOptionSelections[fieldName])
    const from = optionDrag.index
    if (from === dropIdx) {
      setOptionDrag(null)
      setOptionDragOver(null)
      return
    }

    const order = [...cur.order]
    const [moved] = order.splice(from, 1)
    order.splice(dropIdx, 0, moved)

    applyOptionPatch({ [fieldName]: { order, disabledValues: [...cur.disabledValues] } })
    setOptionDrag(null)
    setOptionDragOver(null)
  }

  const handleOptionDragEnd = () => {
    setOptionDrag(null)
    setOptionDragOver(null)
  }

  const renderBasicFormTable = () => {
    const mandatedLabels = mandatedFieldNames
      .map(name => allDisplayFields.find(f => f.fieldName === name)?.label ?? name)
      .join(', ')

    return (
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        {mandatedFieldNames.length > 0 && (
          <Text UNSAFE_style={{ color: COLORS.GRAY_800 }}>
            Note: required fields include <strong>{mandatedLabels}</strong>
          </Text>
        )}

        {fieldSourceMode === 'legacy' && (
          <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600 }}>
            Using cloud RSVP field list (legacy JSON). Connect a scope RSVP config in Cloud Management for full field types and option controls.
          </Text>
        )}

        <div
          style={{
            backgroundColor: SURFACES.SUBTLE,
            borderRadius: '8px',
            padding: '48px'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 40px 40px',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: COLORS.GRAY_600 }}>
              FIELD CATEGORIES
            </Text>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: COLORS.GRAY_600 }}>
              INCLUDE ON FORM
            </Text>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: COLORS.GRAY_600 }}>
              MAKE IT REQUIRED
            </Text>
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </div>

          <div className={style({display: 'flex', flexDirection: 'column', gap: 8})} >
            {sortedDisplayFields.map((displayField, displayIndex) => {
              const { fieldName, label, isMandated } = displayField
              const isVisible = visibleFields.includes(fieldName)
              const isRequired = requiredFields.includes(fieldName)
              const isDragging = draggedIndex === displayIndex
              const isDragOver = dragOverIndex === displayIndex
              const canDrag = isVisible

              const fieldDef = getFieldDef(fieldName)
              const showOptionEditor = fieldSourceMode === 'scope' && fieldDef && isSelectableField(fieldDef)
              const optState = showOptionEditor ? getEffectiveOptionState(fieldName) : null

              const isExpanded = expandedOptions.has(fieldName)
              const toggleExpanded = () =>
                setExpandedOptions(prev => {
                  const next = new Set(prev)
                  if (isExpanded) next.delete(fieldName)
                  else next.add(fieldName)
                  return next
                })

              return (
                <div
                  key={fieldName}
                  onDragOver={(e) => handleDragOver(e, displayIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, displayIndex)}
                  style={{
                    borderRadius: '6px',
                    backgroundColor: isDragging
                      ? SURFACES.PILL_BG
                      : isVisible
                        ? SURFACES.CANVAS
                        : 'transparent',
                    border: isDragOver
                      ? `2px solid ${SURFACES.SELECTED_RING}`
                      : isVisible
                        ? `1px solid ${SURFACES.BORDER}`
                        : '1px solid transparent',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                >
                  <div
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, displayIndex)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 40px 40px',
                      gap: '16px',
                      alignItems: 'center',
                      padding: '12px 16px',
                    }}
                  >
                    <Text UNSAFE_style={{ fontWeight: 500 }}>
                      {label}
                      {isMandated && (
                        <Text UNSAFE_style={{
                          fontSize: '11px',
                          color: COLORS.GRAY_500,
                          marginLeft: '8px',
                          fontWeight: 400
                        }}>
                          (Always required)
                        </Text>
                      )}
                    </Text>
                    <Switch
                      data-testid={`rsvp-field-${fieldName}-visible`}
                      isSelected={isVisible}
                      onChange={(checked) => handleVisibleToggle(fieldName, checked)}
                      isDisabled={isMandated}
                    >
                      Appears on form
                    </Switch>
                    <Switch
                      data-testid={`rsvp-field-${fieldName}-required`}
                      isSelected={isRequired}
                      onChange={(checked) => handleRequiredToggle(fieldName, checked)}
                      isDisabled={!isVisible || isMandated}
                    >
                      Required field
                    </Switch>
                    {showOptionEditor && optState && isVisible ? (
                      <ActionButton
                        isQuiet
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} options for ${label}`}
                        aria-expanded={isExpanded}
                        onPress={toggleExpanded}
                        UNSAFE_style={{ color: isExpanded ? SURFACES.SELECTED_RING : COLORS.GRAY_600 }}
                      >
                        <ListBulleted />
                      </ActionButton>
                    ) : null}
                    <div
                      aria-label="Drag to reorder"
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: canDrag ? 'grab' : 'default',
                        color: canDrag ? COLORS.GRAY_600 : SURFACES.BORDER,
                        opacity: canDrag ? 1 : 0.3
                      }}
                    >
                      <Move aria-hidden="true" />
                    </div>
                  </div>

                  {showOptionEditor && optState && isVisible && isExpanded && (
                    <div style={{ borderTop: `1px solid ${SURFACES.BORDER}`, padding: '8px 16px 12px' }}>
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                        {optState.order.map((optValue, optDisplayIdx) => {
                          const optLabel = fieldDef?.options?.find(o => o.value === optValue)?.label ?? optValue
                          const optEnabled = !optState.disabledValues.includes(optValue)
                          const oDragging = optionDrag?.fieldName === fieldName && optionDrag.index === optDisplayIdx
                          const oOver = optionDragOver?.fieldName === fieldName && optionDragOver.index === optDisplayIdx

                          return (
                            <div
                              key={optValue}
                              draggable
                              onDragStart={(e) => handleOptionDragStart(e, fieldName, optDisplayIdx)}
                              onDragOver={(e) => handleOptionDragOver(e, fieldName, optDisplayIdx)}
                              onDragLeave={handleOptionDragLeave}
                              onDrop={(e) => handleOptionDrop(e, fieldName, optDisplayIdx)}
                              onDragEnd={handleOptionDragEnd}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 40px',
                                gap: 12,
                                alignItems: 'center',
                                padding: '8px 12px',
                                borderRadius: 6,
                                backgroundColor: oDragging ? SURFACES.PILL_BG : SURFACES.CANVAS,
                                border: oOver ? `2px solid ${SURFACES.SELECTED_RING}` : 'none',
                                opacity: oDragging ? 0.6 : 1
                              }}
                            >
                              <Text UNSAFE_style={{ fontSize: 13 }}>{optLabel}</Text>
                              <Switch
                                data-testid={`rsvp-option-${fieldName}-${optValue}-enabled`}
                                isSelected={optEnabled}
                                onChange={(checked) => handleOptionEnabledToggle(fieldName, optValue, checked)}
                              >
                                Include option
                              </Switch>
                              <div
                                aria-label="Drag to reorder"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  color: COLORS.GRAY_600,
                                  cursor: 'grab'
                                }}
                              >
                                <Move aria-hidden="true" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderMarketoForm = () => (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
      <div className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
        <HeadingWithTooltip
          level={4}
          tooltip="Please enter the Marketo form URL generated by the Milo Marketo Configurator."
        >
          Marketo form URL
        </HeadingWithTooltip>
      </div>

      <Text>
        Configure the Marketo RSVP Form here:{' '}
        <a href="https://milo.adobe.com/tools/marketo" target="_blank" rel="noopener noreferrer">
          https://milo.adobe.com/tools/marketo
          <OpenIn UNSAFE_style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
        </a>
      </Text>

      <TextField
        value={marketoFormUrl}
        onChange={onMarketoFormUrlChange}
        placeholder="Enter Marketo form URL"
        styles={style({ width: '[100%]' })}
      />
    </div>
  )

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <Text>Loading registration field configurations...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <Text UNSAFE_style={{ color: COLORS.STATUS_CANCELLED }}>{error}</Text>
      </div>
    )
  }

  const isWebinar = isExperienceCloud && eventType === 'Virtual'

  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      <HeadingWithTooltip
        level={3}
        tooltip="Configure which fields appear on the registration form and which are required."
      >
        RSVP Form Fields
      </HeadingWithTooltip>

      {isWebinar && (
        <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
          <Text UNSAFE_style={{ fontWeight: 600 }}>Select format and additional fields</Text>
          <RadioGroup
            label=""
            aria-label="Form Type"
            orientation="horizontal"
            value={registrationType}
            onChange={(value) => onRegistrationTypeChange(value as 'ESP' | 'Marketo')}
          >
            <Radio value="ESP">Basic form</Radio>
            <Radio value="Marketo">Marketo</Radio>
          </RadioGroup>
        </div>
      )}

      {registrationType === 'ESP' ? renderBasicFormTable() : renderMarketoForm()}
    </div>
  )
}
