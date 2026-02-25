/*
 * IMS Auth Service
 * Wraps Adobe's imslib.min.js (window.adobeIMS) for standalone OAuth authentication.
 * Used when the app is NOT loaded inside the Adobe Experience Cloud Shell.
 *
 * The imslib script tag must be loaded in index.html before this service is used.
 * It creates the global window.adobeIMS object with the following key methods:
 *   - initialize(config)     : Initialize with client_id, scope, redirect_uri, etc.
 *   - signIn()               : Redirect to Adobe login page
 *   - signOut()              : Sign out and clear session
 *   - getAccessToken()       : Returns { token, expire, sid } or null
 *   - getProfile()           : Returns user profile object
 *   - isSignedInUser()       : Returns boolean
 *   - onImsLibInstance(cb)   : Callback when IMS is fully initialized
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
  // Callback fired when an IMS token is successfully obtained
  onAccessToken?: (token: AdobeIMSTokenObject) => void
  // Callback fired when the user is not signed in
  onReauthAccessToken?: (token: AdobeIMSTokenObject) => void
  // Callback fired on errors
  onError?: (type: string, message: string) => void
  // Callback fired when the IMS library is ready
  onReady?: () => void
}

export interface AdobeIMS {
  initialize(config: AdobeIMSConfig): void
  signIn(params?: Record<string, string>): void
  signOut(params?: Record<string, string>): void
  getAccessToken(): AdobeIMSTokenObject | null
  getProfile(): Promise<AdobeIMSProfile>
  isSignedInUser(): boolean
  onImsLibInstance(callback: (adobeIMS: AdobeIMS) => void): void
  refreshToken(): void
}

declare global {
  interface Window {
    adobeIMS?: AdobeIMS
  }
}

// ============================================================================
// IMS Auth Service
// ============================================================================

type AuthStateListener = (ims: IMS | null) => void

class ImsAuthService {
  private initialized = false
  private listeners: AuthStateListener[] = []
  private currentIms: IMS | null = null

  /**
   * Check whether the IMS library has been loaded (script tag present and executed).
   */
  isLibraryAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.adobeIMS !== 'undefined'
  }

  /**
   * Initialize the IMS library with app credentials.
   * Must be called once before any other IMS operations.
   * Safe to call multiple times - subsequent calls are no-ops.
   */
  initialize(onAccessToken?: (ims: IMS) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isLibraryAvailable()) {
        reject(new Error('Adobe IMS library (imslib.min.js) is not loaded. Check the script tag in index.html.'))
        return
      }

      if (this.initialized) {
        resolve()
        return
      }

      const config: AdobeIMSConfig = {
        client_id: env.IMS_CLIENT_ID,
        scope: env.IMS_SCOPES,
        environment: env.IMS_ENV,
        // Called when a token is obtained (both on initial load and after signIn redirect)
        onAccessToken: (tokenObj: AdobeIMSTokenObject) => {
          console.log('✅ IMS: Access token received')
          this.handleTokenReceived(tokenObj, onAccessToken)
        },
        onReauthAccessToken: (tokenObj: AdobeIMSTokenObject) => {
          console.log('🔄 IMS: Re-auth access token received')
          this.handleTokenReceived(tokenObj, onAccessToken)
        },
        onError: (type: string, message: string) => {
          console.error(`❌ IMS Error [${type}]:`, message)
        },
        onReady: () => {
          console.log('✅ IMS library ready')
          this.initialized = true
          resolve()
        }
      }

      console.log('🔐 Initializing Adobe IMS library...')
      console.log(`   client_id: ${config.client_id}`)
      console.log(`   scope: ${config.scope}`)
      console.log(`   environment: ${config.environment}`)

      window.adobeIMS!.initialize(config)
    })
  }

  /**
   * Handle a received access token: fetch profile and notify listeners.
   */
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
      if (callback) {
        callback(ims)
      }
    } catch (err) {
      console.error('❌ IMS: Failed to fetch profile after token receipt', err)
      // Still provide the token even if profile fetch fails
      const ims: IMS = { token: tokenObj.token }
      this.currentIms = ims
      this.notifyListeners(ims)
      if (callback) {
        callback(ims)
      }
    }
  }

  /**
   * Map Adobe IMS profile to our internal IMSProfile type.
   */
  private mapProfile(profile: AdobeIMSProfile | null): IMSProfile | undefined {
    if (!profile) return undefined
    return {
      userId: profile.userId,
      name: profile.displayName || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || undefined,
      email: profile.email,
      ...profile
    }
  }

  /**
   * Fetch the user's IMS profile.
   */
  private async fetchProfile(): Promise<AdobeIMSProfile | null> {
    if (!this.isLibraryAvailable()) return null
    try {
      const profile = await window.adobeIMS!.getProfile()
      return profile
    } catch (err) {
      console.warn('⚠️ IMS: Could not fetch profile', err)
      return null
    }
  }

  /**
   * Check if a valid token is currently available and build IMS data from it.
   * Returns null if the user is not signed in.
   */
  async getCurrentIms(): Promise<IMS | null> {
    if (!this.isLibraryAvailable()) return null
    
    const isSignedIn = window.adobeIMS!.isSignedInUser()
    if (!isSignedIn) return null

    const tokenObj = window.adobeIMS!.getAccessToken()
    if (!tokenObj) return null

    // Check token hasn't expired
    const expireDate = new Date(tokenObj.expire)
    if (expireDate <= new Date()) {
      console.warn('⚠️ IMS: Token has expired')
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
   * Redirect to Adobe sign-in page.
   * After sign-in, Adobe redirects back and the onAccessToken callback fires.
   */
  signIn(): void {
    if (!this.isLibraryAvailable()) {
      console.error('❌ IMS library not available - cannot sign in')
      return
    }
    console.log('🔐 IMS: Redirecting to sign in...')
    window.adobeIMS!.signIn()
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
   * Get the current IMS state without async profile fetch.
   * Returns what was last received via token callback or getCurrentIms().
   */
  getCachedIms(): IMS | null {
    return this.currentIms
  }

  /**
   * Subscribe to auth state changes (sign in / sign out).
   * Returns an unsubscribe function.
   */
  onAuthStateChange(listener: AuthStateListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
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

