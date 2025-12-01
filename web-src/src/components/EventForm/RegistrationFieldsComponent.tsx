/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Switch,
  TextField,
  RadioGroup,
  Radio,
  Text
} from '@adobe/react-spectrum'
import { HeadingWithTooltip } from '../shared'
import LinkOut from '@spectrum-icons/workflow/LinkOut'

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
  
  // Filter out items with null-ish Field attribute, mandated fields, and submit buttons
  const validFields = currentConfig.filter((f) => f.Field && f.Field.trim() !== '')
  const mandatedFields = validFields.filter((f) => f.Required === 'x').map((f) => f.Field)
  const configurableFields = validFields.filter((f) => f.Required !== 'x' && f.Type !== 'submit')

  const handleVisibleToggle = (fieldName: string, checked: boolean) => {
    if (checked) {
      onVisibleFieldsChange([...visibleFields, fieldName])
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
      onRequiredFieldsChange([...requiredFields, fieldName])
    } else {
      // Remove from required only
      onRequiredFieldsChange(requiredFields.filter((f) => f !== fieldName))
    }
  }

  const renderBasicFormTable = () => {
    // Format mandated fields for display
    const mandatedFieldsDisplay = mandatedFields.map((field) => convertString(field)).join(', ')
    const cloudName = cloudType === 'CreativeCloud' ? 'Creative Cloud' : 'Experience Cloud'

    // Grid style for consistent 3-column layout
    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '24px',
      alignItems: 'center'
    }
    
    return (
      <Flex direction="column" gap="size-200">
        {mandatedFields.length > 0 && (
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
          {/* Header row */}
          <div style={{ ...gridStyle, marginBottom: '12px' }}>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              FIELD CATEGORIES
            </Text>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              INCLUDE ON FORM
            </Text>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              MAKE IT REQUIRED
            </Text>
          </div>

          {/* Field rows */}
          <div style={gridStyle}>
            {configurableFields.map((field) => {
              const fieldName = field.Field
              const isVisible = visibleFields.includes(fieldName) || mandatedFields.includes(fieldName)
              const isRequired = requiredFields.includes(fieldName) || mandatedFields.includes(fieldName)

              return (
                <React.Fragment key={fieldName}>
                  <Text UNSAFE_style={{ fontWeight: 500 }}>
                    {convertString(fieldName)}
                  </Text>
                  <Switch
                    isSelected={isVisible}
                    onChange={(checked) => handleVisibleToggle(fieldName, checked)}
                  >
                    Appears on form
                  </Switch>
                  <Switch
                    isSelected={isRequired}
                    onChange={(checked) => handleRequiredToggle(fieldName, checked)}
                    isDisabled={!isVisible}
                  >
                    Required field
                  </Switch>
                </React.Fragment>
              )
            })}
          </div>
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
        width="100%"
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
        Registration fields
      </HeadingWithTooltip>

      {isWebinar && (
        <RadioGroup
          label="Form Type"
          orientation="horizontal"
          value={registrationType}
          onChange={(value) => onRegistrationTypeChange(value as 'ESP' | 'Marketo')}
        >
          <Radio value="ESP">Basic form</Radio>
          <Radio value="Marketo">Marketo</Radio>
        </RadioGroup>
      )}

      {registrationType === 'ESP' ? renderBasicFormTable() : renderMarketoForm()}
    </Flex>
  )
}

