/**
 * Social platform detection configuration.
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

export interface SocialPlatformConfig {
  name: string
  serviceName: SocialServiceName | null
  color: string
  icon: React.ReactElement
}

export const SOCIAL_ICON_BG = '#4a4a4a'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icon = (Icon: any): React.ReactElement =>
  React.createElement(Icon, { size: 18, color: 'white' }) as React.ReactElement

export const SOCIAL_PLATFORM_PATTERNS: Record<string, SocialPlatformConfig> = {
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
