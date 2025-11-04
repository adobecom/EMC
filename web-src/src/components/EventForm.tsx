/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  TextArea,
  Picker,
  Item,
  DatePicker,
  NumberField,
  Switch,
  StatusLight,
  Heading,
  Divider
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import { EventFormData, Series, Organization } from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'
import { FormWizard, WizardStep, LoadingSpinner } from './shared'
import { parseDateTime } from '@internationalized/date'

interface EventFormProps {
  ims: IMS
}

export const EventForm: React.FC<EventFormProps> = ({ ims }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    seriesId: '',
    organizationId: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    capacity: undefined,
    status: 'draft',
    registrationOpen: false
  })

  const [series, setSeries] = useState<Series[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadData()
    if (isEditMode && id) {
      loadEvent(id)
    }
  }, [id])

  const loadData = async () => {
    try {
      // Check if IMS data is available
      if (!ims.token || !ims.org) {
        console.warn('IMS authentication not available yet')
        return
      }

      apiService.setAuthHeaders(ims.token, ims.org)
      const [seriesResponse, orgsResponse] = await Promise.all([
        apiService.getSeries(),
        apiService.getOrganizations()
      ])

      if (seriesResponse.success && seriesResponse.data) {
        setSeries(seriesResponse.data)
        if (!isEditMode && seriesResponse.data.length > 0) {
          setFormData((prev) => ({ ...prev, seriesId: seriesResponse.data[0].id }))
        }
      }

      if (orgsResponse.success && orgsResponse.data) {
        setOrganizations(orgsResponse.data)
        if (!isEditMode && orgsResponse.data.length > 0) {
          setFormData((prev) => ({ ...prev, organizationId: orgsResponse.data[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  const loadEvent = async (eventId: string) => {
    setIsLoading(true)
    try {
      const response = await apiService.getEvent(eventId)
      if (response.success && response.data) {
        const event = response.data
        setFormData({
          name: event.name,
          description: event.description,
          seriesId: event.seriesId,
          organizationId: event.organizationId,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          location: event.location,
          capacity: event.capacity,
          status: event.status,
          registrationOpen: event.registrationOpen,
          metadata: event.metadata
        })
      }
    } catch (err) {
      console.error('Failed to load event:', err)
      setError('Failed to load event data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (isEditMode && id) {
        await apiService.updateEvent(id, formData)
      } else {
        await apiService.createEvent(formData)
      }
      setSuccess(true)
      setTimeout(() => {
        navigate('/resources')
      }, 1500)
    } catch (err) {
      console.error('Failed to save event:', err)
      setError(err instanceof Error ? err.message : 'Failed to save event')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/resources')
  }

  // Step 1: Basic Information
  const step1IsValid =
    formData.name.trim() !== '' &&
    formData.seriesId !== '' &&
    formData.organizationId !== ''

  const basicInfoStep = (
    <View>
      <TextField
        label="Event Name"
        isRequired
        value={formData.name}
        onChange={(value) => setFormData({ ...formData, name: value })}
        autoFocus
      />

      <TextArea
        label="Description"
        value={formData.description || ''}
        onChange={(value) => setFormData({ ...formData, description: value })}
        height="size-1000"
      />

      <Picker
        label="Series"
        isRequired
        selectedKey={formData.seriesId}
        onSelectionChange={(key) => setFormData({ ...formData, seriesId: String(key) })}
      >
        {series.map((s) => (
          <Item key={s.id}>{s.name}</Item>
        ))}
      </Picker>

      <Picker
        label="Organization"
        isRequired
        selectedKey={formData.organizationId}
        onSelectionChange={(key) =>
          setFormData({ ...formData, organizationId: String(key) })
        }
      >
        {organizations.map((org) => (
          <Item key={org.id}>{org.name}</Item>
        ))}
      </Picker>
    </View>
  )

  // Step 2: Date, Time & Location
  const step2IsValid =
    formData.startDateTime !== '' && formData.endDateTime !== ''

  const dateTimeStep = (
    <View>
      <DatePicker
        label="Start Date & Time"
        isRequired
        granularity="minute"
        value={formData.startDateTime ? parseDateTime(formData.startDateTime) : null}
        onChange={(date) =>
          setFormData({ ...formData, startDateTime: date?.toString() || '' })
        }
      />

      <DatePicker
        label="End Date & Time"
        isRequired
        granularity="minute"
        value={formData.endDateTime ? parseDateTime(formData.endDateTime) : null}
        onChange={(date) =>
          setFormData({ ...formData, endDateTime: date?.toString() || '' })
        }
      />

      <TextField
        label="Location"
        value={formData.location || ''}
        onChange={(value) => setFormData({ ...formData, location: value })}
      />
    </View>
  )

  // Step 3: Capacity & Registration
  const capacityStep = (
    <View>
      <NumberField
        label="Capacity"
        value={formData.capacity || 0}
        onChange={(value) => setFormData({ ...formData, capacity: value })}
        minValue={0}
      />

      <Switch
        isSelected={formData.registrationOpen}
        onChange={(value) => setFormData({ ...formData, registrationOpen: value })}
      >
        Registration Open
      </Switch>

      <Picker
        label="Status"
        isRequired
        selectedKey={formData.status}
        onSelectionChange={(key) =>
          setFormData({ ...formData, status: key as EventFormData['status'] })
        }
      >
        <Item key="draft">Draft</Item>
        <Item key="published">Published</Item>
        <Item key="ongoing">Ongoing</Item>
        <Item key="completed">Completed</Item>
        <Item key="cancelled">Cancelled</Item>
      </Picker>
    </View>
  )

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Enter the event name and select the series and organization',
      component: basicInfoStep,
      isValid: step1IsValid
    },
    {
      id: 'datetime',
      title: 'Date, Time & Location',
      description: 'Set the event schedule and location',
      component: dateTimeStep,
      isValid: step2IsValid
    },
    {
      id: 'capacity',
      title: 'Capacity & Registration',
      description: 'Configure event capacity and registration settings',
      component: capacityStep,
      isValid: true
    }
  ]

  if (isLoading) {
    return <LoadingSpinner message="Loading event data..." />
  }

  return (
    <View width="size-6000">
      <Heading level={1} marginBottom="size-300">
        {isEditMode ? 'Edit Event' : 'Create New Event'}
      </Heading>

      <Divider size="M" marginBottom="size-400" />

      {error && (
        <View marginBottom="size-300">
          <StatusLight variant="negative">Error: {error}</StatusLight>
        </View>
      )}

      {success && (
        <View marginBottom="size-300">
          <StatusLight variant="positive">
            Event {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
          </StatusLight>
        </View>
      )}

      <FormWizard
        steps={steps}
        onComplete={handleComplete}
        onCancel={handleCancel}
        isSubmitting={isSaving}
      />
    </View>
  )
}

