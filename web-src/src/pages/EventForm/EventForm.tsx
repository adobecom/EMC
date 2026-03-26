/* 
* <license header>
*/

import React, { useEffect, useCallback, useRef, useState } from 'react'
import {
  Button,
  Picker,
  PickerItem,
  Text,
  Heading,
  Divider,
  ProgressCircle,
  Dialog,
  DialogTrigger,
  Content,
  ButtonGroup,
} from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import { useNavigate, useParams } from 'react-router-dom'
import ChevronRight from "@react-spectrum/s2/icons/ChevronRight"
import ChevronLeft from "@react-spectrum/s2/icons/ChevronLeft"
import AlertTriangle from '@react-spectrum/s2/icons/AlertTriangle'
import {
  EventApiResponse,
  SeriesApiResponse,
  SeriesTemplate
} from '../../types/domain'
import { cachedApi } from '../../services/api'
import { configService } from '../../services/configService'
import { IMS } from '../../types'
import { FormWizard, WizardStep, BlurredLoadingOverlay, FormCard, HistoryTimeline } from '../../components/shared'
import { 
  EventFormatComponent, 
  EventTagsComponent, 
  EventInfoComponent, 
  AgendaComponent, 
  VenueComponent, 
  SpeakersComponent, 
  SponsorsComponent, 
  EventImagesComponent, 
  RegistrationConfigComponent, 
  PageMetadataComponent,
  PromotionalContentComponent,
  MarketoIntegrationComponent,
  VideoContentComponent
} from './index'
import { mapApiResponseToFormData } from '../../utils/eventFormMappers'
import { useEventFeatureFlags } from '../../hooks/useEventTypeFeatures'
import { EventFormProvider, useEventFormContext, useToast } from '../../contexts'
import { useEventFormSave } from '../../hooks/useEventFormSave'
import { useCustomDetailPagePath } from '../../hooks/useCustomDetailPagePath'
import { COLORS, Z_INDEX, TYPOGRAPHY } from '../../styles/designSystem'
import { getEspEnvParam } from '../../config/constants'

// ============================================================================
// FORMAT SELECTION OVERLAY
// ============================================================================

interface CloudOption {
  key: string
  label: string
}

interface SeriesOption {
  id: string
  name: string
  description?: string
}

/**
 * FormatSelectionOverlay - Full-screen frosted glass overlay with cloud/series selection
 * 
 * Shown when the user has not yet confirmed cloud + series for a new event.
 * The form renders behind the overlay but is non-interactive.
 */
