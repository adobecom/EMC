/* 
* <license header>
*/

import { useCallback } from 'react'
import { useEventFormContext } from '../contexts/EventFormContext'
import { apiService, cachedApi } from '../services/api'
import { EventFormData, EventApiResponse } from '../types/domain'
import {
  EVENT_DATA_FILTER,
  setEventAttribute,
  isValidAttribute,
} from '../utils/dataFilters'

// ─── rsvpFormFields BE-shape transition helpers ─────────────────────────────
// TODO: (rsvp-shape-migration) REMOVE THIS BLOCK once ESP BE PR #903 is deployed
// to dev + stage + prod AND all stored events return the new {fields} shape
// on GET (i.e. BE has backfilled DB or added a read-time adapter).
//
// Cleanup checklist — grep for `rsvp-shape-migration` to hit every site:
//   1. THIS FILE (`useEventFormSave.ts`) — save-side dual-shape support:
//      a. Delete `isRsvpFormFieldsRejection` and `toLegacyRsvpFormFieldsPayload`
//         below (down to the closing divider).
//      b. In the update branch of `saveEvent` (search "Transitional retry"):
//         remove the `if (isRsvpFormFieldsRejection(...)) { ... }` block and
//         change `let result` back to `const result`.
//      c. Same cleanup in the create branch — also "Transitional retry".
//      d. Trim the inline comment at the `Array.isArray` guard — drop the
//         "Old-format objects loaded from event responses..." sentence; the
//         rest of the guard and its comment are permanent.
//   2. `utils/eventFormMappers.ts` — read-side dual-shape support:
//      a. Delete the `readRsvpFormFields` helper.
//      b. Simplify the call site back to `event.rsvpFormFields?.fields ?? []`.
//
// Context: ESP #903 changes rsvpFormFields from `{ required: string[], visible: string[] }`
// (legacy) to `{ fields: [...] }` (new). Until #903 ships everywhere, EMC sends
// the legacy shape first and falls back to the new shape on rejection. On read,
// the mapper adapts either shape to the form's array form. After #903 ships and
// stored data is normalized, both adapters become dead code.

/**
 * Detect a BE rejection caused by a rsvpFormFields schema mismatch.
 * Checks the HTTP status (Ajv validation errors come back as 400) and inspects
 * both the top-level `message` and any structured `errors[]` items for a path
 * pointing at `rsvpFormFields`.
 */
function isRsvpFormFieldsRejection(result: any): boolean {
  if (!('error' in result) || result.status !== 400) return false
  const err = result.error
  if (!err || typeof err !== 'object') return false
  if (typeof err.message === 'string' && err.message.includes('rsvpFormFields')) return true
  const errors = Array.isArray(err.errors) ? err.errors : []
  return errors.some((e: any) => {
    const path = typeof e?.instancePath === 'string'
      ? e.instancePath
      : typeof e?.dataPath === 'string' ? e.dataPath : ''
    return path.includes('rsvpFormFields')
  })
}

/**
 * Convert the new `rsvpFormFields: { fields }` shape to the legacy
 * `{ required, visible }` shape that pre-#903 ESP expects.
 * Per-field `options` overrides are not representable in the legacy shape and
 * are dropped — we warn so QA can see the loss in the console.
 */
function toLegacyRsvpFormFieldsPayload(payload: Record<string, any>): Record<string, any> {
  const fields = payload.rsvpFormFields?.fields as
    | Array<{ field: string; required?: boolean; options?: unknown }>
    | undefined
  if (!fields) return payload

  const hasOptions = fields.some(f => f.options !== undefined)
  if (hasOptions) {
    console.warn(
      '[useEventFormSave] Sending legacy rsvpFormFields {required, visible} shape (ESP BE PR #903 not yet deployed). Per-field `options` overrides are dropped in the legacy shape.'
    )
  }

  return {
    ...payload,
    rsvpFormFields: {
      required: fields.filter(f => f.required).map(f => f.field),
      visible: fields.map(f => f.field),
    },
  }
}

// ────────────────────────────────────────────────────────────────────────────

/**
 * Options for the save operation
 */
export interface SaveOptions {
  /** Skip calling component onAfterSave callbacks */
  skipAfterSave?: boolean
  /** Additional fields merged into the API payload after normal payload building (e.g. `detailPagePath` for URL pattern on create) */
  extraPayload?: Record<string, any>
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
    const speciallyHandledFields = new Set(['tags', 'eventType', 'startDateTime', 'endDateTime', 'agendaItems', 'promotionalItems', 'timezone', 'inviteOnly', 'published', 'rsvpFormFields'])
    
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
    
    // Timezone handling (required field) - ensure it's set explicitly
    if (mergedData.timezone && mergedData.timezone.trim() !== '') {
      payload.timezone = mergedData.timezone
    }
    
