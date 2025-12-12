/* 
* <license header>
*/

import React from 'react'
import {
  View,
  Flex,
  Text
} from '@adobe/react-spectrum'
import type { EventApiResponse } from '../../types/domain'
import type { AttendeeStats } from '../../types/attendee'
import { COLORS } from '../../styles/designSystem'

interface EventInfoComponentProps {
  event: EventApiResponse | null
  stats: AttendeeStats
  isLoading?: boolean
}

/**
 * Get event thumbnail/hero image URL
 */
function getEventImageUrl(event: EventApiResponse): string | null {
  if (!event.images || event.images.length === 0) return null
  
  // Priority: hero > thumbnail > card > first available
  const heroImg = event.images.find(img => img.imageKind === 'event-hero-image')
  const thumbnailImg = event.images.find(img => img.imageKind === 'event-thumbnail-image')
  const cardImg = event.images.find(img => img.imageKind === 'event-card-image')
  const firstImg = event.images[0]
  
  const img = heroImg || thumbnailImg || cardImg || firstImg
  return img?.imageUrl || null
}

/**
 * Format event date for display
 */
function formatEventDate(event: EventApiResponse): string {
  const dateStr = event.localStartDate || event.startDate
  if (!dateStr) return 'No date set'
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Get event type display name
 */
function getEventTypeDisplay(event: EventApiResponse): string {
  const type = event.eventType?.toLowerCase()
  if (type === 'inperson' || type === 'in-person') return 'In-Person'
  if (type === 'webinar' || type === 'virtual') return 'Webinar'
  if (type === 'hybrid') return 'Hybrid'
  return event.eventType || 'Unknown'
}

/**
 * Calculate percentage
 */
function calculatePercentage(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${((part / total) * 100).toFixed(0)}%`
}

/**
 * Event info panel with image, metadata, and statistics
 */
export const EventInfoComponent: React.FC<EventInfoComponentProps> = ({
  event,
  stats
}) => {
  if (!event) {
    return (
      <View
        backgroundColor="gray-100"
        padding="size-300"
        borderRadius="medium"
      >
        <Text>Select an event to view details</Text>
      </View>
    )
  }

  const imageUrl = getEventImageUrl(event)
  const eventTitle = event.enTitle || event.title || event.eventId
  const capacityTotal = event.attendeeLimit || 0
  const rsvpPercentage = capacityTotal > 0 
    ? calculatePercentage(stats.total, capacityTotal)
    : 'N/A'

  return (
    <View
      backgroundColor="gray-100"
      padding="size-300"
      borderRadius="medium"
    >
      <Flex direction="row" gap="size-400" alignItems="start">
        {/* Event Image */}
        {imageUrl && (
          <View
            width="224px"
            minWidth="224px"
            UNSAFE_style={{
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <img
              src={imageUrl}
              alt={eventTitle}
              style={{
                width: '100%',
                maxHeight: '167px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </View>
        )}

        {/* Event Info */}
        <Flex direction="column" gap="size-200" flex={1}>
          {/* Metadata Row */}
          <View
            UNSAFE_style={{
              borderBottom: `1px solid ${COLORS.GRAY_400}`,
              paddingBottom: 'var(--spectrum-global-dimension-size-200)'
            }}
          >
            <Flex direction="row" gap="size-600" wrap>
              <InfoItem label="EVENT" value={eventTitle} />
              <InfoItem label="WHEN" value={formatEventDate(event)} />
              <InfoItem label="TYPE" value={getEventTypeDisplay(event)} />
            </Flex>
          </View>

          {/* Stats Row */}
          <Flex direction="row" gap="size-600" alignItems="start" marginTop="size-100">
            <StatItem 
              label="RSVPs" 
              value={stats.total.toString()} 
              subtext={capacityTotal > 0 ? rsvpPercentage : undefined}
            />
            <StatItem 
              label="Registered" 
              value={stats.registered.toString()} 
              variant="secondary"
            />
            <StatItem 
              label="Waitlisted" 
              value={stats.waitlisted.toString()} 
              variant="secondary"
            />
            <StatItem 
              label="Checked In" 
              value={stats.checkedIn.toString()} 
              variant="secondary"
            />
          </Flex>
        </Flex>
      </Flex>
    </View>
  )
}

/**
 * Info item component for metadata display
 */
const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Flex direction="row" gap="size-100" alignItems="baseline">
    <Text 
      UNSAFE_style={{ 
        fontWeight: 700, 
        fontSize: '12px',
        color: COLORS.GRAY_600 
      }}
    >
      {label}:
    </Text>
    <Text UNSAFE_style={{ fontSize: '14px' }}>{value}</Text>
  </Flex>
)

/**
 * Stat item component for statistics display
 */
const StatItem: React.FC<{ 
  label: string
  value: string
  subtext?: string
  variant?: 'primary' | 'secondary'
}> = ({ label, value, subtext, variant = 'primary' }) => (
  <Flex direction="column" gap="size-50">
    <Text 
      UNSAFE_style={{ 
        fontSize: '12px',
        fontWeight: 600,
        color: COLORS.GRAY_600 
      }}
    >
      {label}
    </Text>
    <Flex direction="row" gap="size-100" alignItems="baseline">
      <Text 
        UNSAFE_style={{ 
          fontSize: variant === 'primary' ? '28px' : '20px',
          fontWeight: 700,
          color: variant === 'primary' ? COLORS.ADOBE_RED : COLORS.GRAY_800
        }}
      >
        {value}
      </Text>
      {subtext && (
        <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>
          {subtext}
        </Text>
      )}
    </Flex>
  </Flex>
)

export default EventInfoComponent

