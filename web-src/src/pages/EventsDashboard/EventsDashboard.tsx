/* 
* <license header>
*/

import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionButton, Button, ButtonGroup, MenuTrigger, Menu, MenuItem, Text, DialogTrigger, Dialog, Content, Heading, AlertDialog, Link, Picker, PickerItem } from "@react-spectrum/s2"
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import More from "@react-spectrum/s2/icons/More"
import Publish from "@react-spectrum/s2/icons/Publish"
import PublishNo from "@react-spectrum/s2/icons/PublishNo"
import Preview from "@react-spectrum/s2/icons/Preview"
import Copy from "@react-spectrum/s2/icons/Copy"
import Edit from "@react-spectrum/s2/icons/Edit"
import Duplicate from "@react-spectrum/s2/icons/Duplicate"
import RemoveCircle from "@react-spectrum/s2/icons/RemoveCircle"
import Filter from "@react-spectrum/s2/icons/Filter"
import GlobeGrid from "@react-spectrum/s2/icons/GlobeGrid"
import Location from "@react-spectrum/s2/icons/Location"
import { getEventTypeOptions, EventType } from '../../config/eventTypeConfig'
import { CloneEvent } from './CloneEvent'
import { TableColumn } from '../../components/shared/DataTable'
import { StatusBadge, ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import CalendarIllustration from '@react-spectrum/s2/illustrations/linear/Calendar'
import { EventDashboardItem } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { thumbnailEnrichmentManager, venueEnrichmentManager, historyEnrichmentManager, EventThumbnail, EventVenueInfo, EventHistoryInfo } from '../../services/eventEnrichment'
import { SPACING, SHIMMER_BASE, SURFACES } from '../../styles/designSystem'
import { seriesEnrichmentManager, SeriesInfo } from '../../services/seriesEnrichment'
import { IMS } from '../../types'
import { useToast, useGroup } from '../../contexts'
import { useSafeState, useRBACFilter } from '../../hooks'
import { useHasPermission } from '../../hooks/useHasPermission'
import { getEspEnvParam } from '../../config/constants'

const EVENTS_SEARCH_KEYS = ['eventName', 'eventType', 'cloudType', 'hostEmail', 'seriesId']

const eventsTableShimmerStyle: React.CSSProperties = {
  ...SHIMMER_BASE,
  backgroundSize: '200% 100%',
}

const FILTER_ALL = '__all__'
const FILTER_NONE_SERIES = '__none__'
const FILTER_EMPTY_CLOUD = '__empty__'

const EVENTS_DASHBOARD_TABLE_TEST_IDS = {
  root: 'events-dashboard-table',
  emptyState: 'events-dashboard-table-empty-state',
  pageInput: 'events-dashboard-table-page-input',
  header: (columnKey: string) => `events-dashboard-table-header-${columnKey}`,
  row: (itemKey: string) => `events-dashboard-table-row-${itemKey}`,
}

function getEventCreatorForFilter(
  item: EventDashboardItem,
  historyMap: Map<string, EventHistoryInfo>
): string {
  const h = historyMap.get(item.eventId)
  return (
    item.createdBy?.trim() ||
    h?.creator?.name?.trim() ||
    h?.creator?.email?.trim() ||
    ''
  )
}

interface EventsDashboardProps {
  ims: IMS
}

export const EventsDashboard: React.FC<EventsDashboardProps> = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const { filterEvents } = useRBACFilter()
  const canWriteEvent = useHasPermission('event', 'write')
  const canDeleteEvent = useHasPermission('event', 'delete')
  const [events, setEvents] = useSafeState<EventDashboardItem[]>([])
  const [isLoading, setIsLoading] = useSafeState(true)
  const [error, setError] = useSafeState<string | null>(null)
  const [thumbnails, setThumbnails] = useSafeState<Map<string, EventThumbnail>>(new Map())
  const [venues, setVenues] = useSafeState<Map<string, EventVenueInfo>>(new Map())
  const [series, setSeries] = useSafeState<Map<string, SeriesInfo>>(new Map())
  const [history, setHistory] = useSafeState<Map<string, EventHistoryInfo>>(new Map())
  const [visibleEventIds, setVisibleEventIds] = useSafeState<string[]>([])
  const [loadingThumbnails, setLoadingThumbnails] = useSafeState<Set<string>>(new Set())
  const [loadingVenues, setLoadingVenues] = useSafeState<Set<string>>(new Set())
  const [loadingSeries, setLoadingSeries] = useSafeState<Set<string>>(new Set())
  const [loadingHistory, setLoadingHistory] = useSafeState<Set<string>>(new Set())
  const [itemToDelete, setItemToDelete] = useSafeState<EventDashboardItem | null>(null)
  const [actionInProgress, setActionInProgress] = useSafeState<string | null>(null)
  const [cloneItem, setCloneItem] = useSafeState<EventDashboardItem | null>(null)

  const [listFilters, setListFilters] = useSafeState<{
    seriesId: string
    creator: string
    publish: string
    cloudType: string
  }>({
    seriesId: FILTER_ALL,
    creator: FILTER_ALL,
    publish: FILTER_ALL,
    cloudType: FILTER_ALL,
  })

  const seriesRef = useRef<Map<string, SeriesInfo>>(series)
  seriesRef.current = series

  const loadEventsData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await cachedApi.getEventsList()
      
      // Transform API response to dashboard items
      const dashboardItems: EventDashboardItem[] = data.map(item => ({
        eventId: item.eventId,
        eventName: item.localizations?.[item.defaultLocale || 'en-US']?.title || item.title || item.enTitle || 'Untitled Event',
        seriesId: item.seriesId,
        seriesName: item.seriesId, // TODO: Resolve series name from series ID
        cloudType: item.cloudType,
        eventType: item.eventType,
        published: item.published,
        startDate: item.startDate,
        localStartDate: item.localStartDate,
        localStartTime: item.localStartTime,
        localStartTimeMillis: item.localStartTimeMillis,
        detailPagePath: item.detailPagePath,
        timezone: item.timezone,
        attendeeLimit: item.attendeeLimit,
        attendeeCount: item.attendeeCount,
        hostEmail: item.hostEmail,
        creationTime: item.creationTime,
        modificationTime: item.modificationTime,
        publishTime: undefined, // TODO: Add if available from API
        venueName: item.venue?.venueName,
        language: item.defaultLocale,
        defaultLocale: item.defaultLocale,
        thumbnail: undefined, // TODO: Add if available from API
        contributor: item.hostEmail, // Using hostEmail as contributor for now
        // These will be fetched later from different endpoints
        createdBy: undefined,
        modifiedBy: undefined
      }))
      
      setEvents(filterEvents(dashboardItems))
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load events data')
    } finally {
      setIsLoading(false)
    }
  }

  const { groupVersion } = useGroup()
  useEffect(() => {
    loadEventsData()
  }, [groupVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch thumbnails only for visible event IDs (triggered by pagination)
  useEffect(() => {
    if (visibleEventIds.length === 0) return

    const fetchThumbnails = async () => {
      // Mark events as loading (only ones not already cached)
      const eventsToLoad = visibleEventIds.filter(id => !thumbnails.has(id))
      if (eventsToLoad.length > 0) {
        setLoadingThumbnails(prev => new Set([...prev, ...eventsToLoad]))
      }

      try {
        const thumbnailResults = await thumbnailEnrichmentManager.getMany(visibleEventIds)
        
        setThumbnails(prev => {
          const updated = new Map(prev)
          thumbnailResults.forEach((value, key) => {
            if (value !== null) {
              updated.set(key, value)
            }
          })
          return updated
        })
      } catch (error) {
        console.error('Error fetching thumbnails:', error)
      } finally {
        setLoadingThumbnails(prev => {
          const updated = new Set(prev)
          visibleEventIds.forEach(id => updated.delete(id))
          return updated
        })
      }
    }

    fetchThumbnails()
  }, [visibleEventIds])

  // Fetch venues only for visible event IDs (triggered by pagination)
  useEffect(() => {
    if (visibleEventIds.length === 0) return

    const fetchVenues = async () => {
      // Mark events as loading (only ones not already cached)
      const eventsToLoad = visibleEventIds.filter(id => !venues.has(id))
      if (eventsToLoad.length > 0) {
        setLoadingVenues(prev => new Set([...prev, ...eventsToLoad]))
      }

      try {
        const venueResults = await venueEnrichmentManager.getMany(visibleEventIds)
        
        setVenues(prev => {
          const updated = new Map(prev)
          venueResults.forEach((value, key) => {
            if (value !== null) {
              updated.set(key, value)
            }
          })
          return updated
        })
      } catch (error) {
        console.error('Error fetching venues:', error)
      } finally {
        setLoadingVenues(prev => {
          const updated = new Set(prev)
          visibleEventIds.forEach(id => updated.delete(id))
          return updated
        })
      }
    }

    fetchVenues()
  }, [visibleEventIds])

  // Prefetch series metadata for every series referenced by loaded events (table + filter labels).
  // seriesEnrichmentManager batches and caches; no longer tied to visible page only.
  useEffect(() => {
    if (events.length === 0) return

    const seriesIds = Array.from(new Set(
      events.map(e => e.seriesId).filter((id): id is string => !!id)
    ))
    if (seriesIds.length === 0) return

    let cancelled = false

    const fetchSeries = async () => {
      const missing = seriesIds.filter(id => !seriesRef.current.has(id))
      if (missing.length > 0) {
        setLoadingSeries(prev => {
          const next = new Set(prev)
          missing.forEach(id => next.add(id))
          return next
        })
      }

      try {
        const seriesResults = await seriesEnrichmentManager.getMany(seriesIds)
        if (cancelled) return

        setSeries(prev => {
          const updated = new Map(prev)
          seriesResults.forEach((value, key) => {
            if (value !== null) {
              updated.set(key, value)
            }
          })
          return updated
        })
      } catch (error) {
        console.error('Error fetching series:', error)
      } finally {
        if (!cancelled) {
          setLoadingSeries(prev => {
            const next = new Set(prev)
            seriesIds.forEach(id => next.delete(id))
            return next
          })
        }
      }
    }

    fetchSeries()
    return () => {
      cancelled = true
    }
  }, [events])

  // Fetch history only for visible event IDs (triggered by pagination)
  useEffect(() => {
    if (visibleEventIds.length === 0) return

    const fetchHistory = async () => {
      // Mark events as loading (only ones not already cached)
      const eventsToLoad = visibleEventIds.filter(id => !history.has(id))
      if (eventsToLoad.length > 0) {
        setLoadingHistory(prev => new Set([...prev, ...eventsToLoad]))
      }

      try {
        const historyResults = await historyEnrichmentManager.getMany(visibleEventIds)
        
        setHistory(prev => {
          const updated = new Map(prev)
          historyResults.forEach((value, key) => {
            if (value !== null) {
              updated.set(key, value)
            }
          })
          return updated
        })
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setLoadingHistory(prev => {
          const updated = new Set(prev)
          visibleEventIds.forEach(id => updated.delete(id))
          return updated
        })
      }
    }

    fetchHistory()
  }, [visibleEventIds])

  // Callback to track which events are currently visible
  const handleVisibleEventsChange = useCallback((visibleEvents: EventDashboardItem[]) => {
    const ids = visibleEvents.map(e => e.eventId)
    
    // Only update if the SET of IDs actually changed (not order) to prevent infinite loops
    setVisibleEventIds(prevIds => {
      if (prevIds.length !== ids.length) return ids
      
      // Check if the same set of IDs (order doesn't matter for caching)
      const prevSet = new Set(prevIds)
      const newSet = new Set(ids)
      
      if (prevSet.size === newSet.size && [...prevSet].every(id => newSet.has(id))) {
        return prevIds // Same set of IDs, don't trigger re-fetch
      }
      
      return ids
    })
  }, [])

  const formatDate = useCallback((timestamp?: number): string => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }, [])

  const formatLocalDate = useCallback((dateString?: string): string => {
    if (!dateString) return 'N/A'
    // Convert YYYY-MM-DD to MM/DD/YYYY
    const parts = dateString.split('-')
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`
    }
    return dateString
  }, [])

  const handleMenuAction = useCallback(async (action: string, item: EventDashboardItem) => {
    // Prevent multiple simultaneous actions
    if (actionInProgress) {
      return
    }

    switch (action) {
      case 'publish':
      case 'unpublish': {
        const isPublish = !item.published
        setActionInProgress(item.eventId)
        
        try {
          // Fetch full event data (needed for complete payload with all localizations)
          const eventResponse = await cachedApi.getEventFull(item.eventId)
          
          if ('error' in eventResponse) {
            toast.error(`Failed to load event data: ${eventResponse.error}`)
            break
          }

          // ApiService.publishEvent / unpublishEvent run prepareEslEventPutPayload (submission filter + ESL excludes)
          const result = isPublish
            ? await apiService.publishEvent(item.eventId, eventResponse)
            : await apiService.unpublishEvent(item.eventId, eventResponse)

          if ('error' in result) {
            toast.error(`Failed to ${isPublish ? 'publish' : 'unpublish'} event: ${result.error}`)
          } else {
            toast.success(`Event ${isPublish ? 'published' : 'unpublished'} successfully!`)
            // Refresh events list
            await loadEventsData()
          }
        } catch (err) {
          console.error(`Error ${isPublish ? 'publishing' : 'unpublishing'} event:`, err)
          toast.error(`Failed to ${isPublish ? 'publish' : 'unpublish'} event`)
        } finally {
          setActionInProgress(null)
        }
        break
      }

      case 'preview-pre':
      case 'preview-post': {
        // Use data we already have from the events list - no fetch needed!
        if (!item.detailPagePath) {
          toast.error('Event does not have a detail page URL')
          break
        }

        const previewType = action === 'preview-pre' ? 'pre-event' : 'post-event'
        const localStartTimeMillis = item.localStartTimeMillis || 0
        
        // Pre-event: timing before event start, Post-event: timing after event start
        const timing = previewType === 'pre-event' 
          ? localStartTimeMillis - 10 
          : localStartTimeMillis + 10

        const previewUrl = new URL(item.detailPagePath)
        previewUrl.searchParams.set('timing', String(timing))
        const espenv = getEspEnvParam()
        if (espenv) {
          previewUrl.searchParams.set('espenv', espenv)
        }

        window.open(previewUrl.toString(), '_blank')
        break
      }

      case 'copy-url': {
        // Use data we already have from the events list - no fetch needed!
        if (!item.detailPagePath) {
          toast.error('Event does not have a detail page URL')
          break
        }

        try {
          // Copy to clipboard
          await navigator.clipboard.writeText(item.detailPagePath)
          toast.success('Event URL copied to clipboard!')
        } catch (err) {
          console.error('Error copying URL:', err)
          toast.error('Failed to copy URL to clipboard')
        }
        break
      }

      case 'edit':
        window.location.hash = `#/events/edit/${item.eventId}`
        break

      case 'clone': {
        setCloneItem(item)
        break
      }

      case 'delete':
        // Show delete confirmation dialog
        setItemToDelete(item)
        break

      default:
        break
    }
  }, [actionInProgress, toast])

  const columns = useMemo<TableColumn<EventDashboardItem>[]>(() => [
    {
      key: 'thumbnail',
      name: '',
      width: 100,
      sortable: false,
      render: (item) => {
        const thumbnail = thumbnails.get(item.eventId)
        const isLoading = loadingThumbnails.has(item.eventId)
        
        return (
          <div 
            style={{ 
              width: '90px', 
              height: '90px', 
              backgroundColor: SURFACES.SUBTLE,
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {isLoading ? (
              <div 
                className="thumbnail-shimmer"
                style={{
                  width: '100%',
                  height: '100%',
                  ...eventsTableShimmerStyle,
                }}
              />
            ) : thumbnail?.imageUrl ? (
              <img 
                src={thumbnail.imageUrl} 
                alt={thumbnail.altText || item.eventName}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
                loading="lazy"
              />
            ) : (
              <Text UNSAFE_style={{ fontSize: '10px', color: 'var(--spectrum-global-color-gray-500)' }}>
                No image
              </Text>
            )}
          </div>
        )
      }
    },
    {
      key: 'eventName',
      name: 'EVENT NAME',
      width: 200,
      sortable: true,
      render: (item) => (
        <Text>
          <a 
            href={`#/events/edit/${item.eventId}`}
            style={{ 
              color: 'var(--spectrum-global-color-blue-600)',
              textDecoration: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            {item.eventName}
          </a>
        </Text>
      )
    },
    {
      key: 'published',
      name: 'PUBLISH STATUS',
      width: 140,
      sortable: true,
      sortFn: (a, b) => {
        // Sort published first, then draft
        return (b.published ? 1 : 0) - (a.published ? 1 : 0)
      },
      render: (item) => <StatusBadge status={item.published ? 'published' : 'draft'} />
    },
    {
      key: 'contributor',
      name: 'CONTRIBUTOR',
      width: 150,
      sortable: false,
      render: (item) => <Text>{item.contributor || 'N/A'}</Text>
    },
    {
      key: 'seriesName',
      name: 'SERIES',
      width: 250,
      sortable: false,
      render: (item) => {
        if (!item.seriesId) {
          return <Text>N/A</Text>
        }

        const seriesInfo = series.get(item.seriesId)
        const isLoading = loadingSeries.has(item.seriesId)
        
        if (isLoading) {
          return (
            <div className={style({display: 'flex', flexDirection: 'column', gap: 4})}>
              <div 
                className="series-shimmer"
                style={{
                  width: '150px',
                  height: '16px',
                  ...eventsTableShimmerStyle,
                  borderRadius: '4px'
                }}
              />
              <div 
                className="series-shimmer"
                style={{
                  width: '200px',
                  height: '12px',
                  ...eventsTableShimmerStyle,
                  borderRadius: '4px'
                }}
              />
            </div>
          )
        }
        
        if (seriesInfo) {
          return (
            <div className={style({display: 'flex', flexDirection: 'column', gap: 4})}>
              <Text>{seriesInfo.seriesName}</Text>
              {seriesInfo.seriesDescription && (
                <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)' }}>
                  {seriesInfo.seriesDescription}
                </Text>
              )}
            </div>
          )
        }
        
        return <Text>{item.seriesName || 'N/A'}</Text>
      }
    },
    {
      key: 'localStartDate',
      name: 'DATE RUN | (MM/DD/YYYY)',
      width: 180,
      sortable: true,
      sortFn: (a, b) => {
        // Sort by date string
        const aDate = a.localStartDate || ''
        const bDate = b.localStartDate || ''
        return aDate.localeCompare(bDate)
      },
      render: (item) => <Text>{formatLocalDate(item.localStartDate)}</Text>
    },
    {
      key: 'venueName',
      name: 'VENUE NAME',
      width: 150,
      sortable: false,
      render: (item) => {
        const venue = venues.get(item.eventId)
        const isLoading = loadingVenues.has(item.eventId)
        
        if (isLoading) {
          return (
            <div 
              className="venue-shimmer"
              style={{
                width: '100px',
                height: '16px',
                ...eventsTableShimmerStyle,
                borderRadius: '4px'
              }}
            />
          )
        }
        
        return <Text>{venue?.venueName || item.venueName || 'N/A'}</Text>
      }
    },
    {
      key: 'language',
      name: 'LANGUAGE',
      width: 100,
      sortable: true,
      render: (item) => <Text>{item.language || 'N/A'}</Text>
    },
    {
      key: 'attendeeCount',
      name: 'RSVP DATA',
      width: 120,
      sortable: true,
      sortFn: (a, b) => {
        // Sort by attendee count
        const aCount = a.attendeeCount ?? 0
        const bCount = b.attendeeCount ?? 0
        return aCount - bCount
      },
      render: (item) => (
        <Link
          isQuiet
          onPress={() => navigate(`/registrations/${item.eventId}`)}
          UNSAFE_style={{ cursor: 'pointer' }}
        >
          <span>{item.attendeeCount !== undefined ? item.attendeeCount : 0} / {item.attendeeLimit !== undefined ? item.attendeeLimit : '-'}</span>
        </Link>
      )
    },
    {
      key: 'createdBy',
      name: 'CREATOR',
      width: 150,
      sortable: false,
      render: (item) => {
        const historyInfo = history.get(item.eventId)
        const isLoading = loadingHistory.has(item.eventId)
        
        if (isLoading) {
          return (
            <div 
              className="creator-shimmer"
              style={{
                width: '120px',
                height: '16px',
                ...eventsTableShimmerStyle,
                borderRadius: '4px'
              }}
            />
          )
        }
        
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {historyInfo?.creator?.name || item.createdBy || 'N/A'}
          </Text>
        )
      }
    },
    {
      key: 'modifiedBy',
      name: 'MODIFIER',
      width: 150,
      sortable: false,
      render: (item) => {
        const historyInfo = history.get(item.eventId)
        const isLoading = loadingHistory.has(item.eventId)
        
        if (isLoading) {
          return (
            <div 
              className="modifier-shimmer"
              style={{
                width: '120px',
                height: '16px',
                ...eventsTableShimmerStyle,
                borderRadius: '4px'
              }}
            />
          )
        }
        
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {historyInfo?.modifier?.name || item.modifiedBy || 'N/A'}
          </Text>
        )
      }
    },
    {
      key: 'modificationTime',
      name: 'LAST MODIFIED | (MM/DD/YYYY)',
      width: 200,
      sortable: true,
      render: (item) => <Text>{formatDate(item.modificationTime)}</Text>
    },
    {
      key: 'publishTime',
      name: 'PUBLISHED AT | (MM/DD/YYYY)',
      width: 200,
      sortable: false,
      render: (item) => {
        const historyInfo = history.get(item.eventId)
        const isLoading = loadingHistory.has(item.eventId)
        
        if (isLoading) {
          return (
            <div 
              className="publishtime-shimmer"
              style={{
                width: '140px',
                height: '16px',
                ...eventsTableShimmerStyle,
                borderRadius: '4px'
              }}
            />
          )
        }
        
        const publishedAt = historyInfo?.publishedAt || item.publishTime
        return <Text>{publishedAt ? formatDate(publishedAt) : 'N/A'}</Text>
      }
    },
    {
      key: 'manage',
      name: 'MANAGE',
      width: 190,
      sortable: false,
      cellNoWrap: true,
      render: (item) => (
        <MenuTrigger>
          <ActionButton isQuiet aria-label="Actions menu">
            <More />
          </ActionButton>
          <Menu onAction={(key) => handleMenuAction(key as string, item)}>
            {canWriteEvent && (
              <MenuItem id="publish" textValue={item.published ? 'Unpublish' : 'Publish'}>
                {item.published ? <PublishNo /> : <Publish />}
                <Text slot="label">{item.published ? 'Unpublish' : 'Publish'}</Text>
              </MenuItem>
            )}
            <MenuItem id="preview-pre" textValue="Preview pre-event">
              <Preview />
              <Text slot="label">Preview pre-event</Text>
            </MenuItem>
            <MenuItem id="preview-post" textValue="Preview post-event">
              <Preview />
              <Text slot="label">Preview post-event</Text>
            </MenuItem>
            <MenuItem id="copy-url" textValue="Copy URL">
              <Copy />
              <Text slot="label">Copy URL</Text>
            </MenuItem>
            {canWriteEvent && (
              <MenuItem id="edit" textValue="Edit">
                <Edit />
                <Text slot="label">Edit</Text>
              </MenuItem>
            )}
            {canWriteEvent && (
              <MenuItem id="clone" textValue="Clone">
                <Duplicate />
                <Text slot="label">Clone</Text>
              </MenuItem>
            )}
            {canDeleteEvent && (
              <MenuItem id="delete" textValue="Delete">
                <RemoveCircle />
                <Text slot="label">Delete</Text>
              </MenuItem>
            )}
          </Menu>
        </MenuTrigger>
      )
    }
  ], [formatDate, formatLocalDate, thumbnails, loadingThumbnails, venues, loadingVenues, series, loadingSeries, history, loadingHistory, handleMenuAction])

  const handleDeleteEvent = useCallback(async (event: EventDashboardItem) => {
    setActionInProgress(event.eventId)
    
    try {
      const result = await apiService.deleteEventExternal(event.eventId)
      
      if ('error' in result) {
        toast.error(`Failed to delete event: ${result.error}`)
      } else {
        toast.success('Event deleted successfully!')
        // Refresh events list
        await loadEventsData()
      }
    } catch (err) {
      console.error('Error deleting event:', err)
      toast.error('Failed to delete event')
    } finally {
      setItemToDelete(null)
      setActionInProgress(null)
    }
  }, [toast])


  const handleCreateEvent = useCallback((eventType: EventType) => {
    // Navigate to create event form with event type
    window.location.hash = `#/events/new/${eventType}`
  }, [])

  // Event type options from centralized config
  const eventTypeOptions = useMemo(() => getEventTypeOptions(), [])

  // Icon mapping for event types
  const eventTypeIcons: Record<EventType, React.ReactNode> = {
    'in-person': <Location />,
    'webinar': <GlobeGrid />,
  }

  const filteredEvents = useMemo(() => {
    return events.filter(item => {
      if (listFilters.seriesId !== FILTER_ALL) {
        if (listFilters.seriesId === FILTER_NONE_SERIES) {
          if (item.seriesId) return false
        } else if (item.seriesId !== listFilters.seriesId) {
          return false
        }
      }
      if (listFilters.creator !== FILTER_ALL) {
        if (getEventCreatorForFilter(item, history) !== listFilters.creator) return false
      }
      if (listFilters.publish !== FILTER_ALL) {
        if (listFilters.publish === 'published' && !item.published) return false
        if (listFilters.publish === 'draft' && item.published) return false
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
  }, [events, listFilters, history])

  const seriesFilterIds = useMemo(() => {
    const ids = new Set<string>()
    events.forEach(e => {
      if (e.seriesId) ids.add(e.seriesId)
    })
    return Array.from(ids).sort((a, b) => {
      const na = series.get(a)?.seriesName || a
      const nb = series.get(b)?.seriesName || b
      return na.localeCompare(nb)
    })
  }, [events, series])

  const hasEventsWithoutSeries = useMemo(
    () => events.some(e => !e.seriesId),
    [events]
  )

  const creatorFilterOptions = useMemo(() => {
    const s = new Set<string>()
    events.forEach(e => {
      const c = getEventCreatorForFilter(e, history)
      if (c) s.add(c)
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [events, history])

  const cloudTypeFilterOptions = useMemo(() => {
    const s = new Set<string>()
    events.forEach(e => {
      if (e.cloudType) s.add(e.cloudType)
    })
    return Array.from(s).sort()
  }, [events])

  const hasEventsWithoutCloudType = useMemo(
    () => events.some(e => !e.cloudType),
    [events]
  )

  const clearListFilters = useCallback(() => {
    setListFilters({
      seriesId: FILTER_ALL,
      creator: FILTER_ALL,
      publish: FILTER_ALL,
      cloudType: FILTER_ALL,
    })
  }, [])

  const eventsFilterToolbar = useMemo(() => (
    <DialogTrigger>
      <ActionButton isQuiet aria-label="Filter events">
        <Filter />
      </ActionButton>
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">Filter events</Heading>
            <Content>
              <div
                className={style({ display: 'flex', flexDirection: 'column' })}
                style={{ gap: SPACING.MD }}
              >
                <Picker
                  data-testid="filter-series-picker"
                  label="Series"
                  selectedKey={listFilters.seriesId}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, seriesId: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All series">All series</PickerItem>
                  {hasEventsWithoutSeries && (
                    <PickerItem id={FILTER_NONE_SERIES} textValue="No series">No series</PickerItem>
                  )}
                  {seriesFilterIds.map(sid => {
                    const label = series.get(sid)?.seriesName || sid
                    return (
                      <PickerItem key={sid} id={sid} textValue={label}>
                        {label}
                      </PickerItem>
                    )
                  })}
                </Picker>
                <Picker
                  data-testid="filter-creator-picker"
                  label="Creator"
                  selectedKey={listFilters.creator}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, creator: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All creators">All creators</PickerItem>
                  {creatorFilterOptions.map(c => (
                    <PickerItem key={c} id={c} textValue={c}>{c}</PickerItem>
                  ))}
                </Picker>
                <Picker
                  data-testid="filter-status-picker"
                  label="Publish state"
                  selectedKey={listFilters.publish}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, publish: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All states">All states</PickerItem>
                  <PickerItem id="published" textValue="Published">Published</PickerItem>
                  <PickerItem id="draft" textValue="Draft">Draft</PickerItem>
                </Picker>
                <Picker
                  data-testid="filter-cloud-picker"
                  label="Cloud type"
                  selectedKey={listFilters.cloudType}
                  onSelectionChange={(key) => {
                    if (key == null) return
                    setListFilters(f => ({ ...f, cloudType: String(key) }))
                  }}
                >
                  <PickerItem id={FILTER_ALL} textValue="All cloud types">All cloud types</PickerItem>
                  {hasEventsWithoutCloudType && (
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
    seriesFilterIds,
    hasEventsWithoutSeries,
    creatorFilterOptions,
    cloudTypeFilterOptions,
    hasEventsWithoutCloudType,
    series,
    clearListFilters,
  ])

  // Custom create button with dropdown menu — only shown when user has event:write
  const createEventButton = useMemo(() => {
    if (!canWriteEvent) return undefined
    return (
      <MenuTrigger>
        <Button data-testid="create-event-trigger" variant="accent">Create new event</Button>
        <Menu onAction={(key) => handleCreateEvent(key as EventType)}>
          {eventTypeOptions.map(option => (
            <MenuItem key={option.key} id={option.key} textValue={option.label}>
              {eventTypeIcons[option.key]}
              <Text slot="label">{option.label}</Text>
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    )
  }, [canWriteEvent, handleCreateEvent, eventTypeOptions])

  return (
    <>
      <div data-testid="events-dashboard" className={style({padding: 32})}>
        <ResourceDashboardLayout
          title="All Events"
          totalCount={filteredEvents.length}
          error={error}
          data={filteredEvents}
          columns={columns}
          getItemKey={(item) => item.eventId}
          onVisibleItemsChange={handleVisibleEventsChange}
          onRefresh={loadEventsData}
          createButton={createEventButton}
          toolbarEnd={eventsFilterToolbar}
          emptyStateIllustration={<CalendarIllustration aria-hidden />}
          emptyStateTitle="No Events Found"
          emptyStateDescription="Get started by creating your first event"
          dataTableTestIds={EVENTS_DASHBOARD_TABLE_TEST_IDS}
          searchPlaceholder="Search events..."
          searchKeys={EVENTS_SEARCH_KEYS}
        />
      </div>

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading events..."
        ariaLabel="Loading events"
      />
      <BlurredLoadingOverlay
        visible={!!actionInProgress}
        message="Processing..."
        ariaLabel="Processing action"
        zIndex={9999}
      />

      {/* Clone Event */}
      <CloneEvent
        item={cloneItem}
        existingNames={events.map(e => e.eventName)}
        onClose={() => setCloneItem(null)}
        onCloned={loadEventsData}
      />

      {/* Delete Confirmation Dialog */}
      <DialogTrigger
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Event"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (itemToDelete) {
              handleDeleteEvent(itemToDelete)
            }
          }}
          onCancel={() => setItemToDelete(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          Are you sure you want to delete <strong>{itemToDelete?.eventName}</strong>?
          This action cannot be undone and will permanently remove the event and all associated data.
        </AlertDialog>
      </DialogTrigger>
    </>
  )
}
