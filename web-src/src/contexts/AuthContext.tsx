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

  const isAuthenticated = Boolean(ims.token)

  // When authenticated, ping ESP to verify API reachability before allowing access
  useEffect(() => {
    if (!ims.token) {
      setIsApiReady(false)
      return
    }

    setIsApiReady(false)
    let cancelled = false

    const runPing = async () => {
      if (env.isDevelopment()) {
        console.log('🔌 ESP ping: verifying API access...')
      }
      apiService.setAuthHeaders(ims.token, ims.org)
      const ok = await apiService.pingEsp()
      if (env.isDevelopment()) {
        console.log('🔌 ESP ping:', ok ? 'pong received' : 'failed')
      }
      if (!cancelled && ok) {
        setIsApiReady(true)
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
  }, [])

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

