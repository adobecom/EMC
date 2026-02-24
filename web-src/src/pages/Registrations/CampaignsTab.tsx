/* 
* <license header>
*/

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Flex,
  Text,
  Button,
  ActionButton,
  DialogTrigger,
  Dialog,
  Heading,
  Content,
  ButtonGroup,
  TextField,
  NumberField,
  AlertDialog,
  Divider,
  Picker,
  Item
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import Edit from '@spectrum-icons/workflow/Edit'
import Delete from '@spectrum-icons/workflow/Delete'
import Copy from '@spectrum-icons/workflow/Copy'
import type { EventApiResponse } from '../../types/domain'
import type { Campaign, CampaignFormData, CampaignStatus } from '../../types/campaign'
import { calculateCampaignStats, validateCampaignCapacity } from '../../types/campaign'
import { DataTable, TableColumn } from '../../components/shared'
import { COLORS, SPACING } from '../../styles/designSystem'

interface CampaignsTabProps {
  eventId: string
  event: EventApiResponse | null
  campaigns: Campaign[]
  isLoading: boolean
  onCreateCampaign: (data: CampaignFormData) => Promise<void>
  onUpdateCampaign: (campaignId: string, data: CampaignFormData, modificationTime: number) => Promise<void>
  onDeleteCampaign: (campaignId: string) => Promise<void>
}

