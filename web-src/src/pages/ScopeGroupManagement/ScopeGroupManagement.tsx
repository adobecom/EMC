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
  Heading,
  Text,
  Flex,
  TextField,
  Picker,
  Item,
  DialogTrigger,
  Dialog,
  Content,
  ButtonGroup,
  Divider,
  AlertDialog,
  ActionButton,
  Badge,
  Well,
} from '@adobe/react-spectrum'
import { Button } from '@react-spectrum/s2'
import { ComboBox, ComboBoxItem, Text as S2Text } from "@react-spectrum/s2"
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import Add from "@react-spectrum/s2/icons/Add"
import UserAdd from "@react-spectrum/s2/icons/UserAdd"
import UserGroup from '@spectrum-icons/workflow/UserGroup'
import UserGroupS2 from "@react-spectrum/s2/icons/UserGroup"
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

const SCOPE_TYPE_VARIANTS: Record<ScopeType, 'positive' | 'info' | 'neutral'> = {
  platform: 'positive',
  org: 'info',
  team: 'neutral',
}

const GROUP_SEARCH_KEYS = ['name', 'description']
const USER_SEARCH_KEYS = ['email', 'firstName', 'lastName']

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
  const [groupUsers, setGroupUsers] = useState<ScopeUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserFirstName, setNewUserFirstName] = useState('')
  const [newUserLastName, setNewUserLastName] = useState('')
  const [newUserGuid, setNewUserGuid] = useState('')
  const [userToRemove, setUserToRemove] = useState<ScopeUser | null>(null)

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
      const [scopesResult, rolesResult] = await Promise.all([
        apiService.getScopes(),
        apiService.getRoles(),
      ])
      if (!('error' in scopesResult)) setScopes(scopesResult)
      if (!('error' in rolesResult)) setRoles(rolesResult)
    } catch {
      // Individual errors handled by consumers
    } finally {
      setIsLoadingScopes(false)
    }
  }, [apiService])

  const loadGroups = useCallback(async () => {
    if (!selectedScopeId) {
      setGroups([])
      return
    }
    setIsLoadingGroups(true)
    setGroupError(null)
    try {
      const result = await apiService.getGroupsForScope(selectedScopeId)
      if ('error' in result) {
        setGroupError('Failed to load groups')
        return
      }
      setGroups(result)
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setIsLoadingGroups(false)
    }
  }, [apiService, selectedScopeId])

  const loadGroupUsers = useCallback(async (group: RBACApiGroup) => {
    if (!selectedScopeId) return
    setIsLoadingUsers(true)
    try {
      const result = await apiService.getGroupUsers(selectedScopeId, group.groupId)
      if (!('error' in result)) {
        setGroupUsers(result)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingUsers(false)
    }
  }, [apiService, selectedScopeId])

  useEffect(() => { loadScopes() }, [loadScopes])
  useEffect(() => { loadGroups() }, [loadGroups])

  // When scope changes, clear group/user selection
  useEffect(() => {
    setSelectedGroup(null)
    setGroupUsers([])
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
        setGroupUsers([])
      }
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

  const handleViewUsers = useCallback((group: RBACApiGroup) => {
    setSelectedGroup(group)
    loadGroupUsers(group)
  }, [loadGroupUsers])

  const handleAddUser = useCallback(async () => {
    if (!newUserEmail.trim() || !selectedGroup || !selectedScopeId) return
    setIsSaving(true)
    try {
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
      setIsAddUserOpen(false)
      setNewUserEmail('')
      setNewUserFirstName('')
      setNewUserLastName('')
      setNewUserGuid('')
      await loadGroupUsers(selectedGroup)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setIsSaving(false)
    }
  }, [newUserEmail, newUserFirstName, newUserLastName, newUserGuid, selectedGroup, selectedScopeId, apiService, toast, loadGroupUsers])

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
      await loadGroupUsers(selectedGroup)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user')
    } finally {
      setIsSaving(false)
    }
  }, [selectedGroup, selectedScopeId, apiService, toast, loadGroupUsers])

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
      render: (item) => <Badge variant="neutral">{getRoleName(item.roleId)}</Badge>,
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 160,
      sortable: false,
      render: (item) => (
        <Flex gap="size-100" justifyContent="end">
          <ActionButton
            isQuiet
            aria-label="View users"
            onPress={() => handleViewUsers(item)}
          >
            <UserGroup size="S" />
          </ActionButton>
          {canWriteGroup && (
            <ActionButton isQuiet aria-label="Edit group" onPress={() => openGroupEdit(item)}>
              <Edit size="S" />
            </ActionButton>
          )}
          {canDeleteGroup && (
            <ActionButton isQuiet aria-label="Delete group" onPress={() => setGroupToDelete(item)}>
              <Delete size="S" />
            </ActionButton>
          )}
        </Flex>
      ),
    },
  ], [canWriteGroup, canDeleteGroup, getRoleName, openGroupEdit, handleViewUsers])

  const userColumns = useMemo<TableColumn<ScopeUser>[]>(() => [
    {
      key: 'email',
      name: 'EMAIL',
      width: 300,
      sortable: true,
      render: (item) => <Text>{item.email}</Text>,
    },
    {
      key: 'firstName',
      name: 'FIRST NAME',
      width: 150,
      sortable: true,
      render: (item) => <Text>{item.firstName || '-'}</Text>,
    },
    {
      key: 'lastName',
      name: 'LAST NAME',
      width: 150,
      sortable: true,
      render: (item) => <Text>{item.lastName || '-'}</Text>,
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 80,
      sortable: false,
      render: (item) => canDeleteUser ? (
        <ActionButton isQuiet aria-label="Remove user" onPress={() => setUserToRemove(item)}>
          <Delete size="S" />
        </ActionButton>
      ) : null,
    },
  ], [canDeleteUser])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View padding="size-400" maxWidth="1400px" marginX="auto">
      <Flex direction="column" gap="size-400">
        <Heading level={1}>Access Management</Heading>

        {/* ── Scope selector + actions ── */}
        <Well UNSAFE_style={{ padding: '20px' }}>
          <Flex justifyContent="space-between" alignItems="end" gap="size-200" wrap>
            <Flex alignItems="end" gap="size-100">
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
                    <S2Text slot="label">{item.name}</S2Text>
                    <S2Text slot="description">{item.type}</S2Text>
                  </ComboBoxItem>
                )}
              </ComboBox>

              {selectedScope && (
                <Flex gap="size-50" alignItems="center">
                  <Badge variant={SCOPE_TYPE_VARIANTS[selectedScope.type] || 'neutral'}>
                    {selectedScope.type}
                  </Badge>
                  {canWriteScope && (
                    <ActionButton isQuiet aria-label="Edit scope" onPress={openScopeEdit}>
                      <Edit size="S" />
                    </ActionButton>
                  )}
                  <ActionButton
                    isQuiet
                    aria-label="Clear scope selection"
                    onPress={() => {
                      setSelectedScopeId(null)
                      setScopeFilterText('')
                    }}
                  >
                    <Delete size="S" />
                  </ActionButton>
                  {canDeleteScope && selectedScope.type === 'team' && (
                    <ActionButton isQuiet aria-label="Delete scope" onPress={() => setScopeToDelete(selectedScope)}>
                      <Delete size="S" />
                    </ActionButton>
                  )}
                </Flex>
              )}
            </Flex>

            {canWriteScope && (
              <Button variant="secondary" onPress={openScopeCreate}>
                <Add />
                <S2Text>New Scope</S2Text>
              </Button>
            )}
          </Flex>
        </Well>

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
                <UserGroupS2 />
                <S2Text>Create Group</S2Text>
              </Button>
            ) : undefined}
            onRefresh={loadGroups}
            emptyStateTitle="No Groups"
            emptyStateDescription="Create a group in this scope to manage user access"
            searchPlaceholder="Search groups..."
            searchKeys={GROUP_SEARCH_KEYS}
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

        {/* Users are managed in a full-screen dialog — see DialogTrigger below */}
      </Flex>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Users Management Dialog (full-screen takeover) */}
      <DialogTrigger
        type="fullscreenTakeover"
        isOpen={!!selectedGroup}
        onOpenChange={(open) => { if (!open) { setSelectedGroup(null); setGroupUsers([]) } }}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <Dialog>
            <Heading>Users in {selectedGroup?.name}</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-300" height="100%">
                {canWriteUser && (
                  <Flex justifyContent="end">
                    <Button variant="accent" onPress={() => { setNewUserEmail(''); setNewUserFirstName(''); setNewUserLastName(''); setNewUserGuid(''); setIsAddUserOpen(true) }}>
                      <UserAdd />
                      <S2Text>Add User</S2Text>
                    </Button>
                  </Flex>
                )}

                {isLoadingUsers ? (
                  <View padding="size-600">
                    <Text>Loading users...</Text>
                  </View>
                ) : (
                  <ResourceDashboardLayout
                    title=""
                    totalCount={groupUsers.length}
                    error={null}
                    data={groupUsers}
                    columns={userColumns}
                    getItemKey={(item) => item.email}
                    onRefresh={() => selectedGroup && loadGroupUsers(selectedGroup)}
                    emptyStateTitle="No Users"
                    emptyStateDescription="Add users to this group to grant them access"
                    searchPlaceholder="Search users..."
                    searchKeys={USER_SEARCH_KEYS}
                  />
                )}
              </Flex>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>Close</Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogTrigger>

      {/* Scope Create/Edit Dialog */}
      <DialogTrigger isOpen={isScopeFormOpen} onOpenChange={setIsScopeFormOpen}>
        <div style={{ display: 'none' }} />
        {(close) => (
          <Dialog>
            <Heading>{editingScope ? 'Edit Scope' : 'Create Scope'}</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-200">
                <TextField
                  label="Name"
                  value={scopeFormName}
                  onChange={setScopeFormName}
                  width="100%"
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
                    width="100%"
                  >
                    {SCOPE_TYPES.map(opt => (
                      <Item key={opt.key}>{opt.label}</Item>
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
                        <S2Text slot="label">{item.name}</S2Text>
                        <S2Text slot="description">{item.type}</S2Text>
                      </ComboBoxItem>
                    )}
                  </ComboBox>
                )}
              </Flex>
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
          </Dialog>
        )}
      </DialogTrigger>

      {/* Scope Delete Confirmation */}
      <DialogTrigger
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
      </DialogTrigger>

      {/* Group Create/Edit Dialog */}
      <DialogTrigger isOpen={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
        <div style={{ display: 'none' }} />
        {(close) => (
          <Dialog>
            <Heading>{editingGroup ? 'Edit Group' : 'Create Group'}</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-200">
                <TextField
                  label="Name"
                  value={groupFormName}
                  onChange={setGroupFormName}
                  width="100%"
                  isRequired
                  autoFocus
                />
                <TextField
                  label="Description"
                  value={groupFormDescription}
                  onChange={setGroupFormDescription}
                  width="100%"
                />
                <Picker
                  label="Role"
                  selectedKey={groupFormRoleId}
                  onSelectionChange={(key) => setGroupFormRoleId(key as string)}
                  width="100%"
                  isRequired
                >
                  {roles.map(role => (
                    <Item key={role.roleId}>{role.name}</Item>
                  ))}
                </Picker>
              </Flex>
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
          </Dialog>
        )}
      </DialogTrigger>

      {/* Group Delete Confirmation */}
      <DialogTrigger
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
      </DialogTrigger>

      {/* Add User Dialog */}
      <DialogTrigger isOpen={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <div style={{ display: 'none' }} />
        {(close) => (
          <Dialog>
            <Heading>Add User to {selectedGroup?.name}</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-200">
                <TextField
                  label="Email"
                  value={newUserEmail}
                  onChange={setNewUserEmail}
                  width="100%"
                  isRequired
                  autoFocus
                  type="email"
                />
                <Flex gap="size-200">
                  <TextField
                    label="First Name"
                    value={newUserFirstName}
                    onChange={setNewUserFirstName}
                    flex
                  />
                  <TextField
                    label="Last Name"
                    value={newUserLastName}
                    onChange={setNewUserLastName}
                    flex
                  />
                </Flex>
                <TextField
                  label="User GUID"
                  value={newUserGuid}
                  onChange={setNewUserGuid}
                  width="100%"
                  description="Optional Adobe user identifier"
                />
              </Flex>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>Cancel</Button>
              <Button
                variant="accent"
                onPress={handleAddUser}
                isDisabled={!newUserEmail.trim() || isSaving}
              >
                Add
              </Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogTrigger>

      {/* Remove User Confirmation */}
      <DialogTrigger
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
      </DialogTrigger>

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
