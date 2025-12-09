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
  Flex,
  StatusLight
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import { SeriesFormData, SeriesApiResponse } from '../types/domain'
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

  // Store the full series response for updates (needed for modificationTime)
  const [existingSeriesData, setExistingSeriesData] = useState<SeriesApiResponse | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isEditMode && id) {
      loadSeries(id)
    }
  }, [id])

  const loadSeries = async (seriesId: string) => {
    setIsLoading(true)
    try {
      // Use external API
      const response = await apiService.getSeriesByIdExternal(seriesId)
      
      if ('error' in response) {
        setError('Failed to load series data')
        return
      }
      
      // Store full response for later updates
      setExistingSeriesData(response as SeriesApiResponse)
      
      const series = response as SeriesApiResponse
      setFormData({
        name: series.seriesName || '',
        description: series.seriesDescription || '',
        organizationId: series.organizationId || '',
        startDate: series.startDate || '',
        endDate: series.endDate || '',
        status: series.seriesStatus || 'draft',
        metadata: series.metadata
      })
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
      // Build payload for external API
      const payload: any = {
        seriesName: formData.name,
        seriesDescription: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        seriesStatus: formData.status,
        ...(formData.organizationId && { organizationId: formData.organizationId }),
        ...(formData.metadata && { metadata: formData.metadata })
      }

      if (isEditMode && id && existingSeriesData) {
        // Include modificationTime for optimistic locking
        payload.modificationTime = existingSeriesData.modificationTime
        const result = await apiService.updateSeriesExternal(id, payload)
        
        if ('error' in result) {
          throw new Error(result.error?.message || 'Failed to update series')
        }
      } else {
        const result = await apiService.createSeriesExternal(payload)
        
        if ('error' in result) {
          throw new Error(result.error?.message || 'Failed to create series')
        }
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
          <Item key="published">Published</Item>
          <Item key="archived">Archived</Item>
        </Picker>

        <Flex justifyContent="end" gap="size-200" marginTop="size-300">
          <ButtonGroup>
            <Button variant="secondary" onPress={handleCancel} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="accent"
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
