/*
* <license header>
*/

import React, { useState, useEffect, useCallback } from 'react'
import { View, Heading, Text, Flex, Button } from '@adobe/react-spectrum'
import { useSearchParams } from 'react-router-dom'
import Checkmark from '@spectrum-icons/workflow/Checkmark'
import Refresh from '@spectrum-icons/workflow/Refresh'
import Alert from '@spectrum-icons/workflow/Alert'
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
  | 'already-checked-in'
  | 'capture'
  | 'preview'
  | 'checking-in'
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

/** EventAttendeeBody schema keys - PUT requires firstName, lastName, email, modificationTime; additionalProperties: false */
const EVENT_ATTENDEE_BODY_KEYS = [
  'attendeeId',
  'externalAttendeeId',
  'firstName',
  'lastName',
  'email',
  'registrationStatus',
  'checkedIn',
  'invitedBy',
  'shareInfoWithPartners',
  'ccSentiment',
  'modificationTime'
] as const

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

  // Parse token and load data
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

        // Check for attendee errors
        if (attendeeResult && typeof attendeeResult === 'object' && 'error' in attendeeResult) {
          setState('not-found')
          setErrorMessage('Attendee not found. The check-in link may be invalid.')
          return
        }

        // Set event info if available
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
        // EventAttendee from getAttendee lacks BaseAttendee fields (firstName, lastName, email).
        // EventAttendeeBody requires them. Fetch from getAttendeeBase when missing.
        // Merge base first so EventAttendee fields (modificationTime, registrationStatus, checkedIn) are preserved.
        const needsBaseAttendee = !attendeeData.firstName || !attendeeData.lastName || !attendeeData.email
        if (needsBaseAttendee) {
          const baseResult = await apiService.getAttendeeBase(attendeeId)
          if (!('error' in baseResult) && baseResult) {
            attendeeData = { ...baseResult, ...attendeeData }
          }
        }
        setAttendee({ ...attendeeData, eventId })

        if (attendeeData.checkedIn) {
          setState('already-checked-in')
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

  const handleConfirmCheckin = useCallback(async () => {
    if (!attendee || !attendee.eventId) return

    // EventAttendeeBody requires firstName, lastName, email, modificationTime
    if (!attendee.firstName || !attendee.lastName || !attendee.email) {
      toast.error('Missing required attendee data. Please refresh and try again.')
      return
    }
    if (attendee.modificationTime == null || attendee.modificationTime === undefined) {
      toast.error('Missing modificationTime. Please refresh and try again.')
      return
    }

    setState('checking-in')
    try {
      const payload = Object.fromEntries(
        EVENT_ATTENDEE_BODY_KEYS.filter(
          k => k === 'checkedIn' || attendee[k] !== undefined
        ).map(k => [k, k === 'checkedIn' ? true : attendee[k]])
      )
      await apiService.updateAttendee(
        attendee.eventId,
        attendee.attendeeId,
        payload
      )
      setAttendee(prev => prev ? { ...prev, checkedIn: true } : prev)
      setState('success')
      toast.success(`${getAttendeeName(attendee)} checked in successfully`)
    } catch (err) {
      console.error('Failed to check in attendee:', err)
      toast.error('Failed to check in attendee. Please try again.')
      setState('preview')
    }
  }, [attendee, toast])

  // Invalid token state
  if (state === 'invalid-token') {
    return (
      <View width="100%" padding="size-400" UNSAFE_style={{ boxSizing: 'border-box' }}>
        <Flex direction="column" alignItems="center" justifyContent="center" gap="size-300"
          UNSAFE_style={{ padding: '80px 20px' }}
        >
          <Alert size="XL" UNSAFE_style={{ color: COLORS.GRAY_600 }} />
          <Heading level={2} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
            Invalid or Missing Check-in Token
          </Heading>
          <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '16px', textAlign: 'center', maxWidth: '500px' }}>
            {errorMessage}
          </Text>
        </Flex>
      </View>
    )
  }

  // Not found state
  if (state === 'not-found') {
    return (
      <View width="100%" padding="size-400" UNSAFE_style={{ boxSizing: 'border-box' }}>
        <Flex direction="column" alignItems="center" justifyContent="center" gap="size-300"
          UNSAFE_style={{ padding: '80px 20px' }}
        >
          <Alert size="XL" UNSAFE_style={{ color: COLORS.STATUS_CANCELLED }} />
          <Heading level={2} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
            Not Found
          </Heading>
          <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '16px', textAlign: 'center', maxWidth: '500px' }}>
            {errorMessage}
          </Text>
        </Flex>
      </View>
    )
  }

  return (
    <View width="100%" padding="size-400" UNSAFE_style={{ boxSizing: 'border-box' }}>
      {/* Header */}
      <Heading level={1} UNSAFE_style={{ margin: '0 0 8px 0' }}>
        Biometric Check-in
      </Heading>

      {/* Event info banner */}
      {eventInfo && eventInfo.title && (
        <View
          marginBottom="size-400"
          padding="size-300"
          borderRadius="medium"
          UNSAFE_style={{ backgroundColor: COLORS.GRAY_100 }}
        >
          <Flex direction="column" gap="size-50">
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
          </Flex>
        </View>
      )}

      {/* Already checked in */}
      {state === 'already-checked-in' && attendee && (
        <Flex direction="column" alignItems="center" gap="size-300" UNSAFE_style={{ paddingTop: '24px' }}>
          <FormCard>
            <Flex direction="column" alignItems="center" gap="size-200">
              <Checkmark size="XXL" UNSAFE_style={{ color: COLORS.STATUS_PUBLISHED }} />
              <Heading level={3} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
                Already Checked In
              </Heading>
              <Text UNSAFE_style={{ color: COLORS.GRAY_700, textAlign: 'center' }}>
                {getAttendeeName(attendee)} has already been checked in to this event.
              </Text>
            </Flex>
          </FormCard>
        </Flex>
      )}

      {/* Camera capture */}
      {state === 'capture' && (
        <Flex direction="column" alignItems="center" gap="size-200" UNSAFE_style={{ paddingTop: '24px' }}>
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
        </Flex>
      )}

      {/* Photo preview with confirm/retake */}
      {state === 'preview' && capturedPhoto && (
        <Flex direction="column" alignItems="center" gap="size-300" UNSAFE_style={{ paddingTop: '24px' }}>
          <FormCard>
            <Flex direction="column" gap="size-300" alignItems="center">
              <Heading level={3} UNSAFE_style={{ margin: 0, color: COLORS.GRAY_800 }}>
                Confirm Photo
              </Heading>
              <View
                borderRadius="medium"
                UNSAFE_style={{
                  width: '300px',
                  height: '225px',
                  overflow: 'hidden',
                  border: `2px solid ${COLORS.GRAY_300}`
                }}
              >
                <img
                  src={capturedPhoto}
                  alt="Captured face"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </View>
              <Flex gap="size-100">
                <Button variant="secondary" onPress={handleRetake}>
                  <Refresh />
                  <Text>Retake</Text>
                </Button>
                <Button variant="cta" onPress={handleConfirmCheckin}>
                  <Checkmark />
                  <Text>Confirm Check-in</Text>
                </Button>
              </Flex>
            </Flex>
          </FormCard>
        </Flex>
      )}

      {/* Checking in (spinner) */}
      {state === 'checking-in' && capturedPhoto && (
        <Flex direction="column" alignItems="center" gap="size-300" UNSAFE_style={{ paddingTop: '24px' }}>
          <FormCard>
            <Flex direction="column" alignItems="center" gap="size-300">
              <div style={{
                width: '48px',
                height: '48px',
                border: `3px solid ${COLORS.GRAY_300}`,
                borderTopColor: COLORS.ADOBE_RED,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <Text UNSAFE_style={{ color: COLORS.GRAY_700, fontSize: '16px' }}>
                Checking in {attendee ? getAttendeeName(attendee) : ''}...
              </Text>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </Flex>
          </FormCard>
        </Flex>
      )}

      {/* Success */}
      {state === 'success' && attendee && (
        <Flex direction="column" alignItems="center" gap="size-300" UNSAFE_style={{ paddingTop: '24px' }}>
          <CheckinSuccessCard
            attendee={attendee}
            capturedPhotoUrl={capturedPhoto || undefined}
            eventTitle={eventInfo?.title}
          />
        </Flex>
      )}

      <BlurredLoadingOverlay
        visible={state === 'loading'}
        message="Loading check-in data..."
        ariaLabel="Loading check-in data"
      />
    </View>
  )
}

export default BiometricCheckin
