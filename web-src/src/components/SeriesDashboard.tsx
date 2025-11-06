/* 
* <license header>
*/

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Flex, Text } from '@adobe/react-spectrum'
import { TableColumn } from './shared/DataTable'
import { StatusBadge, ResourceDashboardLayout } from './shared'
import { SeriesDashboardItem } from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface SeriesDashboardProps {
  ims: IMS
}

export const SeriesDashboard: React.FC<SeriesDashboardProps> = () => {
  const [series, setSeries] = useState<SeriesDashboardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSeriesData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await apiService.getSeriesList()
      
      // Transform API response to dashboard items
      const dashboardItems: SeriesDashboardItem[] = data.map(item => ({
        seriesId: item.seriesId,
        seriesName: item.seriesName,
        seriesDescription: item.seriesDescription,
        seriesStatus: item.seriesStatus || 'unknown',
        cloudType: item.cloudType,
        creationTime: item.creationTime,
        modificationTime: item.modificationTime,
        // These will be fetched later from different endpoints
        createdBy: undefined,
        modifiedBy: undefined,
        eventCount: undefined
      }))
      
      setSeries(dashboardItems)
    } catch (err) {
      console.error('Error loading series:', err)
      setError('Failed to load series data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSeriesData()
  }, [])

  const formatDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const columns = useMemo<TableColumn<SeriesDashboardItem>[]>(() => [
    {
      key: 'seriesName',
      name: 'SERIES NAME',
      width: 250,
      sortable: true,
      render: (item) => (
        <Flex direction="column" gap="size-50">
          <Text><strong>{item.seriesName}</strong></Text>
          {item.seriesDescription && (
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)' }}>
              {item.seriesDescription.length > 60 
                ? `${item.seriesDescription.substring(0, 60)}...` 
                : item.seriesDescription}
            </Text>
          )}
        </Flex>
      )
    },
    {
      key: 'seriesStatus',
      name: 'STATUS',
      width: 120,
      sortable: true,
      render: (item) => <StatusBadge status={item.seriesStatus} />
    },
    {
      key: 'cloudType',
      name: 'CLOUD TYPE',
      width: 150,
      sortable: true,
      render: (item) => <Text>{item.cloudType}</Text>
    },
    {
      key: 'modificationTime',
      name: 'LAST MODIFIED',
      width: 180,
      sortable: true,
      render: (item) => <Text>{formatDate(item.modificationTime)}</Text>
    },
    {
      key: 'creationTime',
      name: 'CREATED',
      width: 180,
      sortable: true,
      render: (item) => <Text>{formatDate(item.creationTime)}</Text>
    },
    {
      key: 'createdBy',
      name: 'CREATED BY',
      width: 150,
      sortable: true,
      render: (item) => (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          {item.createdBy || 'N/A'}
        </Text>
      )
    },
    {
      key: 'modifiedBy',
      name: 'MODIFIED BY',
      width: 150,
      sortable: true,
      render: (item) => (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          {item.modifiedBy || 'N/A'}
        </Text>
      )
    },
    {
      key: 'eventCount',
      name: 'EVENTS',
      width: 100,
      sortable: true,
      sortFn: (a, b) => {
        // Sort undefined/null to end
        const aCount = a.eventCount ?? -1
        const bCount = b.eventCount ?? -1
        return aCount - bCount
      },
      render: (item) => (
        <Text UNSAFE_style={{ textAlign: 'center', display: 'block' }}>
          {item.eventCount !== undefined ? item.eventCount : '-'}
        </Text>
      )
    }
  ], [formatDate])

  const handleCreateSeries = () => {
    // Navigate to create series form
    window.location.hash = '#/series/new'
  }

  const handleViewSeries = (item: SeriesDashboardItem) => {
    console.log('View series:', item)
    // TODO: Navigate to series detail view
    window.location.hash = `#/series/edit/${item.seriesId}`
  }

  const handleEditSeries = (item: SeriesDashboardItem) => {
    console.log('Edit series:', item)
    window.location.hash = `#/series/edit/${item.seriesId}`
  }

  const handleDeleteSeries = (item: SeriesDashboardItem) => {
    console.log('Delete series:', item)
    // TODO: Implement delete confirmation dialog
    alert(`Delete functionality will be implemented for: ${item.seriesName}`)
  }

  return (
    <ResourceDashboardLayout
      title="All Series"
      totalCount={series.length}
      isLoading={isLoading}
      error={error}
      data={series}
      columns={columns}
      getItemKey={(item) => item.seriesId}
      actions={[
        {
          icon: 'view',
          label: 'View series',
          onAction: handleViewSeries
        },
        {
          icon: 'edit',
          label: 'Edit series',
          onAction: handleEditSeries
        },
        {
          icon: 'delete',
          label: 'Delete series',
          onAction: handleDeleteSeries
        }
      ]}
      onRefresh={loadSeriesData}
      onCreate={handleCreateSeries}
      createLabel="Create Series"
      emptyStateTitle="No Series Found"
      emptyStateDescription="Get started by creating your first series"
      loadingMessage="Loading series..."
      searchPlaceholder="Search series..."
      searchKeys={['seriesName', 'seriesDescription', 'cloudType', 'seriesStatus']}
    />
  )
}

