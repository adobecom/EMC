/*
* <license header>
*/

import React from 'react'
import { Heading, Text } from '@react-spectrum/s2'
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
  return (
    <FormCard>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <Checkmark aria-hidden UNSAFE_style={{ color: COLORS.STATUS_PUBLISHED, width: 48, height: 48 }} />

        <Heading level={3} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
          Fast lane eligible
        </Heading>

        <Text UNSAFE_style={{ color: COLORS.GRAY_700, fontSize: '15px', textAlign: 'center', maxWidth: '420px' }}>
          Thanks for completing biometric verification. At the event, please proceed to the fast-lane and use the
          automated pre-checkin system. Your registration status has not been changed here.
        </Text>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {capturedPhotoUrl && (
            <div
              style={{
                borderRadius: 8,
                width: '100px',
                height: '100px',
                overflow: 'hidden',
                border: `2px solid ${COLORS.GRAY_300}`,
                flexShrink: 0,
              }}
            >
              <img
                src={capturedPhotoUrl}
                alt="Captured face"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          </div>
        </div>

        {eventTitle && (
          <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_700 }}>
            {eventTitle}
          </Text>
        )}
      </div>
    </FormCard>
  )
}
