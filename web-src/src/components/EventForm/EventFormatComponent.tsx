/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Picker,
  Item,
  Flex,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { apiService } from '../../services/api'
import { LoadingSpinner } from '../shared'
import { SeriesApiResponse } from '../../types/domain'

interface CloudOption {
  key: string
  label: string
}

interface SeriesOption {
  id: string
  name: string
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
  const [series, setSeries] = useState<SeriesOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, []) // Only run once on mount

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch clouds and series in parallel
      // Note: getSeriesList() uses tokenStorage.getValidToken() internally
      // and will fall back to mock data if no dev token is available
      const [cloudsResponse, seriesResponse] = await Promise.all([
        fetchClouds(),
        apiService.getSeriesList()
      ])

      // Set clouds
      if (cloudsResponse) {
        setClouds(cloudsResponse)
        // Auto-select first cloud if none selected
        if (!cloudType && cloudsResponse.length > 0) {
          onChange({ cloudType: cloudsResponse[0].key })
        }
      }

      // Set series - getSeriesList returns SeriesApiResponse[] directly
      if (seriesResponse && Array.isArray(seriesResponse)) {
        const seriesOptions = seriesResponse.map((s: SeriesApiResponse) => ({
          id: s.seriesId,
          name: s.seriesName
        }))
        setSeries(seriesOptions)
        
        // Auto-select first series if none selected
        if (!seriesId && seriesOptions.length > 0) {
          onChange({ seriesId: seriesOptions[0].id })
        }
      } else {
        setError('Failed to load series')
      }
    } catch (err) {
      console.error('Failed to load event format data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
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
      <Heading level={3}>Event Format</Heading>
      <Text>Select the cloud type and event series for this event.</Text>

      <Picker
        label="Select a cloud"
        isRequired
        selectedKey={cloudType}
        onSelectionChange={handleCloudChange}
        width="100%"
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
        width="100%"
        description="The series name will be used on the event detail page and for metadata"
      >
        {series.length === 0 ? (
          <Item key="no-series">No series available</Item>
        ) : (
          series.map((s) => (
            <Item key={s.id}>{s.name}</Item>
          ))
        )}
      </Picker>

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

