/*
 * IMS Auth Service
 * Wraps Adobe's imslib.min.js for standalone OAuth authentication.
 * Used when the app is NOT loaded inside the Adobe Experience Cloud Shell.
 *
 * HOW THE LIBRARY WORKS (from reading the minified source):
 *
 *   1. When imslib.min.js loads it always creates `window.adobeImsFactory`.
 *   2. It then checks for `window.adobeid` (a config object with client_id).
 *      - If found it auto-creates `window.adobeIMS` via
 *        adobeImsFactory.createIMSLib(window.adobeid, "adobeIMS")
 *        and calls `.initialize()`.
 *      - If NOT found, `window.adobeIMS` is NEVER created.
 *   3. We can manually create the instance after the script loads by calling:
 *        window.adobeImsFactory.createIMSLib(config, "adobeIMS")
 *      which sets window.adobeIMS = new instance and returns it.
 *      Then we call instance.initialize() ourselves.
 *
 *   Key instance methods:
 *     .initialize()        → processes URL fragment for tokens, refreshes session, calls onReady
 *     .signIn(params?)     → redirects to Adobe login
 *     .signOut(params?)    → clears session and redirects to Adobe logout
 *     .getAccessToken()    → returns { token, expire, sid, … } or null
 *     .getProfile()        → returns Promise<profile>
 *     .isSignedInUser()    → boolean
 */

import { env } from '../config/env'
import { getImsEnvironment } from '../config/constants'
import { IMS, IMSProfile } from '../types'

// ============================================================================
// Type declarations for imslib globals
// ============================================================================

export interface AdobeIMSTokenObject {
  token: string
  expire: Date | string
  sid?: string
  impersonatorId?: string
  isImpersonatedSession?: boolean
  pbaSatisfiedPolicies?: string[]
  isGuestToken?: boolean
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

/** The instance returned by adobeImsFactory.createIMSLib / window.adobeIMS */
export interface AdobeIMS {
  initialize(): Promise<void>
  signIn(params?: any, context?: any, responseType?: string): Promise<void>
  signOut(params?: Record<string, string>): void
  getAccessToken(): AdobeIMSTokenObject | null
  getReauthAccessToken(): AdobeIMSTokenObject | null
  getProfile(): Promise<AdobeIMSProfile>
  isSignedInUser(): boolean
  refreshToken(params?: any): Promise<any>
  enableLogging(): void
  disableLogging(): void
  version: string
}

/** Config object passed to createIMSLib (same shape as window.adobeid) */
export interface AdobeIdConfig {
  client_id: string
  scope?: string
  environment?: string
  redirect_uri?: string | (() => string)
  locale?: string
  useLocalStorage?: boolean
  logsEnabled?: boolean
  modalMode?: boolean
  autoValidateToken?: boolean
  alwaysRemoveTokenFromUrl?: boolean
  onAccessToken?: (token: AdobeIMSTokenObject) => void
  onReauthAccessToken?: (token: AdobeIMSTokenObject) => void
  onAccessTokenHasExpired?: (err?: any) => void
  onReady?: (context?: any) => void
  onError?: (type: string, message: string, details?: any) => void
  onSignOutEventReceived?: () => void
}

declare global {
  interface Window {
    adobeIMS?: AdobeIMS
    adobeImsFactory?: {
      createIMSLib: (config: AdobeIdConfig | null, instanceName?: string) => AdobeIMS
    }
    adobeid?: AdobeIdConfig
  }
}

// ============================================================================
// Constants
// ============================================================================

const IMS_LIB_CDN_URL = 'https://auth.services.adobe.com/imslib/imslib.min.js'
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
   * Dynamically load the imslib script and wait for `window.adobeImsFactory`
   * to become available.
   *
   * Strategy:
   *   1. Try loading the bundled local copy (same-origin — bypasses CORS/COEP).
   *   2. If that fails, fall back to the Adobe CDN via a <script> tag.
   */
  private loadScript(): Promise<void> {
    if (this.scriptLoadPromise) {
      return this.scriptLoadPromise
    }

    // Already loaded — factory exists
    if (typeof window.adobeImsFactory !== 'undefined') {
      this.scriptLoadPromise = Promise.resolve()
      return this.scriptLoadPromise
    }

    this.scriptLoadPromise = this.loadLocalImsLib()
      .catch((localErr) => {
        console.warn('IMS: local imslib unavailable, falling back to CDN.', localErr)
        return this.loadCdnImsLib()
      })

    return this.scriptLoadPromise
  }

