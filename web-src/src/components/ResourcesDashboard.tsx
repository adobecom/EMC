/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Heading,
  Flex,
  Button,
  TabList,
  TabPanels,
  Item,
  Tabs,
  Content,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import { useNavigate } from 'react-router-dom'
import { Series, Event, Session } from '../types/domain'
import { DataTable, TableColumn, TableAction, LoadingSpinner, StatusBadge } from './shared'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface ResourcesDashboardProps {
  ims: IMS
}

export const ResourcesDashboard: React.FC<ResourcesDashboardProps> = ({ ims }) => {
  const navigate = useNavigate()
  const [series, setSeries] = useState<Series[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<React.Key>('series')
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'series' | 'event' | 'session'
    id: string
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Check if IMS data is available
      if (!ims.token || !ims.org) {
        console.warn('IMS authentication not available yet')
        setIsLoading(false)
        return
      }

      apiService.setAuthHeaders(ims.token, ims.org)
      const [seriesResponse, eventsResponse, sessionsResponse] = await Promise.all([
        apiService.getSeries(),
        apiService.getEvents(),
        apiService.getSessions()
      ])

      if (seriesResponse.success && seriesResponse.data) {
        setSeries(seriesResponse.data)
      }
      if (eventsResponse.success && eventsResponse.data) {
        setEvents(eventsResponse.data)
      }
      if (sessionsResponse.success && sessionsResponse.data) {
        setSessions(sessionsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load resources:', error)
      // Set loading to false even on error
    } finally {
      setIsLoading(false)
    }
  }

  // Series handlers
  const handleCreateSeries = () => {
    navigate('/series/new')
  }

  const handleEditSeries = (item: Series) => {
    navigate(`/series/edit/${item.id}`)
  }

  const handleViewSeries = (item: Series) => {
    navigate(`/series/${item.id}`)
  }

  const handleDeleteSeries = async (id: string) => {
    try {
      await apiService.deleteSeries(id)
      setItemToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete series:', error)
    }
  }

  // Event handlers
  const handleCreateEvent = () => {
    navigate('/events/new')
  }

  const handleEditEvent = (item: Event) => {
    navigate(`/events/edit/${item.id}`)
  }

  const handleViewEvent = (item: Event) => {
    navigate(`/events/${item.id}`)
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiService.deleteEvent(id)
      setItemToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  // Session handlers
  const handleViewSession = (item: Session) => {
    navigate(`/sessions/${item.id}`)
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await apiService.deleteSession(id)
      setItemToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  // Table columns
  const seriesColumns: TableColumn<Series>[] = [
    { key: 'name', name: 'Name', width: 250 },
    { key: 'description', name: 'Description', width: 300 },
    {
      key: 'status',
      name: 'Status',
      width: 120,
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'startDate',
      name: 'Start Date',
      width: 120,
      render: (item) => new Date(item.startDate).toLocaleDateString()
    },
    {
      key: 'endDate',
      name: 'End Date',
      width: 120,
      render: (item) => new Date(item.endDate).toLocaleDateString()
    }
  ]

  const seriesActions: TableAction<Series>[] = [
    { icon: 'view', label: 'View', onAction: handleViewSeries },
    { icon: 'edit', label: 'Edit', onAction: handleEditSeries },
    {
      icon: 'delete',
      label: 'Delete',
      onAction: (item) => setItemToDelete({ type: 'series', id: item.id })
    }
  ]

  const eventColumns: TableColumn<Event>[] = [
    { key: 'name', name: 'Name', width: 250 },
    {
      key: 'seriesId',
      name: 'Series',
      width: 150,
      render: (item) => series.find((s) => s.id === item.seriesId)?.name || '-'
    },
    {
      key: 'status',
      name: 'Status',
      width: 120,
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'startDateTime',
      name: 'Start',
      width: 150,
      render: (item) => new Date(item.startDateTime).toLocaleString()
    },
    {
      key: 'capacity',
      name: 'Capacity',
      width: 100
    }
  ]

  const eventActions: TableAction<Event>[] = [
    { icon: 'view', label: 'View', onAction: handleViewEvent },
    { icon: 'edit', label: 'Edit', onAction: handleEditEvent },
    {
      icon: 'delete',
      label: 'Delete',
      onAction: (item) => setItemToDelete({ type: 'event', id: item.id })
    }
  ]

  const sessionColumns: TableColumn<Session>[] = [
    { key: 'name', name: 'Name', width: 250 },
    {
      key: 'eventId',
      name: 'Event',
      width: 150,
      render: (item) => events.find((e) => e.id === item.eventId)?.name || '-'
    },
    {
      key: 'status',
      name: 'Status',
      width: 120,
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'startDateTime',
      name: 'Start',
      width: 150,
      render: (item) => new Date(item.startDateTime).toLocaleString()
    },
    { key: 'speaker', name: 'Speaker', width: 150 }
  ]

  const sessionActions: TableAction<Session>[] = [
    { icon: 'view', label: 'View', onAction: handleViewSession },
    {
      icon: 'delete',
      label: 'Delete',
      onAction: (item) => setItemToDelete({ type: 'session', id: item.id })
    }
  ]

  if (isLoading) {
    return <LoadingSpinner message="Loading resources..." />
  }

  return (
    <View width="100%">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-300">
        <Heading level={1}>Dashboard</Heading>
      </Flex>

      <Tabs selectedKey={selectedTab} onSelectionChange={setSelectedTab as any}>
        <TabList>
          <Item key="series">Series ({series.length})</Item>
          <Item key="events">Events ({events.length})</Item>
          <Item key="sessions">Sessions ({sessions.length})</Item>
        </TabList>
        <TabPanels>
          <Item key="series">
            <View paddingTop="size-300" paddingBottom="size-300">
              <Flex direction="column" gap="size-300">
                <Flex justifyContent="end">
                  <Button variant="accent" onPress={handleCreateSeries}>
                    <Add />
                    Create Series
                  </Button>
                </Flex>
                <DataTable
                  columns={seriesColumns}
                  data={series}
                  actions={seriesActions}
                  getItemKey={(item) => item.id}
                  emptyState={<Content>No series found. Create your first series!</Content>}
                />
              </Flex>
            </View>
          </Item>

          <Item key="events">
            <Flex direction="column" gap="size-300">
              <Flex justifyContent="end">
                <Button variant="accent" onPress={handleCreateEvent}>
                  <Add />
                  Create Event
                </Button>
              </Flex>

              <DataTable
                columns={eventColumns}
                data={events}
                actions={eventActions}
                getItemKey={(item) => item.id}
                emptyState={<Content>No events found. Create your first event!</Content>}
              />
            </Flex>
          </Item>

          <Item key="sessions">
            <Flex direction="column" gap="size-300">
              <DataTable
                columns={sessionColumns}
                data={sessions}
                actions={sessionActions}
                getItemKey={(item) => item.id}
                emptyState={<Content>No sessions found.</Content>}
              />
            </Flex>
          </Item>
        </TabPanels>
      </Tabs>

      {/* Delete confirmation dialog */}
      <DialogTrigger
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Confirm Delete"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (itemToDelete) {
                if (itemToDelete.type === 'series') {
                  handleDeleteSeries(itemToDelete.id)
                } else if (itemToDelete.type === 'event') {
                  handleDeleteEvent(itemToDelete.id)
                } else {
                  handleDeleteSession(itemToDelete.id)
                }
              }
              close()
            }}
            onSecondaryAction={close}
          >
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </AlertDialog>
        )}
      </DialogTrigger>
    </View>
  )
}

