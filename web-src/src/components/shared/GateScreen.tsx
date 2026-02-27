/*
 * <license header>
 */

import React, { useState } from 'react'
import { View, Text, Button, ProgressCircle } from '@adobe/react-spectrum'
import { SPACING, COLORS, TYPOGRAPHY } from '../../styles/designSystem'
import { GATE_BACKGROUND_IMAGES } from '../../assets/gate-backgrounds'

/** Fallback background when images are unavailable */
const GATE_BACKGROUND_FALLBACK = '#E8E8E8'

/**
 * Browser access forbidden icon - from ecc-milo browser-access-forbidden-lg.svg
 * 134×94px, browser window with padlock
 */
const BrowserLockIcon: React.FC = () => (
  <svg
    width={134}
    height={94}
    viewBox="0 0 134 94"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M129.87 2H4.18301C3.00649 2 2.05273 2.95554 2.05273 4.13425V89.5043C2.05273 90.683 3.00649 91.6386 4.18301 91.6386H129.87C131.046 91.6386 132 90.683 132 89.5043V4.13425C132 2.95554 131.046 2 129.87 2Z"
      stroke="#909090"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M131.947 15.3398H2"
      stroke="#909090"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21.1729 8.9375H10.5215"
      stroke="#909090"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M81.939 46.8203H49.9848C48.8083 46.8203 47.8545 47.7758 47.8545 48.9546V72.4313C47.8545 73.61 48.8083 74.5656 49.9848 74.5656H81.939C83.1155 74.5656 84.0693 73.61 84.0693 72.4313V48.9546C84.0693 47.7758 83.1155 46.8203 81.939 46.8203Z"
      stroke="#909090"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M76.6124 46.8221V39.1314C76.6124 33.7744 72.8209 28.981 67.5273 28.2253C60.9488 27.2862 55.3096 32.3756 55.3096 38.7845V45.755"
      stroke="#909090"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

interface GateScreenProps {
  onRequestAccess: () => void
  isLoading?: boolean
}

/**
 * Full-screen gate shown when the user does not have sufficient access.
 * Uses Spectrum components with layout matching BlurredLoadingOverlay card pattern.
 */
export const GateScreen: React.FC<GateScreenProps> = ({
  onRequestAccess,
  isLoading = false
}) => {
  const [backgroundImage] = useState(() => {
    if (GATE_BACKGROUND_IMAGES.length === 0) return null
    return GATE_BACKGROUND_IMAGES[
      Math.floor(Math.random() * GATE_BACKGROUND_IMAGES.length)
    ]
  })

  const outerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: GATE_BACKGROUND_FALLBACK,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'center'
  }
  if (backgroundImage) {
    outerStyle.backgroundImage = `url(${backgroundImage})`
  }

  return (
    <View UNSAFE_style={outerStyle}>
      <View
        // backgroundColor="gray-50"
        padding="size-800"
        borderRadius="medium"
        UNSAFE_style={{
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          minWidth: 360,
          maxWidth: 480,
        }}
      >
        {isLoading ? (
          <>
            <ProgressCircle
              size="L"
              isIndeterminate
              aria-label="Checking access"
            />
            <Text UNSAFE_style={{ fontSize: '16px', fontWeight: 500 }}>
              Checking access...
            </Text>
          </>
        ) : (
          <>
            <Text
              UNSAFE_style={{
                ...TYPOGRAPHY.COMPONENT_HEADING,
                color: COLORS.DARK_GRAY,
                fontWeight: 600
              }}
            >
              Events Management Console
            </Text>

            <View UNSAFE_style={{ margin: SPACING.XXL }}>
              <BrowserLockIcon />
            </View>

            <Text
              UNSAFE_style={{
                ...TYPOGRAPHY.SECTION_DESCRIPTION,
                color: COLORS.DARK_GRAY,
                maxWidth: 420
              }}
            >
              Please sign in with an authorized account to continue.
            </Text>

            <Button variant="accent" onPress={onRequestAccess}>
              Sign In
            </Button>
          </>
        )}
      </View>
    </View>
  )
}

export default GateScreen
