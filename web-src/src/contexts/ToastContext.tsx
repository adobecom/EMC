/* 
* <license header>
*/

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from 'react'
import { TOAST_LIMITS } from '../config/uiConstants'

// ============================================================================
// TYPES
// ============================================================================

export type ToastVariant = 'positive' | 'negative' | 'info' | 'neutral'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  /** Duration in ms before auto-dismiss. 0 = no auto-dismiss */
  duration: number
  /** Whether the toast can be dismissed by clicking */
  dismissible: boolean
  /** Optional action button */
  action?: {
    label: string
    onPress: () => void
  }
  /** Timestamp when toast was created */
  createdAt: number
}

export interface ToastOptions {
  /** Duration in ms before auto-dismiss. Default: 5000. Use 0 for persistent. */
  duration?: number
  /** Whether the toast can be dismissed. Default: true */
  dismissible?: boolean
  /** Optional action button */
  action?: {
    label: string
    onPress: () => void
  }
}

interface ToastState {
  toasts: Toast[]
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_ALL' }

interface ToastContextValue {
  toasts: Toast[]
  /** Show a success toast */
  success: (message: string, options?: ToastOptions) => string
  /** Show an error toast */
  error: (message: string, options?: ToastOptions) => string
  /** Show an info toast */
  info: (message: string, options?: ToastOptions) => string
  /** Show a neutral toast */
  neutral: (message: string, options?: ToastOptions) => string
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void
  /** Clear all toasts */
  clearAll: () => void
}

// ============================================================================
// REDUCER
// ============================================================================

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST': {
      // Add new toast, limit to maxToasts (remove oldest if exceeding)
      const newToasts = [...state.toasts, action.payload]
      if (newToasts.length > TOAST_LIMITS.maxToasts) {
        return { toasts: newToasts.slice(-TOAST_LIMITS.maxToasts) }
      }
      return { toasts: newToasts }
    }
    case 'REMOVE_TOAST':
      return {
        toasts: state.toasts.filter(t => t.id !== action.payload)
      }
    case 'CLEAR_ALL':
      return { toasts: [] }
    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

// ============================================================================
// ID GENERATOR
// ============================================================================

let toastIdCounter = 0

function generateToastId(): string {
  toastIdCounter += 1
  return `toast-${Date.now()}-${toastIdCounter}`
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] })
  
  const addToast = useCallback((
    message: string,
    variant: ToastVariant,
    options: ToastOptions = {}
  ): string => {
    const id = generateToastId()
    const defaultDuration = variant === 'negative'
      ? TOAST_LIMITS.errorDurationMs
      : TOAST_LIMITS.defaultDurationMs
    
    const toast: Toast = {
      id,
      message,
      variant,
      duration: options.duration ?? defaultDuration,
      dismissible: options.dismissible ?? true,
      action: options.action,
      createdAt: Date.now(),
    }
    
    dispatch({ type: 'ADD_TOAST', payload: toast })
    
    // Set up auto-dismiss timer if duration > 0
    if (toast.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: id })
      }, toast.duration)
    }
    
    return id
  }, [])
  
  const success = useCallback((message: string, options?: ToastOptions) => {
    return addToast(message, 'positive', options)
  }, [addToast])
  
  const error = useCallback((message: string, options?: ToastOptions) => {
    return addToast(message, 'negative', options)
  }, [addToast])
  
  const info = useCallback((message: string, options?: ToastOptions) => {
    return addToast(message, 'info', options)
  }, [addToast])
  
  const neutral = useCallback((message: string, options?: ToastOptions) => {
    return addToast(message, 'neutral', options)
  }, [addToast])
  
  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])
  
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])
  
  const value: ToastContextValue = useMemo(() => ({
    toasts: state.toasts,
    success,
    error,
    info,
    neutral,
    dismiss,
    clearAll,
  }), [state.toasts, success, error, info, neutral, dismiss, clearAll])
  
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access toast functionality
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const toast = useToast()
 *   
 *   const handleSave = async () => {
 *     try {
 *       await saveData()
 *       toast.success('Data saved successfully!')
 *     } catch (err) {
 *       toast.error('Failed to save data')
 *     }
 *   }
 * }
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

