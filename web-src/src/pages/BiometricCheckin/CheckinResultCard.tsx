/*
* <license header>
*/

import React from 'react'
import { Flex, View, Text, Heading } from '@adobe/react-spectrum'
import Checkmark from '@react-spectrum/s2/icons/Checkmark'
import type { Attendee } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'
import { FormCard } from '../../components/shared'
import { COLORS } from '../../styles/designSystem'

interface CheckinSuccessCardProps {
  attendee: Attendee
  capturedPhotoUrl?: string
  eventTitle?: string
}

export const CheckinSuccessCard: React.FC<CheckinSuccessCardProps> = ({
  attendee,
  capturedPhotoUrl,
  eventTitle
}) => {
  const checkinTime = new Date().toLocaleString()

  return (
    <FormCard>
      <Flex direction="column" gap="size-300" alignItems="center">
        <Checkmark aria-hidden UNSAFE_style={{ color: COLORS.STATUS_PUBLISHED, width: 48, height: 48 }} />

        <Heading level={3} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
          Check-in Confirmed
        </Heading>

        <Flex gap="size-300" alignItems="center">
          {capturedPhotoUrl && (
            <View
              borderRadius="medium"
              UNSAFE_style={{
                width: '100px',
                height: '100px',
                overflow: 'hidden',
                border: `2px solid ${COLORS.GRAY_300}`,
                flexShrink: 0
              }}
            >
              <img
                src={capturedPhotoUrl}
                alt="Captured face"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </View>
          )}

          <Flex direction="column" gap="size-50">
            <Text UNSAFE_style={{ fontSize: '18px', fontWeight: 600, color: COLORS.BLACK }}>
              {getAttendeeName(attendee)}
            </Text>
            <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_700 }}>
              {attendee.email}
            </Text>
            {attendee.companyName && (
              <Text UNSAFE_style={{ fontSize: '13px', color: COLORS.GRAY_600 }}>
                {attendee.companyName}
              </Text>
            )}
          </Flex>
        </Flex>

        <Flex direction="column" gap="size-0" alignItems="center">
          {eventTitle && (
            <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_700 }}>
              {eventTitle}
            </Text>
          )}
          <Text UNSAFE_style={{ fontSize: '13px', color: COLORS.GRAY_600 }}>
            Checked in at {checkinTime}
          </Text>
        </Flex>
      </Flex>
    </FormCard>
  )
}
