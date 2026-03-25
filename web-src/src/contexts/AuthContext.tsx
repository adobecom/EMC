/*
 * AuthContext
 * Provides reactive authentication state management for the entire app.
 *
 * Supports two auth modes:
 *   1. Standalone (imslib): When the app runs outside the Experience Cloud Shell.
 *      The imsAuthService handles OAuth via window.adobeIMS.
 *   2. ExC Shell: When the app runs inside the Unified Shell iframe.
 *      The shell provides IMS data via the runtime 'ready' event.
 *
 * Components should use useAuth() to access auth state and actions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { IMS } from '../types'
import { imsAuthService } from '../services/imsAuth'
import { apiService } from '../services/api'
import { env } from '../config/env'

// ============================================================================
// Types
// ============================================================================

export type AuthMode = 'shell' | 'standalone'

export interface AuthContextValue {
  /** Current IMS data: token, org, profile. Null when not authenticated. */
  ims: IMS
  /** Whether the user is currently authenticated (has a valid token). */
  isAuthenticated: boolean
  /** Whether auth is being initialized (IMS lib loading / token check in progress). */
  isLoading: boolean
  /** Whether ESP ping succeeded (API reachable and token valid). Gate stays until true. */
  isApiReady: boolean
  /** If ESP ping failed, describes why. Null when ping hasn't run or succeeded. */
  pingError: 'auth' | 'network' | null
  /** Re-attempt the ESP ping (e.g. after user clicks Retry). */
  retryPing: () => void
  /** Which auth mode is active. */
  authMode: AuthMode
  /** Trigger IMS sign-in flow (standalone mode only). */
  signIn: () => void
  /** Sign out (standalone mode only; no-op in shell mode). */
  signOut: () => void
  /**
   * Update auth from ExC Shell runtime 'ready' or 'configuration' events.
   * Used in shell mode to keep auth state in sync.
   */
  updateFromShell: (ims: IMS) => void
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode
  /** Initial IMS data (e.g. from shell bootstrap or dev token). */
  initialIms?: IMS
  /** Which mode the app was bootstrapped in. */
  authMode: AuthMode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialIms,
  authMode
}) => {
  const emptyIms: IMS = {}

  const [ims, setIms] = useState<IMS>(initialIms || emptyIms)
  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'standalone')
  const [isApiReady, setIsApiReady] = useState<boolean>(false)
  const [pingError, setPingError] = useState<'auth' | 'network' | null>(null)

  const isAuthenticated = Boolean(ims.token)

  // When authenticated, ping ESP to verify API reachability before allowing access
  useEffect(() => {
    if (!ims.token) {
      setIsApiReady(false)
      setPingError(null)
      return
    }

    setIsApiReady(false)
    setPingError(null)
    let cancelled = false

    const runPing = async () => {
      if (env.isDevelopment()) {
        console.log('🔌 ESP ping: verifying API access...')
      }
      apiService.setAuthHeaders(ims.token, ims.org)
      const result = await apiService.pingEsp()
      if (env.isDevelopment()) {
        console.log('🔌 ESP ping:', result.ok ? 'pong received' : `failed (${result.reason})`)
      }
      if (cancelled) return
      if (result.ok) {
        setIsApiReady(true)
      } else if (result.reason === 'no-token' || result.reason === 'auth') {
        setPingError('auth')
      } else {
        setPingError('network')
      }
    }

    runPing()
    return () => {
      cancelled = true
    }
  }, [ims.token, ims.org])

  // In standalone mode, initialize the IMS library and check for an existing session
  useEffect(() => {
    if (authMode !== 'standalone') {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Initialize IMS library; the onAccessToken callback fires when a token arrives
    // (either from a fresh sign-in redirect or on re-initialization with existing session)
    imsAuthService.initialize((receivedIms: IMS) => {
      setIms(receivedIms)
      setIsLoading(false)
    })
      .then(() => {
        // After initialization, check if already signed in (e.g. returning from redirect)
        return imsAuthService.getCurrentIms()
      })
      .then((currentIms) => {
        if (currentIms) {
          setIms(currentIms)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('❌ IMS initialization failed:', err)
        setIsLoading(false)
      })

    // Subscribe to auth state changes (sign in / sign out from any source)
    const unsubscribe = imsAuthService.onAuthStateChange((updatedIms) => {
      setIms(updatedIms || emptyIms)
    })

    return () => {
      unsubscribe()
    }
  }, [authMode])

  const signIn = useCallback(() => {
    imsAuthService.signIn()
  }, [])

  const signOut = useCallback(() => {
    imsAuthService.signOut()
    setIms(emptyIms)
    setIsApiReady(false)
    setPingError(null)
  }, [])

  const retryPing = useCallback(() => {
    if (!ims.token) return
    setPingError(null)
    setIsApiReady(false)

    apiService.setAuthHeaders(ims.token, ims.org)
    apiService.pingEsp().then((result) => {
      if (result.ok) {
        setIsApiReady(true)
      } else if (result.reason === 'no-token' || result.reason === 'auth') {
        setPingError('auth')
      } else {
        setPingError('network')
      }
    })
  }, [ims.token, ims.org])

  /**
   * Called by the ExC Shell bootstrap when the shell provides IMS data.
   * Also called on 'configuration' events (e.g. org switch).
   */
  const updateFromShell = useCallback((shellIms: IMS) => {
    setIms(shellIms)
    setIsLoading(false)
  }, [])

  const value: AuthContextValue = {
    ims,
    isAuthenticated,
    isLoading,
    isApiReady,
    pingError,
    retryPing,
    authMode,
    signIn,
    signOut,
    updateFromShell
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

