/*
* <license header>
*/

import React, { useState, useEffect, useCallback } from 'react'
import { Button, Heading, Text } from '@react-spectrum/s2'
import { useSearchParams } from 'react-router-dom'
import Checkmark from '@react-spectrum/s2/icons/Checkmark'
import Refresh from '@react-spectrum/s2/icons/Refresh'
import AlertTriangle from '@react-spectrum/s2/icons/AlertTriangle'
import type { Attendee } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'
import { apiService } from '../../services/api'
import { IMS } from '../../types'
import { CameraCapture, BlurredLoadingOverlay, FormCard } from '../../components/shared'
import { CheckinSuccessCard } from './CheckinResultCard'
import { useToast as useToastContext } from '../../contexts'
import { parseCheckinToken } from '../../utils/checkinToken'
import { COLORS } from '../../styles/designSystem'
import { BIOMETRIC_FACE_DETECTION_ENABLED } from '../../config/constants'

type CheckinState =
  | 'loading'
  | 'invalid-token'
  | 'not-found'
  | 'already-verified'
  | 'capture'
  | 'preview'
  | 'success'

interface EventInfo {
  title: string
  localStartDate?: string
  localStartTime?: string
  localEndTime?: string
  timezone?: string
  venueName?: string
  venueAddress?: string
  eventType?: string
}

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface BiometricCheckinProps {
  ims: IMS
}

