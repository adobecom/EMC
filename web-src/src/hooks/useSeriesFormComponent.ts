/* 
* <license header>
*/

import { useEffect, useRef } from 'react'
import {
  useSeriesFormContext,
  ComponentCallbacks,
  SeriesFormData,
} from '../contexts/SeriesFormContext'

/**
 * Options for the useSeriesFormComponent hook
 */
export interface UseSeriesFormComponentOptions {
  /**
   * Unique identifier for this component instance
   */
  componentId: string
  
  /**
   * Called during save to gather this component's payload contribution
   */
  onGatherPayload?: () => Partial<SeriesFormData> | Promise<Partial<SeriesFormData>>
  
  /**
   * Called after the series save completes successfully
   */
  onAfterSave?: (seriesId: string, seriesResponse: any) => Promise<void>
  
  /**
   * Called when series data is loaded from API
   */
  onLoadResponse?: (seriesResponse: any) => void
  
  /**
   * Validation function called before save
   */
  validate?: () => true | string
}

/**
 * Return value from useSeriesFormComponent
 */
export interface UseSeriesFormComponentReturn {
  // Form data (read-only reference)
  formData: SeriesFormData
  
  // Context identifiers
  seriesId: string | null
  isEditMode: boolean
  
  // Update function
  updateFormData: (updates: Partial<SeriesFormData>) => void
  
  // Status flags
  isDirty: boolean
  isSaving: boolean
  isLoading: boolean
}

/**
 * Hook for form components to integrate with the SeriesForm system
 * 
 * This hook provides:
 * 1. Access to centralized form state
 * 2. Automatic lifecycle callback registration
 * 3. Type-safe updates to form data
 * 
 * @example
 * ```tsx
 * function SeriesDetailsComponent() {
 *   const {
 *     formData,
 *     updateFormData,
 *     seriesId,
 *   } = useSeriesFormComponent({
 *     componentId: 'series-details',
 *   })
 *   
 *   return (
 *     <TextField
 *       value={formData.seriesName}
 *       onChange={(value) => updateFormData({ seriesName: value })}
 *     />
 *   )
 * }
 * ```
 */
export function useSeriesFormComponent(
  options: UseSeriesFormComponentOptions
): UseSeriesFormComponentReturn {
  const {
    componentId,
    onGatherPayload,
    onAfterSave,
    onLoadResponse,
    validate,
  } = options
  
  const context = useSeriesFormContext()
  const {
    formData,
    seriesId,
    isEditMode,
    isDirty,
    saveStatus,
    isLoading,
    updateFormData,
    registerComponent,
    unregisterComponent,
  } = context
  
  // Use refs to always have the latest callback references
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
    const stableCallbacks: ComponentCallbacks = {
      onGatherPayload: callbacksRef.current.onGatherPayload
        ? () => callbacksRef.current.onGatherPayload!()
        : undefined,
      onAfterSave: callbacksRef.current.onAfterSave
        ? (seriesId, response) => callbacksRef.current.onAfterSave!(seriesId, response)
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
  
  // Re-register when callbacks change
  useEffect(() => {
    const stableCallbacks: ComponentCallbacks = {
      onGatherPayload: onGatherPayload
        ? () => callbacksRef.current.onGatherPayload!()
        : undefined,
      onAfterSave: onAfterSave
        ? (seriesId, response) => callbacksRef.current.onAfterSave!(seriesId, response)
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
    seriesId,
    isEditMode,
    updateFormData,
    isDirty,
    isSaving: saveStatus === 'saving',
    isLoading,
  }
}

/**
 * Simplified hook for components that only need to read/update form data
 */
export function useSeriesFormData() {
  const { formData, updateFormData, seriesId, isEditMode } = useSeriesFormContext()
  
  return {
    formData,
    updateFormData,
    seriesId,
    isEditMode,
  }
}

