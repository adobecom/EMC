/* 
* <license header>
*/

import { useEffect, useRef } from 'react'
import {
  useEventFormContext,
  ComponentCallbacks,
} from '../contexts/EventFormContext'
import { EventFormData } from '../types/domain'

/**
 * Options for the useEventFormComponent hook
 */
export interface UseEventFormComponentOptions {
  /**
   * Unique identifier for this component instance
   * Used for registration and debugging
   */
  componentId: string
  
  /**
   * Called during save to gather this component's payload contribution
   * Return a partial EventFormData to merge into the payload
   */
  onGatherPayload?: () => Partial<EventFormData> | Promise<Partial<EventFormData>>
  
  /**
   * Called after the main event save completes successfully
   * Use for component-specific API calls (venue creation, image upload, etc.)
   * These run in parallel across all components
   */
  onAfterSave?: (eventId: string, eventResponse: any) => Promise<void>
  
  /**
   * Called when event data is loaded from API
   * Use to populate component-specific state from the response
   */
  onLoadResponse?: (eventResponse: any) => void
  
  /**
   * Validation function called before save
   * Return true if valid, or a string error message if invalid
   */
  validate?: () => true | string
}

/**
 * Return value from useEventFormComponent
 */
export interface UseEventFormComponentReturn {
  // Form data (read-only reference)
  formData: EventFormData
  
  // Context identifiers
  eventId: string | null
  seriesId: string
  locale: string
  isEditMode: boolean
  
  // Update function (updates the central form state)
  updateFormData: (updates: Partial<EventFormData>) => void

  /** Switch locale and re-map form data from eventDataResp for the new locale */
  setLocaleAndRemapFormData: (locale: string) => void
  
  // Status flags
  isDirty: boolean
  isSaving: boolean
  isLoading: boolean
}

/**
 * Hook for form components to integrate with the EventForm system
 * 
 * This hook provides:
 * 1. Access to centralized form state
 * 2. Automatic lifecycle callback registration
 * 3. Type-safe updates to form data
 * 
 * @example
 * ```tsx
 * function VenueComponent() {
 *   const {
 *     formData,
 *     updateFormData,
 *     eventId,
 *     locale
 *   } = useEventFormComponent({
 *     componentId: 'venue',
 *     
 *     onAfterSave: async (eventId, response) => {
 *       // Create/update venue after event is saved
 *       if (formData.venue?.venueName) {
 *         await apiService.createVenue(eventId, formData.venue)
 *       }
 *     }
 *   })
 *   
 *   return (
 *     <TextField
 *       value={formData.venue?.venueName || ''}
 *       onChange={(value) => updateFormData({
 *         venue: { ...formData.venue, venueName: value }
 *       })}
 *     />
 *   )
 * }
 * ```
 */
export function useEventFormComponent(
  options: UseEventFormComponentOptions
): UseEventFormComponentReturn {
  const {
    componentId,
    onGatherPayload,
    onAfterSave,
    onLoadResponse,
    validate,
  } = options
  
  const context = useEventFormContext()
  const {
    formData,
    eventId,
    seriesId,
    locale,
    isEditMode,
    isDirty,
    saveStatus,
    isLoading,
    updateFormData,
    setLocaleAndRemapFormData,
    registerComponent,
    unregisterComponent,
  } = context
  
  // Use refs to always have the latest callback references
  // This prevents stale closures in the registered callbacks
  const callbacksRef = useRef<ComponentCallbacks>({})
  
  useEffect(() => {
    callbacksRef.current = {
      onGatherPayload,
      onAfterSave,
      onLoadResponse,
      validate,
    }
  }, [onGatherPayload, onAfterSave, onLoadResponse, validate])
  
  // Register component on mount, unregister on unmount
  useEffect(() => {
    // Create stable callback wrappers that delegate to ref
    const stableCallbacks: ComponentCallbacks = {
      onGatherPayload: callbacksRef.current.onGatherPayload
        ? () => callbacksRef.current.onGatherPayload!()
        : undefined,
      onAfterSave: callbacksRef.current.onAfterSave
        ? (eventId, response) => callbacksRef.current.onAfterSave!(eventId, response)
        : undefined,
      onLoadResponse: callbacksRef.current.onLoadResponse
        ? (response) => callbacksRef.current.onLoadResponse!(response)
        : undefined,
      validate: callbacksRef.current.validate
        ? () => callbacksRef.current.validate!()
        : undefined,
    }
    
    registerComponent(componentId, stableCallbacks)
    
    return () => {
      unregisterComponent(componentId)
    }
  }, [componentId, registerComponent, unregisterComponent])
  
  // Re-register when callbacks change to ensure latest versions are used
  useEffect(() => {
    const stableCallbacks: ComponentCallbacks = {
      onGatherPayload: onGatherPayload
        ? () => callbacksRef.current.onGatherPayload!()
        : undefined,
      onAfterSave: onAfterSave
        ? (eventId, response) => callbacksRef.current.onAfterSave!(eventId, response)
        : undefined,
      onLoadResponse: onLoadResponse
        ? (response) => callbacksRef.current.onLoadResponse!(response)
        : undefined,
      validate: validate
        ? () => callbacksRef.current.validate!()
        : undefined,
    }
    
    registerComponent(componentId, stableCallbacks)
  }, [componentId, onGatherPayload, onAfterSave, onLoadResponse, validate, registerComponent])
  
  return {
    formData,
    eventId,
    seriesId,
    locale,
    isEditMode,
    updateFormData,
    setLocaleAndRemapFormData,
    isDirty,
    isSaving: saveStatus === 'saving',
    isLoading,
  }
}

/**
 * Simplified hook for components that only need to read/update form data
 * Does not register lifecycle callbacks
 * 
 * @example
 * ```tsx
 * function SimpleInput() {
 *   const { formData, updateFormData } = useEventFormData()
 *   return (
 *     <TextField
 *       value={formData.name}
 *       onChange={(value) => updateFormData({ name: value })}
 *     />
 *   )
 * }
 * ```
 */
export function useEventFormData() {
  const { formData, updateFormData, locale, eventId, seriesId, isEditMode } = useEventFormContext()
  
  return {
    formData,
    updateFormData,
    locale,
    eventId,
    seriesId,
    isEditMode,
  }
}

