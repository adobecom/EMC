/* 
* Request Helpers
* Utilities for constructing API request headers and handling external API calls
* Based on the previous app's external API controller
*/

import { env } from '../config/env'

/**
 * Generate a UUID v4
 * Used for x-request-id header
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Get x-client-identity from environment
 * This should be loaded from your .env file
 */
export function getClientIdentity(): string {
  return env.CLIENT_IDENTITY
}

/**
 * Construct standard headers for external API requests
 * Mimics the constructRequestOptions function from the old app
 */
export interface RequestHeaders {
  'Authorization': string
  'x-api-key': string
  'content-type': string
  'x-request-id': string
  'x-client-identity': string
}

export function constructRequestHeaders(authToken: string): RequestHeaders {
  return {
    'Authorization': `Bearer ${authToken}`,
    'x-api-key': 'acom_event_service',
    'content-type': 'application/json',
    'x-request-id': generateUUID(),
    'x-client-identity': getClientIdentity()
  }
}

/**
 * Validate URL is safe to call
 * Based on isValidUrl from old app
 */
const ALLOWED_HOSTS: { [key: string]: boolean } = {
  'localhost': true,
  '127.0.0.1': true,
  // Add your allowed production hosts here
  'events-service.adobe.io': true,
  'events-service-stage.adobe.io': true,
  'events-service-dev.adobe.io': true,
}

export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    
    if (!ALLOWED_HOSTS[url.hostname]) {
      console.warn(`⚠️ Blocked request to non-allowed host: ${url.hostname}`)
      return false
    }
    
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      console.warn(`⚠️ Blocked non-HTTPS request to: ${url.toString()}`)
      return false
    }
    
    return true
  } catch (e) {
    console.error(`❌ Invalid URL: ${urlString}`, e)
    return false
  }
}

/**
 * Safe fetch wrapper
 * Based on safeFetch from old app
 */
export async function safeFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  if (!isValidUrl(url)) {
    throw new Error('Invalid or unauthorized URL')
  }

  // Check for non-invasive test mode
  const nonInvasiveTest = new URLSearchParams(window.location.search).get('nonInvasiveTest') === 'true'
  
  if (nonInvasiveTest && options.method && ['PUT', 'POST', 'DELETE'].includes(options.method)) {
    console.log('🧪 Non-invasive test mode. Skipping request:', url, options)
    if (options.body) {
      console.log('📦 Payload:', JSON.parse(options.body as string))
    }
    // Return a mock successful response
    return new Response(JSON.stringify({}), { 
      status: 200, 
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    })
  }

  try {
    const response = await fetch(url, options)
    
    const contentType = response.headers.get('content-type')
    if (contentType && 
        !contentType.includes('application/json') && 
        !contentType.includes('text/plain')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }
    
    return response
  } catch (error) {
    console.error('❌ Request failed:', error)
    throw error
  }
}

/**
 * Upload image with progress tracking
 * Based on uploadImage from old app
 */
export interface ImageUploadConfig {
  targetUrl: string
  altText?: string
  type: string
}

export interface UploadTracker {
  progress: number
}

export async function uploadImage(
  file: File,
  config: ImageUploadConfig,
  authToken: string,
  tracker?: UploadTracker,
  imageId?: string
): Promise<any> {
  const requestId = generateUUID()
  const method = imageId ? 'PUT' : 'POST'
  const url = imageId ? `${config.targetUrl}/${imageId}` : config.targetUrl

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.open(method, url)
    xhr.setRequestHeader('x-image-alt-text', config.altText || '')
    xhr.setRequestHeader('x-image-kind', config.type)
    xhr.setRequestHeader('x-api-key', 'acom_event_service')
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.setRequestHeader('x-request-id', requestId)
    xhr.setRequestHeader('x-client-identity', getClientIdentity())

    if (tracker) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          tracker.progress = (event.loaded / event.total) * 100
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const respJson = JSON.parse(xhr.responseText)
          resolve(respJson)
        } catch (e) {
          console.error('❌ Failed to parse image upload response:', e)
          reject(e)
        }
      } else {
        console.error(`❌ Upload failed with status: ${xhr.status}`)
        reject(new Error(`Upload failed with status: ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      console.error(`❌ Failed to upload image: ${xhr.statusText}`)
      reject(new Error(`Upload failed: ${xhr.statusText}`))
    }

    xhr.send(file)
  })
}

