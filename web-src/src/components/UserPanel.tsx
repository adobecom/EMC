/* 
* <license header>
*/

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  View,
  Flex,
  Text,
  Avatar,
  ActionButton,
  MenuTrigger,
  Menu,
  Item
} from '@adobe/react-spectrum'
import UserIcon from '@spectrum-icons/workflow/User'
import InfoIcon from '@spectrum-icons/workflow/Info'
import { IMS } from '../types'

interface UserPanelProps {
  ims: IMS
  compact?: boolean  // For top nav layout
}

export const UserPanel: React.FC<UserPanelProps> = ({ ims, compact = false }) => {
  const navigate = useNavigate()

  // Extract user info from IMS
  const userName = ims.profile?.name || 'Guest User'
  const userEmail = ims.profile?.email || ''
  const userId = ims.profile?.userId || ''

  // Get initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleViewProfile = () => {
    navigate('/profile')
  }

  // If no IMS profile, show minimal panel
  if (!ims.profile) {
    return (
      <View 
        backgroundColor={compact ? 'transparent' : 'gray-100'}
        padding={compact ? 'size-100' : 'size-200'}
        borderRadius="medium"
        marginBottom={compact ? 'size-0' : 'size-300'}
      >
        <Flex direction="row" alignItems="center" gap="size-150">
          <Avatar size="avatar-size-400" src="https://pps-stage.services.adobe.com/api/profile/image/default/22c90d64-691f-439f-b7fd-7fe06ccb01a7/138" />
          <Text UNSAFE_className="user-name">Guest User</Text>
        </Flex>
      </View>
    )
  }

  return (
    <View 
      backgroundColor={compact ? 'transparent' : 'gray-100'}
      padding={compact ? 'size-100' : 'size-200'}
      borderRadius="medium"
      marginBottom={compact ? 'size-0' : 'size-300'}
      UNSAFE_className={compact ? 'user-panel-compact' : ''}
    >
      <MenuTrigger>
        <ActionButton 
          isQuiet 
          UNSAFE_className={compact ? 'user-panel-button-compact' : 'user-panel-button'}
        >
          <Flex direction="row" alignItems="center" gap="size-150" width="100%">
            {/* Avatar with initials */}
            <View 
              backgroundColor="blue-600"
              width={compact ? 'size-400' : 'size-500'}
              height={compact ? 'size-400' : 'size-500'}
              borderRadius="medium"
              UNSAFE_className="user-avatar"
            >
              <Text UNSAFE_className={compact ? 'user-initials-compact' : 'user-initials'}>
                {getInitials(userName)}
              </Text>
            </View>

            {/* User info - only show name in compact mode */}
            <Flex direction="column" gap="size-25" flex UNSAFE_className="user-info-container">
              <Text UNSAFE_className="user-name">
                {userName}
              </Text>
              {!compact && userEmail && (
                <Text UNSAFE_className="user-email">
                  {userEmail}
                </Text>
              )}
            </Flex>
          </Flex>
        </ActionButton>

        <Menu onAction={(key) => {
          if (key === 'profile') {
            handleViewProfile()
          }
        }}>
          <Item key="profile" textValue="View Profile">
            <UserIcon />
            <Text>View Profile</Text>
          </Item>
          <Item key="info" textValue="User Info">
            <InfoIcon />
            <Text>User ID: {userId.substring(0, 12)}...</Text>
          </Item>
        </Menu>
      </MenuTrigger>

      {/* Organization indicator - only show in full mode */}
      {!compact && ims.org && (
        <Flex direction="row" alignItems="center" gap="size-100" marginTop="size-150">
          <Text UNSAFE_className="org-label">
            ORG:
          </Text>
          <Text UNSAFE_className="org-value">
            {ims.org}
          </Text>
        </Flex>
      )}
    </View>
  )
}

