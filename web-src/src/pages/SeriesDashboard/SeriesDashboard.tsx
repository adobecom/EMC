/* 
* <license header>
*/

import React, { useEffect, useMemo, useCallback } from 'react'
import { ActionButton, Button, ButtonGroup, Text, MenuTrigger, Menu, MenuItem, DialogTrigger, Dialog, Content, Heading, Picker, PickerItem } from "@react-spectrum/s2"
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import More from '@react-spectrum/s2/icons/More'
import Filter from '@react-spectrum/s2/icons/Filter'
import PublishNo from '@react-spectrum/s2/icons/PublishNo'
import Edit from '@react-spectrum/s2/icons/Edit'
import Duplicate from '@react-spectrum/s2/icons/Duplicate'
import Archive from '@react-spectrum/s2/icons/Archive'
import { TableColumn } from '../../components/shared/DataTable'
import { StatusBadge, ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import LayersIllustration from '@react-spectrum/s2/illustrations/linear/Layers'
import { SeriesDashboardItem, EventApiResponse, SeriesApiResponse } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { IMS } from '../../types'
import { 
  seriesHistoryEnrichmentManager, 
  SeriesHistoryInfo 
} from '../../services/seriesEnrichment'
import { createShimmerStyle, SPACING } from '../../styles/designSystem'
import { useSafeState, useRBACFilter } from '../../hooks'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useGroup } from '../../contexts/GroupContext'

const SERIES_SEARCH_KEYS = ['seriesName', 'seriesDescription', 'cloudType', 'seriesStatus']

const FILTER_ALL = '__all__'
const FILTER_EMPTY_CLOUD = '__empty__'
const FILTER_EMPTY_CREATOR = '__empty_creator__'

interface SeriesDashboardProps {
  ims: IMS
}

