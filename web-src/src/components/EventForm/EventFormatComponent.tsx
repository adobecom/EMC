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

interface CloudOption {
  key: string
  label: string
}

interface SeriesOption {
  id: string
  name: string
  description?: string
}

interface EventFormatComponentProps {
  cloudType: string
  seriesId: string
  onChange: (data: { cloudType?: string; seriesId?: string }) => void
}

export const EventFormatComponent: React.FC<EventFormatComponentProps> = ({
  cloudType,
  seriesId,
  onChange
}) => {
  const [clouds, setClouds] = useState<CloudOption[]>([])
  const [allSeries, setAllSeries] = useState<SeriesApiResponse[]>([]) // Store all series
  const [series, setSeries] = useState<SeriesOption[]>([]) // Filtered series for display
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadDataAsync = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch clouds and series in parallel
        const [cloudsResponse, seriesResponse] = await Promise.all([
          fetchClouds(),
          apiService.getSeriesList()
        ])

        if (!isMounted) return

        // Set clouds
        if (cloudsResponse) {
          setClouds(cloudsResponse)
          // Auto-select first cloud if none selected
          if (!cloudType && cloudsResponse.length > 0) {
            onChange({ cloudType: cloudsResponse[0].key })
          }
        }

        // Set series
        if (seriesResponse && Array.isArray(seriesResponse)) {
          const publishedSeries = seriesResponse.filter(
            (s: SeriesApiResponse) => s.seriesStatus === 'published'
          )
          if (isMounted) {
            setAllSeries(publishedSeries)
            
            // Filter by selected cloud type if available
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
  }, []) // Only run once on mount

  // Re-filter series when cloudType changes
  useEffect(() => {
    if (allSeries.length > 0 && cloudType) {
      filterSeriesByCloud(cloudType)
    }
  }, [cloudType, allSeries])


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
    
    // Auto-select first series if none selected or if current selection is not in filtered list
    if (seriesOptions.length > 0) {
      const currentSeriesExists = seriesOptions.some(s => s.id === seriesId)
      if (!seriesId || !currentSeriesExists) {
        onChange({ seriesId: seriesOptions[0].id })
      }
    } else {
      // No series available for this cloud type, clear selection
      if (seriesId) {
        onChange({ seriesId: '' })
      }
    }
  }

  const fetchClouds = async (): Promise<CloudOption[]> => {
    // TODO: Replace with actual API call when endpoint is available
    // For now, return static list based on v1 reference
    return [
      { key: 'CreativeCloud', label: 'Creative Cloud' },
      { key: 'ExperienceCloud', label: 'Experience Cloud' }
    ]
  }

  const handleCloudChange = (key: React.Key | null) => {
    if (key) {
      onChange({ cloudType: String(key) })
    }
  }

  const handleSeriesChange = (key: React.Key | null) => {
    if (key) {
      onChange({ seriesId: String(key) })
    }
  }

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

