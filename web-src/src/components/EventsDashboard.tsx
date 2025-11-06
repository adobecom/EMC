/* 
* <license header>
*/

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Text } from '@adobe/react-spectrum'
import { TableColumn } from './shared/DataTable'
import { StatusBadge, ResourceDashboardLayout } from './shared'
import { EventDashboardItem } from '../types/domain'
import { apiService } from '../services/api'
import { thumbnailEnrichmentManager, EventThumbnail } from '../services/eventEnrichment'
import { IMS } from '../types'

interface EventsDashboardProps {
  ims: IMS
}

export const EventsDashboard: React.FC<EventsDashboardProps> = () => {
  const [events, setEvents] = useState<EventDashboardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<Map<string, EventThumbnail>>(new Map())
  const [visibleEventIds, setVisibleEventIds] = useState<string[]>([])
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set())

  const loadEventsData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await apiService.getEventsList()
      
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
        timezone: item.timezone,
        attendeeLimit: item.attendeeLimit,
        attendeeCount: item.attendeeCount,
        hostEmail: item.hostEmail,
        creationTime: item.creationTime,
        modificationTime: item.modificationTime,
        publishTime: undefined, // TODO: Add if available from API
        venueName: item.venue?.venueName,
        language: item.defaultLocale,
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
        // Remove loading state for all requested events
        setLoadingThumbnails(prev => {
          const updated = new Set(prev)
          visibleEventIds.forEach(id => updated.delete(id))
          return updated
        })
      }
    }

    fetchThumbnails()
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
        <Text><strong>{item.eventName}</strong></Text>
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
      width: 150,
      sortable: false,
      render: (item) => <Text>{item.seriesName || 'N/A'}</Text>
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
      render: (item) => <Text>{item.venueName || 'N/A'}</Text>
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
        <Text>
          {item.attendeeCount !== undefined ? item.attendeeCount : 0} / {item.attendeeLimit !== undefined ? item.attendeeLimit : '-'}
        </Text>
      )
    },
    {
      key: 'createdBy',
      name: 'CREATOR',
      width: 150,
      sortable: false,
      render: (item) => (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          {item.createdBy || 'N/A'}
        </Text>
      )
    },
    {
      key: 'modifiedBy',
      name: 'MODIFIER',
      width: 150,
      sortable: false,
      render: (item) => (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          {item.modifiedBy || 'N/A'}
        </Text>
      )
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
      render: (item) => <Text>{formatDate(item.publishTime)}</Text>
    }
  ], [formatDate, formatLocalDate, thumbnails, loadingThumbnails])

  const handleCreateEvent = () => {
    // Navigate to create event form
    window.location.hash = '#/events/new'
  }

  const handleViewEvent = (item: EventDashboardItem) => {
    console.log('View event:', item)
    // TODO: Navigate to event detail view
    window.location.hash = `#/events/edit/${item.eventId}`
  }

  const handleEditEvent = (item: EventDashboardItem) => {
    console.log('Edit event:', item)
    window.location.hash = `#/events/edit/${item.eventId}`
  }

  const handleDeleteEvent = (item: EventDashboardItem) => {
    console.log('Delete event:', item)
    // TODO: Implement delete confirmation dialog
    alert(`Delete functionality will be implemented for: ${item.eventName}`)
  }

  return (
    <ResourceDashboardLayout
      title="All Events"
      totalCount={events.length}
      isLoading={isLoading}
      error={error}
      data={events}
      columns={columns}
      getItemKey={(item) => item.eventId}
      onVisibleItemsChange={handleVisibleEventsChange}
      actions={[
        {
          icon: 'view',
          label: 'View event',
          onAction: handleViewEvent
        },
        {
          icon: 'edit',
          label: 'Edit event',
          onAction: handleEditEvent
        },
        {
          icon: 'delete',
          label: 'Delete event',
          onAction: handleDeleteEvent
        }
      ]}
      onRefresh={loadEventsData}
      onCreate={handleCreateEvent}
      createLabel="Create Event"
      emptyStateTitle="No Events Found"
      emptyStateDescription="Get started by creating your first event"
      loadingMessage="Loading events..."
      searchPlaceholder="Search events..."
      searchKeys={['eventName', 'eventType', 'cloudType', 'hostEmail', 'seriesId']}
    />
  )
}

