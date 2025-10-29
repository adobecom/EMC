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
  Divider,
  Button,
  Content,
  Text,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import Download from '@spectrum-icons/workflow/Download'
import { useParams } from 'react-router-dom'
import { Registration, Event } from '../types/domain'
import { DataTable, TableColumn, TableAction, LoadingSpinner, StatusBadge } from './shared'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface RegistrationDashboardProps {
  ims: IMS
}

export const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({ ims }) => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(paramEventId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEventId) {
      loadRegistrations(selectedEventId)
    }
  }, [selectedEventId])

  const loadEvents = async () => {
    try {
      apiService.setAuthHeaders(ims.token, ims.org)
      const response = await apiService.getEvents()
      if (response.success && response.data) {
        setEvents(response.data)
        // If no event selected and we have events, select the first one
        if (!selectedEventId && response.data.length > 0) {
          setSelectedEventId(response.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }

  const loadRegistrations = async (eventId: string) => {
    setIsLoading(true)
    try {
      const response = await apiService.getRegistrations(eventId)
      if (response.success && response.data) {
        setRegistrations(response.data)
      }
    } catch (error) {
      console.error('Failed to load registrations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRegistration = async (id: string) => {
    try {
      await apiService.deleteRegistration(id)
      setItemToDelete(null)
      if (selectedEventId) {
        loadRegistrations(selectedEventId)
      }
    } catch (error) {
      console.error('Failed to delete registration:', error)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: Registration['status']) => {
    try {
      await apiService.updateRegistration(id, { status: newStatus })
      if (selectedEventId) {
        loadRegistrations(selectedEventId)
      }
    } catch (error) {
      console.error('Failed to update registration status:', error)
    }
  }

  const handleExportData = () => {
    // Convert registrations to CSV format
    const headers = [
      'Registration ID',
      'Attendee Name',
      'Attendee Email',
      'Phone',
      'Status',
      'Registration Date'
    ]
    const csvRows = [headers.join(',')]

    registrations.forEach((reg) => {
      const row = [
        reg.id,
        reg.attendeeName,
        reg.attendeeEmail,
        reg.attendeePhone || '',
        reg.status,
        new Date(reg.registrationDate).toLocaleString()
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `registrations-${selectedEventId}-${Date.now()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const columns: TableColumn<Registration>[] = [
    { key: 'attendeeName', name: 'Attendee Name', width: 200 },
    { key: 'attendeeEmail', name: 'Email', width: 250 },
    { key: 'attendeePhone', name: 'Phone', width: 150 },
    {
      key: 'status',
      name: 'Status',
      width: 120,
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: 'registrationDate',
      name: 'Registration Date',
      width: 180,
      render: (item) => new Date(item.registrationDate).toLocaleString()
    }
  ]

  const actions: TableAction<Registration>[] = [
    {
      icon: 'edit',
      label: 'Update Status',
      onAction: (item) => {
        // Cycle through statuses
        const statuses: Registration['status'][] = ['pending', 'confirmed', 'attended', 'cancelled']
        const currentIndex = statuses.indexOf(item.status)
        const nextStatus = statuses[(currentIndex + 1) % statuses.length]
        handleUpdateStatus(item.id, nextStatus)
      }
    },
    {
      icon: 'delete',
      label: 'Delete',
      onAction: (item) => setItemToDelete(item.id)
    }
  ]

  // Get statistics
  const stats = {
    total: registrations.length,
    confirmed: registrations.filter((r) => r.status === 'confirmed').length,
    pending: registrations.filter((r) => r.status === 'pending').length,
    attended: registrations.filter((r) => r.status === 'attended').length,
    cancelled: registrations.filter((r) => r.status === 'cancelled').length
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <View width="100%">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-300">
        <Heading level={1}>Event Registrations</Heading>
      </Flex>

      <Divider size="M" marginBottom="size-400" />

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
              <Item key={event.id}>
                {event.name} - {new Date(event.startDateTime).toLocaleDateString()}
              </Item>
            ))}
          </Picker>
        </View>
        <Button
          variant="secondary"
          onPress={handleExportData}
          isDisabled={registrations.length === 0}
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
              <strong>Event:</strong> {selectedEvent.name}
            </Text>
            <Text>
              <strong>Date:</strong>{' '}
              {new Date(selectedEvent.startDateTime).toLocaleString()}
            </Text>
            {selectedEvent.capacity && (
              <Text>
                <strong>Capacity:</strong> {stats.total} / {selectedEvent.capacity}
              </Text>
            )}
          </Flex>

          <Divider size="S" marginTop="size-200" marginBottom="size-200" />

          <Heading level={4} marginBottom="size-200">
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
                <strong>Confirmed:</strong> {stats.confirmed}
              </Text>
            </Flex>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Pending:</strong> {stats.pending}
              </Text>
            </Flex>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Attended:</strong> {stats.attended}
              </Text>
            </Flex>
            <Flex direction="column" gap="size-50">
              <Text>
                <strong>Cancelled:</strong> {stats.cancelled}
              </Text>
            </Flex>
          </Flex>
        </View>
      )}

      {/* Registrations Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading registrations..." />
      ) : (
        <DataTable
          columns={columns}
          data={registrations}
          actions={actions}
          getItemKey={(item) => item.id}
          emptyState={
            <Content>
              {selectedEventId
                ? 'No registrations found for this event.'
                : 'Please select an event to view registrations.'}
            </Content>
          }
        />
      )}

      {/* Delete confirmation dialog */}
      <DialogTrigger
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
      >
        <Button variant="primary" />
        {(close) => (
          <AlertDialog
            title="Confirm Delete"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (itemToDelete) {
                handleDeleteRegistration(itemToDelete)
              }
              close()
            }}
            onSecondaryAction={close}
          >
            Are you sure you want to delete this registration? This action cannot be undone.
          </AlertDialog>
        )}
      </DialogTrigger>
    </View>
  )
}

