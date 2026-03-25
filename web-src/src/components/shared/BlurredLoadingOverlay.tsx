/* 
* <license header>
*/

import React from 'react'
import { Text, ProgressCircle } from '@react-spectrum/s2'
import { Z_INDEX } from '../../styles/designSystem'

interface BlurredLoadingOverlayProps {
  /** When true, the overlay is visible */
  visible: boolean
  /** Message displayed below the spinner */
  message: string
  /** Accessible label for the progress indicator */
  ariaLabel?: string
  /** Override z-index (e.g. 9999 for action overlays above dialogs) */
  zIndex?: number
}

/**
 * Full-screen frosted glass overlay with centered loading card.
 * Matches the FormatSelectionOverlay pattern from the event creation flow.
 */
export const BlurredLoadingOverlay: React.FC<BlurredLoadingOverlayProps> = ({
  visible,
  message,
  ariaLabel = 'Loading',
  zIndex = Z_INDEX.MODAL_BACKDROP
}) => {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        cursor: 'wait'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--spectrum-gray-50)',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <ProgressCircle size="L" isIndeterminate aria-label={ariaLabel} />
        <Text UNSAFE_style={{ fontSize: '16px', fontWeight: 500 }}>
          {message}
        </Text>
      </div>
    </div>
  )
}