const FormatSelectionOverlay: React.FC<{
  eventType: 'in-person' | 'webinar'
  onConfirm: (cloudType: 'CreativeCloud' | 'ExperienceCloud', seriesId: string) => void
  onCancel: () => void
}> = ({ eventType, onConfirm, onCancel }) => {
  // Local state for selections — only committed to context on confirm
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)

  // Data
  const [clouds] = useState<CloudOption[]>([
    { key: 'CreativeCloud', label: 'Creative Cloud' },
    { key: 'ExperienceCloud', label: 'Experience Cloud' }
  ])
  const [allSeries, setAllSeries] = useState<SeriesApiResponse[]>([])
  const [seriesTemplates, setSeriesTemplates] = useState<SeriesTemplate[]>([])
  const [filteredSeries, setFilteredSeries] = useState<SeriesOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [seriesResponse, templatesConfig] = await Promise.all([
          cachedApi.getSeriesList(),
          configService.getSeriesTemplates()
        ])

        if (!isMounted) return

        if (templatesConfig?.data) {
          setSeriesTemplates(templatesConfig.data)
        }

        if (seriesResponse && Array.isArray(seriesResponse)) {
          const published = seriesResponse.filter(
            (s: SeriesApiResponse) => s.seriesStatus === 'published'
          )
          setAllSeries(published)
        } else {
          setError('Failed to load series list')
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load format selection data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [])

  // ============================================================================
  // SERIES FILTERING
  // ============================================================================

  /**
   * Map form event type to API event type format
   */
  const mapEventTypeToApiFormat = (type: string): string => {
    const mapping: Record<string, string> = {
      'in-person': 'InPerson',
      'webinar': 'Webinar',
      'hybrid': 'Hybrid'
    }
    return mapping[type] || type
  }

  /**
   * Check if a series template supports the given event type
   */
  const templateSupportsEventType = (templateId: string, currentEventType: string, templates: SeriesTemplate[]): boolean => {
    const apiEventType = mapEventTypeToApiFormat(currentEventType)
    const template = templates.find(t => t['template-path'] === templateId)
    
    if (!template) {
      // Backward compatibility: allow if template not in config
      return true
    }
    
    const supportedType = template['supported-event-type']
    if (supportedType === 'Hybrid') return true
    return supportedType === apiEventType
  }

  useEffect(() => {
    if (!selectedCloud || allSeries.length === 0) {
      setFilteredSeries([])
      return
    }

    // Filter by cloud type
    let filtered = allSeries.filter(
      (s: SeriesApiResponse) => s.cloudType === selectedCloud
    )

    // Filter by event type using template matching
    if (seriesTemplates.length > 0) {
      filtered = filtered.filter((s: SeriesApiResponse) =>
        templateSupportsEventType(s.templateId, eventType, seriesTemplates)
      )
    }

    const options = filtered.map((s: SeriesApiResponse) => ({
      id: s.seriesId,
      name: s.seriesName,
      description: s.seriesDescription
    }))

    setFilteredSeries(options)

    // Clear series selection if the previously selected series is no longer available
    if (selectedSeries && !options.some(s => s.id === selectedSeries)) {
      setSelectedSeries(null)
    }
  }, [selectedCloud, allSeries, seriesTemplates, eventType])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCloudChange = (key: React.Key | null) => {
    setSelectedCloud(key ? String(key) : null)
    setSelectedSeries(null) // Reset series when cloud changes
  }

  const handleSeriesChange = (key: React.Key | null) => {
    setSelectedSeries(key ? String(key) : null)
  }

  const handleConfirm = () => {
    if (selectedCloud && selectedSeries) {
      onConfirm(
        selectedCloud as 'CreativeCloud' | 'ExperienceCloud',
        selectedSeries
      )
    }
  }

  const isConfirmDisabled = !selectedCloud || !selectedSeries

  // ============================================================================
  // RENDER
  // ============================================================================

  const eventTypeLabel = eventType === 'webinar' ? 'Webinar' : 'In-person Event'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: Z_INDEX.MODAL_BACKDROP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--spectrum-global-color-gray-50)',
          borderRadius: 8,
          padding: 40,
          width: 520,
          zIndex: Z_INDEX.MODAL,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
          maxWidth: '90vw',
        }}
      >
        {/* Header */}
        <div className={style({display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24})}>
          <Text UNSAFE_style={{ 
            fontSize: '13px', 
            fontWeight: 500, 
            color: COLORS.GRAY_700,
            letterSpacing: '0.3px',
          }}>
            {eventTypeLabel.toUpperCase()}
          </Text>
          <Heading level={2} UNSAFE_style={{ 
            ...TYPOGRAPHY.STEP_HEADING,
            fontSize: '22px',
          }}>
            Select Event Format
          </Heading>
          <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
            Choose the cloud and series for this event. This determines
            where your event will be published and what metadata it inherits.
          </Text>
        </div>

        <Divider size="S" styles={style({ marginBottom: 24 })} />

        {/* Content */}
        {isLoading ? (
          <div className={style({display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16})} style={{minHeight: 'var(--spectrum-global-dimension-size-2000)'}}>
            <ProgressCircle aria-label="Loading format options..." isIndeterminate size="M" />
            <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '14px' }}>
              Loading format options...
            </Text>
          </div>
        ) : error ? (
          <div
            style={{
              padding: 16,
              background: 'var(--spectrum-semantic-negative-color-default, #d7373f)',
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <Text UNSAFE_style={{ color: 'white' }}>Error: {error}</Text>
          </div>
        ) : (
          <div className={style({display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32})}>
            <Picker
              label="Cloud"
              isRequired
              selectedKey={selectedCloud}
              onSelectionChange={handleCloudChange}
              placeholder="Choose a cloud..."
              styles={style({ width: '[100%]' })}
            >
              {clouds.map((cloud) => (
                <PickerItem key={cloud.key} id={cloud.key}>{cloud.label}</PickerItem>
              ))}
            </Picker>

            <Picker
              label="Series"
              isRequired
              selectedKey={selectedSeries}
              onSelectionChange={handleSeriesChange}
              isDisabled={!selectedCloud}
              placeholder={!selectedCloud ? 'Select a cloud first' : 'Choose a series...'}
              styles={style({ width: '[100%]' })}
              description={
                selectedSeries
                  ? filteredSeries.find(s => s.id === selectedSeries)?.description || undefined
                  : undefined
              }
            >
              {filteredSeries.length === 0 ? (
                <PickerItem id="no-series">No series available for this cloud</PickerItem>
              ) : (
                filteredSeries.map((s) => (
                  <PickerItem key={s.id} id={s.id}>{s.name}</PickerItem>
                ))
              )}
            </Picker>

            {selectedCloud && filteredSeries.length === 0 && (
              <div
                style={{
                  padding: 12,
                  backgroundColor: 'rgba(230, 134, 25, 0.15)',
                  borderRadius: 8,
                }}
              >
                <Text UNSAFE_style={{ fontSize: '13px' }}>
                  No event series available for this cloud and event type combination. 
                  Please create a series first or contact your administrator.
                </Text>
              </div>
            )}
          </div>
        )}

        <Divider size="S" styles={style({ marginBottom: 24 })} />

        {/* Actions */}
        <div className={style({display: 'flex', justifyContent: 'end', gap: 16})}>
          <Button
            variant="secondary"
            onPress={onCancel}
          >
            <ChevronLeft />
            <Text>Back to Dashboard</Text>
          </Button>
          <Button
            variant="accent"
            onPress={handleConfirm}
            isDisabled={isConfirmDisabled || isLoading}
          >
            <Text>Confirm & Continue</Text>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INNER FORM COMPONENT (uses context)
// ============================================================================

interface EventFormInnerProps {
  ims: IMS
}

const EventFormInner: React.FC<EventFormInnerProps> = ({ ims: _ims }) => {
  const navigate = useNavigate()
  const { id: eventIdParam } = useParams<{ id: string }>()
  const toast = useToast()
  
  // Track the last error shown to prevent duplicate toasts
  const lastErrorShownRef = useRef<string | null>(null)
  
  // Get context
  const {
    formData,
    eventId,
    isEditMode,
    isLoading,
    isPublished,
    maxStepReached,
    isFormatConfirmed,
    updateFormData,
    setEventId,
    setEditMode,
    setEventResponse,
    setLocale,
    populateFormDataFromResponse,
    setLoading,
    setLoadError,
    setPublished,
    setMaxStepReached,
    setFormatConfirmed,
    setSeriesId,
    loadFromStorage,
    persistToStorage,
    state,
  } = useEventFormContext()
  
  // Get save hook
  const { publishEvent, saveDraft, isSaving, saveError } = useEventFormSave()

  // Custom URL pattern hook
  const { getDetailPagePathForSave } = useCustomDetailPagePath()

  // Dialog state for custom detailPagePath confirmation
  const [urlDialogState, setUrlDialogState] = useState<{
    url: string
    collision: EventApiResponse | null
    pendingAction: 'save' | 'publish'
    relativeUrl: string
  } | null>(null)
  const [isCheckingUrl, setIsCheckingUrl] = useState(false)
  
  // Show toast when saveError changes
  useEffect(() => {
    if (saveError && saveError !== lastErrorShownRef.current) {
      toast.error(saveError, { duration: 8000 })
      lastErrorShownRef.current = saveError
    }
    // Reset when error is cleared
    if (!saveError) {
      lastErrorShownRef.current = null
    }
  }, [saveError, toast])
  
  // Get feature flags based on event type + cloud type
  const { hasVenue, hasPageMetadata, hasMarketoIntegration } = useEventFeatureFlags(formData.eventType, formData.cloudType)
  
  // ============================================================================
  // LOAD EVENT DATA
  // ============================================================================
  
  useEffect(() => {
    if (eventIdParam) {
      setEventId(eventIdParam)
      setEditMode(true)
      setFormatConfirmed(true) // Edit mode: format is already set
      loadEvent(eventIdParam)
    } else {
      loadFromStorage()
    }
  }, [eventIdParam])
  
  // Auto-confirm format when loading a draft that already has cloud + series selected
  useEffect(() => {
    if (!isEditMode && !isFormatConfirmed && formData.cloudType && formData.seriesId) {
      setFormatConfirmed(true)
    }
  }, [isEditMode, isFormatConfirmed, formData.cloudType, formData.seriesId, setFormatConfirmed])
  
  const loadEvent = async (eventIdToLoad: string) => {
    setLoading(true)
    try {
      const response = await cachedApi.getEventFull(eventIdToLoad)
      
      if ('error' in response) {
        console.error('Failed to load event:', response)
        setLoadError('Failed to load event data')
        return
      }
      
      setEventResponse(response as EventApiResponse)
      
      // Set published status
      setPublished(response.published ?? false)
      
      // When editing an existing event, all steps are accessible
      setMaxStepReached(3) // 0-indexed, so 3 is the last step (RSVP)
      
      const eventLocale = response.defaultLocale || 'en-US'
      setLocale(eventLocale)
      const mappedData = mapApiResponseToFormData(response as EventApiResponse, eventLocale)
      populateFormDataFromResponse(mappedData)
      
    } catch (err) {
      console.error('Failed to load event:', err)
      setLoadError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }
  
  // ============================================================================
  // FORMAT SELECTION HANDLERS
  // ============================================================================
  
  /**
   * Handle format selection confirmation from the overlay dialog
   */
  const handleFormatConfirm = useCallback((
    cloudType: 'CreativeCloud' | 'ExperienceCloud',
    seriesId: string
  ) => {
    updateFormData({ cloudType })
    setSeriesId(seriesId)
    setFormatConfirmed(true)
  }, [updateFormData, setSeriesId, setFormatConfirmed])
  
  /**
   * Handle cancel from the format selection overlay — go back to dashboard
   */
  const handleFormatCancel = useCallback(() => {
    navigate('/events')
  }, [navigate])
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  /**
   * Check whether the selected series requires a custom detailPagePath.
   * If so, show a confirmation/collision dialog instead of saving immediately.
   * Returns true when save should proceed directly (no pattern or edit mode).
   */
  const checkUrlPatternBeforeSave = useCallback(async (
    action: 'save' | 'publish'
  ): Promise<{ proceed: boolean; extraPayload?: Record<string, any> }> => {
    // Only intercept on first creation (no eventId yet)
    if (isEditMode || eventId) return { proceed: true }

    setIsCheckingUrl(true)
    try {
      const result = await getDetailPagePathForSave(formData.seriesId, formData)
      if (!result) return { proceed: true }

      // Pattern found — show confirmation dialog
      setUrlDialogState({ url: result.url, collision: result.collision, pendingAction: action, relativeUrl: result.relativeUrl })
      return { proceed: false }
    } catch (err) {
      console.error('URL pattern check failed:', err)
      // On error, let the save through without a custom path
      return { proceed: true }
    } finally {
      setIsCheckingUrl(false)
    }
  }, [isEditMode, eventId, formData, getDetailPagePathForSave])

  /**
   * Execute the actual save/publish after URL confirmation
   */
  const executeSaveWithUrl = useCallback(async (
    action: 'save' | 'publish',
    relativeUrl: string
  ) => {
    setUrlDialogState(null)
    persistToStorage()

    const extra = { url: relativeUrl }

    if (action === 'publish') {
      await publishEvent({
        extraPayload: extra,
        onSuccess: () => {
          setPublished(true)
          toast.success(
            isPublished ? 'Event re-published successfully!' : 'Event published successfully!',
            {
              duration: 3000,
              action: { label: 'View Events', onPress: () => navigate('/events') }
            }
          )
          setTimeout(() => navigate('/events'), 2000)
        },
        onError: (error) => {
          console.error('Failed to publish event:', error)
        }
      })
    } else {
      await saveDraft({
        extraPayload: extra,
        onSuccess: () => {
          toast.success('Event saved successfully!')
        },
        onError: (error) => {
          console.error('Failed to save event:', error)
        }
      })
    }
  }, [publishEvent, saveDraft, persistToStorage, setPublished, navigate, toast, isPublished])

  /**
   * Handle Save button click - saves to API + sessionStorage without advancing
   * Returns true on success, false on failure
   */
  const handleSave = useCallback(async (): Promise<boolean> => {
    const { proceed, extraPayload } = await checkUrlPatternBeforeSave('save')
    if (!proceed) return false // Dialog will handle continuation

    persistToStorage()

    const result = await saveDraft({
      extraPayload,
      onSuccess: () => {
        toast.success(isEditMode ? 'Event updated successfully!' : 'Event saved successfully!')
      },
      onError: (error) => {
        console.error('Failed to save event:', error)
      }
    })
    
    return result.success
  }, [checkUrlPatternBeforeSave, saveDraft, persistToStorage, toast, isEditMode])
  
  /**
   * Handle Next Step button click - saves to API + sessionStorage then advances
   * Returns true on success (so FormWizard can advance), false on failure
   */
  const handleNextStep = useCallback(async (): Promise<boolean> => {
    const { proceed, extraPayload } = await checkUrlPatternBeforeSave('save')
    if (!proceed) return false

    persistToStorage()
    
    const result = await saveDraft({
      extraPayload,
      onSuccess: () => {
        toast.success('Progress saved', { duration: 2000 })
      },
      onError: (error) => {
        console.error('Failed to save event:', error)
      }
    })
    
    return result.success
  }, [checkUrlPatternBeforeSave, saveDraft, persistToStorage, toast])
  
  /**
   * Handle Publish/Re-publish button click (last step completion)
   */
  const handleComplete = useCallback(async () => {
    const { proceed, extraPayload } = await checkUrlPatternBeforeSave('publish')
    if (!proceed) return

    persistToStorage()
    
    await publishEvent({
      extraPayload,
      onSuccess: () => {
        setPublished(true)
        toast.success(
          isPublished ? 'Event re-published successfully!' : 'Event published successfully!',
          { 
            duration: 3000,
            action: {
              label: 'View Events',
              onPress: () => navigate('/events')
            }
          }
        )
        setTimeout(() => {
          navigate('/events')
        }, 2000)
      },
      onError: (error) => {
        console.error('Failed to publish event:', error)
      }
    })
  }, [checkUrlPatternBeforeSave, publishEvent, persistToStorage, setPublished, navigate, toast, isPublished])
  
  /**
   * Handle max step change from FormWizard
   */
  const handleMaxStepChange = useCallback((step: number) => {
    setMaxStepReached(step)
  }, [setMaxStepReached])
  
  const handleCancel = useCallback(() => {
    navigate('/events')
  }, [navigate])
  
  /**
   * Handle preview requests
   * Uses detailPagePath from event response with preview parameters
   */
  const handlePreview = useCallback((previewType: 'pre-event' | 'post-event') => {
    const eventResponse = state.eventDataResp
    
    if (!eventResponse?.detailPagePath) {
      return
    }
    
    const localStartTimeMillis = eventResponse.localStartTimeMillis || 0
    // Pre-event: timing before event start, Post-event: timing after event start
    const timing = previewType === 'pre-event' 
      ? localStartTimeMillis - 10 
      : localStartTimeMillis + 10
    
    const previewUrl = new URL(eventResponse.detailPagePath)
    previewUrl.searchParams.set('timing', String(timing))
    const espenv = getEspEnvParam()
    if (espenv) {
      previewUrl.searchParams.set('espenv', espenv)
    }
    
    window.open(previewUrl.toString(), '_blank')
  }, [state.eventDataResp])
  
  // ============================================================================
  // STEP 1: Basic Info
  // All components now use context directly - no props needed
  // ============================================================================
  const step1IsValid =
    formData.seriesId !== '' &&
    formData.name.trim() !== '' &&
    formData.language !== '' &&
    Boolean(formData.shortDescription && formData.shortDescription.trim() !== '') &&
    formData.startDateTime !== '' &&
    formData.endDateTime !== '' &&
    Boolean(formData.timezone && formData.timezone.trim() !== '') && // Timezone is required
    (hasVenue ? Boolean(formData.venue?.placeId) : true)
  
  const step1Component = (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 0})}>
      <FormCard>
        <EventFormatComponent />
      </FormCard>

      <FormCard>
        <EventTagsComponent />
      </FormCard>

      <FormCard>
        <EventInfoComponent />
      </FormCard>

      <FormCard>
        <AgendaComponent />
      </FormCard>

      {hasVenue && (
        <FormCard>
          <VenueComponent />
        </FormCard>
      )}

      {hasPageMetadata && (
        <FormCard>
          <PageMetadataComponent />
        </FormCard>
      )}

      {hasMarketoIntegration && (
        <FormCard>
          <MarketoIntegrationComponent />
        </FormCard>
      )}
    </div>
  )

  // ============================================================================
  // STEP 2: Speakers & Hosts
  // ============================================================================
  const step2Component = (
    <FormCard>
      <SpeakersComponent />
    </FormCard>
  )
  
  // ============================================================================
  // STEP 3: Additional Content
  // ============================================================================
  const isWebinarEvent = formData.eventType === 'webinar'

  const step3Component = (
    <>
      <FormCard>
        <PromotionalContentComponent />
      </FormCard>

      <FormCard>
        <SponsorsComponent />
      </FormCard>

      <FormCard>
        <EventImagesComponent />
      </FormCard>

      {isWebinarEvent && (
        <FormCard>
          <VideoContentComponent />
        </FormCard>
      )}
    </>
  )
  
  // ============================================================================
  // STEP 4: RSVP
  // ============================================================================
  const step4Component = (
    <FormCard>
      <RegistrationConfigComponent />
    </FormCard>
  )
  
  // ============================================================================
  // WIZARD STEPS
  // ============================================================================
  const steps: WizardStep[] = [
    {
      id: 'basic-info',
      title: 'Basic Info',
      description: 'Event format, tags, information, date/time, and venue',
      component: step1Component,
      isValid: step1IsValid
    },
    {
      id: 'speakers-hosts',
      title: 'Speakers & Hosts',
      description: 'Add speaker and host profiles (optional)',
      component: step2Component,
      isValid: true
    },
    {
      id: 'additional-content',
      title: 'Additional Content',
      description: 'Add event images and visual content (optional)',
      component: step3Component,
      isValid: true
    },
    {
      id: 'rsvp',
      title: 'RSVP',
      description: 'Configure attendance capacity and registration settings',
      component: step4Component,
      isValid: true
    }
  ]
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return <BlurredLoadingOverlay visible={true} message="Loading event data..." ariaLabel="Loading event" />
  }
  
  // Determine event type label for display
  const getEventTypeLabel = (): string => {
    const eventType = formData.eventType
    switch (eventType) {
      case 'webinar':
        return 'Webinar'
      case 'in-person':
      default:
        return 'In-person event'
    }
  }

  // Render history timeline only in edit mode with a valid eventId
  const renderHeaderActions = () => {
    if (!isEditMode || !eventId) {
      return null
    }
    return <HistoryTimeline resourceId={eventId} resourceType="event" />
  }

  // Whether to show the format selection overlay
  const showFormatOverlay = !isFormatConfirmed && !isEditMode

  return (
    <div style={{ backgroundColor: '#F5F5F5' }}>
      <FormWizard
        steps={steps}
        onComplete={handleComplete}
        onSave={handleSave}
        onNextStep={handleNextStep}
        onCancel={handleCancel}
        onPreview={handlePreview}
        isSubmitting={isSaving}
        showSideNav={true}
        hasEventId={!!eventId}
        isPublished={isPublished}
        maxStepReached={maxStepReached}
        onMaxStepChange={handleMaxStepChange}
        eventTypeLabel={getEventTypeLabel()}
        headerActions={renderHeaderActions()}
      />

      {/* Format Selection Overlay — frosted glass + dialog */}
      {showFormatOverlay && (
        <FormatSelectionOverlay
          eventType={formData.eventType}
          onConfirm={handleFormatConfirm}
          onCancel={handleFormatCancel}
        />
      )}

      {/* Custom URL Pattern Confirmation Dialog */}
      <DialogTrigger
        isOpen={urlDialogState !== null}
        onOpenChange={(open) => { if (!open) setUrlDialogState(null) }}
      >
        <div style={{ display: 'none' }} />
        <Dialog size="M">
          <Heading slot="title">{urlDialogState?.collision ? 'URL Conflict Detected' : 'Confirm Event URL'}</Heading>
          <Divider />
          <Content>
            <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
              <Text>The following detail page URL will be assigned to this event:</Text>
              <div
                style={{
                  background: 'var(--spectrum-global-color-gray-75)',
                  padding: 12,
                  borderRadius: 4,
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  fontSize: 13,
                }}
              >
                <Text>{urlDialogState?.url}</Text>
              </div>

              {urlDialogState?.collision && (
                <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
                  <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
                    <AlertTriangle />
                    <Text UNSAFE_style={{ color: COLORS.RED_600, fontWeight: 600 }}>
                      This URL is already in use by another event.
                    </Text>
                  </div>
                  <Text>
                    The event <strong>{urlDialogState.collision.title || urlDialogState.collision.enTitle || urlDialogState.collision.eventId}</strong> already
                    uses this URL. Please go back and change the fields that affect the URL
                    (e.g. title or start date) before saving.
                  </Text>
                </div>
              )}
            </div>
          </Content>
          <ButtonGroup>
            <Button
              variant="secondary"
              onPress={() => setUrlDialogState(null)}
            >
              {urlDialogState?.collision ? 'Go Back' : 'Cancel'}
            </Button>
            {!urlDialogState?.collision && (
              <Button
                variant="accent"
                onPress={() => {
                  if (urlDialogState) {
                    executeSaveWithUrl(urlDialogState.pendingAction, urlDialogState.relativeUrl)
                  }
                }}
              >
                Confirm & Save
              </Button>
            )}
          </ButtonGroup>
        </Dialog>
      </DialogTrigger>

      {/* URL pattern check loading overlay */}
      {isCheckingUrl && (
        <BlurredLoadingOverlay visible={true} message="Checking URL pattern..." ariaLabel="Checking URL" />
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT (provides context)
// ============================================================================

interface EventFormProps {
  ims: IMS
}

export const EventForm: React.FC<EventFormProps> = ({ ims }) => {
  const { id, eventType: eventTypeParam } = useParams<{ id: string; eventType: string }>()
  
  const initialEventType = (eventTypeParam === 'webinar' ? 'webinar' : 'in-person') as 'in-person' | 'webinar'
  
  return (
    <EventFormProvider
      initialEventId={id || null}
      initialEventType={initialEventType}
      autoPersist={true}
    >
      <EventFormInner ims={ims} />
    </EventFormProvider>
  )
}
