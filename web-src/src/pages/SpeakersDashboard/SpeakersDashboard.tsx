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
  Flex,
  Text,
  View,
  ActionButton,
  MenuTrigger,
  Menu,
  Item,
  ComboBox,
  Button,
  DialogTrigger,
  AlertDialog,
  ProgressCircle,
  Badge,
  Tooltip,
  TooltipTrigger,
  Well
} from '@adobe/react-spectrum'
import MoreSmallList from '@spectrum-icons/workflow/MoreSmallList'
import Edit from '@spectrum-icons/workflow/Edit'
import Delete from '@spectrum-icons/workflow/Delete'
import Add from '@spectrum-icons/workflow/Add'
import Link from '@spectrum-icons/workflow/Link'
import User from '@spectrum-icons/workflow/User'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout } from '../../components/shared'
import { SeriesSpeaker, SeriesApiResponse, EventApiResponse } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { IMS } from '../../types'
import { useToast } from '../../contexts'
import { createShimmerStyle, COLORS } from '../../styles/designSystem'
import { SpeakerFormDialog } from './SpeakerFormDialog'
import { CascadeConfirmDialog, CascadeAction } from './CascadeConfirmDialog'
import { SpeakerEventConnectionsDialog } from './SpeakerEventConnectionsDialog'

// Extended speaker type for dashboard display
export interface SpeakerDashboardItem extends SeriesSpeaker {
  eventCount?: number
  events?: EventApiResponse[]
  seriesName?: string
}

interface SpeakersDashboardProps {
  ims: IMS
}