    // Title mapping
    if (mergedData.name) {
      setEventAttribute(payload, 'title', mergedData.name, locale)
    }
    // English title for URL generation — prefer the dedicated enTitle field
    // so that saving in a non-English locale doesn't overwrite enTitle with
    // the localized name.
    if (mergedData.enTitle) {
      payload.enTitle = mergedData.enTitle
    } else if (mergedData.name) {
      payload.enTitle = mergedData.name
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

        const rawEndTime = item.endDateTime?.split('T')[1]?.slice(0, 5)
        const endTime = rawEndTime
          ? (rawEndTime.length === 5 ? `${rawEndTime}:00` : rawEndTime)
          : undefined

        return {
          title: item.title,
          description: item.description || '',
          startTime,
          ...(endTime && { endTime }),
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
    
    // Promotional items transformation
    // Form stores as PromotionalItem[] (objects with title), API expects string[] (names only)
    // Per v1 reference: promotionalItems is stored as array of strings in the API
    if (mergedData.promotionalItems && mergedData.promotionalItems.length > 0) {
      const promotionalItemsForApi = mergedData.promotionalItems
        .map((item: any) => {
          if (typeof item === 'string') return item
          return item.title || item.name || ''
        })
        .filter((name: string) => name.trim() !== '')
      
      if (promotionalItemsForApi.length > 0) {
        setEventAttribute(payload, 'promotionalItems', promotionalItemsForApi, locale)
      }
    }
    
    // Waitlist mapping
    if (mergedData.allowWaitlist !== undefined) {
      payload.allowWaitlisting = mergedData.allowWaitlist
    }
    
    // Privacy mapping
    payload.isPrivate = mergedData.isPrivate ?? false
    if (!eventId) {
      payload.inviteOnly = mergedData.inviteOnly ?? false
    }

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
    } else {
      payload.registration = {
        type: 'ESP',
        formData: 'v1'
      }
    }
    
    // RSVP form fields — array order = display order; required/options are per-field overrides.
    // Guard with Array.isArray: form state stores this as an array; an empty array must not be
    // sent as-is (BE rejects non-object values).
    // TODO(PIM): serialize rsvpOptionSelections when event API exposes per-option RSVP selection.
    if (Array.isArray(mergedData.rsvpFormFields) && mergedData.rsvpFormFields.length) {
      payload.rsvpFormFields = { fields: mergedData.rsvpFormFields }
    }

    // Custom attributes — send IDs only; labels are resolved by ESP at read time.
    if (mergedData.customAttributes?.length) {
      payload.customAttributes = mergedData.customAttributes
        .filter((v: any) => v.valueId)
        .map((v: any) => ({ attributeId: v.attributeId, valueId: v.valueId }))
    }
    // enabledAttributeIds — only set when the active scope has configs.
    // An empty _customAttributeConfigs means the current scope has no configs (e.g. the user
    // switched to a different scope than the one the event was created under). In that case
    // we skip setting it here so the caller can preserve the existing event value instead of
    // wiping it with { event: [], session: [] }.
    if (mergedData._customAttributeConfigs?.length) {
      const enabledIds = mergedData._customAttributeConfigs.map((c: any) => c.attributeId)
      payload.enabledAttributeIds = { event: enabledIds, session: [] }
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
  }, [locale, seriesId, eventId])
  
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
    const { skipAfterSave = false, extraPayload, onSuccess, onError } = options
    
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

      // 4b. Merge caller-supplied extra fields (e.g. custom detailPagePath)
      if (extraPayload) {
        Object.assign(payload, extraPayload)
      }

      // When the active scope has no custom attribute configs (user editing under a different
      // scope than the one that created the event), buildEventPayload leaves enabledAttributeIds
      // unset. Fall back to the value already on the event to avoid wiping it.
      if (!payload.enabledAttributeIds && eventDataResp?.enabledAttributeIds) {
        payload.enabledAttributeIds = eventDataResp.enabledAttributeIds
      }
      
      // `published` is read-only server-side — the client never sets it. A plain save persists
      // the record only; publishing/unpublishing happens via the dedicated action endpoints
      // (see publishEvent/previewEvent below), which are the only calls that may change it.
      delete payload.published

      // Ensure required fields have values
      // Per OpenAPI BaseEventProperties required: cloudType, seriesId, eventType,
      // localStartDate, localEndDate, localStartTime, localEndTime, timezone
      // (`published` is readOnly, no longer client-required — see above)
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