export const SeriesDashboard: React.FC<SeriesDashboardProps> = () => {
  const { filterSeries } = useRBACFilter()
  const canWriteSeries = useHasPermission('series', 'write')
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

  const [listFilters, setListFilters] = useSafeState<{
    creator: string
    publish: string
    cloudType: string
  }>({
    creator: FILTER_ALL,
    publish: FILTER_ALL,
    cloudType: FILTER_ALL,
  })

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

  const filteredSeries = useMemo(() => {
    return enrichedSeries.filter(item => {
      if (listFilters.creator !== FILTER_ALL) {
        const c = item.createdBy?.trim() || ''
        if (listFilters.creator === FILTER_EMPTY_CREATOR) {
          if (c !== '') return false
        } else if (c !== listFilters.creator) {
          return false
        }
      }
      if (listFilters.publish !== FILTER_ALL && item.seriesStatus !== listFilters.publish) {
        return false
      }
      if (listFilters.cloudType !== FILTER_ALL) {
        const ct = item.cloudType || ''
        if (listFilters.cloudType === FILTER_EMPTY_CLOUD) {
          if (ct !== '') return false
        } else if (ct !== listFilters.cloudType) {
          return false
        }
      }
      return true
    })
  }, [enrichedSeries, listFilters])

  const creatorFilterOptions = useMemo(() => {
    const s = new Set<string>()
    enrichedSeries.forEach(item => {
      const c = item.createdBy?.trim() || ''
      if (c) s.add(c)
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [enrichedSeries])

  const hasSeriesWithoutCreator = useMemo(
    () => enrichedSeries.some(item => !(item.createdBy?.trim())),
    [enrichedSeries]
  )

  const publishFilterOptions = useMemo(() => {
    const s = new Set<string>()
    enrichedSeries.forEach(item => s.add(item.seriesStatus))
    return Array.from(s).sort()
  }, [enrichedSeries])

  const cloudTypeFilterOptions = useMemo(() => {
    const s = new Set<string>()
    enrichedSeries.forEach(item => {
      if (item.cloudType) s.add(item.cloudType)
    })
    return Array.from(s).sort()
  }, [enrichedSeries])

  const hasSeriesWithoutCloudType = useMemo(
    () => enrichedSeries.some(item => !item.cloudType),
    [enrichedSeries]
  )

  const clearListFilters = useCallback(() => {
    setListFilters({
      creator: FILTER_ALL,
      publish: FILTER_ALL,
      cloudType: FILTER_ALL,
    })
  }, [])

  const seriesFilterToolbar = useMemo(() => (
    <DialogTrigger>
      <ActionButton isQuiet aria-label="Filter series">
        <Filter />
      </ActionButton>
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">Filter series</Heading>
            <Content>
              <div
                className={style({ display: 'flex', flexDirection: 'column' })}
                style={{ gap: SPACING.MD }}
              >
                <Picker
                  label="Creator"
                  selectedKey={listFilters.creator}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, creator: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All creators">All creators</PickerItem>
                  {hasSeriesWithoutCreator && (
                    <PickerItem id={FILTER_EMPTY_CREATOR} textValue="(empty)">(empty)</PickerItem>
                  )}
                  {creatorFilterOptions.map(c => (
                    <PickerItem key={c} id={c} textValue={c}>{c}</PickerItem>
                  ))}
                </Picker>
                <Picker
                  label="Publish state"
                  selectedKey={listFilters.publish}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, publish: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All states">All states</PickerItem>
                  {publishFilterOptions.map(st => (
                    <PickerItem key={st} id={st} textValue={st}>
                      {st}
                    </PickerItem>
                  ))}
                </Picker>
                <Picker
                  label="Cloud type"
                  selectedKey={listFilters.cloudType}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, cloudType: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All cloud types">All cloud types</PickerItem>
                  {hasSeriesWithoutCloudType && (
                    <PickerItem id={FILTER_EMPTY_CLOUD} textValue="(empty)">(empty)</PickerItem>
                  )}
                  {cloudTypeFilterOptions.map(ct => (
                    <PickerItem key={ct} id={ct} textValue={ct}>{ct}</PickerItem>
                  ))}
                </Picker>
              </div>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={clearListFilters}>Clear filters</Button>
              <Button variant="accent" onPress={close}>Done</Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  ), [
    listFilters,
    creatorFilterOptions,
    hasSeriesWithoutCreator,
    publishFilterOptions,
    cloudTypeFilterOptions,
    hasSeriesWithoutCloudType,
    clearListFilters,
  ])

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
          // ESP validates full Series body on PUT (seriesName, templateId, modificationTime, etc.)
          await apiService.publishSeries(item.seriesId, fullSeries as SeriesApiResponse)
          
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
          await apiService.unpublishSeries(item.seriesId, fullSeries as SeriesApiResponse)
          
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
          await apiService.archiveSeries(item.seriesId, fullSeries as SeriesApiResponse)
          
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
        { key: 'publish', icon: <PublishNo />, label: 'Publish' },
        { key: 'edit', icon: <Edit />, label: 'Edit' },
        { key: 'clone', icon: <Duplicate />, label: 'Clone' },
        { key: 'archive', icon: <Archive />, label: 'Archive' }
      ]
    }

    if (isPublished) {
      return [
        { key: 'unpublish', icon: <PublishNo />, label: 'Unpublish' },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Text>
            {canWriteSeries ? (
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
            ) : (
              <span style={{ fontWeight: 'bold' }}>{item.seriesName}</span>
            )}
          </Text>
          {item.seriesDescription && (
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)' }}>
              {item.seriesDescription}
            </Text>
          )}
        </div>
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
      cellNoWrap: true,
      render: (item) => {
        const menuItems = canWriteSeries ? getMenuItems(item.seriesStatus) : []

        if (menuItems.length === 0) return null

        return (
          <MenuTrigger>
            <ActionButton isQuiet aria-label="Actions menu">
              <More />
            </ActionButton>
            <Menu onAction={(key) => handleMenuAction(key as string, item)}>
              {menuItems.map(menuItem => (
                <MenuItem id={menuItem.key} key={menuItem.key}>
                  {menuItem.icon}
                  <Text>{menuItem.label}</Text>
                </MenuItem>
              ))}
            </Menu>
          </MenuTrigger>
        )
      }
    }
  ], [formatDate, loadingHistory, historyErrors, handleMenuAction, getMenuItems, canWriteSeries])

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
      <div data-testid="series-dashboard" className={style({padding: 32})}>
        <ResourceDashboardLayout
          title="All Series"
          totalCount={filteredSeries.length}
          error={error}
          data={filteredSeries}
          columns={columns}
          getItemKey={getItemKey}
          onVisibleIdsChange={handleVisibleIdsChange}
          onRefresh={loadSeriesData}
          onCreate={canWriteSeries ? handleCreateSeries : undefined}
          createLabel="Create new series"
          createButtonTestId="create-series-button"
          toolbarEnd={seriesFilterToolbar}
          emptyStateIllustration={<LayersIllustration aria-hidden />}
          emptyStateTitle="No Series Found"
          emptyStateDescription="Get started by creating your first series"
          searchPlaceholder="Search series..."
          searchKeys={SERIES_SEARCH_KEYS}
        />
      </div>

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading series..."
        ariaLabel="Loading series"
      />
    </>
  )
}
