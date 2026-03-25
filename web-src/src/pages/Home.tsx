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
import Collection from '@react-spectrum/s2/icons/Collection'
import CursorClick from '@react-spectrum/s2/icons/CursorClick'
import UserGroup from '@react-spectrum/s2/icons/UserGroup'
import Slideshow from '@react-spectrum/s2/icons/Slideshow'
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle'
import ChartBarVert from '@react-spectrum/s2/icons/ChartBarVert'
import { SPACING, COLORS } from '../styles/designSystem'
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
  color?: string
  permission?: { resource: string, access: string }
}

const destinations: NavDestination[] = [
  {
    id: 'overview',
    path: '/overview',
    icon: <ChartBarVert />,
    title: 'Overview',
    description: 'View comprehensive statistics, metrics, and insights across all events and series.',
    color: '#0D66D0'
  },
  {
    id: 'events',
    path: '/events',
    icon: <CursorClick />,
    title: 'Events',
    description: 'Create, edit, and publish events with full configuration options.',
    color: COLORS.ADOBE_RED,
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'registrations',
    path: '/registrations',
    icon: <UserGroup />,
    title: 'Registrations',
    description: 'View and manage event registrations, campaigns, and track RSVPs.',
    color: '#268E6C',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'speakers',
    path: '/speakers',
    icon: <Slideshow />,
    title: 'Speakers',
    description: 'Manage speakers at the series level and assign them to events.',
    color: '#CD3ACE',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'series',
    path: '/series',
    icon: <Collection />,
    title: 'Series',
    description: 'Create and manage event series to group related events together.',
    color: '#2D9D92',
    permission: { resource: 'series', access: 'read' }
  },
  {
    id: 'about',
    path: '/about',
    icon: <InfoCircle />,
    title: 'Documentation',
    description: 'Access comprehensive documentation, guides, and API references.',
    color: '#6E6E6E'
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
  const color = destination.color || COLORS.ADOBE_RED
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
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: color
          }}
        />
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
