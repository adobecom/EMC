/**
 * RoleManagement — Admin page for managing RBAC roles and their permissions.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Badge, Button, ButtonGroup, Text, TextField, DialogTrigger, Dialog, Content, Heading, Checkbox, AlertDialog } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import EditS2 from "@react-spectrum/s2/icons/Edit"
import DeleteS2 from "@react-spectrum/s2/icons/Delete"
import { useApi } from '../../contexts/ApiContext'
import { useToast } from '../../contexts'
import { IMS } from '../../types'
import type { RBACApiRole, RBACPermission } from '../../types/rbacApi'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import BriefcaseIllustration from '@react-spectrum/s2/illustrations/linear/Briefcase'
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
        <div className={style({display: 'flex', gap: 4, flexWrap: 'wrap'})}>
          {item.permissions.slice(0, 5).map(p => (
            <Badge key={p} variant="neutral" UNSAFE_style={{ fontSize: 11 }}>
              {p}
            </Badge>
          ))}
          {item.permissions.length > 5 && (
            <Badge variant="informative">+{item.permissions.length - 5} more</Badge>
          )}
        </div>
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
    ...((canWrite || canDelete) ? [{
      key: 'actions' as const,
      name: 'ACTIONS',
      width: 120,
      sortable: false as const,
      render: (item: RBACApiRole) => (
        <div className={style({display: 'flex', gap: 8, justifyContent: 'end'})}>
          {canWrite && (
            <Button size="S" variant="secondary" fillStyle="outline" onPress={() => openEditDialog(item)}>
              <EditS2 />
              <Text>Edit</Text>
            </Button>
          )}
          {canDelete && (
            <Button size="S" variant="negative" fillStyle="outline" onPress={() => setRoleToDelete(item)}>
              <DeleteS2 />
              <Text>Delete</Text>
            </Button>
          )}
        </div>
      ),
    }] : []),
  ], [canWrite, canDelete, openEditDialog])

  return (
    <div style={{ padding: 32, maxWidth: 1400, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className={style({display: 'flex', flexDirection: 'column', gap: 32})}>
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
          emptyStateIllustration={<BriefcaseIllustration aria-hidden />}
          emptyStateTitle="No Roles"
          emptyStateDescription="Create roles to define permission sets for groups"
          searchPlaceholder="Search roles..."
          searchKeys={SEARCH_KEYS}
        />
      </div>

      {/* Add/Edit Role Dialog */}
      <DialogTrigger isOpen={isFormOpen} onOpenChange={setIsFormOpen}>
        <div style={{ display: 'none' }} />
        <Dialog size="XL">
          {({close}) => (
            <>
              <Heading slot="title">{editingRole ? 'Edit Role' : 'Create Role'}</Heading>
              <Content>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
                  <TextField
                    label="Name"
                    value={formName}
                    onChange={setFormName}
                    styles={style({ width: '[100%]' })}
                    isRequired
                    autoFocus
                  />
                  <Heading level={4}>Permissions ({formPermissions.size} selected)</Heading>
                  <div className={style({ maxHeight: 480, overflow: 'auto' })}>
                    <div className={style({display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16})}>
                      {Array.from(groupedPermissions.entries()).map(([resource, perms]) => (
                        <div key={resource} className={style({
                          padding: 16,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: 'gray-300',
                          borderRadius: 'sm',
                        })}>
                          <Text UNSAFE_style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>
                            {resource}
                          </Text>
                          <div className={style({display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8})}>
                            {perms.map(perm => (
                              <Checkbox
                                key={perm}
                                isSelected={formPermissions.has(perm)}
                                onChange={() => togglePermission(perm)}
                              >
                                {perm}
                              </Checkbox>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
      <DialogTrigger
        isOpen={!!roleToDelete}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Role"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (roleToDelete) handleDeleteRole(roleToDelete)
          }}
          onCancel={() => setRoleToDelete(null)}
          isPrimaryActionDisabled={isSaving}
        >
          Delete role <strong>{roleToDelete?.name}</strong>?
          This will fail if any groups are using this role.
        </AlertDialog>
      </DialogTrigger>

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
    </div>
  )
}

export default RoleManagement
