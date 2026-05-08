/*
 * <license header>
 */

import React, { ReactNode } from 'react'
import {
  Button,
  CustomDialog,
  DialogContainer,
  Heading,
  ProgressCircle,
  Text,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import LockClose from '@react-spectrum/s2/illustrations/gradient/generic2/LockClose'
import { TYPOGRAPHY, Z_INDEX } from '../../styles/designSystem'
const gateBg = new URL('../../assets/gate-bg.png', import.meta.url).href

/**
 * Full-viewport decorative backdrop plus Spectrum DialogContainer.
 * S2 modal layers portal above this; z-index sits below design-system modal tokens.
 */
export const GateDialogShell: React.FC<{ children: ReactNode }> = ({ children }) => (
  <>
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_INDEX.MODAL_BACKDROP - 1,
        backgroundImage: `url(${gateBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
    <DialogContainer onDismiss={() => {}}>
      {children}
    </DialogContainer>
  </>
)

function GateLockIllustration() {
  // @ts-expect-error LockClose implements illustration sizing; package d.ts lists IconProps only.
  return <LockClose aria-hidden size="L" />
}

interface GateScreenProps {
  onRequestAccess: () => void
  isLoading?: boolean
  /** Message shown when access is denied. Defaults to sign-in prompt. */
  message?: string
  /** Label for the action button. Defaults to "Sign In". */
  actionLabel?: string
}

/** Centered column layout inside CustomDialog (Dialog slot layout does not support this well). */
const gateCustomLayout = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  rowGap: 16,
  width: 'full',
  boxSizing: 'border-box',
})

const gateTitle = style({
  font: 'heading-lg',
  textAlign: 'center',
  marginY: 0,
})

/**
 * Full-screen gate shown when the user does not have sufficient access.
 * CustomDialog for full layout control; DialogContainer provides the modal shell.
 */
export const GateScreen: React.FC<GateScreenProps> = ({
  onRequestAccess,
  isLoading = false,
  message = 'Please sign in with an authorized account to continue.',
  actionLabel = 'Sign In'
}) => {
  return (
    <GateDialogShell>
      <CustomDialog
        size="M"
        isDismissible={false}
        isKeyboardDismissDisabled
        role={isLoading ? 'dialog' : 'alertdialog'}
      >
        <div className={gateCustomLayout}>
          <Heading slot="title" styles={gateTitle}>
            Events Management Console
          </Heading>
          {isLoading ? (
            <>
              <ProgressCircle
                size="L"
                isIndeterminate
                aria-label="Checking access"
              />
              <Text
                styles={style({
                  font: 'body',
                  fontWeight: 'medium',
                  textAlign: 'center',
                })}
              >
                Checking access...
              </Text>
            </>
          ) : (
            <>
              <GateLockIllustration />
              <Text
                UNSAFE_style={{
                  ...TYPOGRAPHY.SECTION_DESCRIPTION,
                  maxWidth: 420,
                  textAlign: 'center',
                }}
              >
                {message}
              </Text>
              <Button variant="accent" onPress={onRequestAccess}>
                {actionLabel}
              </Button>
            </>
          )}
        </div>
      </CustomDialog>
    </GateDialogShell>
  )
}

export default GateScreen
