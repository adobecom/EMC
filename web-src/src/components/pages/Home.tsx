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
import Cloud from '@spectrum-icons/workflow/Cloud'
import Collection from '@spectrum-icons/workflow/Collection'
import Events from '@spectrum-icons/workflow/Events'
import UserGroup from '@spectrum-icons/workflow/UserGroup'
import Info from '@spectrum-icons/workflow/Info'
import GraphBarVertical from '@spectrum-icons/workflow/GraphBarVertical'

/**
 * Navigation destination configuration
 */
interface NavDestination {
  id: string
  path: string
  icon: React.ReactNode
  title: string
  description: string
}

const destinations: NavDestination[] = [
  {
    id: 'overview',
    path: '/overview',
    icon: <GraphBarVertical size="XL" />,
    title: 'Overview',
    description: 'View comprehensive statistics, metrics, and insights across all events and series.'
  },
  {
    id: 'clouds',
    path: '/clouds',
    icon: <Cloud size="XL" />,
    title: 'Clouds',
    description: 'Manage cloud configurations and settings for Creative Cloud and Experience Cloud events.'
  },
  {
    id: 'series',
    path: '/series',
    icon: <Collection size="XL" />,
    title: 'Series',
    description: 'Create and manage event series to group related events together.'
  },
  {
    id: 'events',
    path: '/events',
    icon: <Events size="XL" />,
    title: 'Events',
    description: 'Create, edit, and publish events with full configuration options.'
  },
  {
    id: 'attendees',
    path: '/attendees',
    icon: <UserGroup size="XL" />,
    title: 'Attendees',
    description: 'View and manage event registrations, export attendee lists, and track RSVPs.'
  },
  {
    id: 'about',
    path: '/about',
    icon: <Info size="XL" />,
    title: 'Documentation',
    description: 'Access comprehensive documentation, guides, and API references.'
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
    <View
      backgroundColor="gray-50"
      borderWidth="thin"
      borderColor="gray-200"
      borderRadius="medium"
      padding="size-300"
      UNSAFE_style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '160px'
      }}
      UNSAFE_className="nav-card"
    >
      <div onClick={onClick} style={{ height: '100%' }}>
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

  return (
    <View padding="size-400" maxWidth="1200px" marginX="auto">
      {/* Header */}
      <View marginBottom="size-500">
        <Heading level={1}>Event Management Cloud</Heading>
        <Text
          UNSAFE_style={{
            color: 'var(--spectrum-global-color-gray-700)',
            fontSize: '18px'
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
          gap: '24px'
        }}
      >
        {destinations.map(dest => (
          <NavCard
            key={dest.id}
            destination={dest}
            onClick={() => navigate(dest.path)}
          />
        ))}
      </View>

      {/* Quick Start Section */}
      <View marginTop="size-600">
        <Heading level={2}>Quick Start</Heading>
        <View
          backgroundColor="gray-100"
          borderRadius="medium"
          padding="size-300"
          marginTop="size-200"
        >
          <Flex direction="column" gap="size-100">
            <Text>
              <strong>1.</strong> Start by configuring your <strong>Cloud</strong> settings
            </Text>
            <Text>
              <strong>2.</strong> Create a <strong>Series</strong> to group related events
            </Text>
            <Text>
              <strong>3.</strong> Create <strong>Events</strong> within your series
            </Text>
            <Text>
              <strong>4.</strong> Manage <strong>Attendees</strong> and track registrations
            </Text>
          </Flex>
        </View>
      </View>
    </View>
  )
}

export default Home