export const BiometricCheckin: React.FC<BiometricCheckinProps> = ({ ims: _ims }) => {
  const [searchParams] = useSearchParams()
  const toast = useToastContext()

  const [state, setState] = useState<CheckinState>('loading')
  const [attendee, setAttendee] = useState<Attendee | null>(null)
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setState('invalid-token')
      setErrorMessage('No check-in token provided. This page requires a valid check-in link.')
      return
    }

    const parsed = parseCheckinToken(token)
    if (!parsed) {
      setState('invalid-token')
      setErrorMessage('Invalid check-in token. The link may be malformed or expired.')
      return
    }

    const { eventId, attendeeId } = parsed

    const loadData = async () => {
      setState('loading')
      try {
        const [attendeeResult, eventResult] = await Promise.all([
          apiService.getAttendee(eventId, attendeeId),
          apiService.getEventExternal(eventId)
        ])

        if (attendeeResult && typeof attendeeResult === 'object' && 'error' in attendeeResult) {
          setState('not-found')
          setErrorMessage('Attendee not found. The check-in link may be invalid.')
          return
        }

        if (eventResult && typeof eventResult === 'object' && !('error' in eventResult)) {
          setEventInfo({
            title: eventResult.title || eventResult.enTitle || '',
            localStartDate: eventResult.localStartDate,
            localStartTime: eventResult.localStartTime,
            localEndTime: eventResult.localEndTime,
            timezone: eventResult.timezone,
            venueName: eventResult.venue?.venueName,
            venueAddress: eventResult.venue?.formattedAddress,
            eventType: eventResult.eventType,
          })
        }

        let attendeeData = attendeeResult as Attendee
        const needsBaseAttendee = !attendeeData.firstName || !attendeeData.lastName || !attendeeData.email
        if (needsBaseAttendee) {
          const baseResult = await apiService.getAttendeeBase(attendeeId)
          if (!('error' in baseResult) && baseResult) {
            attendeeData = { ...baseResult, ...attendeeData }
          }
        }
        setAttendee({ ...attendeeData, eventId })

        if (attendeeData.checkedIn) {
          setState('already-verified')
        } else {
          setState('capture')
        }
      } catch (err) {
        console.error('Failed to load check-in data:', err)
        setState('not-found')
        setErrorMessage('Failed to load attendee data. Please check the link and try again.')
      }
    }

    loadData()
  }, [token])

  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedPhoto(dataUrl)
    setState('preview')
  }, [])

  const handleRetake = useCallback(() => {
    setCapturedPhoto(null)
    setState('capture')
  }, [])

  /** Completes the on-device flow only — does not call the API or change checkedIn. */
  const handleConfirmFastLane = useCallback(() => {
    if (!attendee) return
    setState('success')
    toast.success(`${getAttendeeName(attendee)} is confirmed for fast-lane pre-checkin at the event`)
  }, [attendee, toast])

  const centeredColumnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: '80px 20px',
  }

  if (state === 'invalid-token') {
    return (
      <div style={{ width: '100%', padding: 32, boxSizing: 'border-box' }}>
        <div style={centeredColumnStyle}>
          <AlertTriangle aria-hidden UNSAFE_style={{ color: COLORS.GRAY_600, width: 32, height: 32 }} />
          <Heading level={2} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
            Invalid or Missing Check-in Token
          </Heading>
          <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '16px', textAlign: 'center', maxWidth: '500px' }}>
            {errorMessage}
          </Text>
        </div>
      </div>
    )
  }

  if (state === 'not-found') {
    return (
      <div style={{ width: '100%', padding: 32, boxSizing: 'border-box' }}>
        <div style={centeredColumnStyle}>
          <AlertTriangle aria-hidden UNSAFE_style={{ color: COLORS.STATUS_CANCELLED, width: 32, height: 32 }} />
          <Heading level={2} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
            Not Found
          </Heading>
          <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '16px', textAlign: 'center', maxWidth: '500px' }}>
            {errorMessage}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', padding: 32, boxSizing: 'border-box' }}>
      <Heading level={1} UNSAFE_style={{ margin: '0 0 8px 0' }}>
        Check-in
      </Heading>

      {eventInfo && eventInfo.title && (
        <div
          style={{
            marginBottom: 32,
            padding: 24,
            borderRadius: 8,
            backgroundColor: COLORS.GRAY_100,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '16px', color: COLORS.BLACK }}>
              {eventInfo.title}
            </Text>
            {eventInfo.localStartDate && (
              <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_700 }}>
                {formatDate(eventInfo.localStartDate)}
                {eventInfo.localStartTime && ` · ${eventInfo.localStartTime}`}
                {eventInfo.localEndTime && ` – ${eventInfo.localEndTime}`}
                {eventInfo.timezone && ` ${eventInfo.timezone}`}
              </Text>
            )}
            {(eventInfo.venueName || eventInfo.venueAddress) && (
              <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_700 }}>
                {[eventInfo.venueName, eventInfo.venueAddress].filter(Boolean).join(' · ')}
              </Text>
            )}
          </div>
        </div>
      )}

      {state === 'already-verified' && attendee && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 24 }}>
          <FormCard>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Checkmark aria-hidden UNSAFE_style={{ color: COLORS.STATUS_PUBLISHED, width: 48, height: 48 }} />
              <Heading level={3} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
                Already verified
              </Heading>
              <Text UNSAFE_style={{ color: COLORS.GRAY_700, textAlign: 'center', maxWidth: '440px' }}>
                {getAttendeeName(attendee)} is already marked checked in for this event. You can still use the fast-lane
                and automated pre-checkin at the venue per event staff instructions.
              </Text>
            </div>
          </FormCard>
        </div>
      )}

      {state === 'capture' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 24 }}>
          <Text UNSAFE_style={{ color: COLORS.GRAY_700, fontSize: '16px' }}>
            Position the attendee&apos;s face in the camera and capture a photo
          </Text>
          <CameraCapture
            onCapture={(dataUrl) => handleCapture(dataUrl)}
            facingMode="user"
            width={520}
            height={390}
            enableFaceDetection={BIOMETRIC_FACE_DETECTION_ENABLED}
            requireFaceForCapture={BIOMETRIC_FACE_DETECTION_ENABLED}
          />
        </div>
      )}

      {state === 'preview' && capturedPhoto && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 24 }}>
          <FormCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <Heading level={3} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
                Confirm photo
              </Heading>
              <div
                style={{
                  width: '300px',
                  height: '225px',
                  overflow: 'hidden',
                  border: `2px solid ${COLORS.GRAY_300}`,
                  borderRadius: 8,
                }}
              >
                <img
                  src={capturedPhoto}
                  alt="Captured face"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onPress={handleRetake}>
                  <Refresh />
                  <Text>Retake</Text>
                </Button>
                <Button variant="accent" onPress={handleConfirmFastLane}>
                  <Checkmark />
                  <Text>Confirm</Text>
                </Button>
              </div>
            </div>
          </FormCard>
        </div>
      )}

      {state === 'success' && attendee && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 24 }}>
          <CheckinSuccessCard
            attendee={attendee}
            capturedPhotoUrl={capturedPhoto || undefined}
            eventTitle={eventInfo?.title}
          />
        </div>
      )}

      <BlurredLoadingOverlay
        visible={state === 'loading'}
        message="Loading check-in data..."
        ariaLabel="Loading check-in data"
      />
    </div>
  )
}
