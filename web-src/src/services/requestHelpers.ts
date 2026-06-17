/* 
* Request Helpers
* Utilities for constructing API request headers and handling external API calls
* Based on the previous app's external API controller
*/

import { getClientIdentity as getClientIdentityFromEnv } from '../config/env'
import { ALLOWED_HOSTS } from '../config/constants'

/**
 * Module-level active group ID for XHR-based requests (e.g. uploadImage)
 * that bypass the ApiService class. Set by ApiService.setGroupId().
 */
let _activeGroupId: string | null = null
export function setUploadGroupId(groupId: string | null): void {
  _activeGroupId = groupId
}

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
 * Get x-client-identity for the current environment tier.
 * Delegates to env.ts which selects DEV/STAGE/PROD_CLIENT_IDENTITY based on ENVIRONMENT.
 */
export function getClientIdentity(): string {
  return getClientIdentityFromEnv()
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

export function constructRequestHeaders(authToken: string, method: string = 'GET'): RequestHeaders {
  const headers: any = {
    'Authorization': `Bearer ${authToken}`,
    'x-api-key': 'acom_event_service',
    'x-request-id': generateUUID(),
    'x-client-identity': getClientIdentity()
  }
  
  // Only add content-type for requests with a body (not GET/HEAD/DELETE)
  // Some cluster gateways reject content-type on GET requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
    headers['content-type'] = 'application/json'
  }
  
  return headers as RequestHeaders
}

/**
 * Validate URL is safe to call
 * Based on isValidUrl from old app
 * Uses ALLOWED_HOSTS from constants which includes all API endpoints
 */
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
 * Properly configured for CORS requests to external APIs
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
    // Configure fetch with proper CORS settings
    const fetchOptions: RequestInit = {
      ...options,
      mode: 'cors',           // Explicitly enable CORS
      credentials: 'omit',    // Don't send cookies/credentials cross-origin
      cache: 'no-cache',      // Don't cache responses
    }
    
    const response = await fetch(url, fetchOptions)
    
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

/**
 * Normalize JSON from ESP image uploads. Shapes differ by endpoint:
 * - POST .../events/{id}/images 201 → bare Image
 * - POST .../speakers/{id}/images 201 → Speaker with `photo` (not `image`)
 * - POST .../sponsors/{id}/images 201 → Sponsor with `image`
 * See docs/backend-reference/openapi.json (uploadSpeakerImage / uploadSponsorImage).
 */
export function extractImageFromUploadResponse(
  result: unknown
): { imageUrl: string; imageId: string } | null {
  const asPair = (v: unknown): { imageUrl: string; imageId: string } | null => {
    if (v === null || typeof v !== 'object') return null
    const o = v as Record<string, unknown>
    const imageUrl = o.imageUrl
    const imageId = o.imageId
    if (
      typeof imageUrl === 'string' &&
      typeof imageId === 'string' &&
      imageUrl !== '' &&
      imageId !== ''
    ) {
      return { imageUrl, imageId }
    }
    return null
  }

  if (result === null || typeof result !== 'object') return null
  const r = result as Record<string, unknown>

  let hit = asPair(r)
  if (hit) return hit

  hit = asPair(r.image) || asPair(r.photo)
  if (hit) return hit

  const speaker = r.speaker
  if (speaker && typeof speaker === 'object') {
    const s = speaker as Record<string, unknown>
    hit = asPair(s.image) || asPair(s.photo)
    if (hit) return hit
  }

  const sponsor = r.sponsor
  if (sponsor && typeof sponsor === 'object') {
    const s = sponsor as Record<string, unknown>
    hit = asPair(s.image)
    if (hit) return hit
  }

  return null
}

export async function uploadImage(
  file: File,
  config: ImageUploadConfig,
  authToken: string,
  tracker?: UploadTracker,
  imageId?: string
): Promise<any> {
  const groupId = _activeGroupId
  const requestId = generateUUID()
  const method = imageId ? 'PUT' : 'POST'
  const url = imageId ? `${config.targetUrl}/${imageId}` : config.targetUrl

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open(method, url)
    xhr.setRequestHeader('x-image-alt-text', `UTF-8''${encodeURIComponent(config.altText || '')}`)
    xhr.setRequestHeader('x-image-kind', config.type)
    xhr.setRequestHeader('x-api-key', 'acom_event_service')
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.setRequestHeader('x-request-id', requestId)
    xhr.setRequestHeader('x-client-identity', getClientIdentity())
    if (groupId) {
      xhr.setRequestHeader('x-adobe-esp-group-id', groupId)
    }

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

