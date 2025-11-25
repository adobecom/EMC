/* 
* <license header>
*/

/**
 * Social Platform Detection Utility
 * Detects social media platform from URL
 */

export interface SocialPlatform {
  name: string
  color: string
  icon: string // Unicode emoji or symbol
}

const PLATFORM_PATTERNS: Record<string, SocialPlatform> = {
  twitter: {
    name: 'Twitter/X',
    color: '#1DA1F2',
    icon: '𝕏'
  },
  'x.com': {
    name: 'X',
    color: '#000000',
    icon: '𝕏'
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0A66C2',
    icon: 'in'
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    icon: 'f'
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    icon: '📷'
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: '▶'
  },
  github: {
    name: 'GitHub',
    color: '#181717',
    icon: '⚡'
  },
  medium: {
    name: 'Medium',
    color: '#000000',
    icon: 'M'
  },
  behance: {
    name: 'Behance',
    color: '#1769FF',
    icon: 'Bē'
  },
  dribbble: {
    name: 'Dribbble',
    color: '#EA4C89',
    icon: '🏀'
  },
  pinterest: {
    name: 'Pinterest',
    color: '#E60023',
    icon: 'P'
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: '♪'
  },
  twitch: {
    name: 'Twitch',
    color: '#9146FF',
    icon: '📺'
  },
  reddit: {
    name: 'Reddit',
    color: '#FF4500',
    icon: '👾'
  },
  discord: {
    name: 'Discord',
    color: '#5865F2',
    icon: '💬'
  },
  slack: {
    name: 'Slack',
    color: '#4A154B',
    icon: '#'
  },
  spotify: {
    name: 'Spotify',
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

