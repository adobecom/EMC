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
import { apiService } from '../../services/api'
import { LoadingSpinner, HeadingWithTooltip } from '../shared'
import { SeriesApiResponse } from '../../types/domain'
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
 */
export const EventFormatComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'event-format',
  })
  
  // Get setSeriesId from context to properly update both state.seriesId and formData.seriesId
  const { setSeriesId, seriesId: contextSeriesId } = useEventFormContext()
  
  const cloudType = formData.cloudType || 'CreativeCloud'
  // Use context seriesId as source of truth (falls back to formData for initial load)
  const seriesId = contextSeriesId || formData.seriesId || ''
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [clouds, setClouds] = useState<CloudOption[]>([])
  const [allSeries, setAllSeries] = useState<SeriesApiResponse[]>([])
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
        const [cloudsResponse, seriesResponse] = await Promise.all([
          fetchClouds(),
          apiService.getSeriesList()
        ])

        if (!isMounted) return

        if (cloudsResponse) {
          setClouds(cloudsResponse)
          if (!cloudType && cloudsResponse.length > 0) {
            updateFormData({ cloudType: cloudsResponse[0].key as 'CreativeCloud' | 'ExperienceCloud' })
          }
        }

        if (seriesResponse && Array.isArray(seriesResponse)) {
          const publishedSeries = seriesResponse.filter(
            (s: SeriesApiResponse) => s.seriesStatus === 'published'
          )
          if (isMounted) {
            setAllSeries(publishedSeries)
            
            if (cloudType) {
              filterSeriesByCloud(cloudType, publishedSeries)
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
      filterSeriesByCloud(cloudType)
    }
  }, [cloudType, allSeries])

  // ============================================================================
  // HELPERS
  // ============================================================================

  const filterSeriesByCloud = (selectedCloudType: string, seriesList?: SeriesApiResponse[]) => {
    const seriesToFilter = seriesList || allSeries
    
    const filteredSeries = seriesToFilter.filter(
      (s: SeriesApiResponse) => s.cloudType === selectedCloudType
    )
    
    const seriesOptions = filteredSeries.map((s: SeriesApiResponse) => ({
      id: s.seriesId,
      name: s.seriesName,
      description: s.seriesDescription
    }))
    
    setSeries(seriesOptions)
    
    if (seriesOptions.length > 0) {
      const currentSeriesExists = seriesOptions.some(s => s.id === seriesId)
      if (!seriesId || !currentSeriesExists) {
        setSeriesId(seriesOptions[0].id)
      } else if (seriesId && contextSeriesId !== seriesId) {
        // Sync state.seriesId with formData.seriesId (happens when loading existing event)
        setSeriesId(seriesId)
      }
    } else {
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
        <Text>Select the cloud type and event series for this event.</Text>
      </View>

      <Flex direction="row" gap="size-300" wrap>
        <Picker
          label="Select a cloud"
          isRequired
          selectedKey={cloudType}
          onSelectionChange={handleCloudChange}
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

      {series.length === 0 && (
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
