/* 
* <license header>
*/

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Button, ButtonGroup, TextField, Picker, PickerItem, DialogTrigger, Dialog, Content, Heading, Text, ActionButton, NumberField, Switch, AlertDialog, SearchField } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Add from '@react-spectrum/s2/icons/Add'
import Edit from '@react-spectrum/s2/icons/Edit'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import Copy from '@react-spectrum/s2/icons/Copy'
import Download from '@react-spectrum/s2/icons/Download'
import type { EventApiResponse } from '../../types/domain'
import type { Campaign, CampaignFormData, CampaignStatus } from '../../types/campaign'
import { calculateCampaignStats } from '../../types/campaign'
import ChannelIllustration from '@react-spectrum/s2/illustrations/linear/Channel'
import NoSearchResults from '@react-spectrum/s2/illustrations/linear/NoSearchResults'
import { DataTable, TableColumn, ResourceEmptyState } from '../../components/shared'
import { COLORS } from '../../styles/designSystem'
import { useHasPermission } from '../../hooks/useHasPermission'
import { generateCsv, downloadCsv, type CsvColumn } from '../../utils/csvExport'

const DEFAULT_CAMPAIGN_PAGE_SIZE = 20
const CAMPAIGN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

const CAMPAIGN_CSV_COLUMNS: CsvColumn[] = [
  { key: 'campaignId', label: 'Campaign ID' },
  { key: 'name', label: 'Campaign Name' },
  { key: 'url', label: 'URL' },
  { key: 'status', label: 'Status' },
  { key: 'attendeeCount', label: 'Registrations (count)' },
  { key: 'attendeeLimit', label: 'Registration limit' },
  { key: 'waitlistAttendeeCount', label: 'Waitlisted' },
  { key: 'creationTime', label: 'Creation time (UTC)' },
  { key: 'modificationTime', label: 'Modification time (UTC)' },
]

function formatCampaignEpochForCsv(ms: number): string {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : ''
}

