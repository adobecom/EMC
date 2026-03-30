/*
 * <license header>
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContainer,
  Heading,
  Content,
  TextField,
  Button,
  Text,
  ProgressCircle,
  Form,
  SegmentedControl,
  SegmentedControlItem,
} from '@react-spectrum/s2'
import { TYPOGRAPHY, COLORS } from '../../styles/designSystem'
import { apiService } from '../../services/api' // TODO: Re-enable once location APIs are ready

// ============================================================================
// TYPES
// ============================================================================

export interface VenueLocation {
  locationId: string
  name: string
  locationType: 'physical' | 'virtual' | 'hybrid'
  locationCode?: string
  capacity?: number
  creationTime?: number
  modificationTime?: number
}

interface LocationPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (location: VenueLocation) => void
  venueId: string
}

interface CreateFormState {
  name: string
  locationType: 'physical' | 'virtual' | 'hybrid'
  locationCode: string
  capacity: string
}

const initialFormState: CreateFormState = {
  name: '',
  locationType: 'physical',
  locationCode: '',
  capacity: '',
}

const LOCATION_TYPE_LABEL: Record<string, string> = {
  physical: 'Physical',
  virtual: 'Virtual',
  hybrid: 'Hybrid',
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LocationPickerDialog: React.FC<LocationPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  venueId,
}) => {
  const [view, setView] = useState<'list' | 'create'>('list')
  const [locations, setLocations] = useState<VenueLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialFormState)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadLocations = useCallback(async () => {
    if (!venueId) return
    setIsLoading(true)
    // TODO: Re-enable once location APIs are ready.
    try {
      const res = await apiService.listVenueLocations(venueId)
      if (res && !('error' in res)) {
        const list = res.locations ?? res ?? []
        setLocations(Array.isArray(list) ? list : [])
      }
    } catch (err) {
      console.error('Failed to load venue locations:', err)
    } finally {
      setIsLoading(false)
    }
    // setLocations([])
    // setIsLoading(false)
  }, [venueId])

  useEffect(() => {
    if (isOpen) {
      setView('list')
      setSelectedLocationId(null)
      setCreateForm(initialFormState)
      setIsCreating(false)
      setCreateError(null)
      loadLocations()
    }
  }, [isOpen, loadLocations])

  const handleSelectConfirm = useCallback(() => {
    if (!selectedLocationId) return
    const location = locations.find(l => l.locationId === selectedLocationId)
    if (!location) return
    onSelect(location)
    onClose()
  }, [selectedLocationId, locations, onSelect, onClose])

  const updateField = useCallback(<K extends keyof CreateFormState>(field: K, value: CreateFormState[K]) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      // TODO: Re-enable once location APIs are ready.
      const payload: Record<string, any> = {
        name: createForm.name.trim(),
        locationType: createForm.locationType,
      }
      if (createForm.locationCode.trim()) payload.locationCode = createForm.locationCode.trim()
      if (createForm.capacity) {
        const n = parseInt(createForm.capacity, 10)
        if (!isNaN(n) && n > 0) payload.capacity = n
      }
      const res = await apiService.createVenueLocation(venueId, payload)
      if (res && !('error' in res)) {
        const created: VenueLocation = res.location ?? res
        onSelect(created)
        onClose()
      } else {
        setCreateError((res as any)?.error?.message || 'Failed to create location')
      }

      // Dummy: simulate a created location
      // const dummy: VenueLocation = {
      //   locationId: `dummy-${Date.now()}`,
      //   name: createForm.name.trim(),
      //   locationType: createForm.locationType,
      //   locationCode: createForm.locationCode.trim() || undefined,
      //   capacity: createForm.capacity ? parseInt(createForm.capacity, 10) || undefined : undefined,
      // }
      // onSelect(dummy)
      // onClose()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setIsCreating(false)
    }
  }, [createForm, venueId, onSelect, onClose])

  // ============================================================================
  // RENDER — Create View
  // ============================================================================

  const renderCreateView = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Heading level={3} UNSAFE_style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
          New Location
        </Heading>
      </div>

      <Form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TextField
            label="Location Name"
            value={createForm.name}
            onChange={(v) => updateField('name', v)}
            isRequired
            UNSAFE_style={{ width: '100%' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>
              Location Type *
            </Text>
            <SegmentedControl
              selectedKey={createForm.locationType}
              onSelectionChange={(key) => updateField('locationType', key as CreateFormState['locationType'])}
            >
              <SegmentedControlItem id="physical">Physical</SegmentedControlItem>
              <SegmentedControlItem id="virtual">Virtual</SegmentedControlItem>
              <SegmentedControlItem id="hybrid">Hybrid</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <TextField
            label="Location Code"
            value={createForm.locationCode}
            onChange={(v) => updateField('locationCode', v)}
            UNSAFE_style={{ width: '100%' }}
            description="Optional identifier code for this location"
          />

          <TextField
            label="Capacity"
            value={createForm.capacity}
            onChange={(v) => updateField('capacity', v)}
            type="number"
            UNSAFE_style={{ width: '100%' }}
            description="Optional maximum number of attendees"
          />

          {createError && (
            <Text UNSAFE_style={{ color: COLORS.ADOBE_RED, fontSize: '14px' }}>
              {createError}
            </Text>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button
              variant="accent"
              onPress={handleCreate}
              isDisabled={!createForm.name.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <ProgressCircle isIndeterminate aria-label="Creating" />
                  <Text>Creating...</Text>
                </>
              ) : (
                <Text>Add Location</Text>
              )}
            </Button>
          </div>
        </div>
      </Form>
    </>
  )

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog isDismissible>
          {() => (
            <>
              <Heading slot="title">
               New Location
              </Heading>
              <Content>
                <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
                  {renderCreateView()}
                </div>
              </Content>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  )
}

export default LocationPickerDialog
