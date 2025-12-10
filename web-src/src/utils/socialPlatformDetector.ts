/* 
* <license header>
*/

/**
 * Social Platform Detection Utility
 * Detects social media platform from URL
 */

import { SocialServiceName } from '../types/domain'

export interface SocialPlatform {
  name: string
  serviceName: SocialServiceName | null // API-compatible enum value
  color: string
  icon: string // Unicode emoji or symbol
}

// OpenAPI SocialLink schema serviceName enum values:
// "YouTube", "LinkedIn", "Web", "X", "TikTok", "Instagram", "Facebook", "Pinterest"
const PLATFORM_PATTERNS: Record<string, SocialPlatform> = {
  twitter: {
    name: 'Twitter/X',
    serviceName: 'X',
    color: '#1DA1F2',
    icon: '𝕏'
  },
  'x.com': {
    name: 'X',
    serviceName: 'X',
    color: '#000000',
    icon: '𝕏'
  },
  linkedin: {
    name: 'LinkedIn',
    serviceName: 'LinkedIn',
    color: '#0A66C2',
    icon: 'in'
  },
  facebook: {
    name: 'Facebook',
    serviceName: 'Facebook',
    color: '#1877F2',
    icon: 'f'
  },
  instagram: {
    name: 'Instagram',
    serviceName: 'Instagram',
    color: '#E4405F',
    icon: '📷'
  },
  youtube: {
    name: 'YouTube',
    serviceName: 'YouTube',
    color: '#FF0000',
    icon: '▶'
  },
  github: {
    name: 'GitHub',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#181717',
    icon: '⚡'
  },
  medium: {
    name: 'Medium',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#000000',
    icon: 'M'
  },
  behance: {
    name: 'Behance',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#1769FF',
    icon: 'Bē'
  },
  dribbble: {
    name: 'Dribbble',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#EA4C89',
    icon: '🏀'
  },
  pinterest: {
    name: 'Pinterest',
    serviceName: 'Pinterest',
    color: '#E60023',
    icon: 'P'
  },
  tiktok: {
    name: 'TikTok',
    serviceName: 'TikTok',
    color: '#000000',
    icon: '♪'
  },
  twitch: {
    name: 'Twitch',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#9146FF',
    icon: '📺'
  },
  reddit: {
    name: 'Reddit',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#FF4500',
    icon: '👾'
  },
  discord: {
    name: 'Discord',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#5865F2',
    icon: '💬'
  },
  slack: {
    name: 'Slack',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#4A154B',
    icon: '#'
  },
  spotify: {
    name: 'Spotify',
    serviceName: 'Web', // Not in API enum, use Web
    color: '#1DB954',
    icon: '🎵'
  }
}

/**
 * Detect social platform from URL
 */
export function detectSocialPlatform(url: string): SocialPlatform | null {
  if (!url) return null

  try {
    const urlLower = url.toLowerCase()
    
    // Check each platform pattern
    for (const [key, platform] of Object.entries(PLATFORM_PATTERNS)) {
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


