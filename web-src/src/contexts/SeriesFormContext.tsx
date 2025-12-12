/* 
* <license header>
*/

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react'
import { SeriesApiResponse, TargetCms } from '../types/domain'

// ============================================================================
// TYPES
// ============================================================================

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

/**
 * Series form data - matches the API structure for creating/updating series
 */
export interface SeriesFormData {
  // Required fields
  seriesName: string
  cloudType: 'CreativeCloud' | 'ExperienceCloud'
  targetCms: TargetCms | null
  templateId: string
  
  // Optional fields
  seriesDescription: string
  externalThemeId: string
  susiContextId: string
  relatedDomain: string
  contentRoot: string
}

/**
 * Callback types for component lifecycle hooks
 */
export interface ComponentCallbacks {
  /**
   * Called during save to gather component's payload contribution
   */
  onGatherPayload?: () => Partial<SeriesFormData> | Promise<Partial<SeriesFormData>>
  
  /**
   * Called after the series is saved successfully
   */
  onAfterSave?: (seriesId: string, seriesResponse: SeriesApiResponse) => Promise<void>
  
  /**
   * Called when series data is loaded from API
   */
  onLoadResponse?: (seriesResponse: SeriesApiResponse) => void
  
  /**
   * Optional validation function
   */
  validate?: () => true | string
}

export interface RegisteredComponent {
  id: string
  callbacks: ComponentCallbacks
}

/**
 * Main context state
 */
export interface SeriesFormState {
  // Series identity
  seriesId: string | null
  isEditMode: boolean
  
  // Data states
  seriesDataResp: SeriesApiResponse | null  // Raw API response
  formData: SeriesFormData                   // Working state
  
  // UI states
  isDirty: boolean
  saveStatus: SaveStatus
  saveError: string | null
  isLoading: boolean
  loadError: string | null
  
  // Published state
  isPublished: boolean
}

/**
 * Context actions
 */
type SeriesFormAction =
  | { type: 'SET_SERIES_ID'; payload: string | null }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'SET_SERIES_RESPONSE'; payload: SeriesApiResponse | null }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<SeriesFormData> }
  | { type: 'RESET_FORM_DATA'; payload: SeriesFormData }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOAD_ERROR'; payload: string | null }
  | { type: 'SET_PUBLISHED'; payload: boolean }
  | { type: 'RESET_TO_SAVED' }

/**
 * Context value exposed to consumers
 */
export interface SeriesFormContextValue {
  // State (read-only)
  state: SeriesFormState
  
  // Form data convenience getters
  formData: SeriesFormData
  seriesDataResp: SeriesApiResponse | null
  seriesId: string | null
  isEditMode: boolean
  isDirty: boolean
  saveStatus: SaveStatus
  isLoading: boolean
  isPublished: boolean
  
  // Actions
  updateFormData: (updates: Partial<SeriesFormData>) => void
  setSeriesResponse: (response: SeriesApiResponse | null) => void
  setSeriesId: (id: string | null) => void
  setEditMode: (isEdit: boolean) => void
  resetToSaved: () => void
  setSaveStatus: (status: SaveStatus) => void
  setSaveError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setLoadError: (error: string | null) => void
  setPublished: (published: boolean) => void
  
  // Component registration
  registerComponent: (id: string, callbacks: ComponentCallbacks) => void
  unregisterComponent: (id: string) => void
  getRegisteredComponents: () => RegisteredComponent[]
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const createDefaultSeriesFormData = (): SeriesFormData => ({
  seriesName: '',
  cloudType: 'ExperienceCloud',
  targetCms: null,
  templateId: '',
  seriesDescription: '',
  externalThemeId: '',
  susiContextId: '',
  relatedDomain: '',
  contentRoot: '',
})

const createInitialState = (initialData?: Partial<SeriesFormData>): SeriesFormState => ({
  seriesId: null,
  isEditMode: false,
  seriesDataResp: null,
  formData: { ...createDefaultSeriesFormData(), ...initialData },
  isDirty: false,
  saveStatus: 'idle',
  saveError: null,
  isLoading: false,
  loadError: null,
  isPublished: false,
})

// ============================================================================
// REDUCER
// ============================================================================

function seriesFormReducer(state: SeriesFormState, action: SeriesFormAction): SeriesFormState {
  switch (action.type) {
    case 'SET_SERIES_ID':
      return { ...state, seriesId: action.payload }
    
    case 'SET_EDIT_MODE':
      return { ...state, isEditMode: action.payload }
    
    case 'SET_SERIES_RESPONSE':
      return {
        ...state,
        seriesDataResp: action.payload,
        isDirty: false
      }
    
    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isDirty: true
      }
    
    case 'RESET_FORM_DATA':
      return {
        ...state,
        formData: action.payload,
        isDirty: false
      }
    
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload }
    
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload }
    
    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.payload }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_LOAD_ERROR':
      return { ...state, loadError: action.payload }
    
    case 'SET_PUBLISHED':
      return { ...state, isPublished: action.payload }
    
    case 'RESET_TO_SAVED':
      return { ...state, isDirty: false }
    
    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const SeriesFormContext = createContext<SeriesFormContextValue | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

