/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Heading,
  Flex,
  Picker,
  Item,
  Button,
  Content,
  Text,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import Download from '@spectrum-icons/workflow/Download'
import { useParams } from 'react-router-dom'
import { EventApiResponse } from '../types/domain'
import { DataTable, TableColumn, TableAction, LoadingSpinner, StatusBadge } from './shared'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface RegistrationDashboardProps {
  ims: IMS
}

// Attendee data structure from ESP API
// Attendee data structure from ESP API
// Per OpenAPI spec: registrationStatus is an enum with only "registered" | "waitlisted"
// checkedIn is a separate boolean field
interface Attendee {
  attendeeId: string
  eventId?: string
  email: string
  firstName?: string
  lastName?: string
  mobilePhone?: string
  registrationStatus?: 'registered' | 'waitlisted' // Per OpenAPI RegistrationStatus enum
  checkedIn?: boolean // Per OpenAPI EventAttendee schema
  registrationDate?: string
  creationTime?: number
  modificationTime?: number
}

// Map attendee status to display status
function mapAttendeeStatus(attendee: Attendee): 'pending' | 'confirmed' | 'attended' | 'cancelled' {
  // Check if attendee has checked in (checkedIn is a boolean per OpenAPI)
  if (attendee.checkedIn) {
    return 'attended'
  }
  
  // Map registration status
  switch (attendee.registrationStatus) {
    case 'registered':
      return 'confirmed'
    case 'waitlisted':
      return 'pending'
    default:
      return 'pending'
  }
}

