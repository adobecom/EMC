/*
 * IMS Auth Service
 * Wraps Adobe's imslib.min.js (window.adobeIMS) for standalone OAuth authentication.
 * Used when the app is NOT loaded inside the Adobe Experience Cloud Shell.
 *
 * This service handles loading imslib.min.js dynamically so there is no race
 * condition between the script loading and our code running.
 *
 * window.adobeIMS key methods (available after the script loads):
 *   - initialize(config)     : Initialize with client_id, scope, etc.
 *   - signIn()               : Redirect to Adobe login page
 *   - signOut()              : Sign out and clear session
 *   - getAccessToken()       : Returns { token, expire, sid } or null
 *   - getProfile()           : Returns user profile object
 *   - isSignedInUser()       : Returns boolean
 */

import { env } from '../config/env'
import { IMS, IMSProfile } from '../types'

// ============================================================================
// Type declarations for window.adobeIMS (the imslib global)
// ============================================================================

export interface AdobeIMSTokenObject {
  token: string
  expire: string
  sid?: string
}

export interface AdobeIMSProfile {
  userId?: string
  displayName?: string
  email?: string
  first_name?: string
  last_name?: string
  account_type?: string
  ownerOrg?: string
  projectedProductContext?: Array<{
    prodCtx: {
      serviceCode: string
      ownerOrg: string
      label?: string
      ident?: string
    }
  }>
  [key: string]: any
}

export interface AdobeIMSConfig {
  client_id: string
  scope: string
  locale?: string
  environment?: string
  redirect_uri?: string
  onAccessToken?: (token: AdobeIMSTokenObject) => void
  onReauthAccessToken?: (token: AdobeIMSTokenObject) => void
  onError?: (type: string, message: string) => void
  onReady?: () => void
  onAccessTokenHasExpired?: () => void
  onLogout?: () => void
}

export interface AdobeIMS {
  initialize(config: AdobeIMSConfig): void
  signIn(params?: Record<string, string>): void
  signOut(params?: Record<string, string>): void
  getAccessToken(): AdobeIMSTokenObject | null
  getProfile(): Promise<AdobeIMSProfile>
  isSignedInUser(): boolean
  refreshToken(): void
}

declare global {
  interface Window {
    adobeIMS?: AdobeIMS
  }
}

// ============================================================================
// Constants
// ============================================================================

const IMS_LIB_URL = 'https://auth.services.adobe.com/imslib/imslib.min.js'
const IMS_SCRIPT_ID = 'adobe-imslib-script'

// ============================================================================
// IMS Auth Service
// ============================================================================

type AuthStateListener = (ims: IMS | null) => void

class ImsAuthService {
  private scriptLoadPromise: Promise<void> | null = null
  private initializePromise: Promise<void> | null = null
  private listeners: AuthStateListener[] = []
  private currentIms: IMS | null = null

  // ============================================================================
  // Script loading
  // ============================================================================

  /**
   * Dynamically load the imslib script and wait for it to be ready.
   * Caches the promise so concurrent callers wait on the same load.
   */
  private loadScript(): Promise<void> {
    if (this.scriptLoadPromise) {
      return this.scriptLoadPromise
    }

    // If the script is already in the DOM and window.adobeIMS exists, resolve immediately
    if (typeof window.adobeIMS !== 'undefined') {
      this.scriptLoadPromise = Promise.resolve()
      return this.scriptLoadPromise
    }

    this.scriptLoadPromise = new Promise((resolve, reject) => {
      // Don't add the script twice if it's already in the DOM (e.g. from index.html)
      const existing = document.getElementById(IMS_SCRIPT_ID)
      if (existing) {
        // Script tag exists but adobeIMS isn't ready yet — wait for its load event
        // If it already fired, resolve immediately
        if (typeof window.adobeIMS !== 'undefined') {
          resolve()
          return
        }
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () =>
          reject(new Error(`Failed to load Adobe IMS library from: ${IMS_LIB_URL}`))
        )
        return
      }

      console.log('🔐 Loading Adobe IMS library...')
      const script = document.createElement('script')
      script.id = IMS_SCRIPT_ID
      script.src = IMS_LIB_URL
      script.type = 'text/javascript'

      script.onload = () => {
        if (typeof window.adobeIMS === 'undefined') {
          // Some environments may set up adobeIMS asynchronously; poll briefly
          let attempts = 0
          const poll = setInterval(() => {
            attempts++
            if (typeof window.adobeIMS !== 'undefined') {
              clearInterval(poll)
              resolve()
            } else if (attempts >= 20) {
              clearInterval(poll)
              reject(new Error('Adobe IMS library loaded but window.adobeIMS was not created'))
            }
          }, 100)
        } else {
          resolve()
        }
      }

      script.onerror = () => {
        reject(new Error(
          `Failed to load Adobe IMS library from: ${IMS_LIB_URL}\n` +
          'This may be caused by:\n' +
          '  - No internet connection (the library is loaded from Adobe\'s CDN)\n' +
          '  - A Content Security Policy blocking the script\n' +
          '  - The CDN being unreachable in your environment'
        ))
      }

      document.head.appendChild(script)
    })