interface SeriesFormProviderProps {
  children: React.ReactNode
  initialSeriesId?: string | null
}

export const SeriesFormProvider: React.FC<SeriesFormProviderProps> = ({
  children,
  initialSeriesId = null,
}) => {
  // Initialize state
  const [state, dispatch] = useReducer(
    seriesFormReducer,
    undefined,
    createInitialState
  )
  
  // Set initial values
  useEffect(() => {
    if (initialSeriesId) {
      dispatch({ type: 'SET_SERIES_ID', payload: initialSeriesId })
      dispatch({ type: 'SET_EDIT_MODE', payload: true })
    }
  }, [initialSeriesId])
  
  // Component registry
  const componentsRef = useRef<Map<string, RegisteredComponent>>(new Map())
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const updateFormData = useCallback((updates: Partial<SeriesFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: updates })
  }, [])
  
  const setSeriesResponse = useCallback((response: SeriesApiResponse | null) => {
    dispatch({ type: 'SET_SERIES_RESPONSE', payload: response })
  }, [])
  
  const setSeriesId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SERIES_ID', payload: id })
    if (id) {
      dispatch({ type: 'SET_EDIT_MODE', payload: true })
    }
  }, [])
  
  const setEditMode = useCallback((isEdit: boolean) => {
    dispatch({ type: 'SET_EDIT_MODE', payload: isEdit })
  }, [])
  
  const resetToSaved = useCallback(() => {
    dispatch({ type: 'RESET_TO_SAVED' })
  }, [])
  
  const setSaveStatus = useCallback((status: SaveStatus) => {
    dispatch({ type: 'SET_SAVE_STATUS', payload: status })
  }, [])
  
  const setSaveError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_SAVE_ERROR', payload: error })
  }, [])
  
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])
  
  const setLoadError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_LOAD_ERROR', payload: error })
  }, [])
  
  const setPublished = useCallback((published: boolean) => {
    dispatch({ type: 'SET_PUBLISHED', payload: published })
  }, [])
  
  // ============================================================================
  // COMPONENT REGISTRATION
  // ============================================================================
  
  const registerComponent = useCallback((id: string, callbacks: ComponentCallbacks) => {
    componentsRef.current.set(id, { id, callbacks })
  }, [])
  
  const unregisterComponent = useCallback((id: string) => {
    componentsRef.current.delete(id)
  }, [])
  
  const getRegisteredComponents = useCallback((): RegisteredComponent[] => {
    return Array.from(componentsRef.current.values())
  }, [])
  
  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  
  const value: SeriesFormContextValue = useMemo(() => ({
    // State
    state,
    
    // Convenience getters
    formData: state.formData,
    seriesDataResp: state.seriesDataResp,
    seriesId: state.seriesId,
    isEditMode: state.isEditMode,
    isDirty: state.isDirty,
    saveStatus: state.saveStatus,
    isLoading: state.isLoading,
    isPublished: state.isPublished,
    
    // Actions
    updateFormData,
    setSeriesResponse,
    setSeriesId,
    setEditMode,
    resetToSaved,
    setSaveStatus,
    setSaveError,
    setLoading,
    setLoadError,
    setPublished,
    
    // Component registration
    registerComponent,
    unregisterComponent,
    getRegisteredComponents,
  }), [
    state,
    updateFormData,
    setSeriesResponse,
    setSeriesId,
    setEditMode,
    resetToSaved,
    setSaveStatus,
    setSaveError,
    setLoading,
    setLoadError,
    setPublished,
    registerComponent,
    unregisterComponent,
    getRegisteredComponents,
  ])
  
  return (
    <SeriesFormContext.Provider value={value}>
      {children}
    </SeriesFormContext.Provider>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Access the SeriesForm context
 * Must be used within a SeriesFormProvider
 */
export function useSeriesFormContext(): SeriesFormContextValue {
  const context = useContext(SeriesFormContext)
  if (!context) {
    throw new Error('useSeriesFormContext must be used within a SeriesFormProvider')
  }
  return context
}

/**
 * Access just the form data from context
 */
export function useSeriesFormData() {
  const { formData, updateFormData } = useSeriesFormContext()
  return { formData, updateFormData }
}

