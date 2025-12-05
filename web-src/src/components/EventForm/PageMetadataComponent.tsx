/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  Flex,
  Heading,
  Text,
  Picker,
  Item
} from '@adobe/react-spectrum'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

interface MetadataField {
  key: string
  name: string
}

interface MetadataOption {
  value: string
}

interface MetadataCatalogue {
  data: {
    data: MetadataField[]
  }
  [key: string]: any
}

const METADATA_CATALOGUE_URL = 'https://www.adobe.com/event-libs/assets/configs/metadata-catalogue.json'

/**
 * PageMetadataComponent - Manages page metadata for webinar events
 * 
 * Uses EventFormContext for state management.
 * Fetches metadata catalogue from external URL.
 */
export const PageMetadataComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'page-metadata',
  })
  
  const metadata = formData.metadata || {}
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [catalogue, setCatalogue] = useState<MetadataCatalogue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    let isMounted = true

    const fetchCatalogue = async () => {
      try {
        const response = await fetch(METADATA_CATALOGUE_URL)
        if (!response.ok) {
          throw new Error('Failed to fetch metadata catalogue')
        }
        const data = await response.json()
        
        if (isMounted) {
          setCatalogue(data)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Error fetching metadata catalogue:', err)
        if (isMounted) {
          setError('Failed to load metadata options')
          setIsLoading(false)
        }
      }
    }

    fetchCatalogue()

    return () => {
      isMounted = false
    }
  }, [])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFieldChange = (fieldKey: string, value: string) => {
    const updatedMetadata = { ...metadata }
    
    if (value && !value.startsWith('No ')) {
      updatedMetadata[fieldKey] = value
    } else {
      delete updatedMetadata[fieldKey]
    }
    
    updateFormData({ metadata: updatedMetadata })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <Flex direction="column" gap={FLEX_GAP.FIELD}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Page metadata management
        </Heading>
        <Text>Loading metadata options...</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <Flex direction="column" gap={FLEX_GAP.FIELD}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Page metadata management
        </Heading>
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)' }}>
          {error}
        </Text>
      </Flex>
    )
  }

  const fields = catalogue?.data?.data || []

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      <Flex direction="column" gap={FLEX_GAP.TIGHT}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Page metadata management
        </Heading>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Configure tracking and metadata settings for your event. Set your primary product name 
          to ensure accurate analytics tracking and reporting for your webinar event page.
        </Text>
      </Flex>

      {fields.map((field: MetadataField) => {
        const fieldOptions: MetadataOption[] = catalogue?.[field.key]?.data || []
        const currentValue = metadata[field.key] || ''
        
        const allOptions = [
          { key: `no-${field.key}`, label: `No ${field.name}` },
          ...fieldOptions.map(opt => ({ key: opt.value, label: opt.value }))
        ]

        return (
          <Picker
            key={field.key}
            label={`${field.name} *`}
            placeholder={`Select ${field.name.toLowerCase()}`}
            selectedKey={currentValue || `no-${field.key}`}
            onSelectionChange={(key) => handleFieldChange(field.key, key as string)}
            isRequired
            items={allOptions}
          >
            {(item) => <Item key={item.key}>{item.label}</Item>}
          </Picker>
        )
      })}
    </Flex>
  )
}
