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
import { EventFormData, EventApiResponse } from '../types/domain'
import { saveFormDraft, loadFormDraft, clearFormDraft } from '../utils/formPersistence'

// ============================================================================
// TYPES
// ============================================================================

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

/**
 * Callback types for component lifecycle hooks
 */
export interface ComponentCallbacks {
  /**
   * Called during save to gather component's payload contribution
   * Should return data to merge into the event payload
   */
  onGatherPayload?: () => Partial<EventFormData> | Promise<Partial<EventFormData>>
  
  /**
   * Called after the main event is saved successfully
   * Use for component-specific API calls (venue, images, speakers, etc.)
   * @param eventId - The saved event's ID
   * @param eventResponse - The full event response from API
   */
  onAfterSave?: (eventId: string, eventResponse: EventApiResponse) => Promise<void>
  
  /**
   * Called when event data is loaded from API
   * Use to populate component-specific state from API response
   * @param eventResponse - The loaded event response
   */
  onLoadResponse?: (eventResponse: EventApiResponse) => void
  
  /**
   * Optional validation function
   * @returns true if valid, or string error message if invalid
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
export interface EventFormState {
  // Event identity
  eventId: string | null
  seriesId: string
  isEditMode: boolean
  
  // Locale
  locale: string
  
  // Data states
  eventDataResp: EventApiResponse | null  // Raw API response (source of truth)
  formData: EventFormData                   // Working state for the form
  
  // UI states
  isDirty: boolean
  saveStatus: SaveStatus
  saveError: string | null
  isLoading: boolean
  loadError: string | null
  
  // Published state
  isPublished: boolean
  
  // Wizard navigation state
  maxStepReached: number
}

/**
 * Context actions
 */
type EventFormAction =
  | { type: 'SET_EVENT_ID'; payload: string | null }
  | { type: 'SET_SERIES_ID'; payload: string }
  | { type: 'SET_LOCALE'; payload: string }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'SET_EVENT_RESPONSE'; payload: EventApiResponse | null }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<EventFormData> }
  | { type: 'RESET_FORM_DATA'; payload: EventFormData }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOAD_ERROR'; payload: string | null }
  | { type: 'SET_PUBLISHED'; payload: boolean }
  | { type: 'SET_MAX_STEP_REACHED'; payload: number }
  | { type: 'RESET_TO_SAVED' }

/**
 * Context value exposed to consumers
 */
export interface EventFormContextValue {
  // State (read-only)
  state: EventFormState
  
  // Form data convenience getters
  formData: EventFormData
  eventDataResp: EventApiResponse | null
  eventId: string | null
  seriesId: string
  locale: string
  isEditMode: boolean
  isDirty: boolean
  saveStatus: SaveStatus
  isLoading: boolean
  isPublished: boolean
  maxStepReached: number
  
  // Actions
  updateFormData: (updates: Partial<EventFormData>) => void
  setEventResponse: (response: EventApiResponse | null) => void
  setEventId: (id: string | null) => void
  setSeriesId: (id: string) => void
  setLocale: (locale: string) => void
  setEditMode: (isEdit: boolean) => void
  resetToSaved: () => void
  setSaveStatus: (status: SaveStatus) => void
  setSaveError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setLoadError: (error: string | null) => void
  setPublished: (published: boolean) => void
  setMaxStepReached: (step: number) => void
  
  // Component registration
  registerComponent: (id: string, callbacks: ComponentCallbacks) => void
  unregisterComponent: (id: string) => void
  getRegisteredComponents: () => RegisteredComponent[]
  
