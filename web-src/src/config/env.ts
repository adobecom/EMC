/* 
* Environment Configuration
* Provides access to environment-specific settings
* 
* Environment variables are injected at build time by Parcel from:
* 1. .env file in project root
* 2. app.config.yaml env section
* 3. System environment variables
*/

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
  
  // Environment mode
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Check if in development mode (localhost only)
  isDevelopment: () => {
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
  console.log('   CLIENT_IDENTITY:', env.CLIENT_IDENTITY)
  console.log('   API_KEY:', env.API_KEY)
  console.log('   NODE_ENV:', env.NODE_ENV)
  
  if (env.CLIENT_IDENTITY === 'emc-console-dev') {
    console.warn('⚠️ Using default CLIENT_IDENTITY')
    console.warn('   Add CLIENT_IDENTITY to your .env file to set a custom value')
  }
}

export default env

