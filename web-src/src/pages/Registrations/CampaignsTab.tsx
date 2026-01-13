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
  Switch,
  AlertDialog,
  Divider
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import Edit from '@spectrum-icons/workflow/Edit'
import Delete from '@spectrum-icons/workflow/Delete'
import Copy from '@spectrum-icons/workflow/Copy'
import type { EventApiResponse } from '../../types/domain'
import type { Campaign, CampaignFormData } from '../../types/campaign'
import { generateUrlParam, calculateCampaignStats, validateCampaignCapacity } from '../../types/campaign'
import { DataTable, TableColumn } from '../../components/shared'
import { COLORS, SPACING } from '../../styles/designSystem'

interface CampaignsTabProps {
  eventId: string
  event: EventApiResponse | null
  campaigns: Campaign[]
  onCampaignsChange: (campaigns: Campaign[]) => void
}

/**
 * Campaigns Tab - Manage event campaigns
 * 
 * Features:
 * - View all campaigns for an event
 * - Create new campaigns (only if isActive === false)
 * - Edit existing campaigns
 * - Delete campaigns
 * - Copy campaign URL to clipboard
 */
export const CampaignsTab: React.FC<CampaignsTabProps> = ({
  eventId,
  event,
  campaigns,
  onCampaignsChange
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Calculate stats
  const stats = useMemo(() => 
    calculateCampaignStats(campaigns, event?.attendeeLimit),
    [campaigns, event?.attendeeLimit]
  )

  // Calculate other campaigns' capacity (for validation)
  const getOtherCampaignsCapacity = useCallback((excludeCampaignId?: string) => {
    return campaigns
      .filter(c => c.campaignId !== excludeCampaignId)
      .reduce((sum, c) => sum + (c.capacityLimit || 0), 0)
  }, [campaigns])

  // Handle create/edit campaign
  const handleSaveCampaign = useCallback((formData: CampaignFormData) => {
    if (editingCampaign) {
      // Update existing campaign
      const updatedCampaigns = campaigns.map(c => 
        c.campaignId === editingCampaign.campaignId
          ? {
              ...c,
              name: formData.name,
              capacityLimit: formData.capacityLimit,
              isActive: formData.isActive,
              modificationTime: Date.now()
            }
          : c
      )
      onCampaignsChange(updatedCampaigns)
    } else {
      // Create new campaign
      const newCampaign: Campaign = {
        campaignId: `campaign-${Date.now()}`,
        eventId,
        name: formData.name,
        urlParam: generateUrlParam(formData.name),
        capacityLimit: formData.capacityLimit,
        registrationCount: 0,
        isActive: formData.isActive,
        creationTime: Date.now(),
        modificationTime: Date.now(),
        createdBy: 'current-user@adobe.com' // Would come from IMS in real implementation
      }
      onCampaignsChange([...campaigns, newCampaign])
    }
    
    setIsFormOpen(false)
    setEditingCampaign(null)
  }, [campaigns, editingCampaign, eventId, onCampaignsChange])

  // Handle delete campaign
  const handleDeleteCampaign = useCallback(() => {
    if (campaignToDelete) {
      const updatedCampaigns = campaigns.filter(c => c.campaignId !== campaignToDelete.campaignId)
      onCampaignsChange(updatedCampaigns)
      setCampaignToDelete(null)
    }
  }, [campaigns, campaignToDelete, onCampaignsChange])

  // Handle copy URL
  const handleCopyUrl = useCallback(async (campaign: Campaign) => {
    const baseUrl = event?.detailPagePath || `https://events.adobe.com/event/${eventId}`
    const fullUrl = `${baseUrl}?campaign=${campaign.urlParam}`
    
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedId(campaign.campaignId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }, [event, eventId])

  // Open edit dialog
  const handleEditClick = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign)
    setIsFormOpen(true)
  }, [])

  // Open create dialog
  const handleCreateClick = useCallback(() => {
    setEditingCampaign(null)
    setIsFormOpen(true)
  }, [])

  // Table columns
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
      key: 'urlParam',
      name: 'URL PARAM',
      width: 150,
      render: (campaign) => (
        <Flex alignItems="center" gap="size-100">
          <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            {campaign.urlParam}
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
      key: 'registrationCount',
      name: 'REGISTRATIONS',
      width: 130,
      sortable: true,
      render: (campaign) => (
        <Text>
          {campaign.registrationCount}
          {campaign.capacityLimit && (
            <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
              {' / '}{campaign.capacityLimit}
            </Text>
          )}
        </Text>
      )
    },
    {
      key: 'isActive',
      name: 'STATUS',
      width: 100,
      sortable: true,
      render: (campaign) => (
        <View
          UNSAFE_style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: campaign.isActive 
              ? 'rgba(45, 157, 146, 0.15)' 
              : 'rgba(102, 102, 102, 0.15)',
            color: campaign.isActive ? COLORS.STATUS_DRAFT : COLORS.STATUS_ARCHIVED
          }}
        >
          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 600 }}>
            {campaign.isActive ? 'Active' : 'Inactive'}
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
        <Flex gap="size-100" justifyContent="flex-end">
          <ActionButton
            isQuiet
            onPress={() => handleEditClick(campaign)}
            aria-label="Edit campaign"
          >
            <Edit size="S" />
          </ActionButton>
          <ActionButton
            isQuiet
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
          <StatItem label="Campaign Registrations" value={stats.totalCampaignRegistrations} />
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
        <Text UNSAFE_style={{ 
          fontSize: '14px', 
          color: COLORS.GRAY_600 
        }}>
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </Text>
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
        {(close) => (
          <CampaignFormDialog
            campaign={editingCampaign}
            eventCapacity={event?.attendeeLimit}
            otherCampaignsCapacity={getOtherCampaignsCapacity(editingCampaign?.campaignId)}
            onSave={(data) => {
              handleSaveCampaign(data)
              close()
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
            Are you sure you want to delete the campaign "{campaignToDelete?.name}"? 
            This will not affect existing registrations, but the campaign URL will no longer work.
          </AlertDialog>
        )}
      </DialogTrigger>
    </View>
  )
}

