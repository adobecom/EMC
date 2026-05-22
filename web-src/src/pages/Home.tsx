/*
* <license header>
*/

import React from 'react'
import { Link } from 'react-router-dom'
import {
  Heading,
  Text
} from '@react-spectrum/s2'
import GraphBarChart from '@react-spectrum/s2/illustrations/gradient/generic1/GraphBarChart'
import CalendarIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Calendar'
import UserGroupIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/UserGroup'
import MicrophoneIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Microphone'
import LayersIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Layers'
import GearSettingIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/GearSetting'
import DocumentIllustration from '@react-spectrum/s2/illustrations/gradient/generic1/Document'
import { GRADIENT_BACKGROUND, LAYOUT_DIMENSIONS, SPACING } from '../styles/designSystem'
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
    id: 'configs',
    path: '/configs',
    icon: <GearSettingIllustration aria-hidden />,
    title: 'Configs',
    description: 'Manage RSVP fields, locale mappings, and custom attributes for your organization.',
    permission: { resource: 'config', access: 'read' }
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
 * Navigation card — horizontal layout: 48px illustration, title 16px bold, body 14px regular
 */
interface NavCardProps {
  destination: NavDestination
}

const NavCard: React.FC<NavCardProps> = ({ destination }) => {
  return (
    <Link to={destination.path} className="nav-card">
      <div className="home-nav-card-icon">
        {destination.icon}
      </div>
      <div className="home-nav-card-body">
        <Heading
          level={3}
          UNSAFE_style={{
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.25,
            margin: 0,
            color: 'var(--spectrum-global-color-gray-900)',
          }}
        >
          {destination.title}
        </Heading>
        <Text
          UNSAFE_style={{
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.5,
            margin: 0,
            color: 'var(--spectrum-global-color-gray-700)',
          }}
        >
          {destination.description}
        </Text>
      </div>
    </Link>
  )
}

/**
 * Home page - Card-based navigation hub
 */
export const Home: React.FC = () => {
  const { permissions } = useGroup()

  const visibleDestinations = destinations.filter(dest =>
    !dest.permission || checkPermission(permissions, dest.permission.resource, dest.permission.access)
  )

  return (
    <div
      style={{
        minHeight: `calc(100vh - ${LAYOUT_DIMENSIONS.GNAV_HEIGHT}px)`,
        background: GRADIENT_BACKGROUND,
        padding: `${SPACING.XL}px`,
        marginLeft: 'auto',
        marginRight: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        maxWidth: 1400,
        margin: '0 auto',
      }}>
        <div>
          <Heading level={1}>Event Management Console</Heading>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))',
            gap: `${SPACING.MD}px`,
          }}
        >
          {visibleDestinations.map(dest => (
            <NavCard
              key={dest.id}
              destination={dest}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