export const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({ ims }) => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [events, setEvents] = useState<EventApiResponse[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(paramEventId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Attendee | null>(null)

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadAttendees(selectedEventId)
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    try {
      // Use external API - getEventsList returns EventApiResponse[] directly
      const eventsData = await apiService.getEventsList()
      
      if (Array.isArray(eventsData)) {
        setEvents(eventsData)
        // If no event selected and we have events, select the first one
        if (!selectedEventId && eventsData.length > 0) {
          setSelectedEventId(eventsData[0].eventId)
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }

  const loadAttendees = async (eventId: string) => {
    setIsLoading(true)
    try {
      // Use external API - getEventAttendees
      const response = await apiService.getEventAttendees(eventId)
      
      if ('error' in response) {
        console.error('Failed to load attendees:', response)
        setAttendees([])
        return
      }
      
      // Response structure: { attendees: [...] }
      const attendeesData = response.attendees || []
      setAttendees(attendeesData)
    } catch (error) {
      console.error('Failed to load attendees:', error)
      setAttendees([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAttendee = async (attendee: Attendee) => {
    try {
      // Use external API - removeAttendeeFromEvent requires both eventId and attendeeId
      await apiService.removeAttendeeFromEvent(attendee.eventId, attendee.attendeeId)
      setItemToDelete(null)
      if (selectedEventId) {
        loadAttendees(selectedEventId)
      }
    } catch (error) {
      console.error('Failed to delete attendee:', error)
    }
  }

  const handleUpdateStatus = async (attendee: Attendee, newStatus: 'registered' | 'waitlisted') => {
    try {
      // Use external API - updateAttendee requires eventId, attendeeId, and data
      // Per OpenAPI, field is "registrationStatus" not "status", and only accepts "registered" | "waitlisted"
      await apiService.updateAttendee(selectedEventId, attendee.attendeeId, { 
        registrationStatus: newStatus,
        modificationTime: attendee.modificationTime 
      })
      if (selectedEventId) {
        loadAttendees(selectedEventId)
      }
    } catch (error) {
      console.error('Failed to update attendee status:', error)
    }
  }

  const handleExportData = () => {
    // Convert attendees to CSV format
    const headers = [
      'Attendee ID',
      'Name',
      'Email',
      'Phone',
      'Status',
      'Registration Date'
    ]
    const csvRows = [headers.join(',')]

    attendees.forEach((attendee) => {
      const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') || 'N/A'
      const displayStatus = attendee.checkedIn ? 'checked-in' : (attendee.registrationStatus || 'registered')
      const row = [
        attendee.attendeeId,
        name,
        attendee.email,
        attendee.mobilePhone || '',
        displayStatus,
        attendee.registrationDate || (attendee.creationTime ? new Date(attendee.creationTime).toLocaleString() : '')
      ]
      csvRows.push(row.map(val => `"${val}"`).join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendees-${selectedEventId}-${Date.now()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const columns: TableColumn<Attendee>[] = [
    { 
      key: 'name', 
      name: 'ATTENDEE NAME', 
      width: 200,
      render: (item) => {
        const name = [item.firstName, item.lastName].filter(Boolean).join(' ')
        return name || 'N/A'
      }
    },
    { key: 'email', name: 'EMAIL', width: 250 },
    { key: 'mobilePhone', name: 'PHONE', width: 150 },
    {
      key: 'status',
      name: 'STATUS',
      width: 120,
      render: (item) => <StatusBadge status={mapAttendeeStatus(item)} />
    },
    {
      key: 'registrationDate',
      name: 'REGISTRATION DATE',
      width: 180,
      render: (item) => {
        const date = item.registrationDate || (item.creationTime ? new Date(item.creationTime) : null)
        return date ? new Date(date).toLocaleString() : 'N/A'
      }
    }
  ]

  const actions: TableAction<Attendee>[] = [
    {
      icon: 'edit',
      label: 'Toggle Status',
      onAction: (item) => {
        // Toggle between the two valid statuses per OpenAPI
        const validStatuses: Array<'registered' | 'waitlisted'> = ['registered', 'waitlisted']
        const currentIndex = validStatuses.indexOf(item.registrationStatus || 'registered')
        const nextStatus = validStatuses[(currentIndex + 1) % validStatuses.length]
        handleUpdateStatus(item, nextStatus)
      }
    },
    {
      icon: 'delete',
      label: 'Delete',
      onAction: (item) => setItemToDelete(item)
    }
  ]

  // Get statistics based on registrationStatus and checkedIn fields per OpenAPI
  const stats = {
    total: attendees.length,
    registered: attendees.filter((a) => a.registrationStatus === 'registered').length,
    waitlisted: attendees.filter((a) => a.registrationStatus === 'waitlisted').length,
    checkedIn: attendees.filter((a) => a.checkedIn === true).length
  }

  const selectedEvent = events.find((e) => e.eventId === selectedEventId)

  return (
    <View width="100%">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-300">
        <Heading level={1}>Event Registrations</Heading>
      </Flex>

      {/* Event Selector */}
      <Flex direction="row" gap="size-300" marginBottom="size-300" alignItems="end">
        <View flex>
          <Picker
            label="Select Event"
            selectedKey={selectedEventId}
            onSelectionChange={(key) => setSelectedEventId(String(key))}
            width="100%"
          >
            {events.map((event) => (
              <Item key={event.eventId}>
                {event.enTitle || event.eventId} - {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'No date'}
              </Item>
            ))}
          </Picker>
        </View>
        <Button
          variant="secondary"
          onPress={handleExportData}
          isDisabled={attendees.length === 0}
        >
          <Download />
          <Text>Export CSV</Text>
        </Button>
      </Flex>

      {/* Statistics */}
      {selectedEvent && (
        <View
          backgroundColor="gray-100"
          padding="size-300"
          borderRadius="medium"
          marginBottom="size-300"
        >
          <Heading level={3} marginBottom="size-200">
            Event Details
          </Heading>
          <Flex direction="column" gap="size-100">
            <Text>
              <strong>Event:</strong> {selectedEvent.enTitle || selectedEvent.eventId}
            </Text>
            <Text>
              <strong>Date:</strong>{' '}
              {selectedEvent.startDate ? new Date(selectedEvent.startDate).toLocaleString() : 'No date set'}
            </Text>
            {selectedEvent.attendeeLimit && (
              <Text>
                <strong>Capacity:</strong> {stats.total} / {selectedEvent.attendeeLimit}
              </Text>
            )}
          </Flex>

          <Heading level={4} marginTop="size-200" marginBottom="size-200">
            Registration Statistics
          </Heading>
          <Flex direction="row" gap="size-400" wrap>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Total:</strong> {stats.total}
              </Text>
            </Flex>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Registered:</strong> {stats.registered}
              </Text>
            </Flex>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Waitlisted:</strong> {stats.waitlisted}
              </Text>
            </Flex>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Checked In:</strong> {stats.checkedIn}
              </Text>
            </Flex>
          </Flex>
        </View>
      )}

      {/* Attendees Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading attendees..." />
      ) : (
        <DataTable
          columns={columns}
          data={attendees}
          actions={actions}
          getItemKey={(item) => item.attendeeId}
          emptyState={
            <Content>
              {selectedEventId
                ? 'No attendees found for this event.'
                : 'Please select an event to view attendees.'}
            </Content>
          }
        />
      )}

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
                handleDeleteAttendee(itemToDelete)
              }
              close()
            }}
            onSecondaryAction={close}
          >
            Are you sure you want to remove this attendee? This action cannot be undone.
          </AlertDialog>
        )}
      </DialogTrigger>
    </View>
  )
}
