/*
* <license header>
*/

import React, { useState } from 'react'
import {
  Dialog,
  Heading,
  Content,
  ButtonGroup,
  Button,
  Checkbox,
  Divider,
  Text,
  Flex
} from '@adobe/react-spectrum'
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
      <Heading>Biometric Data Consent</Heading>
      <Divider />
      <Content>
        <Flex direction="column" gap="size-200">
          <Text>
            <strong>{attendeeName}</strong>, we would like to collect a facial photograph
            for biometric identification to enable expedited event check-in.
          </Text>

          <Flex
            direction="column"
            gap="size-100"
            UNSAFE_style={{
              backgroundColor: COLORS.GRAY_100,
              padding: '16px',
              borderRadius: '4px'
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
              Your photo is compared against enrolled attendees at check-in to verify identity
              and speed up the registration process.
            </Text>

            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '14px', marginTop: '8px' }}>
              Storage and retention:
            </Text>
            <Text UNSAFE_style={{ fontSize: '13px', color: COLORS.GRAY_700 }}>
              Your biometric data is stored securely and will be deleted within 30 days
              after the event concludes. You may request deletion at any time.
            </Text>
          </Flex>

          <Checkbox
            isSelected={isConsented}
            onChange={setIsConsented}
          >
            I understand and consent to the collection and use of my biometric data as described above
          </Checkbox>
        </Flex>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onDecline}>
          Decline
        </Button>
        <Button
          variant="cta"
          onPress={onConsent}
          isDisabled={!isConsented}
        >
          I Consent
        </Button>
      </ButtonGroup>
    </Dialog>
  )
}
