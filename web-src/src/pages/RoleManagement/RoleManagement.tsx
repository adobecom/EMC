/**
 * RoleManagement — Admin page for managing RBAC roles and their permissions.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  Flex,
  DialogTrigger as V3DialogTrigger,
  AlertDialog,
  ActionButton,
  Badge,
  Checkbox,
  Well,
} from '@adobe/react-spectrum'
import { Button, ButtonGroup, TextField, DialogTrigger, Dialog, Content, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import { useApi } from '../../contexts/ApiContext'
import { useToast } from '../../contexts'
import { IMS } from '../../types'
import type { RBACApiRole, RBACPermission } from '../../types/rbacApi'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import { useHasPermission } from '../../hooks/useHasPermission'

interface RoleManagementProps {
  ims: IMS
}

const SEARCH_KEYS = ['name']

// Group permissions by resource for the picker UI
function groupPermissionsByResource(permissions: RBACPermission[]): Map<string, RBACPermission[]> {
  const map = new Map<string, RBACPermission[]>()
  for (const perm of permissions) {
    const [resource] = perm.split(':')
    if (!map.has(resource)) map.set(resource, [])
    map.get(resource)!.push(perm)
  }
  return map
}

export const RoleManagement: React.FC<RoleManagementProps> = () => {
  const apiService = useApi()
  const toast = useToast()
  const canWrite = useHasPermission('role', 'write')
  const canDelete = useHasPermission('role', 'delete')

  // Data
  const [rolesData, setRolesData] = useState<RBACApiRole[]>([])
  const [availablePermissions, setAvailablePermissions] = useState<RBACPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RBACApiRole | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<RBACApiRole | null>(null)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formPermissions, setFormPermissions] = useState<Set<RBACPermission>>(new Set())

  // Action state
  const [isSaving, setIsSaving] = useState(false)

  // Grouped permissions for the form
  const groupedPermissions = useMemo(
    () => groupPermissionsByResource(availablePermissions),
    [availablePermissions]
  )

  // Load roles and permissions
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rolesResult, permsResult] = await Promise.all([
        apiService.getRoles(),
        apiService.getPermissionsList(),
      ])
      if ('error' in rolesResult) {
        setError('Failed to load roles')
        return
      }
      setRolesData(rolesResult)
      if (!('error' in permsResult)) {
        setAvailablePermissions(permsResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setIsLoading(false)
    }
  }, [apiService])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openAddDialog = useCallback(() => {
    setEditingRole(null)
    setFormName('')
    setFormPermissions(new Set())
    setIsFormOpen(true)
  }, [])

  const openEditDialog = useCallback((role: RBACApiRole) => {
    setEditingRole(role)
    setFormName(role.name)
    setFormPermissions(new Set(role.permissions))
    setIsFormOpen(true)
  }, [])

  const togglePermission = useCallback((perm: RBACPermission) => {
    setFormPermissions(prev => {
      const next = new Set(prev)
      if (next.has(perm)) {
        next.delete(perm)
      } else {
        next.add(perm)
      }
      return next
    })
  }, [])

  const handleSaveRole = useCallback(async () => {
    if (!formName.trim()) {
      toast.error('Name is required')
      return
    }
    if (formPermissions.size === 0) {
      toast.error('At least one permission is required')
      return
    }

    setIsSaving(true)
    try {
      const permArray = Array.from(formPermissions)
      if (editingRole) {
        const result = await apiService.updateRole(editingRole.roleId, {
          ...editingRole,
          name: formName.trim(),
          permissions: permArray,
        })
        if ('error' in result) {
          const status = (result as { status: number }).status
          toast.error(status === 409
            ? 'This role was modified by someone else. Refresh and try again.'
            : 'Failed to update role')
          return
        }
        toast.success('Role updated')
      } else {
        const result = await apiService.createRole({
          name: formName.trim(),
          permissions: permArray,
        })
        if ('error' in result) {
          toast.error('Failed to create role')
          return
        }
        toast.success('Role created')
      }
      setIsFormOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save role')
    } finally {
      setIsSaving(false)
    }
  }, [formName, formPermissions, editingRole, apiService, toast, loadData])

  const handleDeleteRole = useCallback(async (role: RBACApiRole) => {
    setIsSaving(true)
    try {
      const result = await apiService.deleteRole(role.roleId)
      if ('error' in result) {
        const errorMsg = (result as { error: { message?: string } }).error?.message || 'Failed to delete role'
        toast.error(errorMsg.includes('409') || errorMsg.includes('conflict')
          ? 'Cannot delete role — it is assigned to one or more groups'
          : 'Failed to delete role')
        return
      }
      toast.success('Role deleted')
      setRoleToDelete(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role')
    } finally {
      setIsSaving(false)
    }
  }, [apiService, toast, loadData])

  const columns = useMemo<TableColumn<RBACApiRole>[]>(() => [
    {
      key: 'name',
      name: 'NAME',
      width: 200,
      sortable: true,
      render: (item) => <Text UNSAFE_style={{ fontWeight: 500 }}>{item.name}</Text>,
    },
    {
      key: 'permissions',
      name: 'PERMISSIONS',
      width: 400,
      sortable: false,
      render: (item) => (
        <Flex gap="size-50" wrap>
          {item.permissions.slice(0, 5).map(p => (
            <Badge key={p} variant="neutral" UNSAFE_style={{ fontSize: 11 }}>
              {p}
            </Badge>
          ))}
          {item.permissions.length > 5 && (
            <Badge variant="info">+{item.permissions.length - 5} more</Badge>
          )}
        </Flex>
      ),
    },
    {
      key: 'creationTime',
      name: 'CREATED',
      width: 160,
      sortable: true,
      render: (item) => (
        <Text>{new Date(item.creationTime).toLocaleDateString()}</Text>
      ),
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 120,
      sortable: false,
      render: (item) => (
        <Flex gap="size-100" justifyContent="end">
          {canWrite && (
            <ActionButton isQuiet aria-label="Edit role" onPress={() => openEditDialog(item)}>
              <Edit size="S" />
            </ActionButton>
          )}
          {canDelete && (
            <ActionButton isQuiet aria-label="Delete role" onPress={() => setRoleToDelete(item)}>
              <Delete size="S" />
            </ActionButton>
          )}
        </Flex>
      ),
    },
  ], [canWrite, canDelete, openEditDialog])

  return (
    <View padding="size-400" maxWidth="1400px" marginX="auto">
      <Flex direction="column" gap="size-400">
        <ResourceDashboardLayout
          title="Roles"
          totalCount={rolesData.length}
          error={error}
          data={rolesData}
          columns={columns}
          getItemKey={(item) => item.roleId}
          onCreate={canWrite ? openAddDialog : undefined}
          createLabel="Create Role"
          onRefresh={loadData}
          emptyStateTitle="No Roles"
          emptyStateDescription="Create roles to define permission sets for groups"
          searchPlaceholder="Search roles..."
          searchKeys={SEARCH_KEYS}
        />
      </Flex>

      {/* Add/Edit Role Dialog */}
      <DialogTrigger isOpen={isFormOpen} onOpenChange={setIsFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog size="L">
          {({close}) => (
            <>
              <Heading slot="title">{editingRole ? 'Edit Role' : 'Create Role'}</Heading>
              <Content>
                <Flex direction="column" gap="size-300">
                  <TextField
                    label="Name"
                    value={formName}
                    onChange={setFormName}
                    styles={style({ width: '[100%]' })}
                    isRequired
                    autoFocus
                  />
                  <Heading level={4}>Permissions ({formPermissions.size} selected)</Heading>
                  <View maxHeight="size-6000" overflow="auto">
                    <Flex direction="column" gap="size-200">
                      {Array.from(groupedPermissions.entries()).map(([resource, perms]) => (
                        <Well key={resource}>
                          <Text UNSAFE_style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                            {resource}
                          </Text>
                          <Flex direction="column" gap="size-50" marginTop="size-100">
                            {perms.map(perm => (
                              <Checkbox
                                key={perm}
                                isSelected={formPermissions.has(perm)}
                                onChange={() => togglePermission(perm)}
                              >
                                {perm}
                              </Checkbox>
                            ))}
                          </Flex>
                        </Well>
                      ))}
                    </Flex>
                  </View>
                </Flex>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  onPress={handleSaveRole}
                  isDisabled={!formName.trim() || formPermissions.size === 0 || isSaving}
                >
                  {editingRole ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Delete Confirmation */}
      <V3DialogTrigger
        isOpen={!!roleToDelete}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Delete Role"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (roleToDelete) handleDeleteRole(roleToDelete)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={isSaving}
          >
            Delete role <strong>{roleToDelete?.name}</strong>?
            This will fail if any groups are using this role.
          </AlertDialog>
        )}
      </V3DialogTrigger>

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading roles..."
        ariaLabel="Loading roles"
      />
      <BlurredLoadingOverlay
        visible={isSaving}
        message="Saving..."
        ariaLabel="Saving role"
      />
    </View>
  )
}

export default RoleManagement
