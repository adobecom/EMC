/*
* <license header>
*/

import React from 'react'

interface SpeakerAvatarProps {
  initials: string
  color?: string
  size?: number
}

/** Initials-circle avatar. No S2 Avatar primitive supports initials (image-only), so this stays custom. */
export const SpeakerAvatar: React.FC<SpeakerAvatarProps> = ({ initials, color, size = 36 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: size * 0.42,
        backgroundColor: color || 'var(--spectrum-global-color-blue-600)'
      }}
    >
      {initials}
    </div>
  )
}

export default SpeakerAvatar
