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
    getRegisteredComponents,
    setEventId,
    setEventResponse,
    setSaveStatus,
    setSaveError,
    clearStorage,
    updateFormData,
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
    Object.entries(mergedData).forEach(([key, value]) => {
      const descriptor = EVENT_DATA_FILTER[key]
      
      // Skip non-submittable fields
      if (!descriptor?.submittable) return
      
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
    if (mergedData.agendaItems && mergedData.agendaItems.length > 0) {
      const agendaForApi = mergedData.agendaItems.map(item => ({
        title: item.title,
        description: item.description || '',
        startTime: item.startDateTime?.split('T')[1]?.slice(0, 5) || '', // Extract HH:MM
      }))
      setEventAttribute(payload, 'agenda', agendaForApi, locale)
    }
    
    // CTA (secondary link) transformation
    if (mergedData.communityForumUrl || mergedData.secondaryLinkTitle) {
      const cta = [{
        url: mergedData.communityForumUrl || '',
        label: mergedData.secondaryLinkTitle || '',
        type: 'secondary'
      }]
      setEventAttribute(payload, 'cta', cta, locale)
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
    
    // Tags transformation (array of EventTag -> comma-separated CAAS IDs)
    if (mergedData.tags && mergedData.tags.length > 0) {
      payload.tags = mergedData.tags
        .filter(tag => tag.caasId)
        .map(tag => tag.caasId)
        .join(',')
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
      }
      
      // 5. Call create/update API (using external ESP/ESL API)
      let response: EventApiResponse
      let savedEventId: string
      
      if (isEditMode && eventId) {
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
        
        // Update context with new event ID
        setEventId(savedEventId)
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
    locale,
    isEditMode,
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

