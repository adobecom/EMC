/* 
* <license header>
*/

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Flex, Text } from '@adobe/react-spectrum'
import { TableColumn } from './shared/DataTable'
import { StatusBadge, ResourceDashboardLayout } from './shared'
import { EventDashboardItem } from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface EventsDashboardProps {
  ims: IMS
}

export const EventsDashboard: React.FC<EventsDashboardProps> = () => {
  const [events, setEvents] = useState<EventDashboardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const formatDate = useCallback((timestamp?: number): string => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const formatLocalDateTime = useCallback((date?: string, time?: string): string => {
    if (!date) return 'N/A'
    if (!time) return date
    return `${date} ${time}`
  }, [])

  const columns = useMemo<TableColumn<EventDashboardItem>[]>(() => [
    {
      key: 'eventName',
      name: 'Event Name',
      width: 250,
      sortable: true,
      render: (item) => (
        <Text><strong>{item.eventName}</strong></Text>
      )
    },
    {
      key: 'published',
      name: 'Status',
      width: 120,
      sortable: true,
      sortFn: (a, b) => {
        // Sort published first, then draft
        return (b.published ? 1 : 0) - (a.published ? 1 : 0)
      },
      render: (item) => <StatusBadge status={item.published ? 'published' : 'draft'} />
    },
    {
      key: 'eventType',
      name: 'Type',
      width: 120,
      sortable: true,
      render: (item) => <Text>{item.eventType || 'N/A'}</Text>
    },
    {
      key: 'cloudType',
      name: 'Cloud Type',
      width: 150,
      sortable: true,
      render: (item) => <Text>{item.cloudType || 'N/A'}</Text>
    },
    {
      key: 'localStartDate',
      name: 'Start Date/Time',
      width: 200,
      sortable: true,
      sortFn: (a, b) => {
        // Sort by date string
        const aDate = a.localStartDate || ''
        const bDate = b.localStartDate || ''
        return aDate.localeCompare(bDate)
      },
      render: (item) => (
        <Flex direction="column" gap="size-25">
          <Text>{formatLocalDateTime(item.localStartDate, item.localStartTime)}</Text>
          {item.timezone && (
            <Text UNSAFE_style={{ fontSize: '11px', color: 'var(--spectrum-global-color-gray-600)' }}>
              {item.timezone}
            </Text>
          )}
        </Flex>
      )
    },
    {
      key: 'attendees',
      name: 'Attendees',
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
      key: 'modificationTime',
      name: 'Last Modified',
      width: 180,
      sortable: true,
      render: (item) => <Text>{formatDate(item.modificationTime)}</Text>
    },
    {
      key: 'createdBy',
      name: 'Created By',
      width: 150,
      sortable: true,
      render: (item) => (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          {item.createdBy || 'N/A'}
        </Text>
      )
    }
  ], [formatDate, formatLocalDateTime])

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

