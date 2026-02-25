/* 
* Environment Configuration
* Provides access to environment-specific settings
* 
* Environment variables are injected at build time by Parcel from:
* 1. .env file in project root
* 2. app.config.yaml env section
* 3. System environment variables (including CI/CD pipeline variables)
*/

/**
 * Valid environment values for API tier selection
 */
export type EnvironmentTier = 'dev' | 'stage' | 'prod'

/**
 * Hostnames where dev token functionality is allowed
 * Includes localhost and all dev/developer namespace workspaces
 */
const DEV_TOKEN_ALLOWED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  // Main dev instance
  '14257-emc-dev.adobeio-static.net',
  // Developer namespace workspaces
  '14257-emc-qiyundai.adobeio-static.net',
  '14257-emc-shameeb.adobeio-static.net',
  '14257-emc-rkhan.adobeio-static.net',
]

/**
 * Environment configuration
 * Parcel automatically injects process.env variables at build time
 */
export const env = {
  // Client identity for API requests
  // Loaded from .env file: CLIENT_IDENTITY=your-value
  CLIENT_IDENTITY: process.env.CLIENT_IDENTITY || 'emc-console-dev',
  
  // API Key for external requests
  API_KEY: process.env.API_KEY || 'acom_event_service',

  // ============================================================================
  // IMS AUTHENTICATION (Standalone mode - without Experience Cloud Shell)
  // ============================================================================
  // IMS Client ID registered with IDOPS/IMSS — used only in standalone (imslib) mode.
  // In ExC Shell mode the shell's own exc_app client ID is used automatically.
  // Loaded from .env file: IMS_CLIENT_ID=your-client-id
  IMS_CLIENT_ID: process.env.IMS_CLIENT_ID || 'acom_event_mgmt_console',

  // OAuth scopes for IMS authentication (standalone mode)
  // Loaded from .env file: IMS_SCOPES=AdobeID,gnav,openid
  IMS_SCOPES: process.env.IMS_SCOPES || 'AdobeID,gnav,openid',

  // IMS environment is derived automatically from ENVIRONMENT tier.
  // 'prod' tier -> 'prod' IMS; everything else (dev/stage/personal) -> 'stg1' IMS.
  // See getImsEnvironment() in config/constants.ts.

  /**
   * Environment tier for API endpoint selection
   * Set at build time via CI/CD or .env file
   * Values: 'dev', 'stage', 'prod'
   * Defaults to 'dev' for local development
   */
  ENVIRONMENT: (process.env.ENVIRONMENT || 'dev') as EnvironmentTier,
  
  // Google Places API Keys (environment-specific)
  // Loaded from .env file: DEV_GOOGLE_PLACES_API, STAGE_GOOGLE_PLACES_API, PROD_GOOGLE_PLACES_API
  DEV_GOOGLE_PLACES_API: process.env.DEV_GOOGLE_PLACES_API || '',
  STAGE_GOOGLE_PLACES_API: process.env.STAGE_GOOGLE_PLACES_API || '',
  PROD_GOOGLE_PLACES_API: process.env.PROD_GOOGLE_PLACES_API || '',
  
  // Environment mode
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Check if in development mode (localhost or dev instances)
  // This controls whether dev token UI is shown
  isDevelopment: () => {
    const hostname = window.location.hostname
    return DEV_TOKEN_ALLOWED_HOSTNAMES.includes(hostname)
  },
  
  // Check if running on localhost specifically
  isLocalhost: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1'
  },
  
  // Check if in production mode
  isProduction: () => {
    return !env.isDevelopment()
  }
}

// Debug logging in development
if (typeof window !== 'undefined' && env.isDevelopment()) {
  console.log('🔧 Environment Configuration:')
  console.log('   ENVIRONMENT:', env.ENVIRONMENT)
  console.log('   CLIENT_IDENTITY:', env.CLIENT_IDENTITY)
  console.log('   API_KEY:', env.API_KEY)
  console.log('   NODE_ENV:', env.NODE_ENV)
  console.log('   DEV_GOOGLE_PLACES_API:', env.DEV_GOOGLE_PLACES_API ? '✓ Configured' : '✗ Not configured')
  console.log('   STAGE_GOOGLE_PLACES_API:', env.STAGE_GOOGLE_PLACES_API ? '✓ Configured' : '✗ Not configured')
  console.log('   PROD_GOOGLE_PLACES_API:', env.PROD_GOOGLE_PLACES_API ? '✓ Configured' : '✗ Not configured')
  
  if (env.CLIENT_IDENTITY === 'emc-console-dev') {
    console.warn('⚠️ Using default CLIENT_IDENTITY')
    console.warn('   Add CLIENT_IDENTITY to your .env file to set a custom value')
  }
  
  if (!env.DEV_GOOGLE_PLACES_API && !env.STAGE_GOOGLE_PLACES_API && !env.PROD_GOOGLE_PLACES_API) {
    console.warn('⚠️ No Google Places API keys configured')
    console.warn('   Add DEV_GOOGLE_PLACES_API, STAGE_GOOGLE_PLACES_API, or PROD_GOOGLE_PLACES_API to your .env file')
    console.warn('   See docs/GOOGLE_PLACES_SETUP.md for setup instructions')
  }
}

export default env
