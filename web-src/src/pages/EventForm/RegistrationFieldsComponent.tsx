/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Switch,
  RadioGroup,
  Radio,
  Text
} from '@adobe/react-spectrum'
import { TextField } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import { HeadingWithTooltip } from '../../components/shared'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import DragHandle from '@spectrum-icons/workflow/DragHandle'

/**
 * Configuration field structure from the JSON configs
 */
interface RsvpConfigField {
  Field: string
  Type: string
  Required?: string
}

interface RsvpConfig {
  cloudType: string
  config: RsvpConfigField[] | null
}

/**
 * Extended field with display info
 */
interface DisplayField {
  fieldName: string
  isMandated: boolean
  originalIndex: number
}

interface RegistrationFieldsComponentProps {
  cloudType: 'CreativeCloud' | 'ExperienceCloud'
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

/**
 * Converts a camelCase or PascalCase string into an uppercase string with spaces between words.
 */
const convertString = (input: string): string => {
  const parts = input.replace(/([a-z])([A-Z])/g, '$1 $2')
  return parts.toUpperCase()
}

/**
 * Fetches RSVP form configurations for all supported clouds
 */
const fetchRsvpFormConfigs = async (): Promise<RsvpConfig[]> => {
  const SUPPORTED_CLOUDS = [
    { id: 'CreativeCloud', name: 'Creative Cloud' },
    { id: 'ExperienceCloud', name: 'Experience Cloud' }
  ]

  return Promise.all(
    SUPPORTED_CLOUDS.map(async ({ id }) => {
      try {
        const response = await fetch(`https://www.adobe.com/event-libs/assets/configs/rsvp/${id.toLowerCase()}.json`)
        if (!response.ok) {
          console.error(`Failed to fetch RSVP config for ${id}: ${response.status} ${response.statusText}`)
          return { cloudType: id, config: null }
        }
        const data = await response.json()
        console.log(`Fetched RSVP config for ${id}:`, data)
        
        // Handle different possible JSON structures
        const config = Array.isArray(data) ? data : (data.data || data.fields || data.config || null)
        
        return { cloudType: id, config }
      } catch (error) {
        console.error(`Failed to fetch RSVP config for ${id}:`, error)
        return { cloudType: id, config: null }
      }
    })
  )
}

export const RegistrationFieldsComponent: React.FC<RegistrationFieldsComponentProps> = ({
  cloudType,
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
  const [configs, setConfigs] = useState<RsvpConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Fetch configs on mount
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        setLoading(true)
        const fetchedConfigs = await fetchRsvpFormConfigs()
        setConfigs(fetchedConfigs)
        setError(null)
      } catch (err) {
        setError('Failed to load registration field configurations')
        console.error('Error loading RSVP configs:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConfigs()
  }, [])

  // Get the current cloud's config
  const cloudConfig = configs.find((c) => c.cloudType === cloudType)
  const currentConfig = Array.isArray(cloudConfig?.config) ? cloudConfig.config : []
  
  // Filter out items with null-ish Field attribute and submit buttons
  const validFields = currentConfig.filter((f) => f.Field && f.Field.trim() !== '' && f.Type !== 'submit')
  const mandatedFieldNames = validFields.filter((f) => f.Required === 'x').map((f) => f.Field)
  
  // Build display fields list with original order preserved
  const allDisplayFields: DisplayField[] = validFields.map((f, idx) => ({
    fieldName: f.Field,
    isMandated: f.Required === 'x',
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
    // Filter requiredFields to only include fields that are in newVisibleFields, maintaining the new order
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
    // Format mandated fields for display
    const mandatedFieldsDisplay = mandatedFieldNames.map((field) => convertString(field)).join(', ')
    const cloudName = cloudType === 'CreativeCloud' ? 'Creative Cloud' : 'Experience Cloud'
    
    return (
      <Flex direction="column" gap="size-200">
        {mandatedFieldNames.length > 0 && (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
            Note: <strong>{cloudName}</strong> required fields include <strong>{mandatedFieldsDisplay}</strong>
          </Text>
        )}
        
        <View
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-gray-100)',
            borderRadius: '8px',
            padding: 'var(--spectrum-global-dimension-size-600)'
          }}
        >
          {/* Header row - 4 columns now with drag handle */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 40px',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              FIELD CATEGORIES
            </Text>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              INCLUDE ON FORM
            </Text>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              MAKE IT REQUIRED
            </Text>
            {/* Drag handle header - empty placeholder */}
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }} />
          </div>

          {/* Field rows */}
          <Flex direction="column" gap="size-100">
            {sortedDisplayFields.map((displayField, displayIndex) => {
              const { fieldName, isMandated } = displayField
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
                      ? 'var(--spectrum-global-color-gray-200)' 
                      : isVisible
                        ? 'var(--spectrum-global-color-gray-50)'
                        : 'transparent',
                    border: isDragOver 
                      ? '2px solid var(--spectrum-global-color-blue-500)' 
                      : isVisible
                        ? '1px solid var(--spectrum-global-color-gray-300)'
                        : '1px solid transparent',
                    opacity: isDragging ? 0.5 : 1,
                    transition: 'border-color 0.2s, background-color 0.2s',
                    cursor: canDrag ? 'default' : 'default'
                  }}
                >
                  <Text UNSAFE_style={{ fontWeight: 500 }}>
                    {convertString(fieldName)}
                    {isMandated && (
                      <Text UNSAFE_style={{ 
                        fontSize: '11px', 
                        color: 'var(--spectrum-global-color-gray-500)',
                        marginLeft: '8px',
                        fontWeight: 400
                      }}>
                        (Always required)
                      </Text>
                    )}
                  </Text>
                  <Switch
                    isSelected={isVisible}
                    onChange={(checked) => handleVisibleToggle(fieldName, checked)}
                    isDisabled={isMandated}
                  >
                    Appears on form
                  </Switch>
                  <Switch
                    isSelected={isRequired}
                    onChange={(checked) => handleRequiredToggle(fieldName, checked)}
                    isDisabled={!isVisible || isMandated}
                  >
                    Required field
                  </Switch>
                  {/* Drag handle - only visible for selected fields */}
                  <View
                    UNSAFE_style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: canDrag ? 'grab' : 'default',
                      color: canDrag 
                        ? 'var(--spectrum-global-color-gray-600)' 
                        : 'var(--spectrum-global-color-gray-300)',
                      opacity: canDrag ? 1 : 0.3
                    }}
                  >
                    <DragHandle size="S" />
                  </View>
                </div>
              )
            })}
          </Flex>
        </View>
      </Flex>
    )
  }

  const renderMarketoForm = () => (
    <Flex direction="column" gap="size-200">
      <Flex direction="row" gap="size-100" alignItems="center">
        <HeadingWithTooltip
          level={4}
          tooltip="Please enter the Marketo form URL generated by the Milo Marketo Configurator."
        >
          Marketo form URL
        </HeadingWithTooltip>
      </Flex>

      <Text>
        Configure the Marketo RSVP Form here:{' '}
        <a href="https://milo.adobe.com/tools/marketo" target="_blank" rel="noopener noreferrer">
          https://milo.adobe.com/tools/marketo
          <LinkOut size="S" UNSAFE_style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
        </a>
      </Text>

      <TextField
        value={marketoFormUrl}
        onChange={onMarketoFormUrlChange}
        placeholder="Enter Marketo form URL"
        styles={style({ width: '[100%]' })}
      />
    </Flex>
  )

  if (loading) {
    return (
      <View padding="size-400">
        <Text>Loading registration field configurations...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View padding="size-400">
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)' }}>{error}</Text>
      </View>
    )
  }

  // For webinars (ExperienceCloud Virtual), show form type selector
  const isWebinar = cloudType === 'ExperienceCloud' && eventType === 'Virtual'

  return (
    <Flex direction="column" gap="size-300">
      <HeadingWithTooltip
        level={3}
        tooltip="Configure which fields appear on the registration form and which are required."
      >
        RSVP Form Fields
      </HeadingWithTooltip>

      {isWebinar && (
        <Flex direction="column" gap="size-200">
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
        </Flex>
      )}

      {registrationType === 'ESP' ? renderBasicFormTable() : renderMarketoForm()}
    </Flex>
  )
}