    return this.scriptLoadPromise
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Check whether window.adobeIMS is currently available.
   */
  isLibraryAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.adobeIMS !== 'undefined'
  }

  /**
   * Load the IMS library (if needed) and initialize it with app credentials.
   * Safe to call multiple times — subsequent calls return the cached Promise.
   *
   * @param onAccessToken  Called with a populated IMS object once a token is available.
   */
  initialize(onAccessToken?: (ims: IMS) => void): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise
    }

    this.initializePromise = this.loadScript().then(() => {
      return new Promise<void>((resolve, reject) => {
        const config: AdobeIMSConfig = {
          client_id: env.IMS_CLIENT_ID,
          scope: env.IMS_SCOPES,
          environment: env.IMS_ENV,

          // Called when IMS is ready (after initialize completes its async setup)
          onReady: () => {
            console.log('✅ IMS library ready')
            resolve()
          },

          // Called when a valid access token is available (sign-in redirect or existing session)
          onAccessToken: (tokenObj: AdobeIMSTokenObject) => {
            console.log('✅ IMS: Access token received')
            this.handleTokenReceived(tokenObj, onAccessToken)
          },

          // Called when a re-authentication token is obtained
          onReauthAccessToken: (tokenObj: AdobeIMSTokenObject) => {
            console.log('🔄 IMS: Re-auth access token received')
            this.handleTokenReceived(tokenObj, onAccessToken)
          },

          // Called when the current token has expired
          onAccessTokenHasExpired: () => {
            console.warn('⚠️ IMS: Access token expired')
            this.currentIms = null
            this.notifyListeners(null)
          },

          // Called when the user signs out
          onLogout: () => {
            console.log('🚪 IMS: User signed out')
            this.currentIms = null
            this.notifyListeners(null)
          },

          onError: (type: string, message: string) => {
            console.error(`❌ IMS Error [${type}]:`, message)
            // Resolve instead of reject so the app can still render in an unauthenticated state
            resolve()
          }
        }

        console.log('🔐 Initializing Adobe IMS...')
        console.log(`   client_id : ${config.client_id}`)
        console.log(`   scope     : ${config.scope}`)
        console.log(`   environment: ${config.environment}`)

        try {
          window.adobeIMS!.initialize(config)
        } catch (err) {
          reject(err)
        }
      })
    })

    return this.initializePromise
  }

  /**
   * Check if a valid token is currently cached by the IMS library.
   * Call after initialize() resolves.
   * Returns null if the user is not signed in.
   */
  async getCurrentIms(): Promise<IMS | null> {
    if (!this.isLibraryAvailable()) return null

    const isSignedIn = window.adobeIMS!.isSignedInUser()
    if (!isSignedIn) return null

    const tokenObj = window.adobeIMS!.getAccessToken()
    if (!tokenObj) return null

    // Check the token hasn't expired
    const expireDate = new Date(tokenObj.expire)
    if (expireDate <= new Date()) {
      console.warn('⚠️ IMS: Cached token has expired')
      return null
    }

    const profile = await this.fetchProfile()
    const ims: IMS = {
      token: tokenObj.token,
      org: profile?.ownerOrg,
      profile: this.mapProfile(profile)
    }
    this.currentIms = ims
    return ims
  }

  /**
   * Redirect to Adobe sign-in. Requires the library to be initialized first.
   * If the library isn't ready yet, waits for it then signs in.
   */
  signIn(): void {
    if (this.isLibraryAvailable()) {
      console.log('🔐 IMS: Redirecting to sign in...')
      window.adobeIMS!.signIn()
      return
    }

    // Library not available yet — try initializing first
    console.log('⏳ IMS: Library not yet ready, waiting to sign in...')
    this.initialize()
      .then(() => {
        console.log('🔐 IMS: Now redirecting to sign in...')
        window.adobeIMS!.signIn()
      })
      .catch((err) => {
        console.error('❌ IMS: Could not load library for sign in:', err)
        alert(
          'Unable to load Adobe authentication. ' +
          'Please check your internet connection and try again.'
        )
      })
  }

  /**
   * Sign out the current user.
   */
  signOut(): void {
    if (!this.isLibraryAvailable()) {
      console.error('❌ IMS library not available - cannot sign out')
      return
    }
    console.log('🚪 IMS: Signing out...')
    this.currentIms = null
    this.notifyListeners(null)
    window.adobeIMS!.signOut()
  }

  /**
   * Get the most recently received IMS state (no async fetch).
   */
  getCachedIms(): IMS | null {
    return this.currentIms
  }

  /**
   * Subscribe to auth state changes (sign in / sign out / expiry).
   * Returns an unsubscribe function.
   */
  onAuthStateChange(listener: AuthStateListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async handleTokenReceived(
    tokenObj: AdobeIMSTokenObject,
    callback?: (ims: IMS) => void
  ): Promise<void> {
    try {
      const profile = await this.fetchProfile()
      const ims: IMS = {
        token: tokenObj.token,
        org: profile?.ownerOrg,
        profile: this.mapProfile(profile)
      }
      this.currentIms = ims
      this.notifyListeners(ims)
      if (callback) callback(ims)
    } catch (err) {
      console.error('❌ IMS: Failed to fetch profile after token receipt', err)
      const ims: IMS = { token: tokenObj.token }
      this.currentIms = ims
      this.notifyListeners(ims)
      if (callback) callback(ims)
    }
  }

  private mapProfile(profile: AdobeIMSProfile | null): IMSProfile | undefined {
    if (!profile) return undefined
    return {
      userId: profile.userId,
      name: (
        profile.displayName ||
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
        undefined
      ),
      email: profile.email,
      ...profile
    }
  }

  private async fetchProfile(): Promise<AdobeIMSProfile | null> {
    if (!this.isLibraryAvailable()) return null
    try {
      return await window.adobeIMS!.getProfile()
    } catch (err) {
      console.warn('⚠️ IMS: Could not fetch profile', err)
      return null
    }
  }

  private notifyListeners(ims: IMS | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(ims)
      } catch (err) {
        console.error('❌ IMS auth state listener error', err)
      }
    })
  }
}

// Export singleton instance
export const imsAuthService = new ImsAuthService()
export default imsAuthService
