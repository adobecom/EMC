/*
* <license header>
*/

import React, { useState, useCallback, useMemo } from 'react'
import { Button, ButtonGroup, NumberField, DialogTrigger, Dialog, Content, Heading, Text, ActionButton, AlertDialog, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Add from '@react-spectrum/s2/icons/Add'
import CalendarEdit from '@react-spectrum/s2/icons/CalendarEdit'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import Copy from '@react-spectrum/s2/icons/Copy'
import Link from '@react-spectrum/s2/illustrations/linear/Link'
import type { RsvpToken } from '../../types/rsvpToken'
import { calculateRsvpTokenStats } from '../../types/rsvpToken'
import type { Campaign } from '../../types/campaign'
import { DataTable, TableColumn, ResourceEmptyState, StatusBadge } from '../../components/shared'
import { COLORS } from '../../styles/designSystem'
import { useHasPermission } from '../../hooks/useHasPermission'

const DEFAULT_EXTEND_DAYS = 7
// Sentinel id for the "No campaign" Picker option — rsvp tokens never carry a
// campaign of their own, so this just means "copy the plain link."
const NO_CAMPAIGN_ID = '__none__'

function formatEpoch(ms?: number): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const GUEST_RSVP_LINKS_TABLE_TEST_IDS = {
  root: 'guest-rsvp-links-table',
  emptyState: 'guest-rsvp-links-table-empty-state',
  pageInput: 'guest-rsvp-links-table-page-input',
  header: (columnKey: string) => `guest-rsvp-links-table-header-${columnKey}`,
  row: (itemKey: string) => `guest-rsvp-links-table-row-${itemKey}`,
}

interface GuestRsvpUrlsTabProps {
  eventId: string
  links: RsvpToken[]
  campaigns: Campaign[]
  onGenerate: () => Promise<void>
  onExtend: (token: string, expiresInDays: number) => Promise<void>
  onRevoke: (token: string) => Promise<void>
}

export const GuestRsvpUrlsTab: React.FC<GuestRsvpUrlsTabProps> = ({
  eventId,
  links,
  campaigns,
  onGenerate,
  onExtend,
  onRevoke,
}) => {
  const canWriteEvent = useHasPermission('event', 'write')
  const canDeleteEvent = useHasPermission('event', 'delete')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [linkToRevoke, setLinkToRevoke] = useState<RsvpToken | null>(null)
  const [linkToExtend, setLinkToExtend] = useState<RsvpToken | null>(null)
  const [extendDays, setExtendDays] = useState<number>(DEFAULT_EXTEND_DAYS)
  const [isSaving, setIsSaving] = useState(false)
  const [linkToCopy, setLinkToCopy] = useState<RsvpToken | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Campaign tracking is opted into per-copy, not bound to the token itself —
  // only Active campaigns make sense to attribute a brand-new share to.
  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.status === 'Active'), [campaigns])

  const stats = useMemo(() => calculateRsvpTokenStats(links), [links])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      await onGenerate()
    } catch (err) {
      console.error('Failed to generate guest RSVP link:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [onGenerate])

  const copyToClipboard = useCallback(async (token: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (err) {
      console.error('Failed to copy guest RSVP URL:', err)
    }
  }, [])

  const handleCopyUrl = useCallback((link: RsvpToken) => {
    if (!link.url) {
      console.error('Guest RSVP link has no composed URL (event is missing a detail page path)')
      return
    }
    // Only worth asking when there's an active campaign to attribute the share
    // to — otherwise just copy the plain rsvpToken link, same as before.
    if (activeCampaigns.length === 0) {
      copyToClipboard(link.token, link.url)
      return
    }
    setSelectedCampaignId(null)
    setLinkToCopy(link)
  }, [activeCampaigns, copyToClipboard])

  const handleCopyConfirm = useCallback(() => {
    if (!linkToCopy?.url) return
    if (!selectedCampaignId || selectedCampaignId === NO_CAMPAIGN_ID) {
      copyToClipboard(linkToCopy.token, linkToCopy.url)
      setLinkToCopy(null)
      return
    }
    const campaign = activeCampaigns.find((c) => c.campaignId === selectedCampaignId)
    if (!campaign?.url) {
      // Campaign has no shareable URL of its own — fall back to the plain link
      // rather than silently dropping the user's copy action.
      console.error('Selected campaign has no composed URL; copying the plain rsvp token link instead')
      copyToClipboard(linkToCopy.token, linkToCopy.url)
      setLinkToCopy(null)
      return
    }
    try {
      const url = new URL(campaign.url)
      url.searchParams.set('rsvpToken', linkToCopy.token)
      copyToClipboard(linkToCopy.token, url.toString())
    } catch (err) {
      console.error('Failed to compose campaign-tracked rsvp token URL:', err)
      copyToClipboard(linkToCopy.token, linkToCopy.url)
    }
    setLinkToCopy(null)
  }, [linkToCopy, selectedCampaignId, activeCampaigns, copyToClipboard])

  const handleRevoke = useCallback(async () => {
    if (!linkToRevoke) return
    setIsSaving(true)
    try {
      await onRevoke(linkToRevoke.token)
      setLinkToRevoke(null)
    } catch (err) {
      console.error('Failed to revoke guest RSVP link:', err)
    } finally {
      setIsSaving(false)
    }
  }, [linkToRevoke, onRevoke])

  const handleExtendSubmit = useCallback(async () => {
    if (!linkToExtend) return
    // The API takes a relative day count and recomputes expiresAt as now +
    // expiresInDays server-side (replacing the prior value), so no client-side
    // epoch math is needed here.
    setIsSaving(true)
    try {
      await onExtend(linkToExtend.token, extendDays)
      setLinkToExtend(null)
    } catch (err) {
      console.error('Failed to extend guest RSVP link:', err)
    } finally {
      setIsSaving(false)
    }
  }, [linkToExtend, extendDays, onExtend])

  const emptyState = useMemo(() => {
    if (links.length > 0) return undefined
    return (
      <ResourceEmptyState
        fillContainer
        illustration={<Link aria-hidden />}
        title="No guest RSVP links yet"
        description="Generate a one-time-use link to let a guest register without an Adobe ID — for VIP/on-behalf-of registrations or when Adobe ID is blocking someone."
      />
    )
  }, [links.length])

  const columns: TableColumn<RsvpToken>[] = useMemo(() => [
    {
      key: 'url',
      name: 'URL',
      width: 260,
      render: (link) => (
        <div className={style({ display: 'flex', alignItems: 'center', gap: 8 })}>
          <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {link.url ?? '-'}
          </Text>
          <ActionButton
            isQuiet
            isDisabled={!link.url}
            onPress={() => handleCopyUrl(link)}
            aria-label="Copy guest RSVP URL"
          >
            <Copy />
          </ActionButton>
          {copiedToken === link.token && (
            <Text UNSAFE_style={{ fontSize: '11px', color: COLORS.STATUS_DRAFT }}>
              Copied!
            </Text>
          )}
        </div>
      )
    },
    {
      key: 'status',
      name: 'STATUS',
      width: 100,
      sortable: true,
      // An unused token past its expiry is still reported as status "unused" by the
      // API (isExpired is a separate flag) — show it as "Expired" here rather than
      // implying it's still shareable.
      render: (link) => <StatusBadge status={link.isExpired && link.status === 'unused' ? 'expired' : link.status} />
    },
    {
      key: 'createdBy',
      name: 'CREATED BY',
      width: 180,
      sortable: true,
      render: (link) => <Text>{link.createdBy}</Text>
    },
    {
      key: 'creationTime',
      name: 'CREATED',
      width: 120,
      sortable: true,
      render: (link) => <Text>{formatEpoch(link.creationTime)}</Text>
    },
    {
      key: 'expiresAt',
      name: 'EXPIRES',
      width: 120,
      sortable: true,
      render: (link) => <Text>{formatEpoch(link.expiresAt)}</Text>
    },
    {
      key: 'usedByAttendee',
      name: 'USED BY',
      width: 180,
      render: (link) => <Text>{link.usedByAttendee || '-'}</Text>
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 100,
      sortable: false,
      isSticky: true,
      cellNoWrap: true,
      render: (link) => (
        <div className={style({ display: 'flex', gap: 8, justifyContent: 'end' })}>
          {canWriteEvent && link.status === 'unused' && (
            <ActionButton
              isQuiet
              onPress={() => { setLinkToExtend(link); setExtendDays(DEFAULT_EXTEND_DAYS) }}
              aria-label="Extend link expiration"
            >
              <CalendarEdit />
            </ActionButton>
          )}
          {canDeleteEvent && link.status === 'unused' && (
            <ActionButton
              isQuiet
              onPress={() => setLinkToRevoke(link)}
              aria-label="Revoke link"
            >
              <RemoveCircle />
            </ActionButton>
          )}
        </div>
      )
    }
  ], [canWriteEvent, canDeleteEvent, copiedToken, handleCopyUrl])

  if (!eventId) {
    return (
      <div style={{ padding: '32px' }}>
        <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
          Select an event to manage guest RSVP links
        </Text>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <div className={style({ display: 'flex', gap: 48, flexWrap: 'wrap' })}>
          <StatItem label="Total Links" value={stats.totalTokens} />
          <StatItem label="Unused" value={stats.unusedTokens} />
          <StatItem label="Used" value={stats.usedTokens} />
        </div>
      </div>

      {/* Generate link */}
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
            <Button variant="accent" onPress={handleGenerate} isPending={isGenerating}>
              <Add />
              <Text>Generate guest RSVP link</Text>
            </Button>
          )}
        </div>
      </div>

      {/* Guest RSVP Links Table */}
      <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <DataTable
          columns={columns}
          data={links}
          getItemKey={(item) => item.token}
          testIds={GUEST_RSVP_LINKS_TABLE_TEST_IDS}
          emptyState={emptyState}
        />
      </div>

      {/* Extend Expiration Dialog */}
      <DialogTrigger isOpen={!!linkToExtend} onOpenChange={(isOpen) => !isOpen && setLinkToExtend(null)}>
        <div style={{ display: 'none' }} />
        <Dialog size="S">
          {() => (
            <>
              <Heading slot="title">Extend Link Expiration</Heading>
              <Content>
                <NumberField
                  label="Extend by (days)"
                  value={extendDays}
                  onChange={setExtendDays}
                  minValue={1}
                  styles={style({ width: '[100%]' })}
                />
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={() => setLinkToExtend(null)}>
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  onPress={handleExtendSubmit}
                  isDisabled={!extendDays || extendDays < 1 || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Extend'}
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      {/* Revoke Confirmation Dialog */}
      <DialogTrigger isOpen={!!linkToRevoke} onOpenChange={(isOpen) => !isOpen && setLinkToRevoke(null)}>
        <div style={{ display: 'none' }} />
        <AlertDialog title="Revoke Guest RSVP Link" variant="destructive" primaryActionLabel="Revoke" cancelLabel="Cancel"
          onPrimaryAction={handleRevoke}
          onCancel={() => setLinkToRevoke(null)}
        >
          Are you sure you want to revoke this guest RSVP link? It can no longer be used to register once revoked.
        </AlertDialog>
      </DialogTrigger>

      {/* Track-with-Campaign Dialog — shown on copy only when the event has
          active campaigns. Campaign attribution is never bound to the token
          itself; picking one here just adds a second, independent query param
          (campaign) alongside rsvpToken on the copied URL. */}
      <DialogTrigger isOpen={!!linkToCopy} onOpenChange={(isOpen) => !isOpen && setLinkToCopy(null)}>
        <div style={{ display: 'none' }} />
        <Dialog size="S">
          {() => (
            <>
              <Heading slot="title">Track This Link With a Campaign?</Heading>
              <Content>
                <Picker
                  label="Campaign"
                  selectedKey={selectedCampaignId ?? NO_CAMPAIGN_ID}
                  onSelectionChange={(key) => setSelectedCampaignId(key === NO_CAMPAIGN_ID ? null : String(key))}
                  styles={style({ width: '[100%]' })}
                >
                  <PickerItem id={NO_CAMPAIGN_ID}>No campaign</PickerItem>
                  {activeCampaigns.map((campaign) => (
                    <PickerItem key={campaign.campaignId} id={campaign.campaignId}>
                      {campaign.name}
                    </PickerItem>
                  ))}
                </Picker>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={() => setLinkToCopy(null)}>
                  Cancel
                </Button>
                <Button variant="accent" onPress={handleCopyConfirm}>
                  Copy
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>
    </div>
  )
}

const StatItem: React.FC<{
  label: string
  value: number
}> = ({ label, value }) => (
  <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
    <Text UNSAFE_style={{
      fontSize: '12px',
      fontWeight: 600,
      color: COLORS.GRAY_600,
      textTransform: 'uppercase'
    }}>
      {label}
    </Text>
    <Text UNSAFE_style={{
      fontSize: '24px',
      fontWeight: 700,
      color: COLORS.GRAY_800
    }}>
      {value}
    </Text>
  </div>
)

export default GuestRsvpUrlsTab
