/* 
* <license header>
*/

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  View,
  Flex,
  Heading,
  Text
} from '@adobe/react-spectrum'
import Collection from '@spectrum-icons/workflow/Collection'
import Events from '@spectrum-icons/workflow/Events'
import UserGroup from '@spectrum-icons/workflow/UserGroup'
import Stage from '@spectrum-icons/workflow/Stage'
import Info from '@spectrum-icons/workflow/Info'
import GraphBarVertical from '@spectrum-icons/workflow/GraphBarVertical'
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
    icon: <GraphBarVertical size="XL" />,
    title: 'Overview',
    description: 'View comprehensive statistics, metrics, and insights across all events and series.',
    color: '#0D66D0'
  },
  {
    id: 'events',
    path: '/events',
    icon: <Events size="XL" />,
    title: 'Events',
    description: 'Create, edit, and publish events with full configuration options.',
    color: COLORS.ADOBE_RED,
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'registrations',
    path: '/registrations',
    icon: <UserGroup size="XL" />,
    title: 'Registrations',
    description: 'View and manage event registrations, campaigns, and track RSVPs.',
    color: '#268E6C',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'speakers',
    path: '/speakers',
    icon: <Stage size="XL" />,
    title: 'Speakers',
    description: 'Manage speakers at the series level and assign them to events.',
    color: '#CD3ACE',
    permission: { resource: 'event', access: 'read' }
  },
  {
    id: 'series',
    path: '/series',
    icon: <Collection size="XL" />,
    title: 'Series',
    description: 'Create and manage event series to group related events together.',
    color: '#2D9D92',
    permission: { resource: 'series', access: 'read' }
  },
  {
    id: 'about',
    path: '/about',
    icon: <Info size="XL" />,
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
    <View
      backgroundColor="gray-50"
      borderWidth="thin"
      borderColor="gray-200"
      borderRadius="medium"
      padding="size-300"
      UNSAFE_style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '160px',
        position: 'relative',
        overflow: 'hidden'
      }}
      UNSAFE_className="nav-card"
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
        <Flex direction="column" gap="size-200" height="100%">
          {/* Icon */}
          <View
            UNSAFE_style={{
              color: 'var(--spectrum-global-color-gray-700)'
            }}
          >
            {destination.icon}
          </View>
          
          {/* Title */}
          <Heading level={3} marginTop="size-0" marginBottom="size-0">
            {destination.title}
          </Heading>
          
          {/* Description */}
          <Text
            UNSAFE_style={{
              color: 'var(--spectrum-global-color-gray-700)',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          >
            {destination.description}
          </Text>
        </Flex>
      </div>
    </View>
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
    <View padding="size-400" maxWidth="1400px" marginX="auto">
      <Flex direction="column" gap="size-400">
        {/* Header */}
        <View>
          <Heading level={1} marginBottom="size-50">Event Management Cloud</Heading>
          <Text
            UNSAFE_style={{
              color: 'var(--spectrum-global-color-gray-700)',
              fontSize: '14px'
            }}
          >
            Adobe Experience Cloud application for managing events, series, and attendees.
          </Text>
        </View>

        {/* Navigation Cards Grid */}
        <View
          UNSAFE_style={{
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
        </View>
      </Flex>
    </View>
  )
}

export default Home