function isCampaignPageSize(n: number): n is (typeof CAMPAIGN_PAGE_SIZE_OPTIONS)[number] {
  return (CAMPAIGN_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
}

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
  const canWriteEvent = useHasPermission('event', 'write')
  const canDeleteEvent = useHasPermission('event', 'delete')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [pendingArchiveSave, setPendingArchiveSave] = useState<{ campaign: Campaign; formData: CampaignFormData } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_CAMPAIGN_PAGE_SIZE)

  const [formName, setFormName] = useState('')
  const [formAttendeeLimit, setFormAttendeeLimit] = useState<number | undefined>(undefined)
  const [formNoCapacityLimit, setFormNoCapacityLimit] = useState(false)
  const [formStatus, setFormStatus] = useState<CampaignStatus>('Active')

  const eventCapacity = event?.attendeeLimit

  useEffect(() => {
    setSearchQuery('')
    setTablePageSize(DEFAULT_CAMPAIGN_PAGE_SIZE)
  }, [eventId])

  useEffect(() => {
    if (!isFormOpen) return
    if (editingCampaign) {
      setFormName(editingCampaign.name || '')
      setFormAttendeeLimit(editingCampaign.attendeeLimit)
      setFormStatus(editingCampaign.status)
      setFormNoCapacityLimit(false)
    } else {
      setFormName('')
      setFormAttendeeLimit(undefined)
      setFormNoCapacityLimit(false)
      setFormStatus('Active')
    }
  }, [isFormOpen, editingCampaign])

  const formHasValidLimit = useMemo(
    () =>
      formNoCapacityLimit
        ? eventCapacity != null
        : formAttendeeLimit != null &&
          !Number.isNaN(formAttendeeLimit) &&
          formAttendeeLimit >= 1,
    [formNoCapacityLimit, eventCapacity, formAttendeeLimit]
  )

  const formIsValid = useMemo(
    () => formName.trim().length > 0 && formHasValidLimit,
    [formName, formHasValidLimit]
  )

  const stats = useMemo(() => calculateCampaignStats(campaigns), [campaigns])

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter((c) => {
      const name = (c.name ?? '').toLowerCase()
      const id = (c.campaignId ?? '').toLowerCase()
      return name.includes(q) || id.includes(q)
    })
  }, [campaigns, searchQuery])

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

  const handleSubmitCampaignForm = useCallback(() => {
    const trimmed = formName.trim()
    if (!trimmed) return
    const effectiveLimit =
      formNoCapacityLimit && eventCapacity != null
        ? eventCapacity
        : formAttendeeLimit != null && !Number.isNaN(formAttendeeLimit)
          ? formAttendeeLimit
          : undefined
    void handleSaveCampaign({
      name: trimmed,
      attendeeLimit: effectiveLimit,
      status: editingCampaign ? formStatus : 'Active',
    })
  }, [
    formName,
    formNoCapacityLimit,
    eventCapacity,
    formAttendeeLimit,
    formStatus,
    editingCampaign,
    handleSaveCampaign,
  ])

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

  const handleExportCampaignsCsv = useCallback(() => {
    if (filteredCampaigns.length === 0) return
    const rows: Record<string, unknown>[] = filteredCampaigns.map((c) => ({
      campaignId: c.campaignId,
      name: c.name,
      url: c.url,
      status: c.status,
      attendeeCount: c.attendeeCount,
      attendeeLimit: c.attendeeLimit,
      waitlistAttendeeCount: c.waitlistAttendeeCount,
      creationTime: formatCampaignEpochForCsv(c.creationTime),
      modificationTime: formatCampaignEpochForCsv(c.modificationTime),
    }))
    const csv = generateCsv(rows, CAMPAIGN_CSV_COLUMNS)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `campaigns-export-${timestamp}.csv`)
  }, [filteredCampaigns])

  const campaignsTableEmptyState = useMemo(() => {
    if (campaigns.length === 0) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<ChannelIllustration aria-hidden />}
          title="No campaigns yet"
          description="Create campaigns to track registrations from different sources like email, social media, or partner promotions."
        />
      )
    }
    if (filteredCampaigns.length === 0) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<NoSearchResults aria-hidden />}
          title="No matching campaigns"
          description="Try adjusting your search, or clear the search field to see all campaigns."
        />
      )
    }
    return undefined
  }, [campaigns.length, filteredCampaigns.length])

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
      key: 'campaignId',
      name: 'CAMPAIGN ID',
      width: 200,
      sortable: true,
      cellNoWrap: true,
      render: (campaign) => (
        <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {campaign.campaignId}
        </Text>
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
                <Copy />
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
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '16px',
          backgroundColor: campaign.status === 'Active'
            ? 'rgba(45, 157, 146, 0.15)'
            : 'rgba(102, 102, 102, 0.15)',
          color: campaign.status === 'Active' ? COLORS.STATUS_DRAFT : COLORS.STATUS_ARCHIVED
        }}>
          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 600 }}>
            {campaign.status}
          </Text>
        </div>
      )
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 100,
      sortable: false,
      isSticky: true,
      cellNoWrap: true,
      render: (campaign) => (
        <div className={style({display: 'flex', gap: 8, justifyContent: 'end'})}>
          {canWriteEvent && campaign.status === 'Active' && (
            <ActionButton
              isQuiet
              onPress={() => handleEditClick(campaign)}
              aria-label="Edit campaign"
            >
              <Edit />
            </ActionButton>
          )}
          {canDeleteEvent && (
            <ActionButton
              isQuiet
              isDisabled={campaign.attendeeCount > 0}
              onPress={() => setCampaignToDelete(campaign)}
              aria-label="Delete campaign"
            >
              <RemoveCircle />
            </ActionButton>
          )}
        </div>
      )
    }
  ], [handleCopyUrl, handleEditClick, copiedId, canWriteEvent, canDeleteEvent])

  if (!eventId) {
    return (
      <div style={{ padding: '32px' }}>
        <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
          Select an event to manage campaigns
        </Text>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <div className={style({display: 'flex', gap: 48, flexWrap: 'wrap'})}>
          <StatItem label="Total Campaigns" value={stats.totalCampaigns} />
          <StatItem label="Active" value={stats.activeCampaigns} />
          <StatItem label="Registrations" value={stats.totalRegistrations} />
          <StatItem label="Waitlisted" value={stats.totalWaitlisted} />
        </div>
      </div>

      {/* Add campaign + table tools */}
      <div
        className={style({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
        })}
      >
        <div>
          {canWriteEvent && (
            <Button variant="accent" onPress={handleCreateClick}>
              <Add />
              <Text>Add Campaign</Text>
            </Button>
          )}
        </div>
        {campaigns.length > 0 && (
          <div
            className={style({
              display: 'flex',
              gap: 12,
              alignItems: 'end',
              flexWrap: 'wrap',
            })}
          >
            {filteredCampaigns.length > 0 && (
              <ActionButton
                aria-label="Export campaigns as CSV"
                onPress={handleExportCampaignsCsv}
              >
                <Download />
              </ActionButton>
            )}
            <Picker
              label="Rows per page"
              selectedKey={String(tablePageSize)}
              onSelectionChange={(key) => {
                const n = Number(key)
                if (isCampaignPageSize(n)) setTablePageSize(n)
              }}
              styles={style({ width: 120 })}
            >
              {CAMPAIGN_PAGE_SIZE_OPTIONS.map((n) => (
                <PickerItem key={n} id={String(n)}>
                  {String(n)}
                </PickerItem>
              ))}
            </Picker>
            <div className={style({ width: 240 })}>
              <SearchField
                label="Search campaigns"
                placeholder="Search by name or campaign ID"
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                styles={style({ width: '[100%]' })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Campaigns Table */}
      <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <DataTable
          columns={columns}
          data={filteredCampaigns}
          getItemKey={(item) => item.campaignId}
          pageSize={tablePageSize}
          emptyState={campaignsTableEmptyState}
        />
      </div>

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
              eventCapacity={eventCapacity}
              isSaving={isSaving}
              name={formName}
              onNameChange={setFormName}
              attendeeLimit={formAttendeeLimit}
              onAttendeeLimitChange={setFormAttendeeLimit}
              noCapacityLimit={formNoCapacityLimit}
              onNoCapacityLimitChange={setFormNoCapacityLimit}
              status={formStatus}
              onStatusChange={setFormStatus}
              isValid={formIsValid}
              onSubmitForm={handleSubmitCampaignForm}
              onCancel={close}
            />
          )}
        </Dialog>
      </DialogTrigger>

      {/* Delete Confirmation Dialog */}
      <DialogTrigger isOpen={!!campaignToDelete} onOpenChange={(isOpen) => !isOpen && setCampaignToDelete(null)}>
        <div style={{ display: 'none' }} />
        <AlertDialog title="Delete Campaign" variant="destructive" primaryActionLabel="Delete" cancelLabel="Cancel"
          onPrimaryAction={handleDeleteCampaign}
          onCancel={() => setCampaignToDelete(null)}
        >
          Are you sure you want to delete the campaign &ldquo;{campaignToDelete?.name}&rdquo;?
          The campaign URL will stop working.
        </AlertDialog>
      </DialogTrigger>

      {/* Archive Campaign Confirmation Dialog */}
      <DialogTrigger isOpen={!!pendingArchiveSave} onOpenChange={(isOpen) => !isOpen && setPendingArchiveSave(null)}>
        <div style={{ display: 'none' }} />
        <AlertDialog title="Archive Campaign" variant="warning" primaryActionLabel="Archive campaign" cancelLabel="Cancel"
          onPrimaryAction={() => { if (pendingArchiveSave) { performSaveCampaign(pendingArchiveSave.campaign, pendingArchiveSave.formData) } }}
          onCancel={() => setPendingArchiveSave(null)}
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
      </DialogTrigger>
    </div>
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

interface CampaignFormDialogContentProps {
  campaign: Campaign | null
  eventCapacity?: number
  isSaving: boolean
  name: string
  onNameChange: (value: string) => void
  attendeeLimit: number | undefined
  onAttendeeLimitChange: (value: number | undefined) => void
  noCapacityLimit: boolean
  onNoCapacityLimitChange: (value: boolean) => void
  status: CampaignStatus
  onStatusChange: (value: CampaignStatus) => void
  isValid: boolean
  onSubmitForm: () => void
  onCancel: () => void
}

const CampaignFormDialogContent: React.FC<CampaignFormDialogContentProps> = ({
  campaign,
  eventCapacity,
  isSaving,
  name,
  onNameChange,
  attendeeLimit,
  onAttendeeLimitChange,
  noCapacityLimit,
  onNoCapacityLimitChange,
  status,
  onStatusChange,
  isValid,
  onSubmitForm,
  onCancel
}) => (
  <>
    <Heading slot="title">{campaign ? 'Edit Campaign' : 'Create Campaign'}</Heading>
    <Content>
      <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
        <TextField
          label="Name"
          value={name}
          onChange={onNameChange}
          isRequired
          autoFocus
          styles={style({ width: '[100%]' })}
        />

        {campaign && (
          <TextField
            label="Campaign URL"
            value={campaign.url}
            isReadOnly
            styles={style({ width: '[100%]' })}
            description="Auto-generated from the event URL"
          />
        )}

        {!campaign && (
          <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
            <NumberField
              label="Attendee limit"
              value={noCapacityLimit && eventCapacity != null ? eventCapacity : (attendeeLimit ?? NaN)}
              onChange={onAttendeeLimitChange}
              minValue={1}
              isDisabled={noCapacityLimit}
            />
            <Switch
              isSelected={noCapacityLimit}
              onChange={onNoCapacityLimitChange}
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

        {campaign && (
          <Picker
            label="Status"
            selectedKey={status}
            onSelectionChange={(key) => onStatusChange(key as CampaignStatus)}
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
        onPress={onSubmitForm}
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

export default CampaignsTab
