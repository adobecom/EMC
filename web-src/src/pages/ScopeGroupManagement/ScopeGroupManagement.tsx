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
import {
  View,
  DialogTrigger as V3DialogTrigger,
  AlertDialog,
  ActionButton,
} from '@adobe/react-spectrum'
import { Badge, Button, ButtonGroup, TextField, Picker, PickerItem, ComboBox, ComboBoxItem, Text, DialogTrigger, Dialog, Content, Heading } from "@react-spectrum/s2"
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import EditIcon from "@react-spectrum/s2/icons/Edit"
import DeleteIcon from "@react-spectrum/s2/icons/Delete"
import Add from "@react-spectrum/s2/icons/Add"
import UserAdd from "@react-spectrum/s2/icons/UserAdd"
import RemoveCircle from "@react-spectrum/s2/icons/RemoveCircle"
import UserGroupIcon from "@react-spectrum/s2/icons/UserGroup"
import { useApi } from '../../contexts/ApiContext'
import { useToast } from '../../contexts'
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

  const filteredScopes = useMemo(() => {
    const items = scopes.map(s => ({ id: s.scopeId, name: s.name, type: s.type }))
    if (!scopeFilterText) return items
    const lower = scopeFilterText.toLowerCase()
    return items.filter(s => s.name.toLowerCase().includes(lower) || s.type.toLowerCase().includes(lower))
  }, [scopes, scopeFilterText])

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
      await loadGroups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete group')
    } finally {
      setIsSaving(false)
    }
  }, [apiService, selectedScopeId, toast, loadGroups, selectedGroup])

  // ============================================================================
  // USER CRUD
  // ============================================================================

  const handleSaveUser = useCallback(async () => {
    if (!selectedGroup || !selectedScopeId) return
    setIsSaving(true)
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
        const result = await apiService.addGroupUser(selectedScopeId, selectedGroup.groupId, {
          email: newUserEmail.trim().toLowerCase(),
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
      // Refresh users in the expanded row
      await loadGroupUsersForExpand(selectedGroup.groupId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setIsSaving(false)
    }
  }, [editingUser, newUserEmail, newUserFirstName, newUserLastName, newUserGuid, selectedGroup, selectedScopeId, apiService, toast, loadGroupUsersForExpand])

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
      // Refresh users in the expanded row
      await loadGroupUsersForExpand(selectedGroup.groupId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setIsSaving(false)
    }
  }, [selectedGroup, selectedScopeId, apiService, toast, loadGroupUsersForExpand])

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
              <DeleteIcon />
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
          <View padding="size-300">
            <Text>Loading users...</Text>
          </View>
        ) : users.length === 0 ? (
          <View padding="size-300">
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
              No users in this group
            </Text>
          </View>
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View padding="size-400" maxWidth="1400px" marginX="auto">
      <div className={style({display: 'flex', flexDirection: 'column', gap: 32})}>
        <Heading level={1}>Access Management</Heading>

        {/* ── Scope selector + actions ── */}
        <div className={style({padding: 20})}>
          <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap'})}>
            <div className={style({display: 'flex', alignItems: 'end', gap: 8})}>
              <ComboBox
                label={`Select Scope (${scopes.length} scope${scopes.length === 1 ? '' : 's'} available)`}
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
                <div className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
                  <Badge variant={SCOPE_TYPE_VARIANTS[selectedScope.type] || 'neutral'}>
                    {selectedScope.type}
                  </Badge>
                  {canWriteScope && (
                    <Button size="S" variant="secondary" onPress={openScopeEdit}>
                      <EditIcon />
                      <Text>Edit Scope</Text>
                    </Button>
                  )}
                  <Button
                    size="S"
                    variant="secondary"
                    onPress={() => {
                      setSelectedScopeId(null)
                      setScopeFilterText('')
                    }}
                  >
                    <DeleteIcon />
                    <Text>Clear</Text>
                  </Button>
                  {canDeleteScope && selectedScope.type === 'team' && (
                    <Button size="S" variant="negative" fillStyle="outline" onPress={() => setScopeToDelete(selectedScope)}>
                      <DeleteIcon />
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

        {/* ── Groups table ── */}
        {selectedScopeId ? (
          <ResourceDashboardLayout
            title="Groups"
            totalCount={groups.length}
            error={groupError}
            data={groups}
            columns={groupColumns}
            getItemKey={(item) => item.groupId}
            createButton={canWriteGroup ? (
              <Button variant="accent" onPress={openGroupCreate}>
                <UserGroupIcon />
                <Text>Create Group</Text>
              </Button>
            ) : undefined}
            onRefresh={loadGroups}
            emptyStateTitle="No Groups"
            emptyStateDescription="Create a group in this scope to manage user access"
            searchPlaceholder="Search groups..."
            searchKeys={GROUP_SEARCH_KEYS}
            renderExpandedContent={renderGroupExpandedContent}
            expandedKeys={expandedGroupIds}
            onToggleExpand={handleToggleGroupExpand}
          />
        ) : (
          <View
            padding="size-600"
            borderWidth="thin"
            borderColor="gray-200"
            borderRadius="medium"
            backgroundColor="gray-50"
          >
            <Text UNSAFE_style={{ textAlign: 'center', color: 'var(--spectrum-global-color-gray-600)' }}>
              Select a scope above to manage its groups and users.
            </Text>
          </View>
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
      <V3DialogTrigger
        isOpen={!!scopeToDelete}
        onOpenChange={(open) => !open && setScopeToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Delete Scope"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (scopeToDelete) handleDeleteScope(scopeToDelete)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={isSaving}
          >
            Delete scope <strong>{scopeToDelete?.name}</strong>? This action cannot be undone.
          </AlertDialog>
        )}
      </V3DialogTrigger>

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
      <V3DialogTrigger
        isOpen={!!groupToDelete}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Delete Group"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (groupToDelete) handleDeleteGroup(groupToDelete)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={isSaving}
          >
            Delete group <strong>{groupToDelete?.name}</strong>? All users in this group will lose access.
          </AlertDialog>
        )}
      </V3DialogTrigger>

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
      <V3DialogTrigger
        isOpen={!!userToRemove}
        onOpenChange={(open) => !open && setUserToRemove(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Remove User"
            variant="destructive"
            primaryActionLabel="Remove"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (userToRemove) handleRemoveUser(userToRemove)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={isSaving}
          >
            Remove <strong>{userToRemove?.email}</strong> from this group?
          </AlertDialog>
        )}
      </V3DialogTrigger>

      <BlurredLoadingOverlay
        visible={isLoadingScopes || isLoadingGroups}
        message="Loading..."
        ariaLabel="Loading"
      />
      <BlurredLoadingOverlay
        visible={isSaving}
        message="Saving..."
        ariaLabel="Saving"
      />
    </View>
  )
}

export default ScopeGroupManagement
