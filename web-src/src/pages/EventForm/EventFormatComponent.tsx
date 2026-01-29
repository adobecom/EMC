/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Picker,
  Item,
  Flex,
  Text
} from '@adobe/react-spectrum'
import { cachedApi } from '../../services/api'
import { configService } from '../../services/configService'
import { LoadingSpinner, HeadingWithTooltip } from '../../components/shared'
import { SeriesApiResponse, SeriesTemplate } from '../../types/domain'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useEventFormContext } from '../../contexts/EventFormContext'

interface CloudOption {
  key: string
  label: string
}

interface SeriesOption {
  id: string
  name: string
  description?: string
}

/**
 * EventFormatComponent - Manages cloud type and series selection
 * 
 * Uses EventFormContext for state management.
 * No API calls needed in onAfterSave - just data collection.
 * 
 * Note: Cloud type and series are locked once the event is created (eventId exists).
 * Marketers cannot change these fields after event creation.
 */
export const EventFormatComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
  } = useEventFormComponent({
    componentId: 'event-format',
  })
  
  // Get setSeriesId from context to properly update both state.seriesId and formData.seriesId
  const { setSeriesId, seriesId: contextSeriesId } = useEventFormContext()
  
  const cloudType = formData.cloudType || 'CreativeCloud'
  const eventType = formData.eventType || 'in-person'
  // Use context seriesId as source of truth (falls back to formData for initial load)
  const seriesId = contextSeriesId || formData.seriesId || ''
  
  // Once the event is created (eventId exists), cloud and series are locked
  const isLocked = !!eventId
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [clouds, setClouds] = useState<CloudOption[]>([])
  const [allSeries, setAllSeries] = useState<SeriesApiResponse[]>([])
  const [seriesTemplates, setSeriesTemplates] = useState<SeriesTemplate[]>([])
  const [series, setSeries] = useState<SeriesOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    let isMounted = true

    const loadDataAsync = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [cloudsResponse, seriesResponse, templatesConfig] = await Promise.all([
          fetchClouds(),
          cachedApi.getSeriesList(),
          configService.getSeriesTemplates()
        ])

        if (!isMounted) return

        if (cloudsResponse) {
          setClouds(cloudsResponse)
          if (!cloudType && cloudsResponse.length > 0) {
            updateFormData({ cloudType: cloudsResponse[0].key as 'CreativeCloud' | 'ExperienceCloud' })
          }
        }

        // Load series templates for filtering
        if (templatesConfig?.data) {
          setSeriesTemplates(templatesConfig.data)
        }

        if (seriesResponse && Array.isArray(seriesResponse)) {
          const publishedSeries = seriesResponse.filter(
            (s: SeriesApiResponse) => s.seriesStatus === 'published'
          )
          if (isMounted) {
            setAllSeries(publishedSeries)
            
            if (cloudType) {
              filterSeries(cloudType, eventType, publishedSeries, templatesConfig?.data || [])
            }
          }
        } else {
          if (isMounted) {
            setError('Failed to load series')
          }
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load event format data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDataAsync()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (allSeries.length > 0 && cloudType) {
      filterSeries(cloudType, eventType)
    }
  }, [cloudType, eventType, allSeries, seriesTemplates])

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Map form event type to API event type format
   * Form: 'in-person' | 'webinar' -> API: 'InPerson' | 'Webinar'
   */
  const mapEventTypeToApiFormat = (type: string): string => {
    const mapping: Record<string, string> = {
      'in-person': 'InPerson',
      'webinar': 'Webinar',
      'hybrid': 'Hybrid'
    }
    return mapping[type] || type
  }

  /**
   * Check if a series template supports the current event type
   */
  const templateSupportsEventType = (templateId: string, currentEventType: string, templates: SeriesTemplate[]): boolean => {
    const apiEventType = mapEventTypeToApiFormat(currentEventType)
    
    // Find the template by matching template-path with templateId
    const template = templates.find(t => t['template-path'] === templateId)
    
    if (!template) {
      // If template not found in config, allow it (backward compatibility)
      console.warn(`Template not found in config: ${templateId}`)
      return true
    }
    
    const supportedType = template['supported-event-type']
    
    // Hybrid templates support both InPerson and Webinar
    if (supportedType === 'Hybrid') return true
    
    // Otherwise, must match exactly
    return supportedType === apiEventType
  }

  /**
   * Filter series by cloud type AND event type (using template mapping)
   */
  const filterSeries = (
    selectedCloudType: string, 
    selectedEventType: string,
    seriesList?: SeriesApiResponse[],
    templates?: SeriesTemplate[]
  ) => {
    const seriesToFilter = seriesList || allSeries
    const templatesToUse = templates || seriesTemplates
    
    // First filter by cloud type
    let filteredSeries = seriesToFilter.filter(
      (s: SeriesApiResponse) => s.cloudType === selectedCloudType
    )
    
    // Then filter by event type using template matching
    if (templatesToUse.length > 0) {
      filteredSeries = filteredSeries.filter((s: SeriesApiResponse) => 
        templateSupportsEventType(s.templateId, selectedEventType, templatesToUse)
      )
    }
    
    const seriesOptions = filteredSeries.map((s: SeriesApiResponse) => ({
      id: s.seriesId,
      name: s.seriesName,
      description: s.seriesDescription
    }))
    
    setSeries(seriesOptions)
    
    if (seriesOptions.length > 0) {
      const currentSeriesExists = seriesOptions.some(s => s.id === seriesId)
      if (!seriesId || !currentSeriesExists) {
        // Select first available series
        setSeriesId(seriesOptions[0].id)
      } else if (seriesId && contextSeriesId !== seriesId) {
        // Sync state.seriesId with formData.seriesId (happens when loading existing event)
        setSeriesId(seriesId)
      }
    } else {
      // No series available for this combination
      if (seriesId) {
        setSeriesId('')
      }
    }
  }

  const fetchClouds = async (): Promise<CloudOption[]> => {
    return [
      { key: 'CreativeCloud', label: 'Creative Cloud' },
      { key: 'ExperienceCloud', label: 'Experience Cloud' }
    ]
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCloudChange = (key: React.Key | null) => {
    if (key) {
      updateFormData({ cloudType: String(key) as 'CreativeCloud' | 'ExperienceCloud' })
    }
  }

  const handleSeriesChange = (key: React.Key | null) => {
    if (key) {
      setSeriesId(String(key))
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return <LoadingSpinner message="Loading event format options..." />
  }

  if (error) {
    return (
      <View
        padding="size-200"
        backgroundColor="negative"
        borderRadius="medium"
      >
        <Text UNSAFE_style={{ color: 'white' }}>Error: {error}</Text>
      </View>
    )
  }

  return (
    <Flex direction="column" gap="size-200">
      <View>
        <HeadingWithTooltip 
          level={3}
          tooltip="The cloud type and series determine where your event will be published and what metadata it inherits."
        >
          Event Format
        </HeadingWithTooltip>
        <Text>
          Select the cloud type and event series for this event.
          {isLocked && ' These fields are locked after the event is created.'}
        </Text>
      </View>

      <Flex direction="row" gap="size-300" wrap>
        <Picker
          label="Select a cloud"
          isRequired
          selectedKey={cloudType}
          onSelectionChange={handleCloudChange}
          isDisabled={isLocked}
        >
          {clouds.map((cloud) => (
            <Item key={cloud.key}>{cloud.label}</Item>
          ))}
        </Picker>

        <Picker
          label="Select a series"
          isRequired
          selectedKey={seriesId}
          onSelectionChange={handleSeriesChange}
          isDisabled={isLocked}
          description={
            seriesId && series.find(s => s.id === seriesId)?.description || undefined
          }
        >
          {series.length === 0 ? (
            <Item key="no-series">No series available</Item>
          ) : (
            series.map((s) => (
              <Item key={s.id}>{s.name}</Item>
            ))
          )}
        </Picker>
      </Flex>

      {series.length === 0 && !isLocked && (
        <View
          padding="size-150"
          backgroundColor="notice"
          borderRadius="medium"
        >
          <Text UNSAFE_style={{ fontSize: '14px' }}>
            No event series available. Please create a series first or contact your administrator.
          </Text>
        </View>
      )}
    </Flex>
  )
}
