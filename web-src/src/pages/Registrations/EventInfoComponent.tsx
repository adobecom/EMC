/* 
* <license header>
*/

import React, { useEffect } from 'react'
import { Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import type { EventApiResponse } from '../../types/domain'
import type { AttendeeStats } from '../../types/attendee'
import { COLORS } from '../../styles/designSystem'
import { cachedApi } from '../../services/api'
import { useSafeState } from '../../hooks'

interface EventInfoComponentProps {
  event: EventApiResponse | null
  stats: AttendeeStats
}

interface EventImage {
  imageKind: string
  imageUrl?: string
  sharepointUrl?: string
}

/**
 * Get event thumbnail/hero image URL
 * Priority: thumbnail > hero > card > first available
 */
function getEventImageUrl(images: EventImage[] | null): string | null {
  if (!images || images.length === 0) return null
  
  const thumbnailImg = images.find(img => img.imageKind === 'event-thumbnail-image')
  const heroImg = images.find(img => img.imageKind === 'event-hero-image')
  const cardImg = images.find(img => img.imageKind === 'event-card-image')
  const firstImg = images[0]
  
  const img = thumbnailImg || heroImg || cardImg || firstImg
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
  return `${((part / total) * 100).toFixed(2)}%`
}

/**
 * Event info panel with image, metadata, and statistics
 */
export const EventInfoComponent: React.FC<EventInfoComponentProps> = ({
  event,
  stats
}) => {
  const [eventImages, setEventImages] = useSafeState<EventImage[] | null>(null)

  // Fetch event images when event changes
  useEffect(() => {
    const eventId = event?.eventId
    const fallbackImages = event?.images
    
    if (!eventId) {
      setEventImages(null)
      return
    }

    const fetchImages = async () => {
      try {
        const response = await cachedApi.getEventImages(eventId)
        
        if (response && !('error' in response) && response.images) {
          setEventImages(response.images)
        } else {
          // Fallback to event.images if API call fails
          setEventImages(fallbackImages || null)
        }
      } catch (error) {
        console.error('Failed to fetch event images:', error)
        // Fallback to event.images
        setEventImages(fallbackImages || null)
      }
    }

    fetchImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.eventId])

  if (!event) {
    return (
      <div style={{ backgroundColor: 'var(--spectrum-gray-100)', padding: '24px', borderRadius: '8px' }}>
        <Text>Select an event to view details</Text>
      </div>
    )
  }

  const imageUrl = getEventImageUrl(eventImages)
  const eventTitle = event.enTitle || event.title || event.eventId
  const capacityTotal = event.attendeeLimit || 0
  const rsvpPercentage = capacityTotal > 0 
    ? calculatePercentage(stats.total, capacityTotal)
    : 'N/A'

  return (
    <div style={{ backgroundColor: 'var(--spectrum-gray-100)', padding: '24px', borderRadius: '8px' }}>
      <div className={style({ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'start' })}>
        {/* Event Image */}
        {imageUrl && (
          <div style={{ width: '224px', minWidth: '224px', borderRadius: '8px', overflow: 'hidden' }}>
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
          </div>
        )}

        {/* Event Info */}
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 })}>
          {/* Metadata Row */}
          <div style={{ borderBottom: `1px solid ${COLORS.GRAY_400}`, paddingBottom: 'var(--spectrum-global-dimension-size-200)' }}>
            <div className={style({ display: 'flex', flexDirection: 'row', gap: 48, flexWrap: 'wrap' })}>
              <InfoItem label="EVENT" value={eventTitle} />
              <InfoItem label="WHEN" value={formatEventDate(event)} />
              <InfoItem label="TYPE" value={getEventTypeDisplay(event)} />
            </div>
          </div>

          {/* Stats Row */}
          <div className={style({ display: 'flex', flexDirection: 'row', gap: 48, alignItems: 'start', marginTop: 8 })}>
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
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Info item component for metadata display
 */
const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'baseline' })}>
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
  </div>
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
  <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
    <Text
      UNSAFE_style={{
        fontSize: '12px',
        fontWeight: 600,
        color: COLORS.GRAY_600
      }}
    >
      {label}
    </Text>
    {variant === 'primary' ? (
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
        <Text
          UNSAFE_style={{
            fontSize: '48px',
            fontWeight: 700,
            lineHeight: '1',
            color: COLORS.ADOBE_RED
          }}
        >
          {value}
        </Text>
        {subtext && (
          <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_600 }}>
            {subtext}
          </Text>
        )}
      </div>
    ) : (
      <Text
        UNSAFE_style={{
          fontSize: '20px',
          fontWeight: 700,
          color: COLORS.GRAY_800
        }}
      >
        {value}
      </Text>
    )}
  </div>
)

export default EventInfoComponent

