/* 
* <license header>
*/

import React from 'react'
import { NavLink } from 'react-router-dom'
import { Flex, View, Button } from '@adobe/react-spectrum'
import Login from '@spectrum-icons/workflow/Login'
import { IMS } from '../../types'
import { UserPanel } from '../user'
import { DevTokenButton } from '../dev'
import { STICKY_GNAV_STYLES } from '../../styles/designSystem'
import { useAuth } from '../../contexts/AuthContext'
import { useHasPermission } from '../../hooks'
import { useGroup } from '../../contexts/GroupContext'

interface TopNavProps {
  ims: IMS
}

const TopNav: React.FC<TopNavProps> = ({ ims }) => {
  const { isAuthenticated, isLoading, signIn, authMode } = useAuth()
  const { isLoading: isGroupLoading } = useGroup()
  const canReadEvents = useHasPermission('event', 'read')
  const canReadSeries = useHasPermission('series', 'read')
  const canReadClouds = useHasPermission('cloud', 'read')

  // Hide all tabs until group/permissions are resolved
  const showNav = !isGroupLoading

  // Only show the standalone sign-in button when:
  //   - Running in standalone mode (not the ExC Shell)
  //   - Not yet authenticated
  //   - Not in the middle of initializing auth
  const showSignIn = authMode === 'standalone' && !isAuthenticated && !isLoading

  return (
    <View 
      backgroundColor="gray-100"
      borderBottomWidth="thin" 
      borderBottomColor="gray-300"
      UNSAFE_className="top-nav"
      paddingX="size-300"
      UNSAFE_style={STICKY_GNAV_STYLES}
    >
      <Flex 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between"
        height="size-700"
      >
        {/* Left: Brand/Logo */}
        <View>
          <a href="/">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 64.57 35"
              width="80"
              height="auto"
              style={{ display: 'block' }}
            >
              <path 
                fill="#eb1000" 
                d="M6.27,10.22h4.39l6.2,14.94h-4.64l-3.92-9.92-2.59,6.51h3.08l1.23,3.41H0l6.27-14.94ZM22.03,13.32c.45,0,.94.04,1.43.16v-3.7h3.88v14.72c-.89.4-2.81.89-4.73.89-3.48,0-6.47-1.98-6.47-5.93s2.88-6.13,5.89-6.13ZM22.52,22.19c.36,0,.65-.07.94-.16v-5.42c-.29-.11-.58-.16-.96-.16-1.27,0-2.45.94-2.45,2.92s1.2,2.81,2.47,2.81ZM34.25,13.32c3.23,0,5.98,2.18,5.98,6.02s-2.74,6.02-5.98,6.02-6-2.18-6-6.02,2.72-6.02,6-6.02ZM34.25,22.13c1.11,0,2.14-.89,2.14-2.79s-1.03-2.79-2.14-2.79-2.12.89-2.12,2.79.96,2.79,2.12,2.79ZM41.16,9.78h3.9v3.7c.47-.09.96-.16,1.45-.16,3.03,0,5.84,1.98,5.84,5.86,0,4.1-2.99,6.18-6.53,6.18-1.52,0-3.46-.31-4.66-.87v-14.72ZM45.91,22.17c1.34,0,2.56-.96,2.56-2.94,0-1.85-1.2-2.72-2.5-2.72-.36,0-.65.04-.91.16v5.35c.22.09.51.16.85.16ZM58.97,13.32c2.92,0,5.6,1.87,5.6,5.64,0,.51-.02,1-.09,1.49h-7.27c.4,1.32,1.56,1.94,3.01,1.94,1.18,0,2.27-.29,3.5-.82v2.97c-1.14.58-2.5.82-3.9.82-3.7,0-6.58-2.23-6.58-6.02s2.61-6.02,5.73-6.02ZM60.93,18.02c-.2-1.27-1.05-1.78-1.92-1.78s-1.58.54-1.87,1.78h3.79Z"
              />
            </svg>
          </a>
        </View>

        {/* Center: Navigation Links — hidden until access is resolved */}
        {showNav && (
        <Flex
          direction="row"
          alignItems="center"
          gap="size-0"
          UNSAFE_className="nav-links"
        >
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
            end
            to="/"
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
            to="/overview"
          >
            Overview
          </NavLink>
          {canReadEvents && (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
              to="/events"
            >
              Events
            </NavLink>
          )}
          {canReadEvents && (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
              to="/registrations"
            >
              Registrations
            </NavLink>
          )}
          {canReadEvents && (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
              to="/speakers"
            >
              Speakers
            </NavLink>
          )}
          {canReadSeries && (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
              to="/series"
            >
              Series
            </NavLink>
          )}
          {canReadClouds && (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
              to="/clouds"
            >
              Clouds
            </NavLink>
          )}
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'is-selected' : ''}`}
            to="/about"
          >
            About
          </NavLink>
        </Flex>
        )}

        {/* Right: Auth controls + User Panel */}
        <Flex direction="row" alignItems="center" gap="size-100">
          {/* Dev token fallback — localhost only */}
          <DevTokenButton />

          {showSignIn ? (
            /* Standalone mode, not signed in: show a Sign In button */
            <Button
              variant="primary"
              style="fill"
              onPress={signIn}
              UNSAFE_style={{ fontSize: 12, padding: '4px 12px' }}
            >
              <Login 
                UNSAFE_style={{ marginRight: 4 }}
              />
              <span>Sign In</span>
            </Button>
          ) : (
            /* Signed in (either mode): show user panel */
            !isLoading && <UserPanel ims={ims} compact />
          )}
        </Flex>
      </Flex>
    </View>
  )
}

export default TopNav
