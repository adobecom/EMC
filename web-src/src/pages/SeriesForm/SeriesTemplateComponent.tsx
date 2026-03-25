/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Button
} from '@adobe/react-spectrum'
import { Text } from '@react-spectrum/s2'
import { HeadingWithTooltip, LoadingSpinner } from '../../components/shared'
import { FLEX_GAP, COLORS } from '../../styles/designSystem'
import { useSeriesFormComponent } from '../../hooks/useSeriesFormComponent'
import { EXTERNAL_CONFIG_URLS, ECC_CONFIG_BASE } from '../../config/externalConfigs'
import { TemplatePicker, TemplateOption } from './TemplatePicker'

/**
 * SeriesTemplateComponent - Manages template selection for the series
 * 
 * Uses SeriesFormContext for state management.
 * Handles: templateId
 */
export const SeriesTemplateComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useSeriesFormComponent({
    componentId: 'series-template',
  })
  
  const { templateId = '' } = formData
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadTemplates()
  }, [])
  
  // Update selected template when templateId changes or templates load
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const found = templates.find(t => t.id === templateId)
      if (found) {
        setSelectedTemplate(found)
      }
    }
  }, [templateId, templates])
  
  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    setLoadError(null)
    
    try {
      const response = await fetch(EXTERNAL_CONFIG_URLS.seriesTemplates)
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`)
      }
      
      const json = await response.json()
      const rows = Array.isArray(json?.data) ? json.data : []
      
      const templateOptions: TemplateOption[] = rows
        .map((row: any) => {
          const templatePath = (row['template-path'] ?? '').trim()
          if (!templatePath) return null
          
          const templateName = (row['template-name'] ?? '').trim()
          const templateImage = (row['template-image'] ?? '').trim()
          const eventType = (row['supported-event-type'] ?? '').trim()
          
          // Build full image URL - images are relative paths from the ECC base
          const imageSrc = templateImage 
            ? `${ECC_CONFIG_BASE}${templateImage}`
            : ''
          
          return {
            id: templatePath,
            name: templateName || templatePath,
            imageSrc,
            description: eventType ? `${eventType} event template` : undefined
          }
        })
        .filter(Boolean) as TemplateOption[]
      
      setTemplates(templateOptions)
      
      // If a templateId is already set, find and select it
      if (templateId) {
        const found = templateOptions.find(t => t.id === templateId)
        if (found) {
          setSelectedTemplate(found)
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      setLoadError('Failed to load templates')
    } finally {
      setIsLoadingTemplates(false)
    }
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleOpenPicker = () => {
    setIsPickerOpen(true)
  }
  
  const handleClosePicker = () => {
    setIsPickerOpen(false)
  }
  
  const handleSelectTemplate = (template: TemplateOption) => {
    setSelectedTemplate(template)
    updateFormData({ templateId: template.id })
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      {/* Template Selection Header */}
      <HeadingWithTooltip 
        level={3}
        tooltip="Select the event template that will be used for all events in this series."
      >
        Template selection
      </HeadingWithTooltip>
      
      {isLoadingTemplates ? (
        <LoadingSpinner message="Loading templates..." />
      ) : loadError ? (
        <View padding="size-100">
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)', fontSize: '14px' }}>
            {loadError}
          </Text>
        </View>
      ) : (
        <Flex direction="row" gap="size-400" alignItems="center">
          <Text UNSAFE_style={{ width: '150px', flexShrink: 0, fontWeight: 600 }}>
            Event template
          </Text>
          
          {/* Show selected template name or prompt */}
          <View flex>
            {selectedTemplate ? (
              <Text>{selectedTemplate.name}</Text>
            ) : (
              <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontStyle: 'italic' }}>
                No template selected
              </Text>
            )}
          </View>
          
          <Button
            variant="accent"
            onPress={handleOpenPicker}
            UNSAFE_style={{ 
              backgroundColor: COLORS.BLACK,
              borderColor: COLORS.BLACK 
            }}
          >
            Select
          </Button>
        </Flex>
      )}
      
      {/* Template Picker Modal */}
      <TemplatePicker
        isOpen={isPickerOpen}
        onClose={handleClosePicker}
        onSelect={handleSelectTemplate}
        templates={templates}
        selectedTemplateId={templateId}
        isLoading={isLoadingTemplates}
      />
    </Flex>
  )
}
