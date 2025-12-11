/* 
* <license header>
*/

import { useCallback } from 'react'
import { useEventFormContext } from '../contexts/EventFormContext'
import { apiService } from '../services/api'
import { EventFormData, EventApiResponse } from '../types/domain'
import {
  EVENT_DATA_FILTER,
  setEventAttribute,
  isValidAttribute,
} from '../utils/dataFilters'

/**
 * Options for the save operation
 */
export interface SaveOptions {
  /** If true, also publish the event after saving */
  publish?: boolean
  /** Skip calling component onAfterSave callbacks */
  skipAfterSave?: boolean
  /** Custom success callback */
  onSuccess?: (eventId: string, response: EventApiResponse) => void
  /** Custom error callback */
  onError?: (error: Error) => void
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  success: boolean
  eventId?: string
  response?: EventApiResponse
  error?: string
}

/**
 * Hook that provides save/publish functionality for the event form
 * Orchestrates the save flow across all registered components
 * 
 * Save Flow:
 * 1. Validate all components (if any return error, abort)
 * 2. Gather payload contributions from all components
 * 3. Build the localized event payload
 * 4. Call create/update event API
 * 5. Call all component onAfterSave callbacks in parallel (for venue, images, etc.)
 * 6. Clear session storage draft
 * 7. Update context with new response
 * 
 * @example
 * ```tsx
 * function EventFormActions() {
 *   const { saveEvent, publishEvent, isSaving } = useEventFormSave()
 *   
 *   return (
 *     <>
 *       <Button onPress={() => saveEvent()}>Save Draft</Button>
 *       <Button onPress={() => publishEvent()}>Publish</Button>
 *     </>
 *   )
 * }
 * ```
 */
