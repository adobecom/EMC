/* 
* Environment Configuration
* Provides access to environment-specific settings
*/

/**
 * Get environment variable
 * Works with both webpack DefinePlugin and runtime environment
 */
function getEnvVar(key: string, defaultValue: string = ''): string {
  // Try process.env (webpack DefinePlugin)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key]
  }
  
  // Try window global (runtime injection)
  // @ts-ignore
  if (typeof window !== 'undefined' && window.EMC_ENV && window.EMC_ENV[key]) {
    // @ts-ignore
    return window.EMC_ENV[key]
  }
  
  return defaultValue
}

/**
 * Environment configuration
 */
export const env = {
  // Client identity for API requests
  // This should match the value from your .env file
  CLIENT_IDENTITY: getEnvVar('CLIENT_IDENTITY', 'emc-console-dev'),
  
  // API Key for external requests
  API_KEY: getEnvVar('API_KEY', 'acom_event_service'),
  
  // Environment mode
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  
  // Check if in development mode
  isDevelopment: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('devMode=true')
  },
  
  // Check if in production mode
  isProduction: () => {
    return !env.isDevelopment()
  }
}

export default env

