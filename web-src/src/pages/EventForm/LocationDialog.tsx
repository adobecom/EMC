/*
 * <license header>
 */

import React, { useState, useCallback } from 'react'
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
import { TYPOGRAPHY } from '../../styles/designSystem'
import { apiService } from '../../services/api'

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

interface LocationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (location: VenueLocation) => void
  /** When provided, locations are created via API. When absent, locations are added locally (pending save). */
  venueId?: string | null
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

// ============================================================================
// COMPONENT
// ============================================================================

export const LocationDialog: React.FC<LocationDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  venueId,
}) => {
  const [createForm, setCreateForm] = useState<CreateFormState>(initialFormState)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setCreateForm(initialFormState)
    setIsCreating(false)
    setCreateError(null)
  }, [])

  const updateField = useCallback(<K extends keyof CreateFormState>(field: K, value: CreateFormState[K]) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      const payload: Record<string, any> = {
        name: createForm.name.trim(),
        locationType: createForm.locationType,
      }
      if (createForm.locationCode.trim()) payload.locationCode = createForm.locationCode.trim()
      if (createForm.capacity) {
        const n = parseInt(createForm.capacity, 10)
        if (!isNaN(n) && n > 0) payload.capacity = n
      }

      if (venueId) {
        // Venue exists — create location via API
        const res = await apiService.createVenueLocation(venueId, payload)
        if (res && !('error' in res)) {
          const created: VenueLocation = res.location ?? res
          onSelect(created)
          resetForm()
          onClose()
        } else {
          setCreateError((res as any)?.error?.message || 'Failed to create location')
        }
      } else {
        // Venue not yet saved — add location locally (will be created on save)
        const pending: VenueLocation = {
          locationId: `pending-${Date.now()}`,
          name: createForm.name.trim(),
          locationType: createForm.locationType,
          locationCode: createForm.locationCode.trim() || undefined,
          capacity: payload.capacity,
        }
        onSelect(pending)
        resetForm()
        onClose()
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setIsCreating(false)
    }
  }, [createForm, venueId, onSelect, onClose, resetForm])

  return (
    <DialogContainer onDismiss={() => { resetForm(); onClose() }}>
      {isOpen && (
        <Dialog isDismissible>
          {() => (
            <>
              <Heading slot="title">
                Add location in the venue
              </Heading>
              <Content>
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
                      <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)', fontSize: '14px' }}>
                        {createError}
                      </Text>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                      <Button variant="secondary" onPress={() => { resetForm(); onClose() }} isDisabled={isCreating}>
                        <Text>Cancel</Text>
                      </Button>
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
              </Content>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  )
}

export default LocationDialog