export function useEventFormSave() {
  const context = useEventFormContext()
  const {
    formData,
    eventId,
    seriesId,
    locale,
    isEditMode,
    saveStatus,
    eventDataResp, // Raw API response - contains modificationTime/creationTime for updates
    getRegisteredComponents,
    setEventId,
    setEventResponse,
    setSaveStatus,
    setSaveError,
    clearStorage,
  } = context
  
  /**
   * Build the API payload from form data, handling localization
   */
  const buildEventPayload = useCallback((
    data: EventFormData,
    additionalPayload: Partial<EventFormData> = {}
  ): Record<string, any> => {
    const mergedData = { ...data, ...additionalPayload }
    const payload: Record<string, any> = {}
    const localizations: Record<string, any> = {}
    
    // Process each field according to the data filter
    // Note: Some fields are handled specially below (tags, eventType, dates, etc.)
    const speciallyHandledFields = new Set(['tags', 'eventType', 'startDateTime', 'endDateTime', 'agendaItems'])
    
    Object.entries(mergedData).forEach(([key, value]) => {
      const descriptor = EVENT_DATA_FILTER[key]
      
      // Skip non-submittable fields
      if (!descriptor?.submittable) return
      
      // Skip fields that are handled specially below
      if (speciallyHandledFields.has(key)) return
      
      // Skip invalid values (null, undefined, empty string - but not false)
      if (!isValidAttribute(value)) return
      
      // Handle localizable fields
      if (descriptor.localizable) {
        if (!localizations[locale]) {
          localizations[locale] = {}
        }
        localizations[locale][key] = value
      } else {
        payload[key] = value
      }
    })
    
    // Add localizations to payload if we have any
    if (Object.keys(localizations).length > 0) {
      payload.localizations = localizations
    }
    
    // Map form field names to API field names where they differ
    
    // EventType mapping - API requires PascalCase: "InPerson" | "Webinar" | "Hybrid"
    // Form uses lowercase: "in-person" | "webinar"
    if (mergedData.eventType) {
      const eventTypeMap: Record<string, string> = {
        'in-person': 'InPerson',
        'webinar': 'Webinar',
        'hybrid': 'Hybrid',
        // Also handle if already in correct format
        'InPerson': 'InPerson',
        'Webinar': 'Webinar',
        'Hybrid': 'Hybrid',
      }
      payload.eventType = eventTypeMap[mergedData.eventType] || 'InPerson'
    }
    
    // Date/Time mapping - API requires separate localStartDate/localEndDate and localStartTime/localEndTime
    // Form uses combined startDateTime/endDateTime
    // Per OpenAPI Time schema: pattern "^(00|0[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$"
    // Format must be HH:MM:SS (with seconds)
    if (mergedData.startDateTime) {
      const [startDate, startTime] = mergedData.startDateTime.split('T')
      payload.localStartDate = startDate
      // Ensure HH:MM:SS format - append :00 if only HH:MM provided
      const formattedStartTime = startTime?.slice(0, 5) || '09:00'
      payload.localStartTime = formattedStartTime.length === 5 ? `${formattedStartTime}:00` : formattedStartTime
    }
    if (mergedData.endDateTime) {
      const [endDate, endTime] = mergedData.endDateTime.split('T')
      payload.localEndDate = endDate
      // Ensure HH:MM:SS format - append :00 if only HH:MM provided
      const formattedEndTime = endTime?.slice(0, 5) || '17:00'
      payload.localEndTime = formattedEndTime.length === 5 ? `${formattedEndTime}:00` : formattedEndTime
    }
    
    // Title mapping
    if (mergedData.name) {
      setEventAttribute(payload, 'title', mergedData.name, locale)
      payload.enTitle = mergedData.name // English title for URL generation
    }
    
    // Description mapping (shortDescription -> description in API)
    if (mergedData.shortDescription) {
      setEventAttribute(payload, 'description', mergedData.shortDescription, locale)
    }
    
    // Rich description -> eventDetails
    if (mergedData.description) {
      setEventAttribute(payload, 'eventDetails', mergedData.description, locale)
    }
    
    // Agenda items transformation
    // Per OpenAPI AgendaItem schema: startTime uses Time schema (HH:MM:SS format)
    if (mergedData.agendaItems && mergedData.agendaItems.length > 0) {
      const agendaForApi = mergedData.agendaItems.map(item => {
        const rawTime = item.startDateTime?.split('T')[1]?.slice(0, 5) || '09:00'
        // Ensure HH:MM:SS format
        const startTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime
        return {
          title: item.title,
          description: item.description || '',
          startTime,
        }
      })
      setEventAttribute(payload, 'agenda', agendaForApi, locale)
    }
    
    // CTA (secondary link) transformation
    // Per OpenAPI CTAObject schema: requires "label" and "url" (format: uri)
    // Only include CTA if we have both valid url and label
    if (mergedData.communityForumUrl && mergedData.secondaryLinkTitle) {
      // Validate URL format (must be a valid URI, typically https://)
      const url = mergedData.communityForumUrl.trim()
      const label = mergedData.secondaryLinkTitle.trim()
      
      if (url && label) {
        const cta = [{
          url,
          label
          // Note: "type" is not in OpenAPI CTAObject schema, removed to avoid validation failure
        }]
        setEventAttribute(payload, 'cta', cta, locale)
      }
    }
    
    // RSVP description
    if (mergedData.rsvpDescription) {
      setEventAttribute(payload, 'rsvpDescription', mergedData.rsvpDescription, locale)
    }
    
    // Capacity -> attendeeLimit
    if (mergedData.capacity !== undefined) {
      payload.attendeeLimit = mergedData.capacity
    }
    
    // Waitlist mapping
    if (mergedData.allowWaitlist !== undefined) {
      payload.allowWaitlisting = mergedData.allowWaitlist
    }
    
    // Privacy mapping
    payload.isPrivate = mergedData.isPrivate ?? false
    
    // Tags transformation (array of EventTag -> comma-separated CAAS IDs string)
    // Per OpenAPI TagIdList schema:
    // - Type: string | null (NOT array)
    // - Pattern: ^(?:caas:[0-9a-zA-Z-_\/,&()]+)+[^\/,-]$
    // - Must start with "caas:"
    // - Cannot end with "/", ",", or "-"
    if (mergedData.tags && Array.isArray(mergedData.tags) && mergedData.tags.length > 0) {
      const validTags = mergedData.tags
        .filter((tag: any) => tag.caasId && typeof tag.caasId === 'string' && tag.caasId.startsWith('caas:'))
        .map((tag: any) => tag.caasId.trim())
        .filter((caasId: string) => {
          // Validate pattern: must not end with /, ,, or -
          const lastChar = caasId.slice(-1)
          return lastChar !== '/' && lastChar !== ',' && lastChar !== '-'
        })
      
      if (validTags.length > 0) {
        // Join as comma-separated string (NOT array)
        payload.tags = validTags.join(',')
      }
      // If no valid tags, don't include the field (or set to null per schema)
    }
    
    // Post-event visibility flags
    if (mergedData.showAgendaPostEvent !== undefined) {
      payload.showAgendaPostEvent = mergedData.showAgendaPostEvent
    }
    if (mergedData.venue?.showVenuePostEvent !== undefined) {
      payload.showVenuePostEvent = mergedData.venue.showVenuePostEvent
    }
    if (mergedData.venue?.showAdditionalInfoPostEvent !== undefined) {
      payload.showVenueAdditionalInfoPostEvent = mergedData.venue.showAdditionalInfoPostEvent
    }
    
    // Registration configuration
    if (mergedData.registrationType === 'Marketo' && mergedData.marketoFormUrl) {
      payload.registration = {
        type: 'Marketo',
        formData: mergedData.marketoFormUrl
      }
    }
    
    // RSVP form fields
    if (mergedData.visibleRsvpFields || mergedData.requiredRsvpFields) {
      payload.rsvpFormFields = {
        visible: mergedData.visibleRsvpFields || [],
        required: mergedData.requiredRsvpFields || []
      }
    }
    
    // Ensure seriesId is set
    if (!payload.seriesId && seriesId) {
      payload.seriesId = seriesId
    }
    
    // Set default locale
    payload.defaultLocale = locale
    
    // Validate URL fields per OpenAPI NullableLink pattern (must be https:// or null)
    // communityTopicUrl: NullableLink pattern ^https:\/\/...
    if (payload.communityTopicUrl && !payload.communityTopicUrl.startsWith('https://')) {
      delete payload.communityTopicUrl // Remove invalid URL
    }
    
    return payload
  }, [locale, seriesId])
  
  /**
   * Validate all registered components
   * @returns true if all valid, or first error message string
   */
  const validateComponents = useCallback(async (): Promise<true | string> => {
    const components = getRegisteredComponents()
    
    for (const component of components) {
      if (component.callbacks.validate) {
        const result = component.callbacks.validate()
        if (result !== true) {
          return result // Return first error
        }
      }
    }
    
    return true
  }, [getRegisteredComponents])
  
  /**
   * Gather payload contributions from all registered components
   */
  const gatherComponentPayloads = useCallback(async (): Promise<Partial<EventFormData>> => {
    const components = getRegisteredComponents()
    let merged: Partial<EventFormData> = {}
    
    for (const component of components) {
      if (component.callbacks.onGatherPayload) {
        try {
          const contribution = await component.callbacks.onGatherPayload()
          merged = { ...merged, ...contribution }
        } catch (error) {
          console.error(`Error gathering payload from component ${component.id}:`, error)
        }
      }
    }
    
    return merged
  }, [getRegisteredComponents])
  
  /**
   * Call all component onAfterSave callbacks in parallel
   */
  const callAfterSaveCallbacks = useCallback(async (
    savedEventId: string,
    response: EventApiResponse
  ): Promise<void> => {
    const components = getRegisteredComponents()
    const afterSavePromises: Promise<void>[] = []
    
    for (const component of components) {
      if (component.callbacks.onAfterSave) {
        afterSavePromises.push(
          component.callbacks.onAfterSave(savedEventId, response).catch(error => {
            console.error(`Error in onAfterSave for component ${component.id}:`, error)
            // Don't throw - we want other callbacks to continue
          })
        )
      }
    }
    
    // Wait for all in parallel
    await Promise.all(afterSavePromises)
  }, [getRegisteredComponents])
  
  /**
   * Main save function
   */
  const saveEvent = useCallback(async (options: SaveOptions = {}): Promise<SaveResult> => {
    const { publish = false, skipAfterSave = false, onSuccess, onError } = options
    
    try {
      // 1. Set saving status
      setSaveStatus('saving')
      setSaveError(null)
      
      // 2. Validate all components
      const validationResult = await validateComponents()
      if (validationResult !== true) {
        setSaveStatus('error')
        setSaveError(validationResult)
        onError?.(new Error(validationResult))
        return { success: false, error: validationResult }
      }
      
      // 3. Gather payload contributions from components
      const additionalPayload = await gatherComponentPayloads()
      
      // 4. Build the API payload
      const payload = buildEventPayload(formData, additionalPayload)
      
      // Add publish flag if requested
      if (publish) {
        payload.published = true
      } else {
        // Ensure published is always set (required by schema)
        payload.published = payload.published ?? false
      }
      
      // Ensure required fields have values
      // Per OpenAPI BaseEventProperties required: cloudType, seriesId, eventType, 
      // localStartDate, localEndDate, localStartTime, localEndTime, timezone, published
      if (!payload.cloudType) {
        payload.cloudType = formData.cloudType || 'CreativeCloud'
      }
      if (!payload.seriesId && seriesId) {
        payload.seriesId = seriesId
      }
      if (!payload.timezone) {
        // Default to America/Los_Angeles if not set (required field)
        payload.timezone = formData.timezone || 'America/Los_Angeles'
      }
      
      // 5. Call create/update API (using external ESP/ESL API)
      let response: EventApiResponse
      let savedEventId: string
      
      if (isEditMode && eventId) {
        // Per OpenAPI EventUpdateBody schema (Event -> EventDetails), eventId is required in the body
        payload.eventId = eventId
        
        // For updates, include modificationTime for optimistic locking
        // This is required by the backend to prevent concurrent update conflicts
        if (eventDataResp?.modificationTime) {
          payload.modificationTime = eventDataResp.modificationTime
        }
        
        // Per OpenAPI EventDetails schema, creationTime is also required for updates
        if (eventDataResp?.creationTime) {
          payload.creationTime = eventDataResp.creationTime
        }
        
        // Update existing event
        const result = await apiService.updateEventExternal(eventId, payload, {
          forceSpWrite: false,
          liveUpdate: publish // Only live update when publishing
        })
        if ('error' in result) {
          throw new Error(result.message || 'Failed to update event')
        }
        response = result as EventApiResponse
        savedEventId = eventId
      } else {
        // Create new event
        const result = await apiService.createEventExternal(payload, locale)
        if ('error' in result) {
          throw new Error(result.message || 'Failed to create event')
        }
        response = result as EventApiResponse
        savedEventId = response.eventId
        
        // Update context with new event ID and store the response for subsequent updates
        setEventId(savedEventId)
        setEventResponse(response) // Store response so modificationTime/creationTime are available
      }
      
      // 6. Call component onAfterSave callbacks (for venue, images, speakers, etc.)
      if (!skipAfterSave) {
        await callAfterSaveCallbacks(savedEventId, response)
      }
      
      // 7. Refresh event data to get the complete state
      const refreshedResponse = await apiService.getEventFull(savedEventId)
      if (!('error' in refreshedResponse)) {
        setEventResponse(refreshedResponse as EventApiResponse)
      }
      
      // 8. Clear session storage draft
      clearStorage()
      
      // 9. Update status
      setSaveStatus('success')
      
      // 10. Call success callback
      onSuccess?.(savedEventId, response)
      
      return {
        success: true,
        eventId: savedEventId,
        response,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save event'
      setSaveStatus('error')
      setSaveError(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [
    formData,
    eventId,
    seriesId,
    locale,
    isEditMode,
    eventDataResp,
    buildEventPayload,
    validateComponents,
    gatherComponentPayloads,
    callAfterSaveCallbacks,
    setEventId,
    setEventResponse,
    setSaveStatus,
    setSaveError,
    clearStorage,
  ])
  
  /**
   * Save and publish in one action
   */
  const publishEvent = useCallback(async (options: Omit<SaveOptions, 'publish'> = {}): Promise<SaveResult> => {
    return saveEvent({ ...options, publish: true })
  }, [saveEvent])
  
  /**
   * Save draft only (no publish)
   */
  const saveDraft = useCallback(async (options: Omit<SaveOptions, 'publish'> = {}): Promise<SaveResult> => {
    return saveEvent({ ...options, publish: false })
  }, [saveEvent])
  
  return {
    saveEvent,
    publishEvent,
    saveDraft,
    isSaving: saveStatus === 'saving',
    saveStatus,
    saveError: context.state.saveError,
  }
}