  // Persistence
  persistToStorage: () => void
  loadFromStorage: () => boolean
  clearStorage: () => void
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_LOCALE = 'en-US'

export const createDefaultFormData = (): EventFormData => ({
  cloudType: 'CreativeCloud',
  eventType: 'in-person',
  seriesId: '',
  organizationId: '',
  name: '',
  urlTitle: '',
  description: '',
  shortDescription: '',
  language: 'en',
  defaultLocale: DEFAULT_LOCALE,
  isPrivate: false,
  tags: [],
  startDateTime: '',
  endDateTime: '',
  timezone: '',
  venue: {
    venueName: '',
    formattedAddress: '',
    additionalInformation: '',
    showVenuePostEvent: false,
    showAdditionalInfoPostEvent: false
  },
  attendeeLimit: undefined,
  status: 'draft',
  registrationOpen: false,
  allowWaitlist: false,
  allowGuestRegistration: false,
  hostEmail: '',
  rsvpDescription: '',
  registrationType: 'ESP',
  marketoFormUrl: '',
  visibleRsvpFields: [],
  requiredRsvpFields: [],
  images: [],
  profiles: [],
  communityForumUrl: '',
  secondaryLinkTitle: '',
  agendaItems: [],
  showAgendaPostEvent: false,
  sponsors: []
})

const createInitialState = (initialData?: Partial<EventFormData>): EventFormState => ({
  eventId: null,
  seriesId: '',
  isEditMode: false,
  locale: DEFAULT_LOCALE,
  eventDataResp: null,
  formData: { ...createDefaultFormData(), ...initialData },
  isDirty: false,
  saveStatus: 'idle',
  saveError: null,
  isLoading: false,
  loadError: null,
  isPublished: false,
  maxStepReached: 0,
})

// ============================================================================
// REDUCER
// ============================================================================

function eventFormReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_EVENT_ID':
      return { ...state, eventId: action.payload }
    
    case 'SET_SERIES_ID':
      return {
        ...state,
        seriesId: action.payload,
        formData: { ...state.formData, seriesId: action.payload }
      }
    
    case 'SET_LOCALE':
      return { ...state, locale: action.payload }
    
    case 'SET_EDIT_MODE':
      return { ...state, isEditMode: action.payload }
    
    case 'SET_EVENT_RESPONSE':
      return {
        ...state,
        eventDataResp: action.payload,
        isDirty: false // Response just set means we're in sync
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
    
    case 'SET_MAX_STEP_REACHED':
      return { ...state, maxStepReached: Math.max(state.maxStepReached, action.payload) }
    
    case 'RESET_TO_SAVED':
      // If we have an API response, we'd need to map it back to formData
      // For now, just clear dirty flag (actual reset logic in hook)
      return { ...state, isDirty: false }
    
    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const EventFormContext = createContext<EventFormContextValue | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

interface EventFormProviderProps {
  children: React.ReactNode
  initialEventId?: string | null
  initialSeriesId?: string
  initialEventType?: 'in-person' | 'webinar'
  initialLocale?: string
  /** If true, auto-persist to sessionStorage on formData changes */
  autoPersist?: boolean
}

export const EventFormProvider: React.FC<EventFormProviderProps> = ({
  children,
  initialEventId = null,
  initialSeriesId = '',
  initialEventType = 'in-person',
  initialLocale = DEFAULT_LOCALE,
  autoPersist = true,
}) => {
  // Initialize state
  const [state, dispatch] = useReducer(
    eventFormReducer,
    { eventType: initialEventType, seriesId: initialSeriesId },
    createInitialState
  )
  
  // Set initial values
  useEffect(() => {
    if (initialEventId) {
      dispatch({ type: 'SET_EVENT_ID', payload: initialEventId })
      dispatch({ type: 'SET_EDIT_MODE', payload: true })
    }
    if (initialSeriesId) {
      dispatch({ type: 'SET_SERIES_ID', payload: initialSeriesId })
    }
    if (initialLocale) {
      dispatch({ type: 'SET_LOCALE', payload: initialLocale })
    }
  }, [initialEventId, initialSeriesId, initialLocale])
  
  // Component registry
  const componentsRef = useRef<Map<string, RegisteredComponent>>(new Map())
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const updateFormData = useCallback((updates: Partial<EventFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: updates })
  }, [])
  
