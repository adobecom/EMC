/* 
* <license header>
*/

/**
 * Load Google Places API dynamically
 * This allows us to inject the API key from environment variables
 */

import { env } from '../config/env'
import { getCurrentEnvironment, ENVIRONMENTS } from '../config/constants'

let isLoading = false
let isLoaded = false

/**
 * Get the Google Places API key for the current environment
 */
function getGooglePlacesApiKey(): string {
  const currentEnv = getCurrentEnvironment()
  
  switch (currentEnv) {
    case ENVIRONMENTS.DEV:
    case ENVIRONMENTS.DEV02:
    case ENVIRONMENTS.LOCAL:
      return env.DEV_GOOGLE_PLACES_API
    case ENVIRONMENTS.STAGE:
    case ENVIRONMENTS.STAGE02:
      return env.STAGE_GOOGLE_PLACES_API
    case ENVIRONMENTS.PROD:
      return env.PROD_GOOGLE_PLACES_API
    default:
      return env.DEV_GOOGLE_PLACES_API
  }
}

export function loadGooglePlacesAPI(): Promise<void> {
  // Already loaded
  if (isLoaded && window.google && window.google.maps) {
    return Promise.resolve()
  }

  // Currently loading
  if (isLoading) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval)
          isLoaded = true
          resolve()
        }
      }, 100)
    })
  }

  isLoading = true

  return new Promise((resolve, reject) => {
    const apiKey = getGooglePlacesApiKey()
    
    if (!apiKey) {
      const currentEnv = getCurrentEnvironment()
      console.warn('⚠️ Google Places API key not configured')
      console.warn(`   Add ${currentEnv.toUpperCase()}_GOOGLE_PLACES_API to your .env file`)
      isLoading = false
      reject(new Error('Google Places API key not configured'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      isLoaded = true
      isLoading = false
      console.log('✅ Google Places API loaded')
      resolve()
    }

    script.onerror = () => {
      isLoading = false
      console.error('❌ Failed to load Google Places API')
      reject(new Error('Failed to load Google Places API'))
    }

    document.head.appendChild(script)
  })
}

