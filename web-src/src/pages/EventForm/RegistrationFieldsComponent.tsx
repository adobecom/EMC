/*
* <license header>
*/

import React, { useState, useEffect } from 'react'
import { TextField, RadioGroup, Radio, Text, Switch } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import { HeadingWithTooltip } from '../../components/shared'
import { COLORS, SURFACES } from '../../styles/designSystem'
import OpenIn from '@react-spectrum/s2/icons/OpenIn'
import Move from '@react-spectrum/s2/icons/Move'
import { useGroup } from '../../contexts/GroupContext'
import { cachedApi } from '../../services/api'
import type { RsvpFormField, RsvpScopeConfig } from '../../types/configApi'

/**
 * Extended field with display info
 */
interface DisplayField {
  fieldName: string
  label: string
  isMandated: boolean
  originalIndex: number
}

interface RegistrationFieldsComponentProps {
  isExperienceCloud: boolean
  eventType: 'InPerson' | 'Virtual'
  visibleFields: string[]
  requiredFields: string[]
  registrationType: 'ESP' | 'Marketo'
  marketoFormUrl?: string
  onVisibleFieldsChange: (fields: string[]) => void
  onRequiredFieldsChange: (fields: string[]) => void
  onRegistrationTypeChange: (type: 'ESP' | 'Marketo') => void
  onMarketoFormUrlChange: (url: string) => void
}

