/**
 * UserManagement — Admin-only page for managing EMC user access.
 *
 * Changes create a GitHub PR against users.json rather than modifying
 * the file directly. Requires a GitHub PAT stored in sessionStorage.
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
import { Button, Text as S2Text } from '@react-spectrum/s2'
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import Key from "@react-spectrum/s2/icons/Key"
import { useNavigate } from 'react-router-dom'
import { useRBAC } from '../../contexts/RBACContext'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useToast } from '../../contexts'
import { IMS } from '../../types'
import type { RBACUser, UserRole } from '../../types/rbac'
import { TableColumn } from '../../components/shared/DataTable'
import { ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import * as githubService from '../../services/githubService'

interface UserManagementProps {
  ims: IMS
}

const ROLE_OPTIONS: { key: UserRole; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'manager', label: 'Manager' },
  { key: 'creator', label: 'Creator' },
  { key: 'editor', label: 'Editor' },
]

const SEARCH_KEYS = ['email', 'role']

export const UserManagement: React.FC<UserManagementProps> = () => {
  const navigate = useNavigate()
  const { allUsers, refreshUsers } = useRBAC()
  const isAdmin = useHasPermission('user', 'write')
  const toast = useToast()

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) {
      navigate('/')
    }
  }, [isAdmin, navigate])

  // GitHub PAT state
  const [patInput, setPatInput] = useState('')
  const [isConnected, setIsConnected] = useState(() => githubService.isAuthenticated())

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<RBACUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<RBACUser | null>(null)

  // Form fields
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('editor')
  const [formBusinessUnits, setFormBusinessUnits] = useState('')
  const [formSeries, setFormSeries] = useState('')
  const [formEvents, setFormEvents] = useState('')

  // Action state
  const [isSaving, setIsSaving] = useState(false)

  const handleConnectGitHub = useCallback(() => {
    if (!patInput.trim()) return
    githubService.setToken(patInput.trim())
    setIsConnected(true)
    setPatInput('')
    toast.success('GitHub connected')
  }, [patInput, toast])

  const handleDisconnect = useCallback(() => {
    githubService.clearToken()
    setIsConnected(false)
    toast.success('GitHub disconnected')
  }, [toast])

  const openAddDialog = useCallback(() => {
    setEditingUser(null)
    setFormEmail('')
    setFormRole('editor')
    setFormBusinessUnits('')
    setFormSeries('')
    setFormEvents('')
    setIsFormOpen(true)
  }, [])

  const openEditDialog = useCallback((user: RBACUser) => {
    setEditingUser(user)
    setFormEmail(user.email)
    setFormRole(user.role)
    setFormBusinessUnits(user.businessUnits.join(', '))
    setFormSeries(user.series.join(', '))
    setFormEvents(user.events.join(', '))
    setIsFormOpen(true)
  }, [])

  const handleSaveUser = useCallback(async () => {
    if (!formEmail.trim()) {
      toast.error('Email is required')
      return
    }
    if (!isConnected) {
      toast.error('Connect GitHub PAT first')
      return
    }

    setIsSaving(true)

    try {
      // Fetch latest users.json from GitHub
      const { content, sha } = await githubService.fetchFileContent()
      const usersJson = JSON.parse(content)

      const userData = {
        email: formEmail.toLowerCase().trim(),
        role: formRole,
        'business-units': formBusinessUnits.trim(),
        series: formSeries.trim(),
        events: formEvents.trim(),
      }

      if (editingUser) {
        // Update existing user
        const idx = usersJson.data.findIndex(
          (u: Record<string, unknown>) =>
            String(u.email).toLowerCase() === editingUser.email
        )
        if (idx >= 0) {
          usersJson.data[idx] = userData
        }
      } else {
        // Add new user
        usersJson.data.push(userData)
        usersJson.total = usersJson.data.length
      }

      const branchName = `rbac-update-${Date.now()}`
      const commitMsg = editingUser
        ? `chore: update RBAC user ${formEmail}`
        : `chore: add RBAC user ${formEmail}`

      await githubService.createBranch(undefined, undefined, undefined, branchName)
      await githubService.updateFile(
        undefined,
        undefined,
        undefined,
        JSON.stringify(usersJson, null, 2) + '\n',
        sha,
        branchName,
        commitMsg
      )
      const pr = await githubService.createPullRequest(
        undefined,
        undefined,
        commitMsg,
        `Automated RBAC update via EMC User Management UI.\n\nUser: ${formEmail}\nAction: ${editingUser ? 'update' : 'add'}`,
        branchName
      )

      toast.success(`PR created: ${pr.html_url}`, { duration: 8000 })
      setIsFormOpen(false)
      await refreshUsers()
    } catch (err) {
      console.error('Error saving user:', err)
      toast.error(`Failed to create PR: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [formEmail, formRole, formBusinessUnits, formSeries, formEvents, editingUser, isConnected, toast, refreshUsers])

  const handleDeleteUser = useCallback(async (user: RBACUser) => {
    if (!isConnected) {
      toast.error('Connect GitHub PAT first')
      return
    }

    setIsSaving(true)

    try {
      const { content, sha } = await githubService.fetchFileContent()
      const usersJson = JSON.parse(content)

      usersJson.data = usersJson.data.filter(
        (u: Record<string, unknown>) =>
          String(u.email).toLowerCase() !== user.email
      )
      usersJson.total = usersJson.data.length

      const branchName = `rbac-update-${Date.now()}`
      const commitMsg = `chore: remove RBAC user ${user.email}`

      await githubService.createBranch(undefined, undefined, undefined, branchName)
      await githubService.updateFile(
        undefined,
        undefined,
        undefined,
        JSON.stringify(usersJson, null, 2) + '\n',
        sha,
        branchName,
        commitMsg
      )
      const pr = await githubService.createPullRequest(
        undefined,
        undefined,
        commitMsg,
        `Automated RBAC update via EMC User Management UI.\n\nUser: ${user.email}\nAction: remove`,
        branchName
      )

      toast.success(`PR created: ${pr.html_url}`, { duration: 8000 })
      setUserToDelete(null)
      await refreshUsers()
    } catch (err) {
      console.error('Error removing user:', err)
      toast.error(`Failed to create PR: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [isConnected, toast, refreshUsers])

  const columns = useMemo<TableColumn<RBACUser>[]>(() => [
    {
      key: 'email',
      name: 'EMAIL',
      width: 250,
      sortable: true,
      render: (item) => <Text>{item.email}</Text>,
    },
    {
      key: 'role',
      name: 'ROLE',
      width: 120,
      sortable: true,
      render: (item) => (
        <Badge variant={item.role === 'admin' ? 'positive' : 'neutral'}>
          {item.role}
        </Badge>
      ),
    },
    {
      key: 'businessUnits',
      name: 'BUSINESS UNITS',
      width: 200,
      sortable: false,
      render: (item) => <Text>{item.businessUnits.join(', ') || '-'}</Text>,
    },
    {
      key: 'series',
      name: 'SERIES',
      width: 200,
      sortable: false,
      render: (item) => <Text>{item.series.join(', ') || '-'}</Text>,
    },
    {
      key: 'events',
      name: 'EVENTS',
      width: 200,
      sortable: false,
      render: (item) => <Text>{item.events.join(', ') || '-'}</Text>,
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 120,
      sortable: false,
      render: (item) => (
        <Flex gap="size-100">
          <ActionButton isQuiet aria-label="Edit user" onPress={() => openEditDialog(item)}>
            <Edit size="S" />
          </ActionButton>
          <ActionButton isQuiet aria-label="Delete user" onPress={() => setUserToDelete(item)}>
            <Delete size="S" />
          </ActionButton>
        </Flex>
      ),
    },
  ], [openEditDialog])

  if (!isAdmin) return null

  return (
    <View padding="size-400" maxWidth="1400px" marginX="auto">
      <Flex direction="column" gap="size-400">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={1}>User Management</Heading>
          <Flex gap="size-200" alignItems="center">
            {isConnected ? (
              <>
                <Badge variant="positive">GitHub Connected</Badge>
                <ActionButton onPress={handleDisconnect} isQuiet>
                  Disconnect
                </ActionButton>
              </>
            ) : (
              <DialogTrigger>
                <Button variant="secondary">
                  <Key />
                  <S2Text>Connect GitHub</S2Text>
                </Button>
                {(close) => (
                  <Dialog>
                    <Heading>GitHub Personal Access Token</Heading>
                    <Divider />
                    <Content>
                      <Flex direction="column" gap="size-200">
                        <Text>
                          A GitHub Personal Access Token (classic) with <strong>repo</strong> scope
                          is required to create pull requests against adobecom/emc.
                        </Text>
                        <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          To create one:
                        </Text>
                        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          <li>Go to <strong>GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens &gt; Tokens (classic)</strong></li>
                          <li>Click <strong>Generate new token (classic)</strong></li>
                          <li>Give it a descriptive name (e.g. "EMC User Management")</li>
                          <li>Select the <strong>repo</strong> scope (full control of private repositories)</li>
                          <li>Click <strong>Generate token</strong> and copy it</li>
                        </ol>
                        <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                          The token is stored in sessionStorage only and is cleared when you close the tab.
                        </Text>
                        <TextField
                          label="Personal Access Token"
                          type="password"
                          value={patInput}
                          onChange={setPatInput}
                          width="100%"
                          autoFocus
                        />
                      </Flex>
                    </Content>
                    <ButtonGroup>
                      <Button variant="secondary" onPress={close}>Cancel</Button>
                      <Button
                        variant="accent"
                        onPress={() => { handleConnectGitHub(); close() }}
                        isDisabled={!patInput.trim()}
                      >
                        Connect
                      </Button>
                    </ButtonGroup>
                  </Dialog>
                )}
              </DialogTrigger>
            )}
          </Flex>
        </Flex>

        {!isConnected && (
          <Well>
            <Text>Connect a GitHub PAT to add, edit, or remove users. Changes create a pull request.</Text>
          </Well>
        )}

        {/* Users Table */}
        <ResourceDashboardLayout
          title="Users"
          totalCount={allUsers.length}
          error={null}
          data={allUsers}
          columns={columns}
          getItemKey={(item) => item.email}
          onCreate={openAddDialog}
          createLabel="Add User"
          onRefresh={refreshUsers}
          emptyStateTitle="No Users"
          emptyStateDescription="Add users to control access to EMC"
          searchPlaceholder="Search users..."
          searchKeys={SEARCH_KEYS}
        />
      </Flex>

      {/* Add/Edit User Dialog */}
      <DialogTrigger isOpen={isFormOpen} onOpenChange={setIsFormOpen}>
        <div style={{ display: 'none' }} />
        {(close) => (
          <Dialog>
            <Heading>{editingUser ? 'Edit User' : 'Add User'}</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-200">
                <TextField
                  label="Email"
                  value={formEmail}
                  onChange={setFormEmail}
                  isDisabled={!!editingUser}
                  width="100%"
                  isRequired
                />
                <Picker
                  label="Role"
                  selectedKey={formRole}
                  onSelectionChange={(key) => setFormRole(key as UserRole)}
                  width="100%"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <Item key={opt.key}>{opt.label}</Item>
                  ))}
                </Picker>
                <TextField
                  label="Business Units (comma-separated)"
                  value={formBusinessUnits}
                  onChange={setFormBusinessUnits}
                  width="100%"
                />
                <TextField
                  label="Series IDs (comma-separated)"
                  value={formSeries}
                  onChange={setFormSeries}
                  width="100%"
                />
                <TextField
                  label="Event IDs (comma-separated)"
                  value={formEvents}
                  onChange={setFormEvents}
                  width="100%"
                />
              </Flex>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>Cancel</Button>
              <Button
                variant="accent"
                onPress={() => { handleSaveUser(); close() }}
                isDisabled={!formEmail.trim() || !isConnected || isSaving}
              >
                {editingUser ? 'Update' : 'Add'}
              </Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogTrigger>

      {/* Delete Confirmation */}
      <DialogTrigger
        isOpen={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Remove User"
            variant="destructive"
            primaryActionLabel="Remove"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (userToDelete) handleDeleteUser(userToDelete)
              close()
            }}
            onSecondaryAction={close}
            isPrimaryActionDisabled={isSaving || !isConnected}
          >
            Remove <strong>{userToDelete?.email}</strong> from the users list?
            This will create a pull request.
          </AlertDialog>
        )}
      </DialogTrigger>

      <BlurredLoadingOverlay
        visible={isSaving}
        message="Creating pull request..."
        ariaLabel="Creating pull request"
      />
    </View>
  )
}

export default UserManagement
