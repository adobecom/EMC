/**
 * ScopeGroupManagement — Combined admin page for managing RBAC scopes,
 * groups within scopes, and users within groups.
 *
 * Layout (vertical stack):
 *   1. Scope selector (ComboBox) + scope CRUD actions
 *   2. Groups table for selected scope
 *   3. Users table for selected group (appears below groups)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Badge, Button, ButtonGroup, TextField, Picker, PickerItem, ComboBox, ComboBoxItem, Text, DialogTrigger, Dialog, Content, Heading, Switch, ActionButton, AlertDialog, Divider } from "@react-spectrum/s2"
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import EditIcon from "@react-spectrum/s2/icons/Edit"
import Add from "@react-spectrum/s2/icons/Add"
import UserAdd from "@react-spectrum/s2/icons/UserAdd"
import RemoveCircle from "@react-spectrum/s2/icons/RemoveCircle"
import UserGroupIcon from "@react-spectrum/s2/icons/UserGroup"
import { useApi } from '../../contexts/ApiContext'
import { useToast, useGroup, useAuth } from '../../contexts'
import { IMS } from '../../types'
import type {
  RBACApiScope,
  RBACApiGroup,
  RBACApiRole,
  ScopeUser,
  ScopeType,
  ScopeCreateBody,
  ScopeUserUpdateBody,
} from '../../types/rbacApi'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import FolderSharedIllustration from '@react-spectrum/s2/illustrations/linear/FolderShared'
import { useHasPermission } from '../../hooks/useHasPermission'

interface ScopeGroupManagementProps {
  ims: IMS
}

const SCOPE_TYPES: { key: ScopeType; label: string }[] = [
  { key: 'platform', label: 'Platform' },
  { key: 'org', label: 'Organization' },
  { key: 'team', label: 'Team' },
]

const SCOPE_TYPE_VARIANTS: Record<ScopeType, 'positive' | 'informative' | 'neutral'> = {
  platform: 'positive',
  org: 'informative',
  team: 'neutral',
}

const GROUP_SEARCH_KEYS = ['name', 'description']

export const ScopeGroupManagement: React.FC<ScopeGroupManagementProps> = () => {
  const apiService = useApi()
  const toast = useToast()
  const { ims } = useAuth()
  const { groups: userMemberGroups, refreshGroups } = useGroup()

  // Permissions
  const canWriteScope = useHasPermission('scope', 'write')
  const canDeleteScope = useHasPermission('scope', 'delete')
  const canWriteGroup = useHasPermission('group', 'write')
  const canDeleteGroup = useHasPermission('group', 'delete')
  const canWriteUser = useHasPermission('user', 'write')
  const canDeleteUser = useHasPermission('user', 'delete')

  // ============================================================================
  // SCOPE STATE
  // ============================================================================

  const [scopes, setScopes] = useState<RBACApiScope[]>([])
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null)
  const [scopeFilterText, setScopeFilterText] = useState('')
  const [myScopesOnly, setMyScopesOnly] = useState(false)
  const [isLoadingScopes, setIsLoadingScopes] = useState(true)
  const [roles, setRoles] = useState<RBACApiRole[]>([])

  // Scope form dialog
  const [isScopeFormOpen, setIsScopeFormOpen] = useState(false)
  const [editingScope, setEditingScope] = useState<RBACApiScope | null>(null)
  const [scopeToDelete, setScopeToDelete] = useState<RBACApiScope | null>(null)
  const [scopeFormName, setScopeFormName] = useState('')
  const [scopeFormType, setScopeFormType] = useState<ScopeType>('org')
  const [scopeFormParentId, setScopeFormParentId] = useState('')
  const [parentScopeFilterText, setParentScopeFilterText] = useState('')

  // ============================================================================
  // GROUP STATE
  // ============================================================================

  const [groups, setGroups] = useState<RBACApiGroup[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [groupError, setGroupError] = useState<string | null>(null)

  // Group form dialog
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<RBACApiGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<RBACApiGroup | null>(null)
  const [groupFormName, setGroupFormName] = useState('')
  const [groupFormDescription, setGroupFormDescription] = useState('')
  const [groupFormRoleId, setGroupFormRoleId] = useState<string | null>(null)

  // ============================================================================
  // USER STATE
  // ============================================================================

  const [selectedGroup, setSelectedGroup] = useState<RBACApiGroup | null>(null)
  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ScopeUser | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserFirstName, setNewUserFirstName] = useState('')
  const [newUserLastName, setNewUserLastName] = useState('')
  const [newUserGuid, setNewUserGuid] = useState('')
  const [userToRemove, setUserToRemove] = useState<ScopeUser | null>(null)
  const [userSortKey, setUserSortKey] = useState<string>('name')

  // Expandable row state
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())
  const [groupUsersMap, setGroupUsersMap] = useState<Record<string, ScopeUser[]>>({})
  const [loadingGroupIds, setLoadingGroupIds] = useState<Set<string>>(new Set())

  // Action state
  const [isSaving, setIsSaving] = useState(false)

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const selectedScope = useMemo(
    () => scopes.find(s => s.scopeId === selectedScopeId) || null,
    [scopes, selectedScopeId]
  )

  const scopeIdsImMemberOf = useMemo(() => {
    const ids = new Set<string>()
    for (const g of userMemberGroups) {
      if (g.scopeId) ids.add(g.scopeId)
    }
    return ids
  }, [userMemberGroups])

  const scopesForPicker = useMemo(() => {
    if (!myScopesOnly) return scopes
    return scopes.filter(s => scopeIdsImMemberOf.has(s.scopeId))
  }, [scopes, myScopesOnly, scopeIdsImMemberOf])

  const filteredScopes = useMemo(() => {
    const items = scopesForPicker.map(s => ({ id: s.scopeId, name: s.name, type: s.type }))
    if (!scopeFilterText) return items
    const lower = scopeFilterText.toLowerCase()
    return items.filter(s => s.name.toLowerCase().includes(lower) || s.type.toLowerCase().includes(lower))
  }, [scopesForPicker, scopeFilterText])

  /** Group IDs the current user belongs to for the selected scope (for table filter). */
  const myGroupIdsInSelectedScope = useMemo(() => {
    if (!selectedScopeId) return new Set<string>()
    const withScopeId = userMemberGroups.some(m => !!m.scopeId)
    if (withScopeId) {
      const ids = new Set<string>()
      for (const m of userMemberGroups) {
        if (m.scopeId === selectedScopeId) ids.add(m.groupId)
      }
      return ids
    }
    // /me/groups omitted scopeId — match by groupId; table is already limited to selected scope's groups
    return new Set(userMemberGroups.map(m => m.groupId))
  }, [userMemberGroups, selectedScopeId])

  const groupsForTable = useMemo(() => {
    if (!myScopesOnly || !selectedScopeId) return groups
    return groups.filter(g => myGroupIdsInSelectedScope.has(g.groupId))
  }, [groups, myScopesOnly, selectedScopeId, myGroupIdsInSelectedScope])

  const parentScopes = useMemo(() => {
    if (scopeFormType === 'platform') return []
    if (scopeFormType === 'org') return scopes.filter(s => s.type === 'platform')
    if (scopeFormType === 'team') return scopes.filter(s => s.type === 'org')
    return []
  }, [scopes, scopeFormType])

  const filteredParentScopes = useMemo(() => {
    const items = parentScopes.map(s => ({ id: s.scopeId, name: s.name, type: s.type }))
    if (!parentScopeFilterText) return items
    const lower = parentScopeFilterText.toLowerCase()
    return items.filter(s => s.name.toLowerCase().includes(lower))
  }, [parentScopes, parentScopeFilterText])

  const needsParent = scopeFormType !== 'platform'

  const getRoleName = useCallback((roleId: string | null) => {
    if (!roleId) return 'None'
    const role = roles.find(r => r.roleId === roleId)
    return role?.name || roleId.substring(0, 8) + '...'
  }, [roles])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadScopes = useCallback(async () => {
    setIsLoadingScopes(true)
    try {
      const scopesResult = await apiService.getScopes()
      if (!('error' in scopesResult)) setScopes(scopesResult)
    } catch {
      // Individual errors handled by consumers
    } finally {
      setIsLoadingScopes(false)
    }
  }, [apiService])

  const loadGroups = useCallback(async () => {
    if (!selectedScopeId || !selectedScope) {
      setGroups([])
      setRoles([])
      return
    }
    setIsLoadingGroups(true)
    setGroupError(null)
    try {
      const [groupsResult, rolesResult] = await Promise.all([
        apiService.getGroupsForScope(selectedScopeId),
        apiService.getRoles(selectedScope.type),
      ])
      if ('error' in groupsResult) {
        setGroupError('Failed to load groups')
      } else {
        setGroups(groupsResult)
      }
      if (!('error' in rolesResult)) setRoles(rolesResult)
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setIsLoadingGroups(false)
    }
  }, [apiService, selectedScopeId, selectedScope])

  const loadGroupUsersForExpand = useCallback(async (groupId: string) => {
    if (!selectedScopeId) return
    setLoadingGroupIds(prev => new Set(prev).add(groupId))
    try {
      const result = await apiService.getGroupUsers(selectedScopeId, groupId)
      if (!('error' in result)) {
        setGroupUsersMap(prev => ({ ...prev, [groupId]: result }))
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingGroupIds(prev => {
        const next = new Set(prev)
        next.delete(groupId)
        return next
      })
    }
  }, [apiService, selectedScopeId])

  const handleToggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
        // Load users on first expand
        if (!groupUsersMap[groupId]) {
          loadGroupUsersForExpand(groupId)
        }
      }
      return next
    })
  }, [groupUsersMap, loadGroupUsersForExpand])

  useEffect(() => { loadScopes() }, [loadScopes])
  useEffect(() => { loadGroups() }, [loadGroups])

  // When scope changes, clear group/user selection and expansion
  useEffect(() => {
    setSelectedGroup(null)
    setExpandedGroupIds(new Set())
    setGroupUsersMap({})
  }, [selectedScopeId])

  // Drop scope selection if it falls outside the current picker pool (e.g. My scopes on)
  useEffect(() => {
    if (!selectedScopeId) return
    if (!scopesForPicker.some(s => s.scopeId === selectedScopeId)) {
      setSelectedScopeId(null)
    }
  }, [selectedScopeId, scopesForPicker])

  // Remove expand/user cache for groups no longer visible in the table
  useEffect(() => {
    const valid = new Set(groupsForTable.map(g => g.groupId))
    setExpandedGroupIds(prev => {
      const next = new Set([...prev].filter(id => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
    setGroupUsersMap(prev => {
      let changed = false
      const next = { ...prev }
      for (const k of Object.keys(next)) {
        if (!valid.has(k)) {
          delete next[k]
          changed = true
        }
      }
      return changed ? next : prev
    })
    setSelectedGroup(prev => (prev && !valid.has(prev.groupId) ? null : prev))
  }, [groupsForTable])

  // ============================================================================
  // SCOPE CRUD
  // ============================================================================

  const openScopeCreate = useCallback(() => {
    setEditingScope(null)
    setScopeFormName('')
    setScopeFormType('org')
    setScopeFormParentId('')
    setParentScopeFilterText('')
    setIsScopeFormOpen(true)
  }, [])

  const openScopeEdit = useCallback(() => {
    if (!selectedScope) return
    setEditingScope(selectedScope)
    setScopeFormName(selectedScope.name)
    setScopeFormType(selectedScope.type)
    setScopeFormParentId('')
    setIsScopeFormOpen(true)
  }, [selectedScope])

  const handleSaveScope = useCallback(async () => {
    if (!scopeFormName.trim()) {
      toast.error('Name is required')
      return
    }
    if (needsParent && !scopeFormParentId && !editingScope) {
      toast.error('Parent scope is required')
      return
    }

    setIsSaving(true)
    try {
      if (editingScope) {
        const result = await apiService.updateScope(editingScope.scopeId, {
          ...editingScope,
          name: scopeFormName.trim(),
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This scope was modified by someone else. Refresh and try again.'
            : 'Failed to update scope')
          return
        }
        toast.success('Scope updated')
      } else {
        const body: ScopeCreateBody = {
          name: scopeFormName.trim(),
          type: scopeFormType,
        }
        if (needsParent) body.parentScopeId = scopeFormParentId
        const result = await apiService.createScope(body)
        if ('error' in result) {
          toast.error('Failed to create scope')
          return
        }
        toast.success('Scope created')
      }
      setIsScopeFormOpen(false)
      setIsSaving(false)
      await loadScopes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save scope')
    } finally {
      setIsSaving(false)
    }
  }, [scopeFormName, scopeFormType, scopeFormParentId, needsParent, editingScope, apiService, toast, loadScopes])

  const handleDeleteScope = useCallback(async (scope: RBACApiScope) => {
    setIsSaving(true)
    try {
      const result = await apiService.deleteScope(scope.scopeId)
      if ('error' in result) {
        toast.error('Failed to delete scope')
        return
      }
      toast.success('Scope deleted')
      setScopeToDelete(null)
      if (selectedScopeId === scope.scopeId) setSelectedScopeId(null)
      setIsSaving(false)
      await loadScopes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete scope')
    } finally {
      setIsSaving(false)
    }
  }, [apiService, toast, loadScopes, selectedScopeId])

  // ============================================================================
  // GROUP CRUD
  // ============================================================================

  const openGroupCreate = useCallback(() => {
    setEditingGroup(null)
    setGroupFormName('')
    setGroupFormDescription('')
    setGroupFormRoleId(null)
    setIsGroupFormOpen(true)
  }, [])

  const openGroupEdit = useCallback((group: RBACApiGroup) => {
    setEditingGroup(group)
    setGroupFormName(group.name)
    setGroupFormDescription(group.description || '')
    setGroupFormRoleId(group.roleId)
    setIsGroupFormOpen(true)
  }, [])

  const handleSaveGroup = useCallback(async () => {
    if (!groupFormName.trim() || !selectedScopeId) {
      toast.error('Name is required')
      return
    }
    if (!groupFormRoleId) {
      toast.error('Role is required')
      return
    }

    setIsSaving(true)
    try {
      if (editingGroup) {
        const result = await apiService.updateGroup(selectedScopeId, editingGroup.groupId, {
          name: groupFormName.trim(),
          description: groupFormDescription.trim() || undefined,
          roleId: groupFormRoleId,
          modificationTime: editingGroup.modificationTime,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This group was modified by someone else. Refresh and try again.'
            : 'Failed to update group')
          return
        }
        toast.success('Group updated')
      } else {
        const result = await apiService.createGroup(selectedScopeId, {
          name: groupFormName.trim(),
          description: groupFormDescription.trim() || undefined,
          roleId: groupFormRoleId,
        })
        if ('error' in result) {
          toast.error('Failed to create group')
          return
        }
        toast.success('Group created')
      }
      setIsGroupFormOpen(false)
      setIsSaving(false)
      await loadGroups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save group')
    } finally {
      setIsSaving(false)
    }
  }, [groupFormName, groupFormDescription, groupFormRoleId, selectedScopeId, editingGroup, apiService, toast, loadGroups])

  const handleDeleteGroup = useCallback(async (group: RBACApiGroup) => {
    if (!selectedScopeId) return
    setIsSaving(true)
    try {
      const result = await apiService.deleteGroup(selectedScopeId, group.groupId)
      if ('error' in result) {
        toast.error('Failed to delete group')
        return
      }
      toast.success('Group deleted')
      setGroupToDelete(null)
      if (selectedGroup?.groupId === group.groupId) {
        setSelectedGroup(null)
      }
      setExpandedGroupIds(prev => {
        const next = new Set(prev)
        next.delete(group.groupId)
        return next
      })
      setGroupUsersMap(prev => {
        const next = { ...prev }
        delete next[group.groupId]
        return next
      })
      setIsSaving(false)
      await loadGroups()
      if (userMemberGroups.some(g => g.groupId === group.groupId)) {
        await refreshGroups()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete group')
    } finally {
      setIsSaving(false)
    }
  }, [apiService, selectedScopeId, toast, loadGroups, selectedGroup, userMemberGroups, refreshGroups])

  // ============================================================================
  // USER CRUD
  // ============================================================================

  const handleSaveUser = useCallback(async () => {
    if (!selectedGroup || !selectedScopeId) return
    setIsSaving(true)
    let addedSelfToGroup = false
    try {
      if (editingUser) {
        const updateData: ScopeUserUpdateBody = {
          ...(newUserFirstName.trim() && { firstName: newUserFirstName.trim() }),
          ...(newUserLastName.trim() && { lastName: newUserLastName.trim() }),
          ...(newUserGuid.trim() && { userGuid: newUserGuid.trim() }),
          modificationTime: editingUser.modificationTime,
        }
        const result = await apiService.updateGroupUser(selectedScopeId, selectedGroup.groupId, editingUser.email, updateData)
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This user was modified by someone else. Refresh and try again.'
            : 'Failed to update user')
          return
        }
        toast.success('User updated')
      } else {
        if (!newUserEmail.trim()) return
        const profileEmail = ims.profile?.email?.toLowerCase()
        const addedEmail = newUserEmail.trim().toLowerCase()
        addedSelfToGroup = !!(profileEmail && addedEmail === profileEmail)
        const result = await apiService.addGroupUser(selectedScopeId, selectedGroup.groupId, {
          email: addedEmail,
          ...(newUserFirstName.trim() && { firstName: newUserFirstName.trim() }),
          ...(newUserLastName.trim() && { lastName: newUserLastName.trim() }),
          ...(newUserGuid.trim() && { userGuid: newUserGuid.trim() }),
        })
        if ('error' in result) {
          toast.error('Failed to add user')
          return
        }
        toast.success('User added')
      }
      setIsUserFormOpen(false)
      setEditingUser(null)
      setNewUserEmail('')
      setNewUserFirstName('')
      setNewUserLastName('')
      setNewUserGuid('')
      setIsSaving(false)
      // Refresh users in the expanded row
      await loadGroupUsersForExpand(selectedGroup.groupId)
      if (addedSelfToGroup) {
        await refreshGroups()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setIsSaving(false)
    }
  }, [editingUser, newUserEmail, newUserFirstName, newUserLastName, newUserGuid, selectedGroup, selectedScopeId, apiService, toast, loadGroupUsersForExpand, ims.profile?.email, refreshGroups])

  const handleRemoveUser = useCallback(async (user: ScopeUser) => {
    if (!selectedGroup || !selectedScopeId) return
    setIsSaving(true)
    try {
      const result = await apiService.removeGroupUser(selectedScopeId, selectedGroup.groupId, user.email)
      if ('error' in result) {
        toast.error('Failed to remove user')
        return
      }
      toast.success('User removed')
      setUserToRemove(null)
      setIsSaving(false)
      // Refresh users in the expanded row
      await loadGroupUsersForExpand(selectedGroup.groupId)
      const profileEmail = ims.profile?.email?.toLowerCase()
      if (profileEmail && user.email.toLowerCase() === profileEmail) {
        await refreshGroups()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setIsSaving(false)
    }
  }, [selectedGroup, selectedScopeId, apiService, toast, loadGroupUsersForExpand, ims.profile?.email, refreshGroups])

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const groupColumns = useMemo<TableColumn<RBACApiGroup>[]>(() => [
    {
      key: 'name',
      name: 'NAME',
      width: 200,
      sortable: true,
      render: (item) => <Text UNSAFE_style={{ fontWeight: 500 }}>{item.name}</Text>,
    },
    {
      key: 'description',
      name: 'DESCRIPTION',
      width: 250,
      sortable: false,
      render: (item) => <Text>{item.description || '-'}</Text>,
    },
    {
      key: 'roleId',
      name: 'ROLE',
      width: 150,
      sortable: false,
      render: (item) => <div className={style({display: 'flex', alignItems: 'start'})}><Badge variant="neutral">{getRoleName(item.roleId)}</Badge></div>,
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 120,
      sortable: false,
      render: (item) => (
        <div className={style({display: 'flex', gap: 8, justifyContent: 'end'})}>
          {canWriteGroup && (
            <ActionButton isQuiet aria-label="Edit group" onPress={() => openGroupEdit(item)}>
              <EditIcon />
            </ActionButton>
          )}
          {canDeleteGroup && (
            <ActionButton isQuiet aria-label="Delete group" onPress={() => setGroupToDelete(item)}>
              <RemoveCircle />
            </ActionButton>
          )}
        </div>
      ),
    },
  ], [canWriteGroup, canDeleteGroup, getRoleName, openGroupEdit])

  const renderGroupExpandedContent = useCallback((group: RBACApiGroup) => {
    const users = groupUsersMap[group.groupId] || []
    const isLoading = loadingGroupIds.has(group.groupId)

    const sortedUsers = [...users].sort((a, b) => {
      switch (userSortKey) {
        case 'name': {
          const aName = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email
          const bName = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.email
          return aName.localeCompare(bName)
        }
        case 'email':
          return a.email.localeCompare(b.email)
        default:
          return 0
      }
    })

    return (
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        {/* Action bar */}
        <div className={style({display: 'flex', justifyContent: 'end', gap: 12, alignItems: 'center'})}>
          <Picker
            label="Sort by"
            labelPosition="side"
            selectedKey={userSortKey}
            onSelectionChange={(key) => setUserSortKey(key as string)}
            size="S"
            styles={style({ width: 176 })}
          >
            <PickerItem id="name">Name</PickerItem>
            <PickerItem id="email">Email</PickerItem>
          </Picker>
          {canWriteUser && (
            <Button
              variant="secondary"
              size="S"
              onPress={() => {
                setSelectedGroup(group)
                setEditingUser(null)
                setNewUserEmail('')
                setNewUserFirstName('')
                setNewUserLastName('')
                setNewUserGuid('')
                setIsUserFormOpen(true)
              }}
            >
              <UserAdd />
              <Text>Add user</Text>
            </Button>
          )}
        </div>

        {/* User cards */}
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <Text>Loading users...</Text>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 24 }}>
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
              No users in this group
            </Text>
          </div>
        ) : (
          <div className="user-card-list">
            {sortedUsers.map(user => (
              <div className="user-card" key={user.email}>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'start'})}>
                  <Text UNSAFE_style={{ fontWeight: 600 }}>
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
                  </Text>
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    Email: {user.email}
                  </Text>
                  <Badge variant="neutral" UNSAFE_style={{ marginTop: '4px' }}>{getRoleName(group.roleId)}</Badge>
                </div>
                <div className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
                  {canWriteUser && (
                    <ActionButton
                      isQuiet
                      aria-label="Edit user"
                      onPress={() => {
                        setSelectedGroup(group)
                        setEditingUser(user)
                        setNewUserEmail(user.email)
                        setNewUserFirstName(user.firstName || '')
                        setNewUserLastName(user.lastName || '')
                        setNewUserGuid(user.userGuid || '')
                        setIsUserFormOpen(true)
                      }}
                    >
                      <EditIcon />
                    </ActionButton>
                  )}
                  {canDeleteUser && (
                    <ActionButton
                      isQuiet
                      aria-label="Remove user"
                      onPress={() => {
                        setSelectedGroup(group)
                        setUserToRemove(user)
                      }}
                    >
                      <RemoveCircle />
                    </ActionButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }, [groupUsersMap, loadingGroupIds, canWriteUser, canDeleteUser, getRoleName, userSortKey])

  const { loadingOverlayVisible, savingOverlayVisible } = useMemo(() => {
    const isBlockingDialogOpen =
      isUserFormOpen ||
      isScopeFormOpen ||
      isGroupFormOpen ||
      scopeToDelete != null ||
      groupToDelete != null ||
      userToRemove != null
    return {
      loadingOverlayVisible: (isLoadingScopes || isLoadingGroups) && !isSaving,
      savingOverlayVisible:
        isSaving && !isBlockingDialogOpen && !isLoadingScopes && !isLoadingGroups,
    }
  }, [
    isUserFormOpen,
    isScopeFormOpen,
    isGroupFormOpen,
    scopeToDelete,
    groupToDelete,
    userToRemove,
    isLoadingScopes,
    isLoadingGroups,
    isSaving,
  ])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ padding: 32, maxWidth: 1400, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className={style({display: 'flex', flexDirection: 'column', gap: 32})}>
        <div className={style({display: 'flex', flexDirection: 'column', alignItems: 'start'})}>
          <Heading level={1}>Access Management</Heading>
          <Switch isSelected={myScopesOnly} onChange={setMyScopesOnly}>
            Show my scopes only
          </Switch>
        </div>

        {/* ── Scope selector + actions ── */}
        <div>
          <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap'})}>
            <div className={style({display: 'flex', alignItems: 'end', gap: 8})}>
              <ComboBox
                label={`Select Scope (${filteredScopes.length} scope${filteredScopes.length === 1 ? '' : 's'} available)`}
                selectedKey={selectedScopeId}
                onSelectionChange={(key) => setSelectedScopeId(key as string | null)}
                onInputChange={setScopeFilterText}
                defaultItems={filteredScopes}
                styles={style({ width: 480 })}
                menuTrigger="input"
                menuWidth={480}
                allowsCustomValue={false}
              >
                {(item) => (
                  <ComboBoxItem id={item.id} textValue={item.name}>
                    <Text slot="label">{item.name}</Text>
                    <Text slot="description">{item.type}</Text>
                  </ComboBoxItem>
                )}
              </ComboBox>

              {selectedScope && (
                <div className={style({display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4})}>
                  <Badge variant={SCOPE_TYPE_VARIANTS[selectedScope.type] || 'neutral' } UNSAFE_style={{ marginRight: 40 }}>
                    {selectedScope.type}
                  </Badge>
                  <Button
                    size="S"
                    variant="secondary"
                    onPress={() => {
                      setSelectedScopeId(null)
                      setScopeFilterText('')
                    }}
                  >
                    <RemoveCircle />
                    <Text>Reset</Text>
                  </Button>
                  {canWriteScope && (
                    <Button size="S" variant="secondary" onPress={openScopeEdit}>
                      <EditIcon />
                      <Text>Edit Scope</Text>
                    </Button>
                  )}
                  {canDeleteScope && selectedScope.type === 'team' && (
                    <Button size="S" variant="negative" fillStyle="outline" onPress={() => setScopeToDelete(selectedScope)}>
                      <RemoveCircle />
                      <Text>Delete Scope</Text>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {canWriteScope && (
              <Button variant="secondary" onPress={openScopeCreate}>
                <Add />
                <Text>New Scope</Text>
              </Button>
            )}
          </div>
        </div>

        <Divider />

        {/* ── Groups table ── */}
        {selectedScopeId ? (
          <ResourceDashboardLayout
            title="Groups"
            totalCount={groupsForTable.length}
            error={groupError}
            data={groupsForTable}
            columns={groupColumns}
            getItemKey={(item) => item.groupId}
            createButton={canWriteGroup ? (
              <Button variant="accent" onPress={openGroupCreate}>
                <UserGroupIcon />
                <Text>Create Group</Text>
              </Button>
            ) : undefined}
            onRefresh={loadGroups}
            emptyStateIllustration={<FolderSharedIllustration aria-hidden />}
            emptyStateTitle="No Groups"
            emptyStateDescription="Create a group in this scope to manage user access"
            searchPlaceholder="Search groups..."
            searchKeys={GROUP_SEARCH_KEYS}
            renderExpandedContent={renderGroupExpandedContent}
            expandedKeys={expandedGroupIds}
            onToggleExpand={handleToggleGroupExpand}
          />
        ) : (
          <div
            style={{
              padding: 48,
              border: '1px solid var(--spectrum-global-color-gray-200)',
              borderRadius: 8,
              backgroundColor: 'var(--spectrum-global-color-gray-50)',
            }}
          >
            <Text UNSAFE_style={{ textAlign: 'center', color: 'var(--spectrum-global-color-gray-600)' }}>
              Select a scope above to manage its groups and users.
            </Text>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Scope Create/Edit Dialog */}
      <DialogTrigger isOpen={isScopeFormOpen} onOpenChange={setIsScopeFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog>
          {({close}) => (
            <>
              <Heading slot="title">{editingScope ? 'Edit Scope' : 'Create Scope'}</Heading>
              <Content>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
                  <TextField
                    label="Name"
                    value={scopeFormName}
                    onChange={setScopeFormName}
                    styles={style({ width: '[100%]' })}
                    isRequired
                    autoFocus
                  />
                  {!editingScope && (
                    <Picker
                      label="Type"
                      selectedKey={scopeFormType}
                      onSelectionChange={(key) => {
                        setScopeFormType(key as ScopeType)
                        setScopeFormParentId('')
                      }}
                      styles={style({ width: '[100%]' })}
                    >
                      {SCOPE_TYPES.map(opt => (
                        <PickerItem key={opt.key} id={opt.key}>{opt.label}</PickerItem>
                      ))}
                    </Picker>
                  )}
                  {!editingScope && needsParent && (
                    <ComboBox
                      label="Parent Scope"
                      selectedKey={scopeFormParentId || null}
                      onSelectionChange={(key) => setScopeFormParentId(key as string)}
                      onInputChange={setParentScopeFilterText}
                      defaultItems={filteredParentScopes}
                      styles={style({ width: '[100%]' })}
                      menuTrigger="input"
                      allowsCustomValue={false}
                      isRequired
                    >
                      {(item) => (
                        <ComboBoxItem id={item.id} textValue={item.name}>
                          <Text slot="label">{item.name}</Text>
                          <Text slot="description">{item.type}</Text>
                        </ComboBoxItem>
                      )}
                    </ComboBox>
                  )}
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveScope}
                  isDisabled={!scopeFormName.trim() || (needsParent && !scopeFormParentId && !editingScope) || isSaving}
                >
                  {editingScope ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Scope Delete Confirmation */}
      <DialogTrigger
        isOpen={!!scopeToDelete}
        onOpenChange={(open) => !open && setScopeToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Scope"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (scopeToDelete) handleDeleteScope(scopeToDelete)
          }}
          onCancel={() => setScopeToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete scope <strong>{scopeToDelete?.name}</strong>? This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      {/* Group Create/Edit Dialog */}
      <DialogTrigger isOpen={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog>
          {({close}) => (
            <>
              <Heading slot="title">{editingGroup ? 'Edit Group' : 'Create Group'}</Heading>
              <Content>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
                  <TextField
                    label="Name"
                    value={groupFormName}
                    onChange={setGroupFormName}
                    styles={style({ width: '[100%]' })}
                    isRequired
                    autoFocus
                  />
                  <TextField
                    label="Description"
                    value={groupFormDescription}
                    onChange={setGroupFormDescription}
                    styles={style({ width: '[100%]' })}
                  />
                  <Picker
                    label="Role"
                    selectedKey={groupFormRoleId}
                    onSelectionChange={(key) => setGroupFormRoleId(key as string)}
                    styles={style({ width: '[100%]' })}
                    isRequired
                  >
                    {roles.map(role => (
                      <PickerItem key={role.roleId} id={role.roleId}>{role.name}</PickerItem>
                    ))}
                  </Picker>
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveGroup}
                  isDisabled={!groupFormName.trim() || !groupFormRoleId || isSaving}
                >
                  {editingGroup ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Group Delete Confirmation */}
      <DialogTrigger
        isOpen={!!groupToDelete}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Group"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (groupToDelete) handleDeleteGroup(groupToDelete)
          }}
          onCancel={() => setGroupToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete group <strong>{groupToDelete?.name}</strong>? All users in this group will lose access.
        </AlertDialog>
      </DialogTrigger>

      {/* Add/Edit User Dialog */}
      <DialogTrigger isOpen={isUserFormOpen} onOpenChange={(open) => { if (!open) { setIsUserFormOpen(false); setEditingUser(null) } }}>
        <div style={{ display: 'none' }} />
        <Dialog>
          {({close}) => (
            <>
              <Heading slot="title">{editingUser ? `Edit User` : `Add User to ${selectedGroup?.name}`}</Heading>
              <Content>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <TextField
                    label="Email"
                    value={newUserEmail}
                    onChange={setNewUserEmail}
                    styles={style({ width: '[100%]' })}
                    isRequired
                    autoFocus={!editingUser}
                    type="email"
                    isReadOnly={!!editingUser}
                  />
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <TextField
                      label="First Name"
                      value={newUserFirstName}
                      onChange={setNewUserFirstName}
                      styles={style({ flexGrow: 1 })}
                      autoFocus={!!editingUser}
                    />
                    <TextField
                      label="Last Name"
                      value={newUserLastName}
                      onChange={setNewUserLastName}
                      styles={style({ flexGrow: 1 })}
                    />
                  </div>
                  <TextField
                    label="User GUID"
                    value={newUserGuid}
                    onChange={setNewUserGuid}
                    styles={style({ width: '[100%]' })}
                    description="Optional Adobe user identifier"
                  />
                </div>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveUser}
                  isDisabled={!editingUser && !newUserEmail.trim() || isSaving}
                >
                  {editingUser ? 'Update' : 'Add'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Remove User Confirmation */}
      <DialogTrigger
        isOpen={!!userToRemove}
        onOpenChange={(open) => !open && setUserToRemove(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Remove User"
          variant="destructive"
          primaryActionLabel="Remove"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (userToRemove) handleRemoveUser(userToRemove)
          }}
          onCancel={() => setUserToRemove(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Remove <strong>{userToRemove?.email}</strong> from this group?
        </AlertDialog>
      </DialogTrigger>

      <BlurredLoadingOverlay
        visible={loadingOverlayVisible}
        message="Loading..."
        ariaLabel="Loading"
      />
      <BlurredLoadingOverlay
        visible={savingOverlayVisible}
        message="Saving..."
        ariaLabel="Saving"
      />
    </div>
  )
}

export default ScopeGroupManagement
