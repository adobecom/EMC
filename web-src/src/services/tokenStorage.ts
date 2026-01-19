import { STORAGE_KEYS } from '../config/storageConstants'

/* 
* Token Storage Service
* Manages Adobe IMS token storage and retrieval for local development
*/

export interface StoredToken {
  token: string
  expire: string
  sid?: string
}

/**
 * Token Storage Service
 * Provides methods to store, retrieve, and validate Adobe IMS tokens
 */
export class TokenStorageService {
  /**
   * Save a token to localStorage
   */
  saveToken(tokenData: StoredToken): void {
    try {
      localStorage.setItem(STORAGE_KEYS.devToken, JSON.stringify(tokenData))
      console.log('✅ Token saved successfully. Expires:', tokenData.expire)
    } catch (error) {
      console.error('❌ Failed to save token:', error)
    }
  }

  /**
   * Retrieve the stored token
   */
  getToken(): StoredToken | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.devToken)
      if (!stored) return null
      
      const tokenData: StoredToken = JSON.parse(stored)
      return tokenData
    } catch (error) {
      console.error('❌ Failed to retrieve token:', error)
      return null
    }
  }

  /**
   * Check if the stored token is still valid
   */
  isTokenValid(): boolean {
    const tokenData = this.getToken()
    if (!tokenData) return false

    try {
      const expireDate = new Date(tokenData.expire)
      const now = new Date()
      
      const isValid = expireDate > now
      
      if (!isValid) {
        console.log('⚠️ Token expired at:', tokenData.expire)
      }
      
      return isValid
    } catch (error) {
      console.error('❌ Failed to validate token expiration:', error)
      return false
    }
  }

  /**
   * Get the token string if valid, null otherwise
   */
  getValidToken(): string | null {
    if (!this.isTokenValid()) {
      return null
    }
    
    const tokenData = this.getToken()
    return tokenData?.token || null
  }

  /**
   * Clear the stored token
   */
  clearToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.devToken)
      console.log('🗑️ Token cleared')
    } catch (error) {
      console.error('❌ Failed to clear token:', error)
    }
  }

  /**
   * Get token expiration info
   */
  getTokenExpiration(): { expired: boolean; expiresAt: string; timeRemaining: string } | null {
    const tokenData = this.getToken()
    if (!tokenData) return null

    try {
      const expireDate = new Date(tokenData.expire)
      const now = new Date()
      const expired = expireDate <= now
      
      // Calculate time remaining
      const diffMs = expireDate.getTime() - now.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      let timeRemaining = ''
      if (expired) {
        timeRemaining = 'Expired'
      } else if (diffHours > 24) {
        const days = Math.floor(diffHours / 24)
        timeRemaining = `${days}d ${diffHours % 24}h`
      } else if (diffHours > 0) {
        timeRemaining = `${diffHours}h ${diffMins}m`
      } else {
        timeRemaining = `${diffMins}m`
      }

      return {
        expired,
        expiresAt: tokenData.expire,
        timeRemaining
      }
    } catch (error) {
      console.error('❌ Failed to get expiration info:', error)
      return null
    }
  }

  /**
   * Parse a token string and extract token and expiration
   * Supports both full JSON object or just the token string
   */
  parseTokenInput(input: string): StoredToken | null {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(input)
      
      if (parsed.token && parsed.expire) {
        // Full token object
        return {
          token: parsed.token,
          expire: parsed.expire,
          sid: parsed.sid
        }
      } else if (typeof parsed === 'string') {
        // Just a token string wrapped in JSON
        return this.parseTokenString(parsed)
      }
    } catch (e) {
      // Not JSON, try as raw token string
      return this.parseTokenString(input)
    }
    
    return null
  }

  /**
   * Parse a JWT token string and extract expiration
   */
  private parseTokenString(token: string): StoredToken | null {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.error('❌ Invalid JWT token format')
        return null
      }

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]))
      
      // Check for expiration in the payload
      if (payload.created_at && payload.expires_in) {
        // Calculate expiration from created_at + expires_in
        const createdAt = parseInt(payload.created_at)
        const expiresIn = parseInt(payload.expires_in)
        const expireDate = new Date(createdAt + expiresIn)
        
        return {
          token,
          expire: expireDate.toISOString(),
          sid: payload.sid
        }
      }
      
      console.error('❌ Could not determine token expiration')
      return null
    } catch (error) {
      console.error('❌ Failed to parse token:', error)
      return null
    }
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorageService()
export default tokenStorage

