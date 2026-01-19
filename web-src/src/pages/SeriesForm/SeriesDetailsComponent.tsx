/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  TextArea,
  Picker,
  Item,
  Flex,
  Text
} from '@adobe/react-spectrum'
import { HeadingWithTooltip, LoadingSpinner } from '../../components/shared'
import { FLEX_GAP } from '../../styles/designSystem'
import { useSeriesFormComponent } from '../../hooks/useSeriesFormComponent'
import { SUPPORTED_CLOUDS } from '../../config/environmentConfig'
import { EXTERNAL_CONFIG_URLS } from '../../config/externalConfigs'
import { TargetCms } from '../../types/domain'

interface TargetCmsOption {
  code: string
  provider: string
  instance: string
  label: string
}

/**
 * SeriesDetailsComponent - Manages core series information
 * 
 * Uses SeriesFormContext for state management.
 * Handles: cloudType, targetCms, seriesName, seriesDescription
 */
export const SeriesDetailsComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    seriesId,
  } = useSeriesFormComponent({
    componentId: 'series-details',
  })
  
  // Destructure form data
  const {
    cloudType = 'ExperienceCloud',
    targetCms,
    seriesName = '',
    seriesDescription = '',
  } = formData
  
  // Once series is created, cloud and target CMS are locked
  const isLocked = !!seriesId
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [targetCmsOptions, setTargetCmsOptions] = useState<TargetCmsOption[]>([])
  const [isLoadingCms, setIsLoadingCms] = useState(true)
  const [cmsError, setCmsError] = useState<string | null>(null)
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadTargetCmsOptions()
  }, [])
  
  const loadTargetCmsOptions = async () => {
    setIsLoadingCms(true)
    setCmsError(null)
    
    try {
      const response = await fetch(EXTERNAL_CONFIG_URLS.targetCmsMap)
      if (!response.ok) {
        throw new Error(`Failed to fetch Target CMS options: ${response.status}`)
      }
      
      const json = await response.json()
      const rows = Array.isArray(json?.data) ? json.data : []
      
      const options: TargetCmsOption[] = rows
        .map((row: any) => {
          const code = (row.Code ?? '').trim()
          if (!code) return null
          
          const provider = (row.Provider ?? '').trim()
          const instance = (row.Instance ?? '').trim()
          
          return { code, provider, instance, label: code }
        })
        .filter(Boolean) as TargetCmsOption[]
      
      // Sort by code
      options.sort((a, b) => a.code.localeCompare(b.code))
      setTargetCmsOptions(options)
      
      // If no targetCms is selected and we have options, select the first one
      if (!targetCms && options.length > 0) {
        const firstOption = options[0]
        updateFormData({
          targetCms: {
            code: firstOption.code,
            provider: firstOption.provider,
            instance: firstOption.instance
          }
        })
      }
    } catch (error) {
      console.error('Failed to load Target CMS options:', error)
      setCmsError('Failed to load Target CMS options')
    } finally {
      setIsLoadingCms(false)
    }
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleCloudChange = (key: React.Key | null) => {
    if (key) {
      updateFormData({ cloudType: String(key) as 'CreativeCloud' | 'ExperienceCloud' })
    }
  }
  
  const handleTargetCmsChange = (key: React.Key | null) => {
    if (key) {
      const selected = targetCmsOptions.find(opt => opt.code === key)
      if (selected) {
        updateFormData({
          targetCms: {
            code: selected.code,
            provider: selected.provider,
            instance: selected.instance
          }
        })
      }
    }
  }
  
  const handleNameChange = (value: string) => {
    updateFormData({ seriesName: value })
  }
  
  const handleDescriptionChange = (value: string) => {
    updateFormData({ seriesDescription: value })
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      {/* Header */}
      <HeadingWithTooltip 
        level={3}
        tooltip="Define the basic information for your series including cloud type, target CMS, name, and description."
      >
        Series details
      </HeadingWithTooltip>
      
      <Text>Add details</Text>

      {/* Cloud and Target CMS Selection */}
      <Flex direction="row" gap="size-200" wrap>
        <Picker
          label="Cloud Type"
          isRequired
          selectedKey={cloudType}
          onSelectionChange={handleCloudChange}
          isDisabled={isLocked}
          width="size-2400"
        >
          {SUPPORTED_CLOUDS.map((cloud) => (
            <Item key={cloud.id}>{cloud.name}</Item>
          ))}
        </Picker>

        {isLoadingCms ? (
          <View width="size-2400">
            <LoadingSpinner message="Loading..." />
          </View>
        ) : cmsError ? (
          <View width="size-2400" padding="size-100">
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)', fontSize: '12px' }}>
              {cmsError}
            </Text>
          </View>
        ) : (
          <Picker
            label="Target CMS"
            isRequired
            selectedKey={targetCms?.code || null}
            onSelectionChange={handleTargetCmsChange}
            isDisabled={isLocked}
            width="size-2400"
          >
            {targetCmsOptions.map((option) => (
              <Item key={option.code}>{option.code}</Item>
            ))}
          </Picker>
        )}
      </Flex>

      {/* Series Name */}
      <TextField
        label="Series Name"
        isRequired
        maxLength={30}
        value={seriesName}
        onChange={handleNameChange}
        description="30 characters max"
        width="100%"
        validationState={seriesName.length > 0 && seriesName.length <= 30 ? 'valid' : undefined}
      />

      {/* Series Description */}
      <TextArea
        label="Series Description"
        maxLength={600}
        value={seriesDescription}
        onChange={handleDescriptionChange}
        description="600 characters max"
        width="100%"
        height="size-1600"
      />
    </Flex>
  )
}

