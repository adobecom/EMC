/*
* <license header>
*/

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heading,
  Text
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import GraphBarChart from '@react-spectrum/s2/illustrations/gradient/generic1/GraphBarChart'
import CalendarIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Calendar'
import UserGroupIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/UserGroup'
import MicrophoneIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Microphone'
import LayersIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Layers'
import DocumentIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Document'
import { SPACING } from '../styles/designSystem'
import { checkPermission } from '../hooks/useHasPermission'
import { useGroup } from '../contexts/GroupContext'

/**
 * Navigation destination configuration
 */
interface NavDestination {
  id: string
  path: string
  icon: React.ReactNode
  title: string
  description: string
  permission?: { resource: string, access: string }
}

const destinations: NavDestination[] = [
  {
    id: 'overview',
    path: '/overview',
    icon: <GraphBarChart aria-hidden />,
    title: 'Overview',
    description: 'View comprehensive statistics, metrics, and insights across all events and series.',
  },
  {
    id: 'events',
    path: '/events',
    icon: <CalendarIllustration aria-hidden />,
    title: 'Events',
    description: 'Create, edit, and publish events with full configuration options.',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'registrations',
    path: '/registrations',
    icon: <UserGroupIllustration aria-hidden />,
    title: 'Registrations',
    description: 'View and manage event registrations, campaigns, and track RSVPs.',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'speakers',
    path: '/speakers',
    icon: <MicrophoneIllustration aria-hidden />,
    title: 'Speakers',
    description: 'Manage speakers at the series level and assign them to events.',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'series',
    path: '/series',
    icon: <LayersIllustration aria-hidden />,
    title: 'Series',
    description: 'Create and manage event series to group related events together.',
    permission: { resource: 'series', access: 'read' }
  },
  {
    id: 'about',
    path: '/about',
    icon: <DocumentIllustration aria-hidden />,
    title: 'Documentation',
    description: 'Access comprehensive documentation, guides, and API references.',
  }
]

/**
 * Navigation card component
 */
interface NavCardProps {
  destination: NavDestination
  onClick: () => void
}

const NavCard: React.FC<NavCardProps> = ({ destination, onClick }) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--spectrum-gray-75)',
        border: '1px solid var(--spectrum-gray-200)',
        borderRadius: '8px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '160px',
        position: 'relative',
        overflow: 'hidden'
      }}
      className="nav-card"
    >
      <div onClick={onClick} style={{ height: '100%' }}>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}
          style={{ height: '100%' }}
        >
          {/* Icon */}
          <div style={{ color: 'var(--spectrum-gray-700)' }}>
            {destination.icon}
          </div>

          {/* Title */}
          <Heading level={3}>
            {destination.title}
          </Heading>

          {/* Description */}
          <Text
            UNSAFE_style={{
              color: 'var(--spectrum-gray-700)',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          >
            {destination.description}
          </Text>
        </div>
      </div>
    </div>
  )
}

/**
 * Home page - Card-based navigation hub
 */
export const Home: React.FC = () => {
  const navigate = useNavigate()
  const { permissions } = useGroup()

  const visibleDestinations = destinations.filter(dest =>
    !dest.permission || checkPermission(permissions, dest.permission.resource, dest.permission.access)
  )

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', marginLeft: 'auto', marginRight: 'auto' }}>
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 32 })}>
        {/* Header */}
        <div>
          <Heading level={1}>Event Management Cloud</Heading>
          <Text
            UNSAFE_style={{
              color: 'var(--spectrum-gray-700)',
              fontSize: '14px'
            }}
          >
            Adobe Experience Cloud application for managing events, series, and attendees.
          </Text>
        </div>

        {/* Navigation Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: `${SPACING.MD}px`
          }}
        >
          {visibleDestinations.map(dest => (
            <NavCard
              key={dest.id}
              destination={dest}
              onClick={() => navigate(dest.path)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
