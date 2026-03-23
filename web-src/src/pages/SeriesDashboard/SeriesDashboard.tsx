/* 
* <license header>
*/

import React, { useEffect, useMemo, useCallback } from 'react'
import { Flex, Text, ActionButton, MenuTrigger, Menu, Item } from '@adobe/react-spectrum'
import MoreSmallList from '@spectrum-icons/workflow/MoreSmallList'
import PublishRemove from '@spectrum-icons/workflow/PublishRemove'
import Edit from '@spectrum-icons/workflow/Edit'
import Duplicate from '@spectrum-icons/workflow/Duplicate'
import Archive from '@spectrum-icons/workflow/Archive'
import { TableColumn } from '../../components/shared/DataTable'
import { StatusBadge, ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import { SeriesDashboardItem, EventApiResponse } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { IMS } from '../../types'
import { 
  seriesHistoryEnrichmentManager, 
  SeriesHistoryInfo 
} from '../../services/seriesEnrichment'
import { createShimmerStyle } from '../../styles/designSystem'
import { useSafeState, useRBACFilter } from '../../hooks'
import { useGroup } from '../../contexts/GroupContext'

const SERIES_SEARCH_KEYS = ['seriesName', 'seriesDescription', 'cloudType', 'seriesStatus']

interface SeriesDashboardProps {
  ims: IMS
}

export const SeriesDashboard: React.FC<SeriesDashboardProps> = () => {
  const { filterSeries } = useRBACFilter()
  const [series, setSeries] = useSafeState<SeriesDashboardItem[]>([])
  const [isLoading, setIsLoading] = useSafeState(true)
  const [error, setError] = useSafeState<string | null>(null)
  
  // Cache all events once for counting
  const [allEvents, setAllEvents] = useSafeState<EventApiResponse[]>([])
  
  // Enrichment state
  const [visibleSeriesIds, setVisibleSeriesIds] = useSafeState<string[]>([])
  const [historyInfo, setHistoryInfo] = useSafeState<Map<string, SeriesHistoryInfo>>(new Map())
  const [loadingHistory, setLoadingHistory] = useSafeState<Set<string>>(new Set())
  const [historyErrors, setHistoryErrors] = useSafeState<Set<string>>(new Set())
  const [historyAttempted, setHistoryAttempted] = useSafeState<Set<string>>(new Set())

  const loadSeriesData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      
      // Fetch both series and events in parallel
      const [seriesData, eventsData] = await Promise.all([
        cachedApi.getSeriesList(),
        cachedApi.getEventsList()
      ])
      
      
      // Store events for later counting
      setAllEvents(eventsData)
      
      // Transform API response to dashboard items
      // Don't set createdBy/modifiedBy here - they'll be enriched later
      // eventCount will be calculated from allEvents
      const dashboardItems: SeriesDashboardItem[] = seriesData.map(item => ({
        seriesId: item.seriesId,
        seriesName: item.seriesName,
        seriesDescription: item.seriesDescription,
        seriesStatus: item.seriesStatus || 'unknown',
        cloudType: item.cloudType,
        creationTime: item.creationTime,
        modificationTime: item.modificationTime,
        createdBy: undefined,
        modifiedBy: undefined,
        eventCount: undefined
      }))
      
      setSeries(filterSeries(dashboardItems))
    } catch (err) {
      console.error('❌ Error loading series:', err)
      setError('Failed to load series data')
    } finally {
      setIsLoading(false)
    }
  }

  const { groupVersion } = useGroup()
  useEffect(() => {
    loadSeriesData()
  }, [groupVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch history info (creator/modifier) for visible series IDs
  useEffect(() => {
    if (visibleSeriesIds.length === 0) return

    const fetchHistory = async () => {
      // Only fetch for series we haven't attempted yet
      const seriesToLoad = visibleSeriesIds.filter(id => !historyAttempted.has(id))
      if (seriesToLoad.length === 0) {
        return
      }

      
      // Mark as attempted and loading
      setHistoryAttempted(prev => new Set([...prev, ...seriesToLoad]))
      setLoadingHistory(prev => new Set([...prev, ...seriesToLoad]))

      try {
        const historyResults = await seriesHistoryEnrichmentManager.getMany(seriesToLoad)
        
        setHistoryInfo(prev => {
          const updated = new Map(prev)
          historyResults.forEach((value, key) => {
            if (value !== null) {
              updated.set(key, value)
            }
          })
          return updated
        })
      } catch (error) {
        console.error('❌ Error fetching series history:', error)
        // Mark errored series
        setHistoryErrors(prev => new Set([...prev, ...seriesToLoad]))
      } finally {
        // Remove loading state for all requested series
        setLoadingHistory(prev => {
          const updated = new Set(prev)
          seriesToLoad.forEach(id => updated.delete(id))
          return updated
        })
      }
    }

    fetchHistory()
  }, [visibleSeriesIds])

  // Calculate event counts from cached events (no API calls needed)
  const eventCountsBySeriesId = useMemo(() => {
    const counts = new Map<string, number>()
    
    allEvents.forEach(event => {
      if (event.seriesId) {
        counts.set(event.seriesId, (counts.get(event.seriesId) || 0) + 1)
      }
    })
    
    return counts
  }, [allEvents])

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

  // Compute enriched dashboard items by merging base data with enrichment data
  const enrichedSeries = useMemo<SeriesDashboardItem[]>(() => {
    return series.map(item => {
      const history = historyInfo.get(item.seriesId)
      const eventCount = eventCountsBySeriesId.get(item.seriesId)
      
      return {
        ...item,
        createdBy: history?.creator?.name || history?.creator?.email,
        modifiedBy: history?.modifier?.name || history?.modifier?.email,
        eventCount: eventCount
      }
    })
  }, [series, historyInfo, eventCountsBySeriesId])

  const handleCreateSeries = useCallback(() => {
    // Navigate to create series form
    window.location.hash = '#/series/new'
  }, [])

  const handleMenuAction = useCallback(async (action: string, item: SeriesDashboardItem) => {
    switch (action) {
      case 'publish':
        try {
          // Fetch full series data first to get modificationTime
          const fullSeries = await cachedApi.getSeriesFull(item.seriesId)

          if ('error' in fullSeries) {
            throw new Error('Failed to fetch series data')
          }
          await apiService.publishSeries(item.seriesId, { modificationTime: fullSeries.modificationTime })
          
          // Reload data to reflect changes
          await loadSeriesData()
        } catch (error) {
          console.error('Failed to publish series:', error)
          alert(`Failed to publish series: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        break
      case 'unpublish':
        try {
          // Fetch full series data first to get modificationTime
          const fullSeries = await cachedApi.getSeriesFull(item.seriesId)

          if ('error' in fullSeries) {
            throw new Error('Failed to fetch series data')
          }
          await apiService.unpublishSeries(item.seriesId, { modificationTime: fullSeries.modificationTime })
          
          // Reload data to reflect changes
          await loadSeriesData()
        } catch (error) {
          console.error('Failed to unpublish series:', error)
          alert(`Failed to unpublish series: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        break
      case 'edit':
        window.location.hash = `#/series/edit/${item.seriesId}`
        break
      case 'clone':
        // TODO: Implement clone functionality
        alert(`Clone functionality will be implemented for: ${item.seriesName}`)
        break
      case 'archive':
        try {
          // Fetch full series data first to get modificationTime
          const fullSeries = await cachedApi.getSeriesFull(item.seriesId)

          if ('error' in fullSeries) {
            throw new Error('Failed to fetch series data')
          }
          await apiService.archiveSeries(item.seriesId, { modificationTime: fullSeries.modificationTime })
          
          // Reload data to reflect changes
          await loadSeriesData()
        } catch (error) {
          console.error('Failed to archive series:', error)
          alert(`Failed to archive series: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        break
      default:
        break
    }
  }, [])

  // Helper to get menu items based on status
  const getMenuItems = useCallback((status: string | undefined) => {
    const normalizedStatus = status?.toLowerCase()
    const isArchived = normalizedStatus === 'archived'
    const isUnknown = normalizedStatus === 'unknown' || !normalizedStatus
    const isDraft = normalizedStatus === 'draft'
    const isPublished = normalizedStatus === 'published'

    if (isArchived || isUnknown) {
      return [{ key: 'clone', icon: <Duplicate />, label: 'Clone' }]
    }
    
    if (isDraft) {
      return [
        { key: 'publish', icon: <PublishRemove />, label: 'Publish' },
        { key: 'edit', icon: <Edit />, label: 'Edit' },
        { key: 'clone', icon: <Duplicate />, label: 'Clone' },
        { key: 'archive', icon: <Archive />, label: 'Archive' }
      ]
    }
    
    if (isPublished) {
      return [
        { key: 'unpublish', icon: <PublishRemove />, label: 'Unpublish' },
        { key: 'edit', icon: <Edit />, label: 'Edit' },
        { key: 'clone', icon: <Duplicate />, label: 'Clone' },
        { key: 'archive', icon: <Archive />, label: 'Archive' }
      ]
    }
    
    return [{ key: 'clone', icon: <Duplicate />, label: 'Clone' }]
  }, [])

  const columns = useMemo<TableColumn<SeriesDashboardItem>[]>(() => [
    {
      key: 'seriesName',
      name: 'SERIES NAME',
      width: 250,
      sortable: true,
      render: (item) => (
        <Flex direction="column" gap="size-50">
          <Text>
            <a 
              href={`#/series/edit/${item.seriesId}`}
              style={{ 
                color: 'var(--spectrum-global-color-blue-600)',
                textDecoration: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              {item.seriesName}
            </a>
          </Text>
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
      render: (item) => {
        const isLoading = loadingHistory.has(item.seriesId)
        const hasError = historyErrors.has(item.seriesId)
        
        if (isLoading && !hasError) {
          return <div style={createShimmerStyle(120, 16)} />
        }
        
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {item.createdBy || 'N/A'}
          </Text>
        )
      }
    },
    {
      key: 'modifiedBy',
      name: 'MODIFIED BY',
      width: 150,
      sortable: true,
      render: (item) => {
        const isLoading = loadingHistory.has(item.seriesId)
        const hasError = historyErrors.has(item.seriesId)
        
        if (isLoading && !hasError) {
          return <div style={createShimmerStyle(120, 16)} />
        }
        
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {item.modifiedBy || 'N/A'}
          </Text>
        )
      }
    },
    {
      key: 'eventCount',
      name: 'NUMBER OF EVENTS IN SERIES',
      width: 200,
      sortable: true,
      sortFn: (a, b) => {
        // Sort undefined/null to end
        const aCount = a.eventCount ?? -1
        const bCount = b.eventCount ?? -1
        return aCount - bCount
      },
      render: (item) => {
        // Event count is calculated from cached data, no loading state needed
        return (
          <Text UNSAFE_style={{ textAlign: 'center', display: 'block' }}>
            {item.eventCount !== undefined ? item.eventCount : 0}
          </Text>
        )
      }
    },
    {
      key: 'manage',
      name: 'MANAGE',
      width: 100,
      sortable: false,
      render: (item) => {
        const menuItems = getMenuItems(item.seriesStatus)
        
        return (
          <MenuTrigger>
            <ActionButton isQuiet aria-label="Actions menu">
              <MoreSmallList />
            </ActionButton>
            <Menu onAction={(key) => handleMenuAction(key as string, item)}>
              {menuItems.map(menuItem => (
                <Item key={menuItem.key}>
                  {menuItem.icon}
                  <Text>{menuItem.label}</Text>
                </Item>
              ))}
            </Menu>
          </MenuTrigger>
        )
      }
    }
  ], [formatDate, loadingHistory, historyErrors, handleMenuAction, getMenuItems])

  // Callback to track visible series IDs for enrichment
  const handleVisibleIdsChange = useCallback((ids: string[]) => {
    setVisibleSeriesIds(prev => {
      if (prev.length === ids.length && prev.every((id, i) => id === ids[i])) {
        return prev
      }
      return ids
    })
  }, [])

  // Stable getItemKey function to prevent infinite loops
  const getItemKey = useCallback((item: SeriesDashboardItem) => item.seriesId, [])

  return (
    <>
      <ResourceDashboardLayout
        title="All Series"
        totalCount={enrichedSeries.length}
        error={error}
        data={enrichedSeries}
        columns={columns}
        getItemKey={getItemKey}
        onVisibleIdsChange={handleVisibleIdsChange}
        onRefresh={loadSeriesData}
        onCreate={handleCreateSeries}
        createLabel="Create new series"
        emptyStateTitle="No Series Found"
        emptyStateDescription="Get started by creating your first series"
        searchPlaceholder="Search series..."
        searchKeys={SERIES_SEARCH_KEYS}
      />
      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading series..."
        ariaLabel="Loading series"
      />
    </>
  )
}