export const CampaignsTab: React.FC<CampaignsTabProps> = ({
  eventId,
  event,
  campaigns,
  isLoading,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const stats = useMemo(() =>
    calculateCampaignStats(campaigns, event?.attendeeLimit),
    [campaigns, event?.attendeeLimit]
  )

  const getOtherCampaignsCapacity = useCallback((excludeCampaignId?: string) => {
    return campaigns
      .filter(c => c.campaignId !== excludeCampaignId)
      .reduce((sum, c) => sum + c.attendeeLimit, 0)
  }, [campaigns])

  const handleSaveCampaign = useCallback(async (formData: CampaignFormData) => {
    setIsSaving(true)
    try {
      if (editingCampaign) {
        await onUpdateCampaign(
          editingCampaign.campaignId,
          formData,
          editingCampaign.modificationTime
        )
      } else {
        await onCreateCampaign(formData)
      }
      setIsFormOpen(false)
      setEditingCampaign(null)
    } catch (err) {
      console.error('Failed to save campaign:', err)
    } finally {
      setIsSaving(false)
    }
  }, [editingCampaign, onCreateCampaign, onUpdateCampaign])

  const handleDeleteCampaign = useCallback(async () => {
    if (!campaignToDelete) return
    try {
      await onDeleteCampaign(campaignToDelete.campaignId)
      setCampaignToDelete(null)
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }, [campaignToDelete, onDeleteCampaign])

  const handleCopyUrl = useCallback(async (campaign: Campaign) => {
    try {
      await navigator.clipboard.writeText(campaign.url)
      setCopiedId(campaign.campaignId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }, [])

  const handleEditClick = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign)
    setIsFormOpen(true)
  }, [])

  const handleCreateClick = useCallback(() => {
    setEditingCampaign(null)
    setIsFormOpen(true)
  }, [])

  const columns: TableColumn<Campaign>[] = useMemo(() => [
    {
      key: 'name',
      name: 'CAMPAIGN NAME',
      width: 200,
      sortable: true,
      render: (campaign) => (
        <Text UNSAFE_style={{ fontWeight: 600 }}>{campaign.name}</Text>
      )
    },
    {
      key: 'url',
      name: 'URL',
      width: 200,
      render: (campaign) => (
        <Flex alignItems="center" gap="size-100">
          <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.url}
          </Text>
          <ActionButton
            isQuiet
            onPress={() => handleCopyUrl(campaign)}
            aria-label="Copy URL"
          >
            <Copy size="S" />
          </ActionButton>
          {copiedId === campaign.campaignId && (
            <Text UNSAFE_style={{ fontSize: '11px', color: COLORS.STATUS_DRAFT }}>
              Copied!
            </Text>
          )}
        </Flex>
      )
    },
    {
      key: 'attendeeCount',
      name: 'REGISTRATIONS',
      width: 130,
      sortable: true,
      render: (campaign) => (
        <Text>
          {campaign.attendeeCount}
          <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
            {' / '}{campaign.attendeeLimit}
          </Text>
        </Text>
      )
    },
    {
      key: 'waitlistAttendeeCount',
      name: 'WAITLISTED',
      width: 100,
      sortable: true,
      render: (campaign) => (
        <Text>{campaign.waitlistAttendeeCount}</Text>
      )
    },
    {
      key: 'status',
      name: 'STATUS',
      width: 100,
      sortable: true,
      render: (campaign) => (
        <View
          UNSAFE_style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: campaign.status === 'Active'
              ? 'rgba(45, 157, 146, 0.15)'
              : 'rgba(102, 102, 102, 0.15)',
            color: campaign.status === 'Active' ? COLORS.STATUS_DRAFT : COLORS.STATUS_ARCHIVED
          }}
        >
          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 600 }}>
            {campaign.status}
          </Text>
        </View>
      )
    },
    {
      key: 'actions',
      name: '',
      width: 100,
      isSticky: true,
      render: (campaign) => (
        <Flex gap="size-100" justifyContent="end">
          <ActionButton
            isQuiet
            onPress={() => handleEditClick(campaign)}
            aria-label="Edit campaign"
          >
            <Edit size="S" />
          </ActionButton>
          <ActionButton
            isQuiet
            isDisabled={campaign.attendeeCount > 0}
            onPress={() => setCampaignToDelete(campaign)}
            aria-label="Delete campaign"
          >
            <Delete size="S" />
          </ActionButton>
        </Flex>
      )
    }
  ], [handleCopyUrl, handleEditClick, copiedId])

  if (!eventId) {
    return (
      <View padding="size-400">
        <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
          Select an event to manage campaigns
        </Text>
      </View>
    )
  }

  return (
    <View>
      {/* Stats Bar */}
      <View
        backgroundColor="gray-100"
        padding="size-300"
        borderRadius="medium"
        marginBottom="size-300"
      >
        <Flex gap="size-600" wrap>
          <StatItem label="Total Campaigns" value={stats.totalCampaigns} />
          <StatItem label="Active" value={stats.activeCampaigns} />
          <StatItem label="Registrations" value={stats.totalRegistrations} />
          <StatItem label="Waitlisted" value={stats.totalWaitlisted} />
          {event?.attendeeLimit && (
            <StatItem
              label="Available Capacity"
              value={stats.availableCapacity}
              subtext={`of ${event.attendeeLimit} total`}
            />
          )}
        </Flex>
      </View>

      {/* Header with Add Button */}
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom="size-200"
      >
        <Button
          variant="accent"
          onPress={handleCreateClick}
        >
          <Add size="S" />
          <Text>Add Campaign</Text>
        </Button>
      </Flex>

      {/* Campaigns Table */}
      {campaigns.length > 0 ? (
        <DataTable
          columns={columns}
          data={campaigns}
          getItemKey={(item) => item.campaignId}
          pageSize={10}
          isLoading={isLoading}
          emptyState={<EmptyCampaignsState onCreateClick={handleCreateClick} />}
        />
      ) : isLoading ? (
        <View padding="size-400">
          <Text>Loading campaigns...</Text>
        </View>
      ) : (
        <EmptyCampaignsState onCreateClick={handleCreateClick} />
      )}

      {/* Create/Edit Campaign Dialog */}
      <DialogTrigger
        isOpen={isFormOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsFormOpen(false)
            setEditingCampaign(null)
          }
        }}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <CampaignFormDialog
            campaign={editingCampaign}
            eventCapacity={event?.attendeeLimit}
            otherCampaignsCapacity={getOtherCampaignsCapacity(editingCampaign?.campaignId)}
            isSaving={isSaving}
            onSave={(data) => {
              handleSaveCampaign(data)
            }}
            onCancel={close}
          />
        )}
      </DialogTrigger>

      {/* Delete Confirmation Dialog */}
      <DialogTrigger
        isOpen={!!campaignToDelete}
        onOpenChange={(isOpen) => !isOpen && setCampaignToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Delete Campaign"
            variant="destructive"
            primaryActionLabel="Delete"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              handleDeleteCampaign()
              close()
            }}
            onSecondaryAction={close}
          >
            Are you sure you want to delete the campaign &ldquo;{campaignToDelete?.name}&rdquo;?
            The campaign URL will stop working.
          </AlertDialog>
        )}
      </DialogTrigger>
    </View>
  )
}

