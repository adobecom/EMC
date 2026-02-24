/* 
* <license header>
*/

import React, { useEffect, useMemo, useCallback } from 'react'
import { Text, ActionButton, MenuTrigger, Menu, Item, Flex, Button, DialogTrigger, AlertDialog, ProgressCircle, View, Link } from '@adobe/react-spectrum'
import MoreSmallList from '@spectrum-icons/workflow/MoreSmallList'
import PublishRemove from '@spectrum-icons/workflow/PublishRemove'
import ViewDetail from '@spectrum-icons/workflow/ViewDetail'
import Copy from '@spectrum-icons/workflow/Copy'
import Edit from '@spectrum-icons/workflow/Edit'
import Duplicate from '@spectrum-icons/workflow/Duplicate'
import Delete from '@spectrum-icons/workflow/Delete'
import Globe from '@spectrum-icons/workflow/Globe'
import Location from '@spectrum-icons/workflow/Location'
import { getEventTypeOptions, EventType } from '../../config/eventTypeConfig'
import { TableColumn } from '../../components/shared/DataTable'
import { StatusBadge, ResourceDashboardLayout } from '../../components/shared'
import { EventDashboardItem } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { thumbnailEnrichmentManager, venueEnrichmentManager, historyEnrichmentManager, EventThumbnail, EventVenueInfo, EventHistoryInfo } from '../../services/eventEnrichment'
import { seriesEnrichmentManager, SeriesInfo } from '../../services/seriesEnrichment'
import { IMS } from '../../types'
import { useToast } from '../../contexts'
import { filterEventData } from '../../utils/dataFilters'
import { useSafeState } from '../../hooks'
import { getEspEnvParam } from '../../config/constants'

interface EventsDashboardProps {
  ims: IMS
}