/**
 * Stat item component
 */
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

/**
 * Empty state component
 */
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

/**
 * Campaign Form Dialog
 */
interface CampaignFormDialogProps {
  campaign: Campaign | null
  eventCapacity?: number
  otherCampaignsCapacity: number
  onSave: (data: CampaignFormData) => void
  onCancel: () => void
}

const CampaignFormDialog: React.FC<CampaignFormDialogProps> = ({
  campaign,
  eventCapacity,
  otherCampaignsCapacity,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(campaign?.name || '')
  const [capacityLimit, setCapacityLimit] = useState<number | undefined>(campaign?.capacityLimit)
  const [isActive, setIsActive] = useState(campaign?.isActive ?? false) // New campaigns start as inactive
  const [capacityError, setCapacityError] = useState<string | null>(null)

  // Validate capacity on change
  const handleCapacityChange = (value: number) => {
    setCapacityLimit(value)
    
    if (value && eventCapacity) {
      const validation = validateCampaignCapacity(
        value,
        campaign?.capacityLimit || 0,
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
      capacityLimit: capacityLimit || undefined,
      isActive
    })
  }

  const isValid = name.trim().length > 0 && !capacityError

  return (
    <Dialog>
      <Heading>{campaign ? 'Edit Campaign' : 'Create Campaign'}</Heading>
      <Divider />
      <Content>
        <Flex direction="column" gap="size-300">
          <TextField
            label="Campaign Name"
            value={name}
            onChange={setName}
            isRequired
            autoFocus
            description="A descriptive name for this campaign"
          />
          
          <View>
            <Text UNSAFE_style={{ 
              fontSize: '12px', 
              color: COLORS.GRAY_600,
              marginBottom: SPACING.XS 
            }}>
              URL Preview
            </Text>
            <View
              backgroundColor="gray-100"
              padding="size-150"
              borderRadius="regular"
            >
              <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                ?campaign={name ? generateUrlParam(name) : 'your-campaign-name'}
              </Text>
            </View>
          </View>

          <NumberField
            label="Capacity Limit"
            value={capacityLimit ?? NaN}
            onChange={handleCapacityChange}
            minValue={1}
            maxValue={eventCapacity || 10000}
            description={
              eventCapacity
                ? `Max available: ${eventCapacity - otherCampaignsCapacity}`
                : 'Optional. Leave empty for unlimited'
            }
            validationState={capacityError ? 'invalid' : undefined}
            errorMessage={capacityError}
          />

          <Flex alignItems="center" gap="size-200">
            <Switch
              isSelected={isActive}
              onChange={setIsActive}
            >
              Active
            </Switch>
            <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>
              {isActive 
                ? 'Campaign URL is accepting registrations' 
                : 'Campaign URL is disabled'}
            </Text>
          </Flex>
        </Flex>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="accent" 
          onPress={handleSave}
          isDisabled={!isValid}
        >
          {campaign ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </ButtonGroup>
    </Dialog>
  )
}

export default CampaignsTab