export const SpeakersDashboard: React.FC<SpeakersDashboardProps> = () => {
  const toast = useToast()
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  // Series selection
  const [seriesList, setSeriesList] = useState<SeriesApiResponse[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [isLoadingSeries, setIsLoadingSeries] = useState(true)
  
  // Speakers data
  const [speakers, setSpeakers] = useState<SpeakerDashboardItem[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Event connections loading
  const [loadingEventCounts, setLoadingEventCounts] = useState<Set<string>>(new Set())
  const [eventConnections, setEventConnections] = useState<Map<string, EventApiResponse[]>>(new Map())
  
  // Ref to track which speaker IDs we've already loaded (prevents infinite loop)
  const loadedSpeakerIdsRef = useRef<Set<string>>(new Set())
  
  // Action states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  
  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<SpeakerDashboardItem | null>(null)
  const [speakerToDelete, setSpeakerToDelete] = useState<SpeakerDashboardItem | null>(null)
  const [speakerForCascade, setSpeakerForCascade] = useState<SpeakerDashboardItem | null>(null)
  const [cascadeAction, setCascadeAction] = useState<CascadeAction | null>(null)
  const [speakerForConnections, setSpeakerForConnections] = useState<SpeakerDashboardItem | null>(null)
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  // Load series list on mount
  useEffect(() => {
    let cancelled = false

    const loadSeriesList = async () => {
      setIsLoadingSeries(true)
      try {
        const data = await cachedApi.getSeriesList()
        
        if (cancelled) return
        
        setSeriesList(data)
        
        // Auto-select first series if available
        if (data.length > 0 && !selectedSeriesId) {
          setSelectedSeriesId(data[0].seriesId)
        }
      } catch (err) {
        console.error('Error loading series:', err)
        if (!cancelled) {
          toast.error('Failed to load series list')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSeries(false)
        }
      }
    }
    
    loadSeriesList()
    
    return () => {
      cancelled = true
    }
  }, [])
  
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
          } catch (err) {
            console.warn(`Failed to load events for speaker ${speakerId}:`, err)
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
              } catch (err) {
                console.warn(`Failed to update speaker in event ${event.eventId}:`, err)
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
            } catch (err) {
              console.warn(`Failed to remove speaker from event ${event.eventId}:`, err)
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
        console.log('Unknown action:', action)
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
          <View
            UNSAFE_style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: 'var(--spectrum-global-color-gray-300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
          </View>
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
        <Flex direction="column" gap="size-50">
          <Text UNSAFE_style={{ fontWeight: 'bold' }}>
            {item.firstName} {item.lastName}
          </Text>
          {item.title && (
            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
              {item.title.length > 40 ? `${item.title.substring(0, 40)}...` : item.title}
            </Text>
          )}
        </Flex>
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
              <Flex alignItems="center" gap="size-100">
                <Link size="S" />
                <Text UNSAFE_style={{ 
                  color: eventCount > 0 
                    ? 'var(--spectrum-global-color-blue-600)' 
                    : 'var(--spectrum-global-color-gray-500)'
                }}>
                  {eventCount} {eventCount === 1 ? 'event' : 'events'}
                </Text>
              </Flex>
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
        
        return (
          <MenuTrigger>
            <ActionButton isQuiet aria-label="Actions menu">
              <MoreSmallList />
            </ActionButton>
            <Menu 
              onAction={(key) => handleMenuAction(key as string, item)}
              disabledKeys={eventCount === 0 ? ['view-connections'] : []}
            >
              <Item key="edit">
                <Edit />
                <Text>Edit Speaker</Text>
              </Item>
              <Item key="view-connections">
                <Link />
                <Text>View Connections ({eventCount})</Text>
              </Item>
              <Item key="delete">
                <Delete />
                <Text>Delete Speaker</Text>
              </Item>
            </Menu>
          </MenuTrigger>
        )
      }
    }
  ], [loadingEventCounts, handleMenuAction, handleViewConnections])
  
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

  // Series selector header with searchable ComboBox
  const seriesSelectorHeader = useMemo(() => (
    <Well UNSAFE_style={{ marginBottom: '16px', padding: '20px' }}>
      <Flex justifyContent="space-between" alignItems="center" gap="size-200">
        {/* ComboBox Row */}
        <Flex alignItems="end" gap="size-200">
          {isLoadingSeries ? (
            <Flex alignItems="center" gap="size-200">
              <Text UNSAFE_style={{ fontWeight: 600 }}>Loading series...</Text>
              <ProgressCircle size="S" isIndeterminate aria-label="Loading series" />
            </Flex>
          ) : (
            <ComboBox
              label="Select Series"
              selectedKey={selectedSeriesId}
              onSelectionChange={handleSeriesComboBoxChange}
              onInputChange={setSeriesFilterText}
              width="size-6000"
              isDisabled={seriesList.length === 0}
              items={filteredSeriesItems}
              menuTrigger="input"
              allowsCustomValue={false}
            >
              {(item) => (
                <Item key={item.id} textValue={item.name}>
                  <Text>{item.name}</Text>
                  <Text slot="description">
                    {formatCloudType(item.cloudType)} • {truncateDescription(item.description, 50)}
                  </Text>
                </Item>
              )}
            </ComboBox>
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
        </Flex>
        
        {/* Selected Series Info Card */}
        {selectedSeries && (
          <View
            backgroundColor="gray-50"
            borderRadius="medium"
            padding="size-200"
            UNSAFE_style={{
              border: '1px solid var(--spectrum-global-color-gray-300)',
              marginTop: '8px'
            }}
          >
            <Flex direction="column" gap="size-100">
              <Flex alignItems="center" gap="size-150">
                <Badge 
                  variant={selectedSeries.cloudType === 'CreativeCloud' ? 'positive' : 'info'}
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
              </Flex>
              {selectedSeries.seriesDescription && (
                <Text UNSAFE_style={{ 
                  fontSize: '13px', 
                  color: 'var(--spectrum-global-color-gray-700)',
                  lineHeight: '1.4'
                }}>
                  {selectedSeries.seriesDescription}
                </Text>
              )}
            </Flex>
          </View>
        )}
      </Flex>
    </Well>
  ), [isLoadingSeries, selectedSeriesId, handleSeriesComboBoxChange, seriesList, filteredSeriesItems, selectedSeries, speakers.length])
  
  // Custom create button
  const createButton = useMemo(() => (
    <Button
      variant="accent"
      onPress={handleCreateSpeaker}
      isDisabled={!selectedSeriesId}
    >
      <Add />
      <Text>Add Speaker</Text>
    </Button>
  ), [handleCreateSpeaker, selectedSeriesId])
  
  return (
    <View>
      {/* Series Selector */}
      <View paddingX="size-400" paddingTop="size-400">
        {seriesSelectorHeader}
      </View>
      
      {/* Speakers Table */}
      {!selectedSeriesId ? (
        <View padding="size-400">
          <Flex
            direction="column"
            alignItems="center"
            justifyContent="center"
            height="size-3000"
            gap="size-200"
          >
            <User size="XXL" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-400)' }} />
            <Text UNSAFE_style={{ fontSize: '18px', color: 'var(--spectrum-global-color-gray-600)' }}>
              Select a series to manage speakers
            </Text>
          </Flex>
        </View>
      ) : (
        <ResourceDashboardLayout
          title="Speakers"
          totalCount={enrichedSpeakers.length}
          isLoading={isLoadingSpeakers}
          error={error}
          data={enrichedSpeakers}
          columns={columns}
          getItemKey={(item) => item.speakerId}
          onVisibleIdsChange={handleVisibleIdsChange}
          onRefresh={loadSpeakers}
          createButton={createButton}
          emptyStateTitle="No Speakers Found"
          emptyStateDescription="Get started by adding your first speaker to this series"
          loadingMessage="Loading speakers..."
          searchPlaceholder="Search speakers..."
          searchKeys={['firstName', 'lastName', 'title']}
        />
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
        {(close) => (
          <AlertDialog
            title="Delete Speaker"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              handleConfirmDelete(false)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={!!actionInProgress}
          >
            Are you sure you want to delete <strong>{speakerToDelete?.firstName} {speakerToDelete?.lastName}</strong>?
            This action cannot be undone.
          </AlertDialog>
        )}
      </DialogTrigger>
      
      {/* Cascade Delete Confirmation */}
      <DialogTrigger
        isOpen={!!speakerToDelete && !!(speakerToDelete as any)?._cascadeToEvents}
        onOpenChange={(isOpen) => !isOpen && setSpeakerToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Delete Speaker & Remove from Events"
            variant="destructive"
            primaryActionLabel="Delete & Remove from Events"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              handleConfirmDelete(true)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={!!actionInProgress}
          >
            <Flex direction="column" gap="size-200">
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
            </Flex>
          </AlertDialog>
        )}
      </DialogTrigger>
      
      {/* Event Connections Dialog */}
      <SpeakerEventConnectionsDialog
        isOpen={!!speakerForConnections}
        onClose={() => setSpeakerForConnections(null)}
        speaker={speakerForConnections}
        events={speakerForConnections ? eventConnections.get(speakerForConnections.speakerId) || [] : []}
      />
      
      {/* Loading Overlay */}
      {actionInProgress && (
        <View
          position="fixed"
          top="size-0"
          left="size-0"
          right="size-0"
          bottom="size-0"
          UNSAFE_style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
            cursor: 'wait'
          }}
        >
          <View
            backgroundColor="gray-50"
            padding="size-400"
            borderRadius="medium"
            UNSAFE_style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <ProgressCircle size="L" isIndeterminate aria-label="Processing" />
            <Text UNSAFE_style={{ fontSize: '16px', fontWeight: 500 }}>
              Processing...
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
