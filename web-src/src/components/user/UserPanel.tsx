/*
* <license header>
*/

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  View,
  Avatar,
  ActionButton,
} from '@adobe/react-spectrum'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import {
  MenuTrigger,
  Menu,
  MenuItem,
  MenuSection,
  Header,
  Heading,
  Text
} from '@react-spectrum/s2'
import User from "@react-spectrum/s2/icons/User"
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle"
import Leave from "@react-spectrum/s2/icons/Leave"
import UserGroup from "@react-spectrum/s2/icons/UserGroup"
import UserSettings from "@react-spectrum/s2/icons/UserSettings"
import UserLock from "@react-spectrum/s2/icons/UserLock"
import Checkmark from "@react-spectrum/s2/icons/Checkmark"
import { IMS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useProfileAvatar } from '../../hooks/useProfileAvatar'
import { useHasAnyPermission } from '../../hooks/useHasPermission'
import { useGroup } from '../../contexts/GroupContext'

interface UserPanelProps {
  ims: IMS
  compact?: boolean  // For top nav layout
}

export const UserPanel: React.FC<UserPanelProps> = ({ ims, compact = false }) => {
  const navigate = useNavigate()
  const { signOut, authMode } = useAuth()
  const { avatarUrl } = useProfileAvatar(ims)

  // RBAC group switching
  const { groups, activeGroup, setActiveGroup } = useGroup()

  // RBAC admin checks
  const canManageAccess = useHasAnyPermission([['scope', 'read'], ['group', 'read']])
  const canManageRoles = useHasAnyPermission([['role', 'read']])
  const showAdminSection = canManageAccess || canManageRoles

  // Extract user info from IMS
  const userName = ims.profile?.name || 'Guest User'
  const userEmail = ims.profile?.email || ''

  // Get initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleMenuAction = (key: React.Key) => {
    if (key === 'profile') {
      navigate('/profile')
    } else if (key === 'signout') {
      signOut()
    } else if (key === 'access') {
      navigate('/access')
    } else if (key === 'roles') {
      navigate('/roles')
    } else if (typeof key === 'string' && key.startsWith('group_')) {
      setActiveGroup(key.replace('group_', ''))
    }
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
        <div className={style({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <View
            backgroundColor="blue-600"
            width="size-400"
            height="size-400"
            borderRadius="medium"
            UNSAFE_className="user-avatar"
          >
            <Text UNSAFE_className="user-initials-compact">GU</Text>
          </View>
          <Text UNSAFE_className="user-name">Guest User</Text>
        </div>
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
          <div className={style({ display: 'flex', alignItems: 'center', gap: 12, width: '[100%]' })}>
            {/* Avatar: image when available, else initials */}
            {avatarUrl ? (
              <Avatar
                size={compact ? 'avatar-size-400' : 'avatar-size-500'}
                src={avatarUrl}
                alt={userName}
              />
            ) : (
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
            )}

            {/* User info - only show name in compact mode */}
            <div className={`${style({ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 })} user-info-container`}>
              <Text UNSAFE_className="user-name">
                {userName}
              </Text>
              {!compact && userEmail && (
                <Text UNSAFE_className="user-email">
                  {userEmail}
                </Text>
              )}
            </div>
          </div>
        </ActionButton>

        <Menu onAction={handleMenuAction}>
          <MenuSection>
            <MenuItem id="profile" textValue="View Profile">
              <User />
              <Text slot="label">View Profile</Text>
            </MenuItem>
          </MenuSection>
          {groups.length > 0 ? (
            <MenuSection>
              <Header>
                <Heading>Group</Heading>
              </Header>
              {groups.map(group => (
                <MenuItem
                  key={`group_${group.groupId}`}
                  id={`group_${group.groupId}`}
                  textValue={group.name}
                >
                  {activeGroup?.groupId === group.groupId ? <Checkmark /> : <UserGroup />}
                  <Text slot="label">{group.name}</Text>
                  {group.scopeName && <Text slot="description">{group.scopeName}</Text>}
                </MenuItem>
              ))}
            </MenuSection>
          ) : null}
          {showAdminSection ? (
            <MenuSection>
              <Header>
                <Heading>Administration</Heading>
              </Header>
              {canManageAccess ? (
                <MenuItem id="access" textValue="Access Management">
                  <UserSettings />
                  <Text slot="label">Access Management</Text>
                </MenuItem>
              ) : null}
              {canManageRoles ? (
                <MenuItem id="roles" textValue="Roles">
                  <UserLock />
                  <Text slot="label">Roles</Text>
                </MenuItem>
              ) : null}
            </MenuSection>
          ) : null}
          {authMode === 'standalone' ? (
            <MenuSection>
              <MenuItem id="signout" textValue="Sign Out">
                <Leave />
                <Text slot="label">Sign Out</Text>
              </MenuItem>
            </MenuSection>
          ) : (
            <MenuSection aria-label="shell-mode">
              <MenuItem id="shell-info" textValue="Managed by Experience Cloud">
                <InfoCircle />
                <Text slot="label">Sign out via Experience Cloud</Text>
              </MenuItem>
            </MenuSection>
          )}
        </Menu>
      </MenuTrigger>

      {/* Organization indicator - only show in full mode */}
      {!compact && ims.org && (
        <div className={style({ display: 'flex', alignItems: 'center', gap: 8 })} style={{ marginTop: 'var(--spectrum-global-dimension-size-150)' }}>
          <Text UNSAFE_className="org-label">
            ORG:
          </Text>
          <Text UNSAFE_className="org-value">
            {ims.org}
          </Text>
        </div>
      )}
    </View>
  )
}
