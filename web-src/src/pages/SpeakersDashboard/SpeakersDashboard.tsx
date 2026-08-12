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
 *
 * Event rows reference speakers by id only ({speakerId, speakerType, ordinal}) and resolve
 * the profile from the series record at read time, so series-level edits need no
 * propagation to events. Deleting a series speaker removes every event association in one
 * atomic backend transaction, so the delete dialog warns about that rather than offering it.
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  ActionButton,
  MenuTrigger,
  Menu,
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
import More from '@react-spectrum/s2/icons/More'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout, BlurredLoadingOverlay, ResourceEmptyState } from '../../components/shared'
import MicrophoneIllustration from '@react-spectrum/s2/illustrations/linear/Microphone'
import LayersIllustration from '@react-spectrum/s2/illustrations/linear/Layers'
import { SeriesSpeaker, SeriesApiResponse, EventApiResponse } from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { apiCache } from '../../services/cacheUtils'
import { uploadSpeakerSeriesImage } from '../../services/speakerImageUpload'
import { IMS } from '../../types'
import { useToast, useGroup } from '../../contexts'
import { createShimmerStyle, COLORS } from '../../styles/designSystem'
import { useSafeState, useRBACFilter } from '../../hooks'
import { useHasPermission } from '../../hooks/useHasPermission'
import { getProfileAttr } from '../../utils/dataFilters'
import { DEFAULT_LOCALE, SUPPORTED_SPEAKER_LOCALES } from '../../config/localeMapping'
import { hasLocalesSlice } from '../../types/configApi'
import type { Locale } from '../../types/configApi'
import { buildSpeakerPayloadForDashboard } from '../../services/payloadBuilders'
import { SpeakerFormDialog, SpeakerFormSubmitData } from './SpeakerFormDialog'
import { SpeakerEventConnectionsDialog } from './SpeakerEventConnectionsDialog'

// Extended speaker type for dashboard display
export interface SpeakerDashboardItem extends SeriesSpeaker {
  /** `undefined` = linked events not resolved yet; never conflate with 0 */
  eventCount?: number
  seriesName?: string
}

const SPEAKERS_SEARCH_KEYS = ['firstName', 'lastName', 'title']

// Module-level so the identity is stable: an inline arrow here busts the memos in
// ResourceDashboardLayout/DataTable and re-fires the visible-items effect every render.
const getSpeakerKey = (item: SpeakerDashboardItem) => item.speakerId

const SPEAKERS_DASHBOARD_TABLE_TEST_IDS = {
  root: 'speakers-dashboard-table',
  emptyState: 'speakers-dashboard-table-empty-state',
  pageInput: 'speakers-dashboard-table-page-input',
  header: (columnKey: string) => `speakers-dashboard-table-header-${columnKey}`,
  row: (itemKey: string) => `speakers-dashboard-table-row-${itemKey}`,
}

function getSpeakerDisplayTitle(item: SpeakerDashboardItem, locales: readonly string[]): string {
  const row = item as unknown as Record<string, unknown>
  const primary = getProfileAttr(row, 'title', DEFAULT_LOCALE)
  if (typeof primary === 'string' && primary.trim()) {
    return primary.trim()
  }
  for (const loc of locales) {
    const t = item.localizations?.[loc]?.title
    if (typeof t === 'string' && t.trim()) {
      return t.trim()
    }
  }
  return (item.title || '').trim()
}

function speakerTitleSearchText(item: SpeakerDashboardItem, locales: readonly string[]): string {
  const chunks = [
    item.title,
    ...locales.map((loc) => item.localizations?.[loc]?.title),
  ]
  return chunks.filter(Boolean).join(' ').toLowerCase()
}

