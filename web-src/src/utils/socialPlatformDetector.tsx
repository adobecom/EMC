/* 
* <license header>
*/

/**
 * Social Platform Detection Utility
 * Detects social media platform from URL and provides branded icons
 */

import React from 'react'
import { SocialServiceName } from '../types/domain'
import {
  SiLinkedin,
  SiX,
  SiFacebook,
  SiInstagram,
  SiYoutube,
  SiGithub,
  SiMedium,
  SiBehance,
  SiDribbble,
  SiPinterest,
  SiTiktok,
  SiTwitch,
  SiReddit,
  SiDiscord,
  SiSlack,
  SiSpotify,
} from 'react-icons/si'

export interface SocialPlatform {
  name: string
  serviceName: SocialServiceName | null // API-compatible enum value
  color: string
  icon: React.ReactElement // SVG icon element
}

// Uniform dark gray background for all social icons
const SOCIAL_ICON_BG = '#4a4a4a'

// Helper to create icon element (stable typing for React 18 createElement / ReactNode)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icon = (Icon: any): React.ReactElement => 
  React.createElement(Icon, { size: 18, color: 'white' }) as React.ReactElement

// OpenAPI SocialLink schema serviceName enum values:
// "YouTube", "LinkedIn", "Web", "X", "TikTok", "Instagram", "Facebook", "Pinterest"
const PLATFORM_PATTERNS: Record<string, SocialPlatform> = {
  twitter: {
    name: 'Twitter/X',
    serviceName: 'X',
    color: SOCIAL_ICON_BG,
    icon: icon(SiX)
  },
  'x.com': {
    name: 'X',
    serviceName: 'X',
    color: SOCIAL_ICON_BG,
    icon: icon(SiX)
  },
  linkedin: {
    name: 'LinkedIn',
    serviceName: 'LinkedIn',
    color: SOCIAL_ICON_BG,
    icon: icon(SiLinkedin)
  },
  facebook: {
    name: 'Facebook',
    serviceName: 'Facebook',
    color: SOCIAL_ICON_BG,
    icon: icon(SiFacebook)
  },
  instagram: {
    name: 'Instagram',
    serviceName: 'Instagram',
    color: SOCIAL_ICON_BG,
    icon: icon(SiInstagram)
  },
  youtube: {
    name: 'YouTube',
    serviceName: 'YouTube',
    color: SOCIAL_ICON_BG,
    icon: icon(SiYoutube)
  },
  github: {
    name: 'GitHub',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiGithub)
  },
  medium: {
    name: 'Medium',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiMedium)
  },
  behance: {
    name: 'Behance',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiBehance)
  },
  dribbble: {
    name: 'Dribbble',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiDribbble)
  },
  pinterest: {
    name: 'Pinterest',
    serviceName: 'Pinterest',
    color: SOCIAL_ICON_BG,
    icon: icon(SiPinterest)
  },
  tiktok: {
    name: 'TikTok',
    serviceName: 'TikTok',
    color: SOCIAL_ICON_BG,
    icon: icon(SiTiktok)
  },
  twitch: {
    name: 'Twitch',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiTwitch)
  },
  reddit: {
    name: 'Reddit',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiReddit)
  },
  discord: {
    name: 'Discord',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiDiscord)
  },
  slack: {
    name: 'Slack',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiSlack)
  },
  spotify: {
    name: 'Spotify',
    serviceName: 'Web',
    color: SOCIAL_ICON_BG,
    icon: icon(SiSpotify)
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
