/* 
* <license header>
*/

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ActionButton,
  DialogTrigger as V3DialogTrigger,
  NumberField,
  Switch,
  AlertDialog,
} from '@adobe/react-spectrum'
import { Button, ButtonGroup, TextField, Picker, PickerItem, DialogTrigger, Dialog, Content, Heading, Text } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Add from '@spectrum-icons/workflow/Add'
import Edit from '@spectrum-icons/workflow/Edit'
import Delete from '@spectrum-icons/workflow/Delete'
import Copy from '@spectrum-icons/workflow/Copy'
import type { EventApiResponse } from '../../types/domain'
import type { Campaign, CampaignFormData, CampaignStatus } from '../../types/campaign'
import { calculateCampaignStats } from '../../types/campaign'
import { DataTable, TableColumn } from '../../components/shared'
import { COLORS, SPACING } from '../../styles/designSystem'

interface CampaignsTabProps {
  eventId: string
  event: EventApiResponse | null
  campaigns: Campaign[]
  onCreateCampaign: (data: CampaignFormData) => Promise<void>
  onUpdateCampaign: (campaignId: string, data: CampaignFormData, modificationTime: number) => Promise<void>
  onDeleteCampaign: (campaignId: string) => Promise<void>
}

export const CampaignsTab: React.FC<CampaignsTabProps> = ({
  eventId,
  event,
  campaigns,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [pendingArchiveSave, setPendingArchiveSave] = useState<{ campaign: Campaign; formData: CampaignFormData } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const stats = useMemo(() => calculateCampaignStats(campaigns), [campaigns])

  const performSaveCampaign = useCallback(async (campaign: Campaign | null, formData: CampaignFormData) => {
    setIsSaving(true)
    try {
      if (campaign) {
        await onUpdateCampaign(
          campaign.campaignId,
          formData,
          campaign.modificationTime
        )
      } else {
        await onCreateCampaign(formData)
      }
      setIsFormOpen(false)
      setEditingCampaign(null)
      setPendingArchiveSave(null)
    } catch (err) {
      console.error('Failed to save campaign:', err)
    } finally {
      setIsSaving(false)
    }
  }, [onCreateCampaign, onUpdateCampaign])

  const handleSaveCampaign = useCallback(async (formData: CampaignFormData) => {
    if (editingCampaign && editingCampaign.status === 'Active' && formData.status === 'Archived') {
      setPendingArchiveSave({ campaign: editingCampaign, formData })
      return
    }
    await performSaveCampaign(editingCampaign, formData)
  }, [editingCampaign, performSaveCampaign])

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
        <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
          <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.url}
          </Text>
          {campaign.url && (
            <>
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
            </>
          )}
        </div>
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
        <div className={style({display: 'flex', gap: 8, justifyContent: 'end'})}>
          {campaign.status === 'Active' && (
            <ActionButton
              isQuiet
              onPress={() => handleEditClick(campaign)}
              aria-label="Edit campaign"
            >
              <Edit size="S" />
            </ActionButton>
          )}
          <ActionButton
            isQuiet
            isDisabled={campaign.attendeeCount > 0}
            onPress={() => setCampaignToDelete(campaign)}
            aria-label="Delete campaign"
          >
            <Delete size="S" />
          </ActionButton>
        </div>
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
        <div className={style({display: 'flex', gap: 48, flexWrap: 'wrap'})}>
          <StatItem label="Total Campaigns" value={stats.totalCampaigns} />
          <StatItem label="Active" value={stats.activeCampaigns} />
          <StatItem label="Registrations" value={stats.totalRegistrations} />
          <StatItem label="Waitlisted" value={stats.totalWaitlisted} />
        </div>
      </View>

      {/* Header with Add Button */}
      <div
        className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16})}
      >
        <Button
          variant="accent"
          onPress={handleCreateClick}
        >
          <Add size="S" />
          <Text>Add Campaign</Text>
        </Button>
      </div>

      {/* Campaigns Table */}
      {campaigns.length > 0 ? (
        <DataTable
          columns={columns}
          data={campaigns}
          getItemKey={(item) => item.campaignId}
          pageSize={10}
          emptyState={<EmptyCampaignsState onCreateClick={handleCreateClick} />}
        />
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
        <Dialog size="M">
          {({close}) => (
            <CampaignFormDialogContent
              campaign={editingCampaign}
              eventCapacity={event?.attendeeLimit}
              isSaving={isSaving}
              onSave={(data) => {
                handleSaveCampaign(data)
              }}
              onCancel={close}
            />
          )}
        </Dialog>
      </DialogTrigger>

      {/* Delete Confirmation Dialog */}
      <V3DialogTrigger
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
      </V3DialogTrigger>

      {/* Archive Campaign Confirmation Dialog */}
      <V3DialogTrigger
        isOpen={!!pendingArchiveSave}
        onOpenChange={(isOpen) => !isOpen && setPendingArchiveSave(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Archive Campaign"
            variant="warning"
            primaryActionLabel="Archive campaign"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (pendingArchiveSave) {
                performSaveCampaign(pendingArchiveSave.campaign, pendingArchiveSave.formData)
              }
              close()
            }}
            onSecondaryAction={close}
          >
            <Text>
              You are about to archive the campaign &ldquo;{pendingArchiveSave?.campaign.name}&rdquo;.
              This action is <strong>permanent and cannot be undone</strong>.
            </Text>
            <Text UNSAFE_style={{ marginTop: '12px', display: 'block' }}>
              Once archived:
            </Text>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>The campaign cannot be reactivated</li>
              <li>The campaign cannot be edited</li>
              <li>Existing registrations will remain, but no new registrations will be accepted through this campaign</li>
            </ul>
            <Text UNSAFE_style={{ marginTop: '12px', display: 'block' }}>
              Are you sure you want to archive this campaign?
            </Text>
          </AlertDialog>
        )}
      </V3DialogTrigger>
    </View>
  )
}