export const EventsDashboard: React.FC<EventsDashboardProps> = () => {
  const toast = useToast()
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

  const loadEventsData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await cachedApi.getEventsList()
      
      // Transform API response to dashboard items
      const dashboardItems: EventDashboardItem[] = data.map(item => ({
        eventId: item.eventId,
        eventName: item.enTitle || item.localizations?.['en-US']?.title || 'Untitled Event',
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
      
      setEvents(dashboardItems)
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load events data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEventsData()
  }, [])

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

  // Fetch series only for visible event IDs that have seriesId (triggered by pagination)
  useEffect(() => {
    if (visibleEventIds.length === 0) return

    const fetchSeries = async () => {
      // Get unique series IDs from visible events (filter out undefined/null)
      const seriesIds = Array.from(new Set(
        visibleEventIds
          .map(eventId => events.find(e => e.eventId === eventId)?.seriesId)
          .filter((id): id is string => !!id)
      ))

      if (seriesIds.length === 0) return

      // Mark series as loading (only ones not already cached)
      const seriesToLoad = seriesIds.filter(id => !series.has(id))
      if (seriesToLoad.length > 0) {
        setLoadingSeries(prev => new Set([...prev, ...seriesToLoad]))
      }

      try {
        const seriesResults = await seriesEnrichmentManager.getMany(seriesIds)
        
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
        setLoadingSeries(prev => {
          const updated = new Set(prev)
          seriesIds.forEach(id => updated.delete(id))
          return updated
        })
      }
    }

    fetchSeries()
  }, [visibleEventIds, events])

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

          // Filter the event data to only include submittable fields
          // filterEventData preserves ALL localizations (unlike getEventPayload which only keeps one locale)
          const filteredPayload = filterEventData(eventResponse, 'submission')

          // Prepare final payload with publish flags
          const payload = {
            ...filteredPayload,
            published: isPublish,
            liveUpdate: true,
            forceSpWrite: false
          }

          // Call publish or unpublish API
          const result = isPublish
            ? await apiService.publishEvent(item.eventId, payload)
            : await apiService.unpublishEvent(item.eventId, payload)

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
        previewUrl.searchParams.set('previewMode', 'true')
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
        setActionInProgress(item.eventId)
        
        try {
          // Fetch full event data to get all fields for cloning
          const eventResponse = await cachedApi.getEventFull(item.eventId)
          
          if ('error' in eventResponse) {
            toast.error('Failed to load event data for cloning')
            break
          }

          // Filter the event data for cloning (excludes eventId, published, timestamps, etc.)
          const cloneableData = filterEventData(eventResponse, 'clone')
          
          // Get the locale for proper localization handling
          const locale = eventResponse.defaultLocale || 'en-US'
          
          // Get the localized title from the response
          const originalTitle = eventResponse.localizations?.[locale]?.title || 
                               eventResponse.enTitle || 
                               'Untitled Event'
          
          // Prepare the cloned event data with "- copy" suffix
          const clonedEventData: Record<string, any> = {
            ...cloneableData,
            enTitle: `${originalTitle} - copy`,
            published: false,
            liveUpdate: false,
          }
          
          // Update the localized title
          if (clonedEventData.localizations && clonedEventData.localizations[locale]) {
            clonedEventData.localizations[locale].title = `${originalTitle} - copy`
          }
          
          // Create the event directly via API
          const result = await apiService.createEventExternal(clonedEventData, locale)
          
          if ('error' in result) {
            toast.error(`Failed to clone event: ${result.error}`)
          } else {
            const newEventId = result.event?.eventId || result.eventId
            toast.success('Event cloned successfully!', {
              duration: 5000,
              action: {
                label: 'View',
                onPress: () => {
                  window.location.hash = `#/events/edit/${newEventId}`
                }
              }
            })
            // Refresh events list
            await loadEventsData()
          }
        } catch (err) {
          console.error('Error cloning event:', err)
          toast.error('Failed to clone event')
        } finally {
          setActionInProgress(null)
        }
        break
      }

      case 'delete':
        // Show delete confirmation dialog
        setItemToDelete(item)
        break

      default:
        console.log('Unknown action:', action)
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
              backgroundColor: '#f0f0f0', 
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
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite'
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
            <Flex direction="column" gap="size-50">
              <div 
                className="series-shimmer"
                style={{
                  width: '150px',
                  height: '16px',
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  borderRadius: '4px'
                }}
              />
              <div 
                className="series-shimmer"
                style={{
                  width: '200px',
                  height: '12px',
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  borderRadius: '4px'
                }}
              />
            </Flex>
          )
        }
        
        if (seriesInfo) {
          return (
            <Flex direction="column" gap="size-50">
              <Text>{seriesInfo.seriesName}</Text>
              {seriesInfo.seriesDescription && (
                <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)' }}>
                  {seriesInfo.seriesDescription.length > 60 
                    ? `${seriesInfo.seriesDescription.substring(0, 60)}...` 
                    : seriesInfo.seriesDescription}
                </Text>
              )}
            </Flex>
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
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
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
        <Link href={`#/attendees/${item.eventId}`}>
          <Text>
            {item.attendeeCount !== undefined ? item.attendeeCount : 0} / {item.attendeeLimit !== undefined ? item.attendeeLimit : '-'}
          </Text>
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
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
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
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
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
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
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
      render: (item) => (
        <MenuTrigger>
          <ActionButton isQuiet aria-label="Actions menu">
            <MoreSmallList />
          </ActionButton>
          <Menu onAction={(key) => handleMenuAction(key as string, item)}>
            <Item key="publish">
              <PublishRemove />
              <Text>{item.published ? 'Unpublish' : 'Publish'}</Text>
            </Item>
            <Item key="preview-pre">
              <ViewDetail />
              <Text>Preview pre-event</Text>
            </Item>
            <Item key="preview-post">
              <ViewDetail />
              <Text>Preview post-event</Text>
            </Item>
            <Item key="copy-url">
              <Copy />
              <Text>Copy URL</Text>
            </Item>
            <Item key="edit">
              <Edit />
              <Text>Edit</Text>
            </Item>
            <Item key="clone">
              <Duplicate />
              <Text>Clone</Text>
            </Item>
            <Item key="delete">
              <Delete />
              <Text>Delete</Text>
            </Item>
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
    'webinar': <Globe />,
  }

  // Custom create button with dropdown menu
  const createEventButton = useMemo(() => (
    <MenuTrigger>
      <Button variant="accent">Create new event</Button>
      <Menu onAction={(key) => handleCreateEvent(key as EventType)}>
        {eventTypeOptions.map(option => (
          <Item key={option.key} textValue={option.label}>
            {eventTypeIcons[option.key]}
            <Text>{option.label}</Text>
          </Item>
        ))}
      </Menu>
    </MenuTrigger>
  ), [handleCreateEvent, eventTypeOptions])

  return (
    <>
      <ResourceDashboardLayout
        title="All Events"
        totalCount={events.length}
        isLoading={isLoading}
        error={error}
        data={events}
        columns={columns}
        getItemKey={(item) => item.eventId}
        onVisibleItemsChange={handleVisibleEventsChange}
        onRefresh={loadEventsData}
        createButton={createEventButton}
        emptyStateTitle="No Events Found"
        emptyStateDescription="Get started by creating your first event"
        loadingMessage="Loading events..."
        searchPlaceholder="Search events..."
        searchKeys={['eventName', 'eventType', 'cloudType', 'hostEmail', 'seriesId']}
      />

      {/* Loading Overlay for Actions */}
      {actionInProgress && (
        <View
          position="fixed"
          top="size-0"
          left="size-0"
          right="size-0"
          bottom="size-0"
          UNSAFE_style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
            cursor: 'wait'
          }}
        >
          <View
            backgroundColor="gray-50"
            padding="size-400"
            borderRadius="medium"
            UNSAFE_style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <ProgressCircle size="L" isIndeterminate aria-label="Processing action" />
            <Text UNSAFE_style={{ fontSize: '16px', fontWeight: 500 }}>
              Processing...
            </Text>
          </View>
        </View>
      )}

      {/* Delete Confirmation Dialog */}
      <DialogTrigger
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Delete Event"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (itemToDelete) {
                handleDeleteEvent(itemToDelete)
              }
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={!!actionInProgress}
          >
            Are you sure you want to delete <strong>{itemToDelete?.eventName}</strong>? 
            This action cannot be undone and will permanently remove the event and all associated data.
          </AlertDialog>
        )}
      </DialogTrigger>
    </>
  )
}