  const setEventResponse = useCallback((response: EventApiResponse | null) => {
    dispatch({ type: 'SET_EVENT_RESPONSE', payload: response })
  }, [])
  
  const setEventId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_EVENT_ID', payload: id })
    if (id) {
      dispatch({ type: 'SET_EDIT_MODE', payload: true })
    }
  }, [])
  
  const setSeriesId = useCallback((id: string) => {
    dispatch({ type: 'SET_SERIES_ID', payload: id })
  }, [])
  
  const setLocale = useCallback((locale: string) => {
    dispatch({ type: 'SET_LOCALE', payload: locale })
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
  
  const setMaxStepReached = useCallback((step: number) => {
    dispatch({ type: 'SET_MAX_STEP_REACHED', payload: step })
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
  // PERSISTENCE
  // ============================================================================
  
  const storageKey = useMemo(() => {
    // Use eventId if editing, otherwise use a "new-event" key with seriesId
    if (state.eventId) {
      return state.eventId
    }
    return `new-${state.formData.eventType}-${state.seriesId || 'no-series'}`
  }, [state.eventId, state.formData.eventType, state.seriesId])
  
  const persistToStorage = useCallback(() => {
    saveFormDraft(storageKey, state.formData)
  }, [storageKey, state.formData])
  
  const loadFromStorage = useCallback((): boolean => {
    const draft = loadFormDraft(storageKey)
    if (draft) {
      dispatch({ type: 'RESET_FORM_DATA', payload: draft })
      return true
    }
    return false
  }, [storageKey])
  
  const clearStorage = useCallback(() => {
    clearFormDraft(storageKey)
  }, [storageKey])
  
  // Auto-persist on form data changes (debounced via effect)
  useEffect(() => {
    if (!autoPersist || !state.isDirty) return
    
    const timeoutId = setTimeout(() => {
      persistToStorage()
    }, 1000) // Debounce 1 second
    
    return () => clearTimeout(timeoutId)
  }, [autoPersist, state.isDirty, state.formData, persistToStorage])
  
  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  
  const value: EventFormContextValue = useMemo(() => ({
    // State
    state,
    
    // Convenience getters
    formData: state.formData,
    eventDataResp: state.eventDataResp,
    eventId: state.eventId,
    seriesId: state.seriesId,
    locale: state.locale,
    isEditMode: state.isEditMode,
    isDirty: state.isDirty,
    saveStatus: state.saveStatus,
    isLoading: state.isLoading,
    isPublished: state.isPublished,
    maxStepReached: state.maxStepReached,
    
    // Actions
    updateFormData,
    setEventResponse,
    setEventId,
    setSeriesId,
    setLocale,
    setEditMode,
    resetToSaved,
    setSaveStatus,
    setSaveError,
    setLoading,
    setLoadError,
    setPublished,
    setMaxStepReached,
    
    // Component registration
    registerComponent,
    unregisterComponent,
    getRegisteredComponents,
    
    // Persistence
    persistToStorage,
    loadFromStorage,
    clearStorage,
  }), [
    state,
    updateFormData,
    setEventResponse,
    setEventId,
    setSeriesId,
    setLocale,
    setEditMode,
    resetToSaved,
    setSaveStatus,
    setSaveError,
    setLoading,
    setLoadError,
    setPublished,
    setMaxStepReached,
    registerComponent,
    unregisterComponent,
    getRegisteredComponents,
    persistToStorage,
    loadFromStorage,
    clearStorage,
  ])
  
  return (
    <EventFormContext.Provider value={value}>
      {children}
    </EventFormContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Access the EventForm context
 * Must be used within an EventFormProvider
 */
export function useEventFormContext(): EventFormContextValue {
  const context = useContext(EventFormContext)
  if (!context) {
    throw new Error('useEventFormContext must be used within an EventFormProvider')
  }
  return context
}

/**
 * Access just the form data from context
 * Useful for components that only need to read/update form data
 */
export function useFormData() {
  const { formData, updateFormData, locale } = useEventFormContext()
  return { formData, updateFormData, locale }
}

