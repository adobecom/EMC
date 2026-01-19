/* 
* <license header>
*/

/**
 * Social Platform Detection Utility
 * Detects social media platform from URL and provides branded icons
 */

import React from 'react'
import { SocialServiceName } from '../types/domain'
import { SOCIAL_PLATFORM_PATTERNS } from '../config/socialPlatformConstants'

export interface SocialPlatform {
  name: string
  serviceName: SocialServiceName | null // API-compatible enum value
  color: string
  icon: React.ReactElement // SVG icon element
}

/**
 * Detect social platform from URL
 */
export function detectSocialPlatform(url: string): SocialPlatform | null {
  if (!url) return null

  try {
    const urlLower = url.toLowerCase()
    
    // Check each platform pattern
    for (const [key, platform] of Object.entries(SOCIAL_PLATFORM_PATTERNS)) {
      if (urlLower.includes(key)) {
        return platform
      }
    }
    
    // Default to generic link if no platform detected
    return null
  } catch (error) {
    return null
  }
}

/**
 * Validate if URL is a valid social media link
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false
  
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Get platform name from URL for display
 */
export function getPlatformName(url: string): string {
  const platform = detectSocialPlatform(url)
  return platform?.name || 'Link'
}

/**
 * Get API-compatible serviceName from URL
 * Returns 'Web' as fallback for unknown platforms
 */
export function getServiceName(url: string): SocialServiceName {
  const platform = detectSocialPlatform(url)
  return platform?.serviceName || 'Web'
}

/**
 * Convert form social link data to API format
 * Form format: { url: string, platform?: string }
 * API format: { serviceName: enum, link: string }
 */
export function toApiSocialLink(formLink: { url: string; platform?: string }): { serviceName: SocialServiceName; link: string } {
  return {
    serviceName: getServiceName(formLink.url),
    link: formLink.url
  }
}

/**
 * Convert API social link to form format
 * API format: { serviceName: enum, link: string }
 * Form format: { url: string, platform?: string }
 */
export function fromApiSocialLink(apiLink: { serviceName: SocialServiceName; link: string }): { url: string; platform?: string } {
  const platform = detectSocialPlatform(apiLink.link)
  return {
    url: apiLink.link,
    platform: platform?.name || apiLink.serviceName
  }
}
