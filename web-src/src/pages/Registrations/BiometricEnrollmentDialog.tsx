/*
* <license header>
*/

import React, { useState, useCallback } from 'react'
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Heading,
  Text,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import type { Attendee } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'
import { CameraCapture, BiometricConsentDialog } from '../../components/shared'
import { useToast as useToastContext } from '../../contexts'
import { COLORS } from '../../styles/designSystem'

type EnrollmentStep = 'consent' | 'capture' | 'preview'

interface BiometricEnrollmentDialogProps {
  attendee: Attendee
  isOpen: boolean
  onClose: () => void
  onEnrolled: (attendeeId: string, photoDataUrl: string) => void
}

export const BiometricEnrollmentDialog: React.FC<BiometricEnrollmentDialogProps> = ({
  attendee,
  isOpen,
  onClose,
  onEnrolled
}) => {
  const toast = useToastContext()
  const attendeeName = getAttendeeName(attendee)

  const [step, setStep] = useState<EnrollmentStep>(
    attendee.biometricConsent ? 'capture' : 'consent'
  )
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)

  const handleConsent = useCallback(() => {
    setStep('capture')
  }, [])

  const handleDecline = useCallback(() => {
    toast.info('Biometric enrollment was declined')
    onClose()
  }, [toast, onClose])

  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedDataUrl(dataUrl)
    setStep('preview')
  }, [])

  const handleConfirmEnrollment = useCallback(() => {
    if (capturedDataUrl) {
      onEnrolled(attendee.attendeeId, capturedDataUrl)
      toast.success(`Biometric enrollment saved for ${attendeeName}`)
      onClose()
    }
  }, [capturedDataUrl, attendee.attendeeId, attendeeName, onEnrolled, toast, onClose])

  const handleRetake = useCallback(() => {
    setCapturedDataUrl(null)
    setStep('capture')
  }, [])

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open: boolean) => { if (!open) onClose() }}
    >
      <div style={{ display: 'none' }} />
      {step === 'consent' ? (
        <BiometricConsentDialog
          attendeeName={attendeeName}
          onConsent={handleConsent}
          onDecline={handleDecline}
        />
      ) : step === 'capture' ? (
        <Dialog>
          <Heading slot="title">Capture Face Photo</Heading>
          <Content>
            <Divider size="S" />
            <div
              className={style({ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', marginTop: 16 })}
            >
              <Text UNSAFE_style={{ color: COLORS.GRAY_700 }}>
                Position <strong>{attendeeName}</strong>&apos;s face within the guide and capture a clear photo.
              </Text>
              <CameraCapture
                onCapture={handleCapture}
                onCancel={onClose}
                facingMode="user"
                width={400}
                height={300}
              />
            </div>
          </Content>
        </Dialog>
      ) : (
        <Dialog>
          <Heading slot="title">Thank you</Heading>
          <Content>
            <Divider size="S" />
            <div
              className={style({ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', marginTop: 16 })}
            >
              <Text UNSAFE_style={{ color: COLORS.GRAY_700, textAlign: 'center', maxWidth: '440px' }}>
                Thanks for consenting to biometric collection. At the event, please proceed to the fast-lane and use
                the automated pre-checkin system.
              </Text>
              <Text UNSAFE_style={{ color: COLORS.GRAY_700, textAlign: 'center' }}>
                Review the captured photo for <strong>{attendeeName}</strong> before saving.
              </Text>
              {capturedDataUrl && (
                <div
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `2px solid ${COLORS.GRAY_300}`,
                    width: '300px',
                    height: '225px',
                  }}
                >
                  <img
                    src={capturedDataUrl}
                    alt={`Captured photo of ${attendeeName}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}
            </div>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={handleRetake}>
              Retake
            </Button>
            <Button variant="accent" onPress={handleConfirmEnrollment}>
              Save enrollment
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  )
}