  /**
   * Load the bundled local copy of imslib.min.js via dynamic import.
   * Same-origin — completely avoids CORS / COEP issues.
   */
  private async loadLocalImsLib(): Promise<void> {
    if (env.isDevelopment()) {
      console.log('IMS: loading library from local bundle')
    }
    await import('../deps/imslib.min.js')
    // The IIFE inside the file sets window.adobeImsFactory on execution
    if (typeof window.adobeImsFactory === 'undefined') {
      throw new Error('Local imslib loaded but window.adobeImsFactory was not set')
    }
  }

  /**
   * Fallback: load imslib from Adobe CDN via a <script> tag.
   */
  private loadCdnImsLib(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(IMS_SCRIPT_ID) as HTMLScriptElement | null
      if (existing) {
        if (typeof window.adobeImsFactory !== 'undefined') {
          resolve()
          return
        }
        existing.addEventListener('load', () => this.waitForFactory(resolve, reject))
        existing.addEventListener('error', () =>
          reject(new Error(`Failed to load Adobe IMS library from CDN: ${IMS_LIB_CDN_URL}`))
        )
        return
      }

      if (env.isDevelopment()) {
        console.log('IMS: loading library from CDN')
      }
      const script = document.createElement('script')
      script.id = IMS_SCRIPT_ID
      script.src = IMS_LIB_CDN_URL
      script.type = 'text/javascript'

      script.onload = () => this.waitForFactory(resolve, reject)

      script.onerror = () => {
        reject(new Error(
          `Failed to load Adobe IMS library from: ${IMS_LIB_CDN_URL}\n` +
          'Possible causes:\n' +
          '  • COEP/CORS policy blocking cross-origin scripts\n' +
          '  • No internet connection\n' +
          '  • A Content Security Policy blocking the script\n' +
          '  • The CDN being unreachable in your environment'
        ))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * After the script's onload fires, verify that `window.adobeImsFactory`
   * exists.  It should be synchronous but we poll briefly just in case.
   */
  private waitForFactory(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    if (typeof window.adobeImsFactory !== 'undefined') {
      resolve()
      return
    }
    // Extremely unlikely — but poll a handful of times
    let attempts = 0
    const poll = setInterval(() => {
      attempts++
      if (typeof window.adobeImsFactory !== 'undefined') {
        clearInterval(poll)
        resolve()
      } else if (attempts >= 20) {
        clearInterval(poll)
        reject(new Error(
          'Adobe IMS script loaded but window.adobeImsFactory was not created. ' +
          'The CDN may have returned an error page instead of JavaScript.'
        ))
      }
    }, 100)
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Whether the IMS instance (window.adobeIMS) is available.
   */
  isLibraryAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.adobeIMS !== 'undefined'
  }

  /**
   * Load the IMS library (if needed), create the IMS instance, and
   * initialize it.  Safe to call many times — subsequent calls return
   * the cached Promise.
   *
   * @param onAccessToken  Called with a populated IMS object when a
   *                        token becomes available.
   */
  initialize(onAccessToken?: (ims: IMS) => void): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise
    }

    this.initializePromise = this.loadScript().then(() => {
      return new Promise<void>((resolve) => {
        // IMS environment is derived from the build-time ENVIRONMENT tier:
        //   'prod'  → 'prod'  IMS
        //   any other (dev / stage / personal workspace) → 'stg1' IMS
        const imsEnv = getImsEnvironment()

        const imsConfig: AdobeIdConfig = {
          client_id: env.IMS_CLIENT_ID,
          scope: env.IMS_SCOPES,
          environment: imsEnv,
          useLocalStorage: false,
          logsEnabled: false,
          redirect_uri: window.location.origin + window.location.pathname,

          // Called when initialization finishes (always fires, even without a session)
          onReady: () => {
            if (env.isDevelopment()) {
              console.log('IMS: library ready')
            }
            this.checkExistingSession(onAccessToken)
            resolve()
          },

          // Fires when a valid access token is received (sign-in redirect or refresh)
          onAccessToken: (tokenObj: AdobeIMSTokenObject) => {
            if (env.isDevelopment()) {
              console.log('IMS: access token received')
            }
            this.handleTokenReceived(tokenObj, onAccessToken)
          },

          // Fires on re-authentication
          onReauthAccessToken: (tokenObj: AdobeIMSTokenObject) => {
            if (env.isDevelopment()) {
              console.log('IMS: re-auth token received')
            }
            this.handleTokenReceived(tokenObj, onAccessToken)
          },

          // Fires when the current token expires
          onAccessTokenHasExpired: () => {
            console.warn('IMS: access token expired')
            this.currentIms = null
            this.notifyListeners(null)
          },

          // Fires on errors during initialization
          onError: (type: string, message: string, details?: any) => {
            console.error(`IMS error [${type}]: ${message}`, details ?? '')
            // Resolve so the app renders in an unauthenticated state
            resolve()
          }
        }

        if (env.isDevelopment()) {
          console.log(`IMS: initializing (env: ${imsEnv})`)
        }

        try {
          // Create the IMS instance via the factory — this sets window.adobeIMS
          window.adobeImsFactory!.createIMSLib(imsConfig, 'adobeIMS')

          // Tell the library to process any token in the URL fragment, check
          // for existing sessions, etc.
          window.adobeIMS!.initialize()
        } catch (err) {
          console.error('IMS: failed to create/initialize instance:', err)
          // Still resolve so app renders unauthenticated
          resolve()
        }
      })
    })

    return this.initializePromise
  }

