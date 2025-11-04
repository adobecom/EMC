/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Heading,
  Flex,
  Button,
  TabList,
  TabPanels,
  Item,
  Tabs,
  Form,
  TextField,
  TextArea,
  ButtonGroup,
  Dialog,
  DialogTrigger,
  Content,
  Divider,
  AlertDialog
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import { Organization, Team } from '../types/domain'
import { DataTable, TableColumn, TableAction, LoadingSpinner } from './shared'
import { apiService } from '../services/api'
import { IMS } from '../types'

interface OrgTeamManagementProps {
  ims: IMS
}

export const OrgTeamManagement: React.FC<OrgTeamManagementProps> = ({ ims }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<React.Key>('organizations')

  // Organization form state
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    description: ''
  })
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  // Team form state
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
    organizationId: ''
  })
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<{ type: 'org' | 'team'; id: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Check if IMS data is available
      if (!ims.token || !ims.org) {
        console.warn('IMS authentication not available yet')
        setIsLoading(false)
        return
      }

      apiService.setAuthHeaders(ims.token, ims.org)
      const [orgsResponse, teamsResponse] = await Promise.all([
        apiService.getOrganizations(),
        apiService.getTeams()
      ])
      
      if (orgsResponse.success && orgsResponse.data) {
        setOrganizations(orgsResponse.data)
      }
      if (teamsResponse.success && teamsResponse.data) {
        setTeams(teamsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      // Set loading to false even on error
    } finally {
      setIsLoading(false)
    }
  }

  // Organization handlers
  const handleCreateOrg = () => {
    setEditingOrg(null)
    setOrgFormData({ name: '', description: '' })
    setIsOrgDialogOpen(true)
  }

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org)
    setOrgFormData({ name: org.name, description: org.description || '' })
    setIsOrgDialogOpen(true)
  }

  const handleSaveOrg = async () => {
    try {
      if (editingOrg) {
        await apiService.updateOrganization(editingOrg.id, orgFormData)
      } else {
        await apiService.createOrganization({
          ...orgFormData,
          imsOrgId: ims.org
        })
      }
      setIsOrgDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Failed to save organization:', error)
    }
  }

  const handleDeleteOrg = async (id: string) => {
    try {
      await apiService.deleteOrganization(id)
      setItemToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete organization:', error)
    }
  }

  // Team handlers
  const handleCreateTeam = () => {
    setEditingTeam(null)
    setTeamFormData({ name: '', description: '', organizationId: organizations[0]?.id || '' })
    setIsTeamDialogOpen(true)
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setTeamFormData({
      name: team.name,
      description: team.description || '',
      organizationId: team.organizationId
    })
    setIsTeamDialogOpen(true)
  }

  const handleSaveTeam = async () => {
    try {
      if (editingTeam) {
        await apiService.updateTeam(editingTeam.id, teamFormData)
      } else {
        await apiService.createTeam(teamFormData)
      }
      setIsTeamDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Failed to save team:', error)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    try {
      await apiService.deleteTeam(id)
      setItemToDelete(null)
      loadData()
    } catch (error) {
      console.error('Failed to delete team:', error)
    }
  }

  // Table columns
  const orgColumns: TableColumn<Organization>[] = [
    { key: 'name', name: 'Name', width: 200 },
    { key: 'description', name: 'Description', width: 300 },
    {
      key: 'createdAt',
      name: 'Created',
      width: 150,
      render: (org) => new Date(org.createdAt).toLocaleDateString()
    }
  ]

  const orgActions: TableAction<Organization>[] = [
    { icon: 'edit', label: 'Edit', onAction: handleEditOrg },
    { icon: 'delete', label: 'Delete', onAction: (org) => setItemToDelete({ type: 'org', id: org.id }) }
  ]

  const teamColumns: TableColumn<Team>[] = [
    { key: 'name', name: 'Name', width: 200 },
    { key: 'description', name: 'Description', width: 250 },
    {
      key: 'organizationId',
      name: 'Organization',
      width: 150,
      render: (team) => organizations.find((o) => o.id === team.organizationId)?.name || '-'
    },
    {
      key: 'createdAt',
      name: 'Created',
      width: 150,
      render: (team) => new Date(team.createdAt).toLocaleDateString()
    }
  ]

  const teamActions: TableAction<Team>[] = [
    { icon: 'edit', label: 'Edit', onAction: handleEditTeam },
    { icon: 'delete', label: 'Delete', onAction: (team) => setItemToDelete({ type: 'team', id: team.id }) }
  ]

  if (isLoading) {
    return <LoadingSpinner message="Loading organizations and teams..." />
  }

  return (
    <View width="100%">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-300">
        <Heading level={1}>Organizations & Teams</Heading>
      </Flex>

      <Divider size="M" marginBottom="size-400" />

      <Tabs selectedKey={selectedTab} onSelectionChange={setSelectedTab as any}>
        <TabList>
          <Item key="organizations">Organizations</Item>
          <Item key="teams">Teams</Item>
        </TabList>
        <TabPanels>
          <Item key="organizations">
            <Flex direction="column" gap="size-300">
              <Flex justifyContent="end">
                <DialogTrigger isOpen={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                  <Button variant="cta" onPress={handleCreateOrg}>
                    <Add />
                    Create Organization
                  </Button>
                  {(close) => (
                    <Dialog>
                      <Heading>{editingOrg ? 'Edit' : 'Create'} Organization</Heading>
                      <Divider />
                      <Content>
                        <Form>
                          <TextField
                            label="Name"
                            value={orgFormData.name}
                            onChange={(value) => setOrgFormData({ ...orgFormData, name: value })}
                            isRequired
                          />
                          <TextArea
                            label="Description"
                            value={orgFormData.description}
                            onChange={(value) => setOrgFormData({ ...orgFormData, description: value })}
                          />
                        </Form>
                      </Content>
                      <ButtonGroup>
                        <Button variant="secondary" onPress={close}>
                          Cancel
                        </Button>
                        <Button
                          variant="cta"
                          onPress={() => {
                            handleSaveOrg()
                            close()
                          }}
                          isDisabled={!orgFormData.name}
                        >
                          Save
                        </Button>
                      </ButtonGroup>
                    </Dialog>
                  )}
                </DialogTrigger>
              </Flex>

              <DataTable
                columns={orgColumns}
                data={organizations}
                actions={orgActions}
                getItemKey={(org) => org.id}
                emptyState={<Content>No organizations found. Create your first organization!</Content>}
              />
            </Flex>
          </Item>

          <Item key="teams">
            <Flex direction="column" gap="size-300">
              <Flex justifyContent="end">
                <DialogTrigger isOpen={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                  <Button variant="cta" onPress={handleCreateTeam} isDisabled={organizations.length === 0}>
                    <Add />
                    Create Team
                  </Button>
                  {(close) => (
                    <Dialog>
                      <Heading>{editingTeam ? 'Edit' : 'Create'} Team</Heading>
                      <Divider />
                      <Content>
                        <Form>
                          <TextField
                            label="Name"
                            value={teamFormData.name}
                            onChange={(value) => setTeamFormData({ ...teamFormData, name: value })}
                            isRequired
                          />
                          <TextArea
                            label="Description"
                            value={teamFormData.description}
                            onChange={(value) => setTeamFormData({ ...teamFormData, description: value })}
                          />
                          <TextField
                            label="Organization"
                            value={organizations.find((o) => o.id === teamFormData.organizationId)?.name || ''}
                            isReadOnly
                          />
                        </Form>
                      </Content>
                      <ButtonGroup>
                        <Button variant="secondary" onPress={close}>
                          Cancel
                        </Button>
                        <Button
                          variant="cta"
                          onPress={() => {
                            handleSaveTeam()
                            close()
                          }}
                          isDisabled={!teamFormData.name || !teamFormData.organizationId}
                        >
                          Save
                        </Button>
                      </ButtonGroup>
                    </Dialog>
                  )}
                </DialogTrigger>
              </Flex>

              <DataTable
                columns={teamColumns}
                data={teams}
                actions={teamActions}
                getItemKey={(team) => team.id}
                emptyState={<Content>No teams found. Create your first team!</Content>}
              />
            </Flex>
          </Item>
        </TabPanels>
      </Tabs>

      {/* Delete confirmation dialog */}
      <DialogTrigger isOpen={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <Button variant="primary" />
        {(close) => (
          <AlertDialog
            title="Confirm Delete"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (itemToDelete) {
                if (itemToDelete.type === 'org') {
                  handleDeleteOrg(itemToDelete.id)
                } else {
                  handleDeleteTeam(itemToDelete.id)
                }
              }
              close()
            }}
            onSecondaryAction={close}
          >
            Are you sure you want to delete this {itemToDelete?.type === 'org' ? 'organization' : 'team'}?
            This action cannot be undone.
          </AlertDialog>
        )}
      </DialogTrigger>
    </View>
  )
}

