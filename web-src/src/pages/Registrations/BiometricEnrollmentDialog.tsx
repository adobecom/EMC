/*
* <license header>
*/

import React, { useState, useCallback } from 'react'
import {
  DialogTrigger,
  Dialog,
  Heading,
  Content,
  Divider,
  ButtonGroup,
  Button,
  Text,
  Flex,
  View
} from '@adobe/react-spectrum'
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
      toast.success(`Biometric enrollment complete for ${attendeeName}`)
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
      onOpenChange={(open) => { if (!open) onClose() }}
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
          <Heading>Capture Face Photo</Heading>
          <Divider />
          <Content>
            <Flex direction="column" gap="size-200" alignItems="center">
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
            </Flex>
          </Content>
        </Dialog>
      ) : (
        <Dialog>
          <Heading>Confirm Enrollment</Heading>
          <Divider />
          <Content>
            <Flex direction="column" gap="size-200" alignItems="center">
              <Text UNSAFE_style={{ color: COLORS.GRAY_700 }}>
                Review the captured photo for <strong>{attendeeName}</strong>.
              </Text>
              {capturedDataUrl && (
                <View
                  borderRadius="medium"
                  UNSAFE_style={{
                    overflow: 'hidden',
                    border: `2px solid ${COLORS.GRAY_300}`,
                    width: '300px',
                    height: '225px'
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
                </View>
              )}
            </Flex>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={handleRetake}>
              Retake
            </Button>
            <Button variant="cta" onPress={handleConfirmEnrollment}>
              Confirm Enrollment
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  )
}