  /**
   * Check if the user already has a valid session after IMS is ready.
   */
  private async checkExistingSession(callback?: (ims: IMS) => void): Promise<void> {
    if (!this.isLibraryAvailable()) return

    try {
      const isSignedIn = window.adobeIMS!.isSignedInUser()
      if (!isSignedIn) {
        if (env.isDevelopment()) {
          console.log('IMS: no existing session')
        }
        return
      }

      const tokenObj = window.adobeIMS!.getAccessToken()
      if (!tokenObj) return

      if (env.isDevelopment()) {
        console.log('IMS: existing session found')
      }
      await this.handleTokenReceived(tokenObj, callback)
    } catch (err) {
      console.warn('IMS: error checking existing session', err)
    }
  }

  /**
   * Get the current IMS state (fetches profile if needed).
   */
  async getCurrentIms(): Promise<IMS | null> {
    if (!this.isLibraryAvailable()) return null

    const isSignedIn = window.adobeIMS!.isSignedInUser()
    if (!isSignedIn) return null

    const tokenObj = window.adobeIMS!.getAccessToken()
    if (!tokenObj) return null

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
   * Redirect to Adobe sign-in.  Waits for the library if not ready yet.
   */
  signIn(): void {
    if (this.isLibraryAvailable()) {
      window.adobeIMS!.signIn()
      return
    }

    this.initialize()
      .then(() => {
        if (this.isLibraryAvailable()) {
          window.adobeIMS!.signIn()
        } else {
          console.error('IMS: library not available after initialize')
        }
      })
      .catch((err) => {
        console.error('IMS: could not load library for sign-in:', err)
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
      console.error('IMS: library not available — cannot sign out')
      return
    }
    this.currentIms = null
    this.notifyListeners(null)
    window.adobeIMS!.signOut()
  }

  /**
   * Get the most recently received IMS state (synchronous, no fetch).
   */
  getCachedIms(): IMS | null {
    return this.currentIms
  }

  /**
   * Subscribe to auth state changes.  Returns an unsubscribe function.
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
      console.error('IMS: failed to fetch profile after token receipt', err)
      const ims: IMS = { token: tokenObj.token }
      this.currentIms = ims
      this.notifyListeners(ims)
      if (callback) callback(ims)
    }
  }

  private mapProfile(profile: AdobeIMSProfile | null): IMSProfile | undefined {
    if (!profile) return undefined
    // Map only known fields — do not spread the raw profile to avoid leaking
    // unexpected or sensitive data from the IMS response.
    return {
      userId: profile.userId,
      name: (
        profile.displayName ||
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
        undefined
      ),
      email: profile.email,
      account_type: profile.account_type,
      ownerOrg: profile.ownerOrg,
      projectedProductContext: profile.projectedProductContext,
    }
  }

  private async fetchProfile(): Promise<AdobeIMSProfile | null> {
    if (!this.isLibraryAvailable()) return null
    try {
      return await window.adobeIMS!.getProfile()
    } catch (err) {
      console.warn('IMS: could not fetch profile', err)
      return null
    }
  }

  private notifyListeners(ims: IMS | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(ims)
      } catch (err) {
        console.error('IMS: auth state listener error', err)
      }
    })
  }
}

// Export singleton instance
export const imsAuthService = new ImsAuthService()
export default imsAuthService