const StatItem: React.FC<{
  label: string
  value: number
  subtext?: string
}> = ({ label, value, subtext }) => (
  <div className={style({display: 'flex', flexDirection: 'column', gap: 4})}>
    <Text UNSAFE_style={{
      fontSize: '12px',
      fontWeight: 600,
      color: COLORS.GRAY_600,
      textTransform: 'uppercase'
    }}>
      {label}
    </Text>
    <div className={style({display: 'flex', alignItems: 'baseline', gap: 8})}>
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
    </div>
  </div>
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

interface CampaignFormDialogContentProps {
  campaign: Campaign | null
  eventCapacity?: number
  isSaving: boolean
  onSave: (data: CampaignFormData) => void
  onCancel: () => void
}

const CampaignFormDialogContent: React.FC<CampaignFormDialogContentProps> = ({
  campaign,
  eventCapacity,
  isSaving,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(campaign?.name || '')
  const [attendeeLimit, setAttendeeLimit] = useState<number | undefined>(campaign?.attendeeLimit)
  const [noCapacityLimit, setNoCapacityLimit] = useState(false)
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'Active')

  const handleSave = () => {
    if (!name.trim()) return

    const effectiveLimit = noCapacityLimit && eventCapacity != null
      ? eventCapacity
      : (attendeeLimit != null && !Number.isNaN(attendeeLimit) ? attendeeLimit : undefined)

    onSave({
      name: name.trim(),
      attendeeLimit: effectiveLimit,
      status: campaign ? status : 'Active'
    })
  }

  const hasValidLimit = noCapacityLimit
    ? eventCapacity != null
    : (attendeeLimit != null && !Number.isNaN(attendeeLimit) && attendeeLimit >= 1)
  const isValid = name.trim().length > 0 && hasValidLimit

  return (
    <>
      <Heading slot="title">{campaign ? 'Edit Campaign' : 'Create Campaign'}</Heading>
      <Content>
        <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
          {/* Name Field */}
          <TextField
            label="Name"
            value={name}
            onChange={setName}
            isRequired
            autoFocus
            styles={style({ width: '[100%]' })}
          />

          {/* Campaign URL (read-only, only shown when editing) */}
          {campaign && (
            <TextField
              label="Campaign URL"
              value={campaign.url}
              isReadOnly
              styles={style({ width: '[100%]' })}
              description="Auto-generated from the event URL"
            />
          )}

          {/* Attendee Limit (only on create) */}
          {!campaign && (
            <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
              <NumberField
                label="Attendee limit"
                value={noCapacityLimit && eventCapacity != null ? eventCapacity : (attendeeLimit ?? NaN)}
                onChange={(value) => setAttendeeLimit(value)}
                minValue={1}
                width="100%"
                isDisabled={noCapacityLimit}
              />
              <Switch
                isSelected={noCapacityLimit}
                onChange={setNoCapacityLimit}
                isDisabled={eventCapacity == null}
              >
                No capacity limit (use full event capacity)
              </Switch>
              {eventCapacity == null && (
                <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>
                  Event has no capacity limit set
                </Text>
              )}
            </div>
          )}

          {/* Status Picker (only when editing; create always uses Active) */}
          {campaign && (
            <Picker
              label="Status"
              selectedKey={status}
              onSelectionChange={(key) => setStatus(key as CampaignStatus)}
              styles={style({ width: '[100%]' })}
            >
              <PickerItem id="Active">Active</PickerItem>
              <PickerItem id="Archived">Archived</PickerItem>
            </Picker>
          )}
        </div>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button
          variant="accent"
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
    </>
  )
}

export default CampaignsTab