      // ESL PUT must include detailPagePath for custom URL patterns; form state omits it unless extraPayload merged it.
      if (
        isEditMode &&
        eventId &&
        !isValidAttribute(payload.detailPagePath) &&
        eventDataResp &&
        isValidAttribute(eventDataResp.detailPagePath)
      ) {
        payload.detailPagePath = eventDataResp.detailPagePath
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
        
        // Update existing event (ApiService applies prepareEslEventPutPayload before ESL PUT)
        // TODO: (rsvp-shape-migration) Transitional dual-shape: send legacy shape first;
        // retry with new {fields} shape once ESP BE PR #903 ships everywhere.
        // Revert `let result` to `const result` and remove the retry block after cleanup.
        // A plain save never triggers page generation — liveUpdate stays false here regardless
        // of publish intent. Publishing/previewing calls the dedicated action endpoint afterward.
        let result = await apiService.updateEventExternal(
          eventId,
          payload.rsvpFormFields?.fields ? toLegacyRsvpFormFieldsPayload(payload) : payload,
          { forceSpWrite: false, liveUpdate: false }
        )

        if (isRsvpFormFieldsRejection(result) && payload.rsvpFormFields?.fields) {
          result = await apiService.updateEventExternal(eventId, payload, {
            forceSpWrite: false,
            liveUpdate: false,
          })
        }

        if ('error' in result) {
          const errorMsg = (result.error && typeof result.error === 'object')
            ? ((result.error as any).message ?? '') || 'Failed to update event'
            : 'Failed to update event'
          throw new Error(errorMsg)
        }
        response = result as EventApiResponse
        savedEventId = eventId
      } else {
        // Create new event
        // TODO: (rsvp-shape-migration) Transitional dual-shape: send legacy shape first;
        // retry with new {fields} shape once ESP BE PR #903 ships everywhere.
        // Revert `let result` to `const result` and remove the retry block after cleanup.
        let result = await apiService.createEventExternal(
          payload.rsvpFormFields?.fields ? toLegacyRsvpFormFieldsPayload(payload) : payload,
          locale
        )

        if (isRsvpFormFieldsRejection(result) && payload.rsvpFormFields?.fields) {
          result = await apiService.createEventExternal(payload, locale)
        }

        if ('error' in result) {
          const errorMsg = (result.error && typeof result.error === 'object')
            ? ((result.error as any).message ?? '') || 'Failed to create event'
            : 'Failed to create event'
          throw new Error(errorMsg)
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
      const refreshedResponse = await cachedApi.getEventFull(savedEventId)
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
   * Runs a page action (publish/unpublish/preview) via the dedicated action endpoint.
   * Saves the current form state first (a plain save never triggers page generation —
   * only the action call does), then performs the action against the saved event.
   */
  const performPageAction = useCallback(async (
    actionCall: (eventId: string) => Promise<EventApiResponse | { error: unknown }>,
    actionErrorLabel: string,
    options: SaveOptions = {}
  ): Promise<SaveResult> => {
    const { onSuccess, onError, ...saveOptions } = options
    const saveResult = await saveEvent(saveOptions)
    if (!saveResult.success || !saveResult.eventId) {
      onError?.(new Error(saveResult.error || 'Failed to save event'))
      return saveResult
    }

    try {
      const result = await actionCall(saveResult.eventId)
      if ('error' in result) {
        const errorMessage = (result.error && typeof result.error === 'object')
          ? ((result.error as any).message ?? '') || actionErrorLabel
          : actionErrorLabel
        setSaveStatus('error')
        setSaveError(errorMessage)
        onError?.(new Error(errorMessage))
        return { success: false, eventId: saveResult.eventId, error: errorMessage }
      }
      // The action endpoint returns the full persisted event, but skips the same
      // customAttributes-label resolution that a normal save/read applies — refresh via
      // getEventFull so eventDataResp always reflects the same fully-hydrated shape,
      // mirroring saveEvent's own post-write refresh (step 7 above).
      let response = result as EventApiResponse
      const refreshedResponse = await cachedApi.getEventFull(saveResult.eventId)
      if (!('error' in refreshedResponse)) {
        response = refreshedResponse as EventApiResponse
      }
      setEventResponse(response)
      onSuccess?.(saveResult.eventId, response)
      return { success: true, eventId: saveResult.eventId, response }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : actionErrorLabel
      setSaveStatus('error')
      setSaveError(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
      return { success: false, eventId: saveResult.eventId, error: errorMessage }
    }
  }, [saveEvent, setEventResponse, setSaveStatus, setSaveError])

  /**
   * Save, then publish (sets published:true and generates the live page).
   */
  const publishEvent = useCallback(async (options: SaveOptions = {}): Promise<SaveResult> => {
    return performPageAction(id => cachedApi.publishEventPage(id), 'Failed to publish event', options)
  }, [performPageAction])

  /**
   * Save, then (re)generate the staged preview page without changing publish state.
   * Backs the "Update page" button.
   */
  const previewEvent = useCallback(async (options: SaveOptions = {}): Promise<SaveResult> => {
    return performPageAction(id => cachedApi.previewEventPage(id), 'Failed to update page', options)
  }, [performPageAction])

  /**
   * Save draft only (no publish)
   */
  const saveDraft = useCallback(async (options: SaveOptions = {}): Promise<SaveResult> => {
    return saveEvent(options)
  }, [saveEvent])

  return {
    saveEvent,
    publishEvent,
    previewEvent,
    saveDraft,
    isSaving: saveStatus === 'saving',
    saveStatus,
    saveError: context.state.saveError,
  }
}