const StatItem: React.FC<{
  label: string
  value: number
  subtext?: string
}> = ({ label, value, subtext }) => (
  <Flex direction="column" gap="size-50">
    <Text UNSAFE_style={{
      fontSize: '12px',
      fontWeight: 600,
      color: COLORS.GRAY_600,
      textTransform: 'uppercase'
    }}>
      {label}
    </Text>
    <Flex alignItems="baseline" gap="size-75">
      <Text UNSAFE_style={{
        fontSize: '24px',
        fontWeight: 700,
        color: COLORS.GRAY_800
      }}>
        {value}
      </Text>
      {subtext && (
        <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>
          {subtext}
        </Text>
      )}
    </Flex>
  </Flex>
)

const EmptyCampaignsState: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => (
  <View
    padding="size-600"
    UNSAFE_style={{
      textAlign: 'center',
      border: `2px dashed ${COLORS.GRAY_300}`,
      borderRadius: '8px'
    }}
  >
    <Heading level={3} UNSAFE_style={{ marginBottom: SPACING.MD }}>
      No campaigns yet
    </Heading>
    <Text UNSAFE_style={{
      color: COLORS.GRAY_600,
      marginBottom: SPACING.LG,
      display: 'block'
    }}>
      Create campaigns to track registrations from different sources like email, social media, or partner promotions.
    </Text>
    <Button variant="accent" onPress={onCreateClick}>
      <Add size="S" />
      <Text>Create Your First Campaign</Text>
    </Button>
  </View>
)

interface CampaignFormDialogProps {
  campaign: Campaign | null
  eventCapacity?: number
  otherCampaignsCapacity: number
  isSaving: boolean
  onSave: (data: CampaignFormData) => void
  onCancel: () => void
}

const CampaignFormDialog: React.FC<CampaignFormDialogProps> = ({
  campaign,
  eventCapacity,
  otherCampaignsCapacity,
  isSaving,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(campaign?.name || '')
  const [attendeeLimit, setAttendeeLimit] = useState<number | undefined>(campaign?.attendeeLimit)
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'Active')
  const [capacityError, setCapacityError] = useState<string | null>(null)

  const handleCapacityChange = (value: number) => {
    setAttendeeLimit(value)

    if (value && eventCapacity) {
      const validation = validateCampaignCapacity(
        value,
        campaign?.attendeeLimit || 0,
        otherCampaignsCapacity,
        eventCapacity
      )
      setCapacityError(validation.isValid ? null : (validation.message || null))
    } else {
      setCapacityError(null)
    }
  }

  const handleSave = () => {
    if (!name.trim()) return
    if (capacityError) return

    onSave({
      name: name.trim(),
      attendeeLimit: attendeeLimit || undefined,
      status
    })
  }

  const isValid = name.trim().length > 0 && !capacityError

  return (
    <Dialog size="M">
      <Heading>{campaign ? 'Edit Campaign' : 'Create Campaign'}</Heading>
      <Divider />
      <Content>
        <Flex direction="column" gap="size-300">
          {/* Name Field */}
          <TextField
            label="Name"
            value={name}
            onChange={setName}
            isRequired
            autoFocus
            width="100%"
          />

          {/* Campaign URL (read-only, only shown when editing) */}
          {campaign && (
            <TextField
              label="Campaign URL"
              value={campaign.url}
              isReadOnly
              width="100%"
              description="Auto-generated from the event URL"
            />
          )}

          {/* Attendee Limit (only on create) */}
          {!campaign && (
            <View>
              <NumberField
                label="Attendee limit"
                value={attendeeLimit ?? NaN}
                onChange={handleCapacityChange}
                minValue={1}
                maxValue={eventCapacity || 10000}
                width="100%"
                validationState={capacityError ? 'invalid' : undefined}
                description={capacityError || 'Must not exceed remaining event capacity'}
              />
            </View>
          )}

          {/* Status Picker */}
          <Picker
            label="Status"
            selectedKey={status}
            onSelectionChange={(key) => setStatus(key as CampaignStatus)}
            width="100%"
          >
            <Item key="Active">Active</Item>
            <Item key="Archived">Archived</Item>
          </Picker>
        </Flex>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button
          variant="cta"
          onPress={handleSave}
          isDisabled={!isValid || isSaving}
          UNSAFE_style={{
            backgroundColor: COLORS.BLACK,
            borderColor: COLORS.BLACK
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </ButtonGroup>
    </Dialog>
  )
}

export default CampaignsTab
