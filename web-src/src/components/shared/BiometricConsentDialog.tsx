/*
* <license header>
*/

import React, { useState } from 'react'
import {
  Button,
  ButtonGroup,
  Checkbox,
  Content,
  Dialog,
  Divider,
  Heading,
  Text,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { COLORS } from '../../styles/designSystem'

interface BiometricConsentDialogProps {
  attendeeName: string
  onConsent: () => void
  onDecline: () => void
}

export const BiometricConsentDialog: React.FC<BiometricConsentDialogProps> = ({
  attendeeName,
  onConsent,
  onDecline
}) => {
  const [isConsented, setIsConsented] = useState(false)

  return (
    <Dialog>
      {({ close }) => (
        <>
          <Heading slot="title">Biometric Data Consent</Heading>
          <Content>
            <Divider size="S" />
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 })}>
              <Text>
                <strong>{attendeeName}</strong>, we would like to collect a facial photograph for biometric identification.
                At the event, you will use the fast-lane and the automated pre-checkin system.
              </Text>

              <div
                style={{
                  backgroundColor: COLORS.GRAY_100,
                  padding: '16px',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <Text UNSAFE_style={{ fontWeight: 600, fontSize: '14px' }}>
                  What we collect:
                </Text>
                <Text UNSAFE_style={{ fontSize: '13px', color: COLORS.GRAY_700 }}>
                  A single facial photograph used to generate a biometric template for identity matching.
                </Text>

                <Text UNSAFE_style={{ fontWeight: 600, fontSize: '14px', marginTop: '8px' }}>
                  How it is used:
                </Text>
                <Text UNSAFE_style={{ fontSize: '13px', color: COLORS.GRAY_700 }}>
                  Your template is used at the event with the automated pre-checkin system so you can use the fast-lane.
                </Text>

                <Text UNSAFE_style={{ fontWeight: 600, fontSize: '14px', marginTop: '8px' }}>
                  Storage and retention:
                </Text>
                <Text UNSAFE_style={{ fontSize: '13px', color: COLORS.GRAY_700 }}>
                  Your biometric data is stored securely and will be deleted within 30 days
                  after the event concludes. You may request deletion at any time.
                </Text>
              </div>

              <Checkbox isSelected={isConsented} onChange={setIsConsented}>
                I understand and consent to the collection and use of my biometric data as described above
              </Checkbox>
            </div>
          </Content>
          <ButtonGroup>
            <Button
              variant="secondary"
              onPress={() => {
                onDecline()
                close()
              }}
            >
              Decline
            </Button>
            <Button
              variant="accent"
              isDisabled={!isConsented}
              onPress={() => {
                if (!isConsented) return
                onConsent()
                close()
              }}
            >
              I Consent
            </Button>
          </ButtonGroup>
        </>
      )}
    </Dialog>
  )
}
