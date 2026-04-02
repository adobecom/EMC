/* 
* <license header>
*/

/**
 * SpeakersDashboard - Speakers Hub for managing series speakers
 * 
 * This component provides a centralized view for managing speakers at the series level.
 * Key features:
 * - Series selector to switch between series
 * - Full CRUD operations for speakers (Create, Read, Update, Delete)
 * - Visual indicators showing speaker connections to events
 * - Cascade dialogs for update/delete operations that affect linked events
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  ActionButton,
  ActionMenu,
  MenuItem,
  Badge,
  Button,
  ComboBox,
  ComboBoxItem,
  Text,
  DialogTrigger,
  AlertDialog,
  ProgressCircle,
  Tooltip,
  TooltipTrigger,
} from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Edit from '@react-spectrum/s2/icons/Edit'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import RotateCCW from '@react-spectrum/s2/icons/RotateCCW'
import Add from '@react-spectrum/s2/icons/Add'
import Link from '@react-spectrum/s2/icons/Link'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout, BlurredLoadingOverlay, ResourceEmptyState } from '../../components/shared'
import MicrophoneIllustration from '@react-spectrum/s2/illustrations/linear/Microphone'
import LayersIllustration from '@react-spectrum/s2/illustrations/linear/Layers'
import { SeriesSpeaker, SeriesApiResponse, EventApiResponse } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { IMS } from '../../types'
import { useToast, useGroup } from '../../contexts'
import { createShimmerStyle, COLORS } from '../../styles/designSystem'
import { useSafeState, useRBACFilter } from '../../hooks'
import { useHasPermission } from '../../hooks/useHasPermission'
import { SpeakerFormDialog } from './SpeakerFormDialog'
import { CascadeConfirmDialog, CascadeAction } from './CascadeConfirmDialog'
import { SpeakerEventConnectionsDialog } from './SpeakerEventConnectionsDialog'

// Extended speaker type for dashboard display
export interface SpeakerDashboardItem extends SeriesSpeaker {
  eventCount?: number
  events?: EventApiResponse[]
  seriesName?: string
}

const SPEAKERS_SEARCH_KEYS = ['firstName', 'lastName', 'title']

const SPEAKERS_DASHBOARD_TABLE_TEST_IDS = {
  root: 'speakers-dashboard-table',
  emptyState: 'speakers-dashboard-table-empty-state',
  pageInput: 'speakers-dashboard-table-page-input',
  header: (columnKey: string) => `speakers-dashboard-table-header-${columnKey}`,
  row: (itemKey: string) => `speakers-dashboard-table-row-${itemKey}`,
}

interface SpeakersDashboardProps {
  ims: IMS
}

export const SpeakersDashboard: React.FC<SpeakersDashboardProps> = () => {
  const toast = useToast()
  const { groupVersion } = useGroup()
  const { filterSeries } = useRBACFilter()
  const canWriteEvent = useHasPermission('event', 'write')
  const canDeleteEvent = useHasPermission('event', 'delete')
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  // Series selection
  const [seriesList, setSeriesList] = useSafeState<SeriesApiResponse[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useSafeState<string | null>(null)
  const [isLoadingSeries, setIsLoadingSeries] = useSafeState(true)
  
  // Speakers data
  const [speakers, setSpeakers] = useSafeState<SpeakerDashboardItem[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useSafeState(false)
  const [error, setError] = useSafeState<string | null>(null)
  
  // Event connections loading
  const [loadingEventCounts, setLoadingEventCounts] = useSafeState<Set<string>>(new Set())
  const [eventConnections, setEventConnections] = useSafeState<Map<string, EventApiResponse[]>>(new Map())
  
  // Ref to track which speaker IDs we've already loaded (prevents infinite loop)
  const loadedSpeakerIdsRef = useRef<Set<string>>(new Set())
  
  // Action states
  const [actionInProgress, setActionInProgress] = useSafeState<string | null>(null)
  
  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useSafeState(false)
  const [editingSpeaker, setEditingSpeaker] = useSafeState<SpeakerDashboardItem | null>(null)
  const [speakerToDelete, setSpeakerToDelete] = useSafeState<SpeakerDashboardItem | null>(null)
  const [speakerForCascade, setSpeakerForCascade] = useSafeState<SpeakerDashboardItem | null>(null)
  const [cascadeAction, setCascadeAction] = useSafeState<CascadeAction | null>(null)
  const [speakerForConnections, setSpeakerForConnections] = useSafeState<SpeakerDashboardItem | null>(null)
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  // Load series list on mount
  useEffect(() => {
    const loadSeriesList = async () => {
      setIsLoadingSeries(true)
      try {
        const data = await cachedApi.getSeriesList()
        
        setSeriesList(filterSeries(data))
        
        // Auto-select first series if available
        if (data.length > 0 && !selectedSeriesId) {
          setSelectedSeriesId(data[0].seriesId)
        }
      } catch (err) {
        console.error('Error loading series:', err)
        toast.error('Failed to load series list')
      } finally {
        setIsLoadingSeries(false)
      }
    }

    loadSeriesList()
  }, [groupVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load speakers when series changes
  const loadSpeakers = useCallback(async () => {
    if (!selectedSeriesId) {
      setSpeakers([])
      return
    }
    
    setIsLoadingSpeakers(true)
    setError(null)
    
    try {
      const response = await cachedApi.getSpeakers(selectedSeriesId)
      
      if ('error' in response) {
        throw new Error(response.error)
      }
      
      const speakersData = response.speakers || response || []
      const selectedSeries = seriesList.find(s => s.seriesId === selectedSeriesId)
      
      // Map to dashboard items
      const dashboardItems: SpeakerDashboardItem[] = speakersData.map((speaker: SeriesSpeaker) => ({
        ...speaker,
        seriesName: selectedSeries?.seriesName
      }))
      
      setSpeakers(dashboardItems)
    } catch (err) {
      console.error('Error loading speakers:', err)
      setError('Failed to load speakers')
    } finally {
      setIsLoadingSpeakers(false)
    }
  }, [selectedSeriesId, seriesList])
  
  useEffect(() => {
    loadSpeakers()
  }, [loadSpeakers])
  
  // Load event connections for visible speakers
  // NOTE: Using ref to track loaded IDs to prevent infinite loop 
  // (callback recreating when eventConnections changes would cause infinite re-renders)
  const loadEventConnections = useCallback(async (speakerIds: string[]) => {
    if (!selectedSeriesId) return
    
    // Use ref to check which speakers we've already loaded (stable reference)
    const speakersToLoad = speakerIds.filter(id => !loadedSpeakerIdsRef.current.has(id))
    if (speakersToLoad.length === 0) return
    
    // Mark as loading immediately to prevent duplicate requests
    speakersToLoad.forEach(id => loadedSpeakerIdsRef.current.add(id))
    
    setLoadingEventCounts(prev => new Set([...prev, ...speakersToLoad]))
    
    try {
      // Fetch event connections for each speaker
      const results = await Promise.all(
        speakersToLoad.map(async (speakerId) => {
          try {
            const response = await cachedApi.getEventsBySpeakerId(speakerId)
            if (response && !('error' in response)) {
              const events = response.events || response || []
              return { speakerId, events: Array.isArray(events) ? events : [] }
            }
            return { speakerId, events: [] }
          } catch (_err) {
            return { speakerId, events: [] }
          }
        })
      )
      
      setEventConnections(prev => {
        const updated = new Map(prev)
        results.forEach(({ speakerId, events }) => {
          updated.set(speakerId, events)
        })
        return updated
      })
    } catch (err) {
      console.error('Error loading event connections:', err)
      // On error, remove from loaded set so it can be retried
      speakersToLoad.forEach(id => loadedSpeakerIdsRef.current.delete(id))
    } finally {
      setLoadingEventCounts(prev => {
        const updated = new Set(prev)
        speakersToLoad.forEach(id => updated.delete(id))
        return updated
      })
    }
  }, [selectedSeriesId]) // Removed eventConnections from deps - using ref instead
  
  // ============================================================================
  // COMPUTED DATA
  // ============================================================================
  
  const enrichedSpeakers = useMemo(() => {
    return speakers.map(speaker => ({
      ...speaker,
      events: eventConnections.get(speaker.speakerId) || [],
      eventCount: eventConnections.get(speaker.speakerId)?.length
    }))
  }, [speakers, eventConnections])
  
  const selectedSeries = useMemo(() => {
    return seriesList.find(s => s.seriesId === selectedSeriesId)
  }, [seriesList, selectedSeriesId])
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  
  const handleVisibleIdsChange = useCallback((ids: string[]) => {
    loadEventConnections(ids)
  }, [loadEventConnections])
  
  const handleCreateSpeaker = useCallback(() => {
    setEditingSpeaker(null)
    setIsFormDialogOpen(true)
  }, [])
  
  const handleEditSpeaker = useCallback((speaker: SpeakerDashboardItem) => {
    const events = eventConnections.get(speaker.speakerId) || []
    
    // If speaker is connected to events, show cascade dialog first
    if (events.length > 0) {
      setSpeakerForCascade(speaker)
      setCascadeAction('update')
    } else {
      setEditingSpeaker(speaker)
      setIsFormDialogOpen(true)
    }
  }, [eventConnections])
  
  const handleDeleteSpeaker = useCallback((speaker: SpeakerDashboardItem) => {
    const events = eventConnections.get(speaker.speakerId) || []
    
    // If speaker is connected to events, show cascade dialog first
    if (events.length > 0) {
      setSpeakerForCascade(speaker)
      setCascadeAction('delete')
    } else {
      setSpeakerToDelete(speaker)
    }
  }, [eventConnections])
  
  const handleViewConnections = useCallback((speaker: SpeakerDashboardItem) => {
    setSpeakerForConnections(speaker)
  }, [])
  
  const handleFormSubmit = useCallback(async (speakerData: any, cascadeToEvents: boolean = false) => {
    if (!selectedSeriesId) return
    
    setActionInProgress(editingSpeaker?.speakerId || 'new')
    
    try {
      let result
      
      if (editingSpeaker) {
        // Update existing speaker
        result = await apiService.updateSpeaker(
          { ...speakerData, speakerId: editingSpeaker.speakerId, modificationTime: editingSpeaker.modificationTime },
          selectedSeriesId
        )
        
        if ('error' in result) {
          throw new Error(result.error)
        }
        
        // If cascade is enabled, update speaker in all linked events
        if (cascadeToEvents) {
          const events = eventConnections.get(editingSpeaker.speakerId) || []
          await Promise.all(
            events.map(async (event) => {
              try {
                // Note: updateSpeakerInEvent might need the event speaker's speakerType and ordinal
                await apiService.updateSpeakerInEvent(
                  { speakerId: editingSpeaker.speakerId },
                  editingSpeaker.speakerId,
                  event.eventId
                )
              } catch (_err) {
                // Update failed - continue
              }
            })
          )
        }
        
        toast.success('Speaker updated successfully!')
      } else {
        // Create new speaker
        result = await apiService.createSpeaker(speakerData, selectedSeriesId)
        
        if ('error' in result) {
          throw new Error(result.error)
        }
        
        toast.success('Speaker created successfully!')
      }
      
      setIsFormDialogOpen(false)
      setEditingSpeaker(null)
      await loadSpeakers()
      
    } catch (err) {
      console.error('Error saving speaker:', err)
      toast.error(`Failed to ${editingSpeaker ? 'update' : 'create'} speaker`)
    } finally {
      setActionInProgress(null)
    }
  }, [selectedSeriesId, editingSpeaker, eventConnections, loadSpeakers, toast])
  
  const handleConfirmDelete = useCallback(async (cascadeToEvents: boolean = false) => {
    if (!speakerToDelete || !selectedSeriesId) return
    
    setActionInProgress(speakerToDelete.speakerId)
    
    try {
      // If cascade is enabled, first remove speaker from all linked events
      if (cascadeToEvents) {
        const events = eventConnections.get(speakerToDelete.speakerId) || []
        await Promise.all(
          events.map(async (event) => {
            try {
              await apiService.removeSpeakerFromEvent(speakerToDelete.speakerId, event.eventId)
            } catch (_err) {
              // Remove failed - continue
            }
          })
        )
      }
      
      // Delete the speaker from the series
      const result = await apiService.deleteSpeaker(speakerToDelete.speakerId, selectedSeriesId)
      
      if (result && 'error' in result) {
        throw new Error(result.error)
      }
      
      toast.success('Speaker deleted successfully!')
      setSpeakerToDelete(null)
      await loadSpeakers()
      
      // Clear cached event connections for this speaker
      setEventConnections(prev => {
        const updated = new Map(prev)
        updated.delete(speakerToDelete.speakerId)
        return updated
      })
      
    } catch (err) {
      console.error('Error deleting speaker:', err)
      toast.error('Failed to delete speaker')
    } finally {
      setActionInProgress(null)
    }
  }, [speakerToDelete, selectedSeriesId, eventConnections, loadSpeakers, toast])
  
  const handleCascadeConfirm = useCallback((cascadeToEvents: boolean) => {
    if (!speakerForCascade) return
    
    if (cascadeAction === 'update') {
      setEditingSpeaker({ ...speakerForCascade, _cascadeToEvents: cascadeToEvents } as any)
      setIsFormDialogOpen(true)
    } else if (cascadeAction === 'delete') {
      setSpeakerToDelete({ ...speakerForCascade, _cascadeToEvents: cascadeToEvents } as any)
    }
    
    setSpeakerForCascade(null)
    setCascadeAction(null)
  }, [speakerForCascade, cascadeAction])
  
  const handleMenuAction = useCallback((action: string, item: SpeakerDashboardItem) => {
    switch (action) {
      case 'edit':
        handleEditSpeaker(item)
        break
      case 'delete':
        handleDeleteSpeaker(item)
        break
      case 'view-connections':
        handleViewConnections(item)
        break
      default:
        break
    }
  }, [handleEditSpeaker, handleDeleteSpeaker, handleViewConnections])
  
  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================
  
  const columns = useMemo<TableColumn<SpeakerDashboardItem>[]>(() => [
    {
      key: 'photo',
      name: '',
      width: 60,
      sortable: false,
      render: (item) => {
        const photoUrl = item.photo?.imageUrl
        const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`
        
        return (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: 'var(--spectrum-global-color-gray-300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${item.firstName} ${item.lastName}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <Text UNSAFE_style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                color: 'var(--spectrum-global-color-gray-600)' 
              }}>
                {initials}
              </Text>
            )}
          </div>
        )
      }
    },
    {
      key: 'name',
      name: 'NAME',
      width: 200,
      sortable: true,
      sortFn: (a, b) => {
        const aName = `${a.firstName} ${a.lastName}`
        const bName = `${b.firstName} ${b.lastName}`
        return aName.localeCompare(bName)
      },
      render: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text UNSAFE_style={{ fontWeight: 'bold' }}>
            {item.firstName} {item.lastName}
          </Text>
          {item.title && (
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              {item.title.length > 40 ? `${item.title.substring(0, 40)}...` : item.title}
            </Text>
          )}
        </div>
      )
    },
    {
      key: 'eventCount',
      name: 'LINKED EVENTS',
      width: 140,
      sortable: true,
      sortFn: (a, b) => (a.eventCount ?? 0) - (b.eventCount ?? 0),
      render: (item) => {
        const isLoading = loadingEventCounts.has(item.speakerId)
        const eventCount = item.eventCount ?? 0
        
        if (isLoading) {
          return <div style={createShimmerStyle(60, 20)} />
        }
        
        return (
          <TooltipTrigger delay={0}>
            <ActionButton
              isQuiet
              onPress={() => handleViewConnections(item)}
              isDisabled={eventCount === 0}
            >
              <Link />
              <Text>
                {eventCount} {eventCount === 1 ? 'event' : 'events'}
              </Text>
            </ActionButton>
            <Tooltip>
              {eventCount > 0
                ? 'Click to view linked events'
                : 'Not linked to any events'}
            </Tooltip>
          </TooltipTrigger>
        )
      }
    },
    {
      key: 'socialLinks',
      name: 'SOCIAL LINKS',
      width: 120,
      sortable: false,
      render: (item) => {
        const count = item.socialLinks?.length || 0
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {count} {count === 1 ? 'link' : 'links'}
          </Text>
        )
      }
    },
    {
      key: 'creationTime',
      name: 'CREATED',
      width: 150,
      sortable: true,
      render: (item) => {
        if (!item.creationTime) return <Text>N/A</Text>
        const date = new Date(item.creationTime)
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        )
      }
    },
    {
      key: 'modificationTime',
      name: 'MODIFIED',
      width: 150,
      sortable: true,
      render: (item) => {
        if (!item.modificationTime) return <Text>N/A</Text>
        const date = new Date(item.modificationTime)
        return (
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        )
      }
    },
    {
      key: 'manage',
      name: 'ACTIONS',
      width: 100,
      sortable: false,
      render: (item) => {
        const eventCount = item.eventCount ?? 0
        
        const hasAnyAction = canWriteEvent || canDeleteEvent || eventCount > 0
        if (!hasAnyAction) return null

        return (
          <ActionMenu
            isQuiet
            aria-label="Actions menu"
            onAction={(key) => handleMenuAction(key as string, item)}
            disabledKeys={eventCount === 0 ? ['view-connections'] : []}
          >
            {canWriteEvent && (
              <MenuItem key="edit">
                <Edit />
                <Text>Edit Speaker</Text>
              </MenuItem>
            )}
            <MenuItem key="view-connections">
              <Link />
              <Text>View Connections ({eventCount})</Text>
            </MenuItem>
            {canDeleteEvent && (
              <MenuItem key="delete">
                <RemoveCircle />
                <Text>Delete Speaker</Text>
              </MenuItem>
            )}
          </ActionMenu>
        )
      }
    }
  ], [loadingEventCounts, handleMenuAction, handleViewConnections, canWriteEvent, canDeleteEvent])
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Helper to format cloud type for display
  const formatCloudType = (cloudType: string): string => {
    const cloudNames: Record<string, string> = {
      'CreativeCloud': 'Creative Cloud',
      'ExperienceCloud': 'Experience Cloud',
      'DocumentCloud': 'Document Cloud'
    }
    return cloudNames[cloudType] || cloudType
  }

  // Helper to truncate description
  const truncateDescription = (desc: string | undefined, maxLength: number = 60): string => {
    if (!desc) return 'No description'
    return desc.length > maxLength ? `${desc.substring(0, maxLength)}...` : desc
  }

  // State for series search filtering
  const [seriesFilterText, setSeriesFilterText] = useState('')

  // Create searchable series items
  const seriesItems = useMemo(() => {
    return seriesList.map(series => ({
      id: series.seriesId,
      name: series.seriesName,
      cloudType: series.cloudType,
      description: series.seriesDescription,
      status: series.seriesStatus,
      searchText: `${series.seriesName} ${formatCloudType(series.cloudType)} ${series.seriesDescription || ''}`.toLowerCase()
    }))
  }, [seriesList])

  // Filter series based on search text
  const filteredSeriesItems = useMemo(() => {
    if (!seriesFilterText) return seriesItems
    const searchLower = seriesFilterText.toLowerCase()
    return seriesItems.filter(item => item.searchText.includes(searchLower))
  }, [seriesItems, seriesFilterText])

  // Handle series ComboBox selection
  const handleSeriesComboBoxChange = useCallback((key: React.Key | null) => {
    if (key) {
      setSelectedSeriesId(String(key))
      setSeriesFilterText('') // Clear filter after selection
      // Clear event connections cache when switching series
      setEventConnections(new Map())
      loadedSpeakerIdsRef.current.clear()
    }
  }, [])

  const handleSeriesReset = useCallback(() => {
    setSelectedSeriesId(null)
    setSeriesFilterText('')
    setEventConnections(new Map())
    loadedSpeakerIdsRef.current.clear()
  }, [])

  // Series selector header with searchable ComboBox
  const seriesSelectorHeader = useMemo(() => (
    <div
      style={{
        marginBottom: 16,
        padding: 20,
        background: 'var(--spectrum-global-color-gray-75)',
        borderRadius: 8,
        border: '1px solid var(--spectrum-global-color-gray-200)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        {/* ComboBox Row */}
        <div className={style({ display: 'flex', alignItems: 'end', gap: 8 })}>
          {isLoadingSeries ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text UNSAFE_style={{ fontWeight: 600 }}>Loading series...</Text>
              <ProgressCircle size="S" isIndeterminate aria-label="Loading series" />
            </div>
          ) : (
            <ComboBox
              data-testid="series-selector"
              label="Select Series"
              selectedKey={selectedSeriesId}
              onSelectionChange={handleSeriesComboBoxChange}
              onInputChange={setSeriesFilterText}
              styles={style({ width: 480 })}
              isDisabled={seriesList.length === 0}
              defaultItems={filteredSeriesItems}
              menuTrigger="input"
              menuWidth={480}
              allowsCustomValue={false}
            >
              {(item) => (
                <ComboBoxItem id={item.id} textValue={item.name}>
                  <Text slot="label">{item.name}</Text>
                  <Text slot="description">
                    {formatCloudType(item.cloudType)} • {truncateDescription(item.description, 50)}
                  </Text>
                </ComboBoxItem>
              )}
            </ComboBox>
          )}
          {!isLoadingSeries && selectedSeriesId && (
            <div className={style({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 })}>
              <Button size="S" variant="secondary" onPress={handleSeriesReset}>
                <RotateCCW />
                <Text>Reset series</Text>
              </Button>
            </div>
          )}
          {seriesList.length > 0 && (
            <Text UNSAFE_style={{ 
              fontSize: '12px', 
              color: 'var(--spectrum-global-color-gray-600)',
              paddingBottom: '8px'
            }}>
              {seriesList.length} series available
            </Text>
          )}
        </div>

        {/* Selected Series Info Card */}
        {selectedSeries && (
          <div
            style={{
              backgroundColor: 'var(--spectrum-global-color-gray-50)',
              borderRadius: 8,
              padding: 16,
              border: '1px solid var(--spectrum-global-color-gray-300)',
              marginTop: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Badge 
                  variant={selectedSeries.cloudType === 'CreativeCloud' ? 'positive' : 'informative'}
                >
                  {formatCloudType(selectedSeries.cloudType)}
                </Badge>
                <Badge variant="neutral">
                  {selectedSeries.seriesStatus || 'N/A'}
                </Badge>
                <Text UNSAFE_style={{ 
                  fontSize: '13px', 
                  color: 'var(--spectrum-global-color-gray-600)',
                  marginLeft: 'auto'
                }}>
                  {speakers.length} speaker{speakers.length !== 1 ? 's' : ''} in this series
                </Text>
              </div>
              {selectedSeries.seriesDescription && (
                <Text UNSAFE_style={{ 
                  fontSize: '13px', 
                  color: 'var(--spectrum-global-color-gray-700)',
                  lineHeight: '1.4'
                }}>
                  {selectedSeries.seriesDescription}
                </Text>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  ), [isLoadingSeries, selectedSeriesId, handleSeriesComboBoxChange, handleSeriesReset, seriesList, filteredSeriesItems, selectedSeries, speakers.length])
  
  // Custom create button — only shown when user has event:write
  const createButton = useMemo(() => {
    if (!canWriteEvent) return undefined
    return (
      <Button
        data-testid="add-speaker-button"
        variant="accent"
        onPress={handleCreateSpeaker}
        isDisabled={!selectedSeriesId}
      >
        <Add />
        <Text>Add Speaker</Text>
      </Button>
    )
  }, [canWriteEvent, handleCreateSpeaker, selectedSeriesId])
  
  return (
    <div data-testid="speakers-dashboard">
      {/* Series Selector */}
      <div style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 32 }}>
        {seriesSelectorHeader}
      </div>

      {/* Speakers Table — avoid legacy empty UI under BlurredLoadingOverlay while series list loads */}
      {isLoadingSeries ? (
        <div style={{ minHeight: 480 }} aria-hidden />
      ) : !selectedSeriesId ? (
        <div style={{ padding: 32 }}>
          <ResourceEmptyState
            illustration={<LayersIllustration aria-hidden />}
            title="No series available"
            description="Create a series first, then you can add and manage speakers for it here."
          />
        </div>
      ) : (
        <div className={style({padding: 32})}>
          <ResourceDashboardLayout
            title="Speakers"
            totalCount={enrichedSpeakers.length}
            error={error}
            data={enrichedSpeakers}
            columns={columns}
            getItemKey={(item) => item.speakerId}
            onVisibleIdsChange={handleVisibleIdsChange}
            onRefresh={loadSpeakers}
            createButton={createButton}
            emptyStateIllustration={<MicrophoneIllustration aria-hidden />}
            emptyStateTitle="No Speakers Found"
            emptyStateDescription="Get started by adding your first speaker to this series"
            dataTableTestIds={SPEAKERS_DASHBOARD_TABLE_TEST_IDS}
            searchPlaceholder="Search speakers..."
            searchKeys={SPEAKERS_SEARCH_KEYS}
            searchFilter={(speaker, query) => {
              const fullName = `${speaker.firstName || ''} ${speaker.lastName || ''}`.toLowerCase()
              return fullName.includes(query) || (speaker.title || '').toLowerCase().includes(query)
            }}
          />
        </div>
      )}
      
      {/* Speaker Form Dialog */}
      <SpeakerFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => {
          setIsFormDialogOpen(false)
          setEditingSpeaker(null)
        }}
        onSubmit={handleFormSubmit}
        speaker={editingSpeaker}
        seriesId={selectedSeriesId || ''}
        isSubmitting={!!actionInProgress}
        cascadeToEvents={(editingSpeaker as any)?._cascadeToEvents}
      />
      
      {/* Cascade Confirmation Dialog */}
      <CascadeConfirmDialog
        isOpen={!!speakerForCascade}
        onClose={() => {
          setSpeakerForCascade(null)
          setCascadeAction(null)
        }}
        onConfirm={handleCascadeConfirm}
        speaker={speakerForCascade}
        action={cascadeAction || 'update'}
        events={speakerForCascade ? eventConnections.get(speakerForCascade.speakerId) || [] : []}
      />
      
      {/* Simple Delete Confirmation (no cascade) */}
      <DialogTrigger
        isOpen={!!speakerToDelete && !(speakerToDelete as any)?._cascadeToEvents}
        onOpenChange={(isOpen) => !isOpen && setSpeakerToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Speaker"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            handleConfirmDelete(false)
          }}
          onCancel={() => setSpeakerToDelete(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          Are you sure you want to delete <strong>{speakerToDelete?.firstName} {speakerToDelete?.lastName}</strong>?
          This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>
      
      {/* Cascade Delete Confirmation */}
      <DialogTrigger
        isOpen={!!speakerToDelete && !!(speakerToDelete as any)?._cascadeToEvents}
        onOpenChange={(isOpen) => !isOpen && setSpeakerToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Speaker & Remove from Events"
          variant="destructive"
          primaryActionLabel="Delete & Remove from Events"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            handleConfirmDelete(true)
          }}
          onCancel={() => setSpeakerToDelete(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Text>
              <strong>{speakerToDelete?.firstName} {speakerToDelete?.lastName}</strong> is linked to {
                eventConnections.get(speakerToDelete?.speakerId || '')?.length || 0
              } events.
            </Text>
            <Text>
              This will permanently delete the speaker from the series AND remove them from all linked events.
            </Text>
            <Text UNSAFE_style={{ color: COLORS.RED_600, fontWeight: 'bold' }}>
              This action cannot be undone.
            </Text>
          </div>
        </AlertDialog>
      </DialogTrigger>
      
      {/* Event Connections Dialog */}
      <SpeakerEventConnectionsDialog
        isOpen={!!speakerForConnections}
        onClose={() => setSpeakerForConnections(null)}
        speaker={speakerForConnections}
        events={speakerForConnections ? eventConnections.get(speakerForConnections.speakerId) || [] : []}
      />
      
      <BlurredLoadingOverlay
        visible={isLoadingSeries || isLoadingSpeakers}
        message={isLoadingSeries ? 'Loading series...' : 'Loading speakers...'}
        ariaLabel={isLoadingSeries ? 'Loading series' : 'Loading speakers'}
      />
      <BlurredLoadingOverlay
        visible={!!actionInProgress}
        message="Processing..."
        ariaLabel="Processing"
        zIndex={9999}
      />
    </div>
  )
}
