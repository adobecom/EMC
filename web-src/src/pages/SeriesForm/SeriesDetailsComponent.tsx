/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Text
} from '@adobe/react-spectrum'
import { TextField, TextArea, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { HeadingWithTooltip, LoadingSpinner } from '../../components/shared'
import { FLEX_GAP } from '../../styles/designSystem'
import { useSeriesFormComponent } from '../../hooks/useSeriesFormComponent'
import { SUPPORTED_CLOUDS } from '../../config/constants'
import { EXTERNAL_CONFIG_URLS } from '../../config/externalConfigs'
import type { TargetCms as _TargetCms } from '../../types/domain'

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
          styles={style({ width: 192 })}
        >
          {SUPPORTED_CLOUDS.map((cloud) => (
            <PickerItem key={cloud.id} id={cloud.id}>{cloud.name}</PickerItem>
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
            styles={style({ width: 192 })}
          >
            {targetCmsOptions.map((option) => (
              <PickerItem key={option.code} id={option.code}>{option.code}</PickerItem>
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
        styles={style({ width: '[100%]' })}
      />

      {/* Series Description */}
      <TextArea
        label="Series Description"
        maxLength={600}
        value={seriesDescription}
        onChange={handleDescriptionChange}
        description="600 characters max"
        styles={style({ width: '[100%]' })}
      />
    </Flex>
  )
}

