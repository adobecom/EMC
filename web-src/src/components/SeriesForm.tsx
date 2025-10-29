/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Heading,
  Form,
  TextField,
  TextArea,
  Picker,
  Item,
  DatePicker,
  ButtonGroup,
  Button,
  Divider,
  Flex,
  StatusLight
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import { SeriesFormData, Organization } from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'
import { LoadingSpinner } from './shared'
import { parseDate } from '@internationalized/date'

interface SeriesFormProps {
  ims: IMS
}

export const SeriesForm: React.FC<SeriesFormProps> = ({ ims }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const [formData, setFormData] = useState<SeriesFormData>({
    name: '',
    description: '',
    organizationId: '',
    startDate: '',
    endDate: '',
    status: 'draft'
  })

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadOrganizations()
    if (isEditMode && id) {
      loadSeries(id)
    }
  }, [id])

  const loadOrganizations = async () => {
    try {
      apiService.setAuthHeaders(ims.token, ims.org)
      const response = await apiService.getOrganizations()
      if (response.success && response.data) {
        setOrganizations(response.data)
        if (!isEditMode && response.data.length > 0) {
          setFormData((prev) => ({ ...prev, organizationId: response.data[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err)
    }
  }

  const loadSeries = async (seriesId: string) => {
    setIsLoading(true)
    try {
      const response = await apiService.getSeriesById(seriesId)
      if (response.success && response.data) {
        const series = response.data
        setFormData({
          name: series.name,
          description: series.description,
          organizationId: series.organizationId,
          startDate: series.startDate,
          endDate: series.endDate,
          status: series.status,
          metadata: series.metadata
        })
      }
    } catch (err) {
      console.error('Failed to load series:', err)
      setError('Failed to load series data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (isEditMode && id) {
        await apiService.updateSeries(id, formData)
      } else {
        await apiService.createSeries(formData)
      }
      setSuccess(true)
      setTimeout(() => {
        navigate('/resources')
      }, 1500)
    } catch (err) {
      console.error('Failed to save series:', err)
      setError(err instanceof Error ? err.message : 'Failed to save series')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/resources')
  }

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.organizationId !== '' &&
      formData.startDate !== '' &&
      formData.endDate !== ''
    )
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading series data..." />
  }

  return (
    <View width="size-6000">
      <Heading level={1} marginBottom="size-300">
        {isEditMode ? 'Edit Series' : 'Create New Series'}
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
            Series {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
          </StatusLight>
        </View>
      )}

      <Form onSubmit={handleSubmit}>
        <TextField
          label="Series Name"
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

        <DatePicker
          label="Start Date"
          isRequired
          value={formData.startDate ? parseDate(formData.startDate) : null}
          onChange={(date) =>
            setFormData({ ...formData, startDate: date?.toString() || '' })
          }
        />

        <DatePicker
          label="End Date"
          isRequired
          value={formData.endDate ? parseDate(formData.endDate) : null}
          onChange={(date) =>
            setFormData({ ...formData, endDate: date?.toString() || '' })
          }
        />

        <Picker
          label="Status"
          isRequired
          selectedKey={formData.status}
          onSelectionChange={(key) =>
            setFormData({ ...formData, status: key as SeriesFormData['status'] })
          }
        >
          <Item key="draft">Draft</Item>
          <Item key="active">Active</Item>
          <Item key="completed">Completed</Item>
          <Item key="archived">Archived</Item>
        </Picker>

        <Divider size="M" marginTop="size-400" marginBottom="size-300" />

        <Flex justifyContent="end" gap="size-200">
          <ButtonGroup>
            <Button variant="secondary" onPress={handleCancel} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="cta"
              type="submit"
              isDisabled={!isFormValid() || isSaving}
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Update Series' : 'Create Series'}
            </Button>
          </ButtonGroup>
        </Flex>
      </Form>
    </View>
  )
}