export const RegistrationFieldsComponent: React.FC<RegistrationFieldsComponentProps> = ({
  isExperienceCloud,
  eventType,
  visibleFields,
  requiredFields,
  registrationType,
  marketoFormUrl = '',
  onVisibleFieldsChange,
  onRequiredFieldsChange,
  onRegistrationTypeChange,
  onMarketoFormUrlChange
}) => {
  const { activeGroup } = useGroup()
  const [fields, setFields] = useState<RsvpFormField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Fetch RSVP config for the current scope on mount
  useEffect(() => {
    const scopeId = activeGroup?.scopeId
    if (!scopeId) {
      setLoading(false)
      return
    }

    const loadFields = async () => {
      try {
        setLoading(true)
        const result = await cachedApi.getConfigsForScope(scopeId, 'rsvp')
        if ('error' in result) {
          setError('Failed to load registration field configurations')
          return
        }
        const rsvpConfig = result.find(c => c.type === 'rsvp') as RsvpScopeConfig | undefined
        setFields(rsvpConfig?.rsvpFormFields ?? [])
        setError(null)
      } catch (err) {
        setError('Failed to load registration field configurations')
        console.error('Error loading RSVP configs:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFields()
  }, [activeGroup?.scopeId])

  // Filter out submit-type fields
  const validFields = fields.filter(f => f.field)
  const mandatedFieldNames = validFields.filter(f => f.required).map(f => f.field)

  // Build display fields list with original order preserved
  const allDisplayFields: DisplayField[] = validFields.map((f, idx) => ({
    fieldName: f.field,
    label: f.label,
    isMandated: f.required,
    originalIndex: idx
  }))

  // Sort fields: selected (visible) fields first, then unselected
  // Within each group, maintain order based on visibleFields array (for selected) or original config order (for unselected)
  const sortedDisplayFields = [...allDisplayFields].sort((a, b) => {
    const aIsSelected = visibleFields.includes(a.fieldName)
    const bIsSelected = visibleFields.includes(b.fieldName)

    if (aIsSelected && !bIsSelected) return -1
    if (!aIsSelected && bIsSelected) return 1

    // Both selected: sort by position in visibleFields array
    if (aIsSelected && bIsSelected) {
      return visibleFields.indexOf(a.fieldName) - visibleFields.indexOf(b.fieldName)
    }

    // Both unselected: maintain original config order
    return a.originalIndex - b.originalIndex
  })

  // Ensure mandated fields are always included in visible and required arrays
  useEffect(() => {
    if (mandatedFieldNames.length === 0) return

    // Check if any mandated fields are missing from visibleFields
    const missingVisibleMandated = mandatedFieldNames.filter((f) => !visibleFields.includes(f))
    if (missingVisibleMandated.length > 0) {
      const newVisibleFields = [...visibleFields, ...missingVisibleMandated]
      onVisibleFieldsChange(newVisibleFields)

      // Also ensure requiredFields is ordered consistently with newVisibleFields
      const missingRequiredMandated = mandatedFieldNames.filter((f) => !requiredFields.includes(f))
      if (missingRequiredMandated.length > 0) {
        // Build required array in the same order as visible
        const newRequiredFields = newVisibleFields.filter((f) =>
          requiredFields.includes(f) || missingRequiredMandated.includes(f)
        )
        onRequiredFieldsChange(newRequiredFields)
      }
    } else {
      // Check if any mandated fields are missing from requiredFields (visible was already complete)
      const missingRequiredMandated = mandatedFieldNames.filter((f) => !requiredFields.includes(f))
      if (missingRequiredMandated.length > 0) {
        // Build required array in the same order as visible
        const newRequiredFields = visibleFields.filter((f) =>
          requiredFields.includes(f) || missingRequiredMandated.includes(f)
        )
        onRequiredFieldsChange(newRequiredFields)
      }
    }
  }, [mandatedFieldNames.join(','), visibleFields, requiredFields, onVisibleFieldsChange, onRequiredFieldsChange])

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragStart = (e: React.DragEvent, displayIndex: number) => {
    const field = sortedDisplayFields[displayIndex]
    // Only allow dragging selected (visible) fields
    if (!visibleFields.includes(field.fieldName)) return

    setDraggedIndex(displayIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(displayIndex))
  }

  const handleDragOver = (e: React.DragEvent, displayIndex: number) => {
    e.preventDefault()
    const field = sortedDisplayFields[displayIndex]
    // Only allow dropping on selected (visible) fields
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

    // Only reorder within visible fields
    if (!visibleFields.includes(draggedField.fieldName) || !visibleFields.includes(dropField.fieldName)) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reorder visibleFields array
    const newVisibleFields = [...visibleFields]
    const draggedVisibleIdx = newVisibleFields.indexOf(draggedField.fieldName)
    const dropVisibleIdx = newVisibleFields.indexOf(dropField.fieldName)

    const [removed] = newVisibleFields.splice(draggedVisibleIdx, 1)
    newVisibleFields.splice(dropVisibleIdx, 0, removed)

    onVisibleFieldsChange(newVisibleFields)

    // Also reorder requiredFields to match the new visibleFields order
    const newRequiredFields = newVisibleFields.filter((f) => requiredFields.includes(f))
    onRequiredFieldsChange(newRequiredFields)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ============================================================================
  // FIELD TOGGLE HANDLERS
  // ============================================================================

  const handleVisibleToggle = (fieldName: string, checked: boolean) => {
    if (checked) {
      const newVisibleFields = [...visibleFields, fieldName]
      onVisibleFieldsChange(newVisibleFields)
      // Re-order requiredFields to match visible order (in case field was previously required)
      const newRequiredFields = newVisibleFields.filter((f) => requiredFields.includes(f))
      if (newRequiredFields.length !== requiredFields.length ||
          !newRequiredFields.every((f, i) => f === requiredFields[i])) {
        onRequiredFieldsChange(newRequiredFields)
      }
    } else {
      // Remove from both visible and required
      onVisibleFieldsChange(visibleFields.filter((f) => f !== fieldName))
      onRequiredFieldsChange(requiredFields.filter((f) => f !== fieldName))
    }
  }

  const handleRequiredToggle = (fieldName: string, checked: boolean) => {
    if (checked) {
      // Add to both visible and required
      const newVisible = visibleFields.includes(fieldName) ? visibleFields : [...visibleFields, fieldName]
      onVisibleFieldsChange(newVisible)
      // Insert the field in the required array at the position matching its order in visibleFields
      const newRequired = newVisible.filter((f) => requiredFields.includes(f) || f === fieldName)
      onRequiredFieldsChange(newRequired)
    } else {
      // Remove from required only
      onRequiredFieldsChange(requiredFields.filter((f) => f !== fieldName))
    }
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

        <div
          style={{
            backgroundColor: SURFACES.SUBTLE,
            borderRadius: '8px',
            padding: '48px'
          }}
        >
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 40px',
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
            {/* Drag handle header - empty placeholder */}
            <span style={{ fontWeight: 600, fontSize: '12px', color: COLORS.GRAY_600 }} />
          </div>

          {/* Field rows */}
          <div className={style({display: 'flex', flexDirection: 'column', gap: 8})} >
            {sortedDisplayFields.map((displayField, displayIndex) => {
              const { fieldName, label, isMandated } = displayField
              const isVisible = visibleFields.includes(fieldName)
              const isRequired = requiredFields.includes(fieldName)
              const isDragging = draggedIndex === displayIndex
              const isDragOver = dragOverIndex === displayIndex
              const canDrag = isVisible

              return (
                <div
                  key={fieldName}
                  draggable={canDrag}
                  onDragStart={(e) => handleDragStart(e, displayIndex)}
                  onDragOver={(e) => handleDragOver(e, displayIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, displayIndex)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 40px',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '12px 16px',
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
                    cursor: canDrag ? 'default' : 'default'
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
                  {/* Drag handle - only visible for selected fields */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: canDrag ? 'grab' : 'default',
                      color: canDrag ? COLORS.GRAY_600 : SURFACES.BORDER,
                      opacity: canDrag ? 1 : 0.3
                    }}
                  >
                    <Move />
                  </div>
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
