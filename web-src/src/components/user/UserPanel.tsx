/*
* <license header>
*/

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import {
  ActionButton,
  Badge,
  Header,
  Heading,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@react-spectrum/s2'
import User from '@react-spectrum/s2/icons/User'
import UserGroup from '@react-spectrum/s2/icons/UserGroup'
import { IMS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useHasAnyPermission } from '../../hooks/useHasPermission'
import { useGroup } from '../../contexts/GroupContext'

interface UserPanelProps {
  ims: IMS
  compact?: boolean  // For top nav layout
}

export const UserPanel: React.FC<UserPanelProps> = ({ ims, compact = false }) => {
  const navigate = useNavigate()
  const { signOut, authMode } = useAuth()

  const { groups, activeGroup, setActiveGroup } = useGroup()

  const canManageAccess = useHasAnyPermission([['scope', 'read'], ['group', 'read']])
  const canManageRoles = useHasAnyPermission([['role', 'read']])
  const showAdminSection = canManageAccess || canManageRoles

  const userName = ims.profile?.name || 'Guest User'
  const userEmail = ims.profile?.email || ''

  const handleMenuAction = (key: string) => {
    if (key === 'shell-info') return
    if (key === 'profile') {
      navigate('/profile')
    } else if (key === 'signout') {
      signOut()
    } else if (key === 'access') {
      navigate('/access')
    } else if (key === 'roles') {
      navigate('/roles')
    } else if (key.startsWith('group_')) {
      setActiveGroup(key.replace('group_', ''))
    }
  }

  const panelShell = (children: React.ReactNode) => (
    <div
      className={compact ? 'user-panel-compact' : ''}
      style={{
        background: compact ? 'transparent' : 'var(--spectrum-global-color-gray-100)',
        padding: compact ? 8 : 16,
        borderRadius: 8,
        marginBottom: compact ? 0 : 24,
      }}
    >
      {children}
    </div>
  )

  if (!ims.profile) {
    return panelShell(
      <div className={style({ display: 'flex', alignItems: 'center', gap: 12 })}>
        <div
          className="user-avatar"
          style={{
            background: 'var(--spectrum-global-color-blue-600)',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text UNSAFE_className="user-initials-compact">GU</Text>
        </div>
        <Text UNSAFE_className="user-name">Guest User</Text>
      </div>
    )
  }

  let compactGroupIndicator: React.ReactNode = null
  if (compact && activeGroup) {
    const badge = (
      <div className={style({ flexShrink: 0 })}>
        <Badge
          data-testid="active-group-badge"
          variant="informative"
          fillStyle="subtle"
          size="S"
          aria-label={`Active group: ${activeGroup.name}`}
          UNSAFE_style={{ whiteSpace: 'nowrap' }}
        >
          <UserGroup />
          <Text UNSAFE_style={{ whiteSpace: 'nowrap' }}>{activeGroup.name}</Text>
        </Badge>
      </div>
    )
    compactGroupIndicator = activeGroup.scopeName ? (
      <TooltipTrigger delay={0}>
        {badge}
        <Tooltip>
          <Text>{activeGroup.scopeName}</Text>
        </Tooltip>
      </TooltipTrigger>
    ) : (
      badge
    )
  }

  return panelShell(
    <>
      <div
        className={
          compact
            ? style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 })
            : style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 })
        }
      >
        {compactGroupIndicator}
        {!compact && (
          <div className={`${style({ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 })} user-info-container`}>
            <Text UNSAFE_className="user-name">
              {userName}
            </Text>
            {userEmail && (
              <Text UNSAFE_className="user-email">
                {userEmail}
              </Text>
            )}
          </div>
        )}
        {compact && (
          <Text UNSAFE_className="user-name" UNSAFE_style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </Text>
        )}
        <MenuTrigger>
          <ActionButton
            data-testid="user-panel"
            isQuiet
            aria-label={`Account menu for ${userName}`}
            UNSAFE_className={compact ? 'user-panel-button-compact' : 'user-panel-button'}
          >
            <User />
          </ActionButton>
          <Menu onAction={(k) => handleMenuAction(String(k))}>
            <MenuSection aria-label="Account">
              <MenuItem id="profile" textValue="View Profile">
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
                    key={group.groupId}
                    id={`group_${group.groupId}`}
                    textValue={group.scopeName ? `${group.name} (${group.scopeName})` : group.name}
                  >
                    <Text slot="label">
                      {activeGroup?.groupId === group.groupId ? '✓ ' : ''}
                      {group.name}
                      {group.scopeName ? ` — ${group.scopeName}` : ''}
                    </Text>
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
                    <Text slot="label">Access Management</Text>
                  </MenuItem>
                ) : null}
                {canManageRoles ? (
                  <MenuItem id="roles" textValue="Roles">
                    <Text slot="label">Roles</Text>
                  </MenuItem>
                ) : null}
              </MenuSection>
            ) : null}
            {authMode === 'standalone' ? (
              <MenuSection aria-label="Session">
                <MenuItem id="signout" textValue="Sign Out">
                  <Text slot="label">Sign Out</Text>
                </MenuItem>
              </MenuSection>
            ) : (
              <MenuSection aria-label="Sign out information">
                <MenuItem id="shell-info" textValue="Sign out via Experience Cloud" isDisabled>
                  <Text slot="label">Sign out via Experience Cloud</Text>
                </MenuItem>
              </MenuSection>
            )}
          </Menu>
        </MenuTrigger>
      </div>

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
    </>
  )
}