function invalidateSpeakerListCache(seriesId: string, speakerId?: string) {
  apiCache.invalidate(seriesId)
  apiCache.invalidate('getSpeakers')
  if (speakerId) {
    apiCache.invalidate(speakerId)
  }
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
  
  // Three separate refs so "resolved", "in flight" and "failed" stay distinguishable —
  // one Set cannot tell a genuine zero from "never fetched". connectionsRef mirrors
  // eventConnections so stable callbacks can read it without stale closures.
  const connectionsRef = useRef<Map<string, EventApiResponse[]>>(new Map())
  const inFlightRef = useRef<Map<string, Promise<EventApiResponse[]>>>(new Map())
  const failedRef = useRef<Set<string>>(new Set())

  // Action states
  const [actionInProgress, setActionInProgress] = useSafeState<string | null>(null)
  // Separate from actionInProgress: that one disables the delete dialog's confirm button
  const [isCheckingConnections, setIsCheckingConnections] = useSafeState(false)

  // Scope locales for the selected series
  const [scopeLocales, setScopeLocales] = useSafeState<Locale[] | null>(null)

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useSafeState(false)
  const [editingSpeaker, setEditingSpeaker] = useSafeState<SpeakerDashboardItem | null>(null)
  const [speakerToDelete, setSpeakerToDelete] = useSafeState<SpeakerDashboardItem | null>(null)
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

  // Explicit Refresh only — drops resolved counts as well as failed ones so a stale
  // "3 events" is re-resolved, not just a row stuck on "—". Kept out of loadSpeakers,
  // which also runs on mount and after every save/delete and would refetch needlessly.
  // inFlightRef is deliberately left alone: clearing it would both orphan the live
  // promise's shimmer entry and let the table issue a duplicate request for the same row.
  const handleRefresh = useCallback(async () => {
    connectionsRef.current.clear()
    failedRef.current.clear()
    setEventConnections(new Map())
    await loadSpeakers()
  }, [loadSpeakers, setEventConnections])

  // Single entry point for fetching a speaker's linked events. Dedupes in-flight requests
  // so an on-demand fetch (edit/delete/view) can't double-request a row the table is
  // already loading. Only writes connectionsRef on success, so a failure never
  // masquerades as "zero linked events".
  const fetchSpeakerConnections = useCallback(async (
    speakerId: string,
    options?: { force?: boolean }
  ): Promise<EventApiResponse[]> => {
    // force bypasses both caches: callers use it when a stale count would be harmful
    // (e.g. gating a delete), so joining an older in-flight request is not good enough.
    if (!options?.force) {
      const resolved = connectionsRef.current.get(speakerId)
      if (resolved) return resolved

      const inFlight = inFlightRef.current.get(speakerId)
      if (inFlight) return inFlight
    }

    // Declared first so the finally block can identity-check this exact attempt and not
    // evict a newer request under the same id. `const` fails tsc here (TS2454).
    let request!: Promise<EventApiResponse[]>
    request = (async () => {
      try {
        const response = await cachedApi.getEventsBySpeakerId(speakerId)
        if (response && !('error' in response)) {
          const raw = response.events || response || []
          const events: EventApiResponse[] = Array.isArray(raw) ? raw : []
          connectionsRef.current.set(speakerId, events)
          failedRef.current.delete(speakerId)
          setEventConnections(new Map(connectionsRef.current))
          return events
        }
        // Leave connectionsRef untouched so the row stays "unknown", not "zero"
        failedRef.current.add(speakerId)
        return []
      } catch (err) {
        console.error(`Error loading event connections for ${speakerId}:`, err)
        failedRef.current.add(speakerId)
        return []
      } finally {
        // Only the current attempt clears the shimmer. A superseded request (Refresh or a
        // forced refetch replaced it) must not, or the row would flash its old value while
        // the live request is still running.
        if (inFlightRef.current.get(speakerId) === request) {
          inFlightRef.current.delete(speakerId)
          setLoadingEventCounts(prev => {
            const updated = new Set(prev)
            updated.delete(speakerId)
            return updated
          })
        }
      }
    })()

    inFlightRef.current.set(speakerId, request)
    setLoadingEventCounts(prev => new Set(prev).add(speakerId))
    return request
  }, [setEventConnections, setLoadingEventCounts])

  // Fan out over the currently visible page. failedRef is honoured here (but not on
  // explicit user actions) because DataTable re-fires onVisibleItemsChange on every
  // eventConnections change — without it a persistently failing id would retry forever.
  const loadEventConnections = useCallback((speakerIds: string[]) => {
    if (!selectedSeriesId) return

    speakerIds
      .filter(id =>
        !connectionsRef.current.has(id) &&
        !inFlightRef.current.has(id) &&
        !failedRef.current.has(id)
      )
      .forEach(id => { void fetchSpeakerConnections(id) })
  }, [selectedSeriesId, fetchSpeakerConnections])

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================
  
  const enrichedSpeakers = useMemo(() => {
    return speakers.map(speaker => ({
      ...speaker,
      eventCount: eventConnections.get(speaker.speakerId)?.length
    }))
  }, [speakers, eventConnections])
  
  const selectedSeries = useMemo(() => {
    return seriesList.find(s => s.seriesId === selectedSeriesId)
  }, [seriesList, selectedSeriesId])

  useEffect(() => {
    const scopeId = selectedSeries?.scopeId
    if (!scopeId) return
    let cancelled = false
    // Retain previous scopeLocales during the fetch so the dialog never
    // initializes with stale/fallback keys during a series switch.
    cachedApi.getConfig(scopeId).then((result) => {
      if (cancelled) return
      if (!result || 'error' in result) { setScopeLocales(null); return }
      const locales = hasLocalesSlice(result) ? result.locales.locales : undefined
      setScopeLocales(locales && locales.length > 0 ? locales : null)
    }).catch(() => { if (!cancelled) setScopeLocales(null) })
    return () => { cancelled = true }
  }, [selectedSeries?.scopeId, setScopeLocales])

  const effectiveLocales: readonly string[] = useMemo(
    () => (scopeLocales && scopeLocales.length > 0 ? scopeLocales.map((l) => l.code) : SUPPORTED_SPEAKER_LOCALES),
    [scopeLocales]
  )

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
  
  // Profile edits need no linked-event count: event rows hold only a {speakerId,
  // speakerType, ordinal} reference and resolve the profile from the series record at
  // read time, so a series-speaker update is already visible on every linked event.
  const handleEditSpeaker = useCallback((speaker: SpeakerDashboardItem) => {
    setEditingSpeaker(speaker)
    setIsFormDialogOpen(true)
  }, [setEditingSpeaker, setIsFormDialogOpen])

  // Always re-resolve before opening: this warning gates an irreversible delete, so a
  // stale count is worse than a brief overlay. A cached count could say "0 events" while
  // another user has since added the speaker to one, and we would delete that silently.
  const handleDeleteSpeaker = useCallback(async (speaker: SpeakerDashboardItem) => {
    setIsCheckingConnections(true)
    try {
      await fetchSpeakerConnections(speaker.speakerId, { force: true })
    } finally {
      setIsCheckingConnections(false)
    }
    setSpeakerToDelete(speaker)
  }, [fetchSpeakerConnections, setIsCheckingConnections, setSpeakerToDelete])

  // No force: an already-resolved speaker returns its cached array synchronously, so
  // re-opening the dialog doesn't swap a real count for a spinner.
  const handleViewConnections = useCallback((speaker: SpeakerDashboardItem) => {
    void fetchSpeakerConnections(speaker.speakerId)
    setSpeakerForConnections(speaker)
  }, [fetchSpeakerConnections, setSpeakerForConnections])
  
  const handleFormSubmit = useCallback(async (
    data: SpeakerFormSubmitData,
    pendingFile?: File
  ) => {
    if (!selectedSeriesId) return

    setActionInProgress(editingSpeaker?.speakerId || 'new')
    
    try {
      let result
      const altText = pendingFile
        ? `${data.firstName} ${data.lastName}`.trim() || 'Speaker'
        : ''

      const speakerPayload = await buildSpeakerPayloadForDashboard({
        seriesId: selectedSeriesId,
        speakerId: editingSpeaker?.speakerId,
        firstName: data.firstName,
        lastName: data.lastName,
        socialLinks: data.socialLinks,
        localizationDrafts: data.localizationDrafts,
        modificationTime: editingSpeaker?.modificationTime,
      })

      if (editingSpeaker) {
        // Update existing speaker
        result = await cachedApi.updateSpeaker(
          speakerPayload as Record<string, unknown>,
          selectedSeriesId
        )

        if ('error' in result) {
          throw new Error(result.error)
        }

        let imageMutation = false
        let imageDeleteFailed = false
        if (data.removedImageId) {
          imageMutation = true
          const deleted = await apiService.deleteSpeakerImage(
            editingSpeaker.speakerId,
            selectedSeriesId,
            data.removedImageId
          )
          if (deleted && 'error' in deleted) {
            imageDeleteFailed = true
          }
        }

        let imageUploadFailed = false
        if (pendingFile) {
          imageMutation = true
          const uploaded = await uploadSpeakerSeriesImage(
            pendingFile,
            selectedSeriesId,
            editingSpeaker.speakerId,
            altText,
            data.replaceImageId
          )
          if (!uploaded) {
            imageUploadFailed = true
          }
        }

        if (imageMutation) {
          invalidateSpeakerListCache(selectedSeriesId, editingSpeaker.speakerId)
        }

        // One aggregated toast; the speaker record itself saved successfully in all
        // these branches, so only the image axis can degrade the outcome.
        if (imageUploadFailed && imageDeleteFailed) {
          toast.error('Speaker saved, but the profile image could not be updated.')
        } else if (imageUploadFailed) {
          toast.error('Speaker saved, but profile image upload failed.')
        } else if (imageDeleteFailed) {
          toast.error('Speaker saved, but the previous profile image could not be removed.')
        } else {
          toast.success('Speaker updated successfully!')
        }
      } else {
        // Create new speaker
        result = await cachedApi.createSpeaker(
          speakerPayload as Record<string, unknown>,
          selectedSeriesId
        )
        
        if ('error' in result) {
          throw new Error(result.error)
        }

        let createImageUploadFailed = false
        if (pendingFile) {
          const saved = result.speaker ?? result
          const speakerId = saved.speakerId as string | undefined
          if (speakerId) {
            const uploaded = await uploadSpeakerSeriesImage(
              pendingFile,
              selectedSeriesId,
              speakerId,
              altText
            )
            invalidateSpeakerListCache(selectedSeriesId, speakerId)
            if (!uploaded) {
              createImageUploadFailed = true
            }
          } else {
            createImageUploadFailed = true
          }
        }

        if (createImageUploadFailed) {
          toast.error('Speaker created, but profile image upload failed.')
        } else {
          toast.success('Speaker created successfully!')
        }
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
  }, [selectedSeriesId, editingSpeaker, loadSpeakers, toast])

  // The backend deletes every event association in the same atomic transaction as the
  // series speaker (GSI speaker#<id> covers the event#<id> rows), so there is nothing to
  // cascade here — and no pre-delete mutation that could be orphaned if this call fails.
  const handleConfirmDelete = useCallback(async () => {
    if (!speakerToDelete || !selectedSeriesId) return

    setActionInProgress(speakerToDelete.speakerId)

    // Captured before the delete: the backend drops these associations in the same
    // transaction, so their cached rosters go stale and must be invalidated by eventId
    // (apiCache keys on funcId + args, so invalidating by operation name would no-op).
    // handleDeleteSpeaker force-resolves this first, so it is populated unless that fetch
    // failed — in which case the ids are unknown and those rosters expire on their own TTL.
    const affectedEventIds = (connectionsRef.current.get(speakerToDelete.speakerId) ?? [])
      .map(event => event.eventId)
      .filter((id): id is string => !!id)

    try {
      const result = await cachedApi.deleteSpeaker(speakerToDelete.speakerId, selectedSeriesId)

      if (result && 'error' in result) {
        throw new Error(result.error)
      }

      affectedEventIds.forEach(id => apiCache.invalidate(id))

      toast.success('Speaker deleted successfully!')
      setSpeakerToDelete(null)

      connectionsRef.current.delete(speakerToDelete.speakerId)
      inFlightRef.current.delete(speakerToDelete.speakerId)
      failedRef.current.delete(speakerToDelete.speakerId)
      setEventConnections(new Map(connectionsRef.current))

      await loadSpeakers()

    } catch (err) {
      console.error('Error deleting speaker:', err)
      toast.error('Failed to delete speaker')
    } finally {
      setActionInProgress(null)
    }
  }, [speakerToDelete, selectedSeriesId, loadSpeakers, toast, setEventConnections, setActionInProgress, setSpeakerToDelete])

  const handleMenuAction = useCallback((action: string, item: SpeakerDashboardItem) => {
    switch (action) {
      case 'edit':
        handleEditSpeaker(item)
        break
      case 'delete':
        void handleDeleteSpeaker(item)
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
      render: (item) => {
        const displayTitle = getSpeakerDisplayTitle(item, effectiveLocales)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text UNSAFE_style={{ fontWeight: 'bold' }}>
              {item.firstName} {item.lastName}
            </Text>
            {displayTitle ? (
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                {displayTitle.length > 40 ? `${displayTitle.substring(0, 40)}...` : displayTitle}
              </Text>
            ) : null}
          </div>
        )
      }
    },
    {
      key: 'eventCount',
      name: 'LINKED EVENTS',
      width: 140,
      sortable: true,
      // Unloaded rows sort to one end rather than interleaving with genuine zeros
      sortFn: (a, b) => (a.eventCount ?? -1) - (b.eventCount ?? -1),
      render: (item) => {
        if (loadingEventCounts.has(item.speakerId)) {
          return <div style={createShimmerStyle(60, 20)} />
        }

        // Only the first page is loaded eagerly, so an unloaded count must read as
        // unknown — rendering it as 0 would claim the speaker has no linked events.
        const eventCount = item.eventCount
        if (eventCount === undefined) {
          return (
            <TooltipTrigger delay={0}>
              <ActionButton
                isQuiet
                onPress={() => handleViewConnections(item)}
                aria-label="Linked events not loaded — check now"
              >
                <Link />
                <Text>—</Text>
              </ActionButton>
              <Tooltip>Linked events not loaded yet — click to check</Tooltip>
            </TooltipTrigger>
          )
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
        // undefined = not loaded yet; keep the action enabled so the user can find out
        const eventCount = item.eventCount
        const canViewConnections = eventCount === undefined || eventCount > 0
        const viewLabel = eventCount === undefined
          ? 'View Connections'
          : `View Connections (${eventCount})`

        const hasAnyAction = canWriteEvent || canDeleteEvent || canViewConnections
        if (!hasAnyAction) return null

        return (
          <MenuTrigger>
            <ActionButton isQuiet aria-label="Actions menu">
              <More />
            </ActionButton>
            <Menu onAction={(key) => handleMenuAction(key as string, item)}>
              {canWriteEvent && (
                <MenuItem id="edit" textValue="Edit Speaker">
                  <Edit />
                  <Text slot="label">Edit Speaker</Text>
                </MenuItem>
              )}
              <MenuItem
                id="view-connections"
                textValue={viewLabel}
                isDisabled={!canViewConnections}
              >
                <Link />
                <Text slot="label">{viewLabel}</Text>
              </MenuItem>
              {canDeleteEvent && (
                <MenuItem id="delete" textValue="Delete Speaker">
                  <RemoveCircle />
                  <Text slot="label">Delete Speaker</Text>
                </MenuItem>
              )}
            </Menu>
          </MenuTrigger>
        )
      }
    }
  ], [loadingEventCounts, handleMenuAction, handleViewConnections, canWriteEvent, canDeleteEvent, effectiveLocales])
  
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
      // Clear event connections cache when switching series (inFlightRef is left to
      // settle on its own — see handleRefresh)
      setEventConnections(new Map())
      connectionsRef.current.clear()
      failedRef.current.clear()
    }
  }, [])

  const handleSeriesReset = useCallback(() => {
    setSelectedSeriesId(null)
    setSeriesFilterText('')
    setEventConnections(new Map())
    connectionsRef.current.clear()
    failedRef.current.clear()
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

  // Delete-dialog line about linked events. Undefined count means unresolved, not zero.
  // Retains the last non-null speaker: S2's AlertDialog evaluates close() before
  // onPrimaryAction(), so speakerToDelete is already null while the dialog animates out,
  // and reading it directly would flip this line to "could not be determined" on the way.
  const lastSpeakerToDeleteRef = useRef<SpeakerDashboardItem | null>(null)
  if (speakerToDelete) lastSpeakerToDeleteRef.current = speakerToDelete
  const deleteSubject = speakerToDelete ?? lastSpeakerToDeleteRef.current

  const deleteLinkedEventsNotice = useMemo(() => {
    const eventCount = deleteSubject
      ? eventConnections.get(deleteSubject.speakerId)?.length
      : undefined

    if (eventCount === undefined) {
      return (
        <Text>
          Linked events could not be determined; any event assignments will also be removed.
        </Text>
      )
    }
    if (eventCount === 0) return null
    return (
      <Text>
        They are currently linked to <strong>{eventCount}</strong>{' '}
        {eventCount === 1 ? 'event' : 'events'} and will be removed from{' '}
        {eventCount === 1 ? 'it' : 'all of them'}.
      </Text>
    )
  }, [deleteSubject, eventConnections])

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
            getItemKey={getSpeakerKey}
            onVisibleIdsChange={handleVisibleIdsChange}
            onRefresh={handleRefresh}
            createButton={createButton}
            emptyStateIllustration={<MicrophoneIllustration aria-hidden />}
            emptyStateTitle="No Speakers Found"
            emptyStateDescription="Get started by adding your first speaker to this series"
            dataTableTestIds={SPEAKERS_DASHBOARD_TABLE_TEST_IDS}
            searchPlaceholder="Search speakers..."
            searchKeys={SPEAKERS_SEARCH_KEYS}
            searchFilter={(speaker, query) => {
              const fullName = `${speaker.firstName || ''} ${speaker.lastName || ''}`.toLowerCase()
              return (
                fullName.includes(query) || speakerTitleSearchText(speaker, effectiveLocales).includes(query)
              )
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
        scopeLocales={scopeLocales}
      />

      {/*
        Single delete confirmation. Removal from linked events is stated as a consequence,
        not offered as a choice: the backend deletes the series speaker and every event
        association in one atomic transaction, so "series only" was never achievable.
      */}
      <DialogTrigger
        isOpen={!!speakerToDelete}
        onOpenChange={(isOpen) => !isOpen && setSpeakerToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Speaker"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            void handleConfirmDelete()
          }}
          onCancel={() => setSpeakerToDelete(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Text>
              Are you sure you want to delete{' '}
              <strong>{deleteSubject?.firstName} {deleteSubject?.lastName}</strong>?
            </Text>
            {deleteLinkedEventsNotice}
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
        events={speakerForConnections ? eventConnections.get(speakerForConnections.speakerId) : undefined}
        isLoading={!!speakerForConnections && loadingEventCounts.has(speakerForConnections.speakerId)}
      />
      
      <BlurredLoadingOverlay
        visible={isLoadingSeries || isLoadingSpeakers}
        message={isLoadingSeries ? 'Loading series...' : 'Loading speakers...'}
        ariaLabel={isLoadingSeries ? 'Loading series' : 'Loading speakers'}
      />
      <BlurredLoadingOverlay
        visible={isCheckingConnections}
        message="Checking linked events..."
        ariaLabel="Checking linked events"
        zIndex={9999}
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
