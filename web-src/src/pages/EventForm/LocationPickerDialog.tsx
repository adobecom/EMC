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
  View,
  Flex,
  Text,
  ActionButton,
  ProgressCircle,
  Form,
  ActionGroup,
  Item,
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import ArrowLeft from '@spectrum-icons/workflow/ArrowLeft'
import { TYPOGRAPHY, FLEX_GAP, COLORS } from '../../styles/designSystem'
// import { apiService } from '../../services/api' // TODO: Re-enable once location APIs are ready

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
    // try {
    //   const res = await apiService.listVenueLocations(venueId)
    //   if (res && !('error' in res)) {
    //     const list = res.locations ?? res ?? []
    //     setLocations(Array.isArray(list) ? list : [])
    //   }
    // } catch (err) {
    //   console.error('Failed to load venue locations:', err)
    // } finally {
    //   setIsLoading(false)
    // }
    setLocations([])
    setIsLoading(false)
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

  const handleSwitchToCreate = useCallback(() => {
    setView('create')
    setCreateForm(initialFormState)
    setCreateError(null)
  }, [])

  const handleBackToList = useCallback(() => {
    setView('list')
  }, [])

  const updateField = useCallback(<K extends keyof CreateFormState>(field: K, value: CreateFormState[K]) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      // TODO: Re-enable once location APIs are ready.
      // const payload: Record<string, any> = {
      //   name: createForm.name.trim(),
      //   locationType: createForm.locationType,
      // }
      // if (createForm.locationCode.trim()) payload.locationCode = createForm.locationCode.trim()
      // if (createForm.capacity) {
      //   const n = parseInt(createForm.capacity, 10)
      //   if (!isNaN(n) && n > 0) payload.capacity = n
      // }
      // const res = await apiService.createVenueLocation(venueId, payload)
      // if (res && !('error' in res)) {
      //   const created: VenueLocation = res.location ?? res
      //   onSelect(created)
      //   onClose()
      // } else {
      //   setCreateError((res as any)?.error?.message || 'Failed to create location')
      // }

      // Dummy: simulate a created location
      const dummy: VenueLocation = {
        locationId: `dummy-${Date.now()}`,
        name: createForm.name.trim(),
        locationType: createForm.locationType,
        locationCode: createForm.locationCode.trim() || undefined,
        capacity: createForm.capacity ? parseInt(createForm.capacity, 10) || undefined : undefined,
      }
      onSelect(dummy)
      onClose()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create location')
    } finally {
      setIsCreating(false)
    }
  }, [createForm, venueId, onSelect, onClose])

  // ============================================================================
  // RENDER — List View
  // ============================================================================

  const renderListView = () => (
    <>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
        <Heading level={3} UNSAFE_style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
          Select Location
        </Heading>
        <Flex gap="size-100" alignItems="center">
          <ActionButton onPress={handleSwitchToCreate} aria-label="Create new location">
            <Add />
          </ActionButton>
          <Button
            variant="accent"
            onPress={handleSelectConfirm}
            isDisabled={!selectedLocationId}
          >
            <Text>Select</Text>
          </Button>
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex justifyContent="center" padding="size-400">
          <ProgressCircle isIndeterminate aria-label="Loading locations" />
        </Flex>
      ) : locations.length === 0 ? (
        <View padding="size-400" UNSAFE_style={{ textAlign: 'center' }}>
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            No locations have been added to this venue yet. Create one to get started.
          </Text>
        </View>
      ) : (
        <Flex
          direction="column"
          gap="size-100"
          UNSAFE_style={{ maxHeight: '400px', overflowY: 'auto', padding: '4px' }}
        >
          {locations.map(loc => {
            const isSelected = selectedLocationId === loc.locationId
            return (
              <div
                key={loc.locationId}
                onClick={() => setSelectedLocationId(loc.locationId)}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedLocationId(loc.locationId)
                  }
                }}
                style={{
                  padding: '12px 16px',
                  border: isSelected
                    ? '2px solid var(--spectrum-global-color-blue-500)'
                    : '1px solid var(--spectrum-global-color-gray-300)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'var(--spectrum-global-color-blue-100)'
                    : 'var(--spectrum-global-color-gray-50)',
                  outline: 'none',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {loc.name}
                </div>
                <Flex direction="row" gap="size-150" alignItems="center">
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--spectrum-global-color-gray-200)',
                    color: 'var(--spectrum-global-color-gray-700)',
                    fontWeight: 500,
                  }}>
                    {LOCATION_TYPE_LABEL[loc.locationType] ?? loc.locationType}
                  </span>
                  {loc.locationCode && (
                    <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      Code: {loc.locationCode}
                    </Text>
                  )}
                  {loc.capacity != null && (
                    <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      Capacity: {loc.capacity}
                    </Text>
                  )}
                </Flex>
              </div>
            )
          })}
        </Flex>
      )}
    </>
  )

  // ============================================================================
  // RENDER — Create View
  // ============================================================================

  const renderCreateView = () => (
    <>
      <Flex alignItems="center" gap="size-100" marginBottom="size-200">
        {/* <ActionButton onPress={handleBackToList} isQuiet aria-label="Back to list">
          <ArrowLeft />
        </ActionButton> */}
        <Heading level={3} UNSAFE_style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
          New Location
        </Heading>
      </Flex>

      <Form>
        <Flex direction="column" gap={FLEX_GAP.SECTION}>
          <TextField
            label="Location Name"
            value={createForm.name}
            onChange={(v) => updateField('name', v)}
            isRequired
            width="100%"
          />

          <Flex direction="column" gap="size-100">
            <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>
              Location Type <span style={{ color: COLORS.ADOBE_RED }}>*</span>
            </Text>
            <ActionGroup
              selectionMode="single"
              selectedKeys={[createForm.locationType]}
              onAction={(key) => updateField('locationType', key as CreateFormState['locationType'])}
            >
              <Item key="physical">Physical</Item>
              <Item key="virtual">Virtual</Item>
              <Item key="hybrid">Hybrid</Item>
            </ActionGroup>
          </Flex>

          <TextField
            label="Location Code"
            value={createForm.locationCode}
            onChange={(v) => updateField('locationCode', v)}
            width="100%"
            description="Optional identifier code for this location"
          />

          <TextField
            label="Capacity"
            value={createForm.capacity}
            onChange={(v) => updateField('capacity', v)}
            type="number"
            width="100%"
            description="Optional maximum number of attendees"
          />

          {createError && (
            <Text UNSAFE_style={{ color: COLORS.ADOBE_RED, fontSize: '14px' }}>
              {createError}
            </Text>
          )}

          <Flex justifyContent="end" marginTop="size-200">
            <Button
              variant="accent"
              onPress={handleCreate}
              isDisabled={!createForm.name.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <ProgressCircle size="S" isIndeterminate aria-label="Creating" />
                  <Text>Creating...</Text>
                </>
              ) : (
                <Text>Add Location</Text>
              )}
            </Button>
          </Flex>
        </Flex>
      </Form>
    </>
  )

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="M" isDismissable UNSAFE_style={{ maxHeight: '80vh' }}>
          <Content UNSAFE_style={{ overflow: 'auto' }}>
            {renderCreateView()}
            {/* {view === 'list' ? renderListView() : renderCreateView()} */}
          </Content>
        </Dialog>
      )}
    </DialogContainer>
  )
}

export default LocationPickerDialog
