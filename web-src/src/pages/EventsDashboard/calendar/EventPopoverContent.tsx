/*
* <license header>
*/

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Text, Heading, Divider, ActionButton, TooltipTrigger, Tooltip, Link } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { EventDashboardItem } from '../../../types/domain'
import { StatusBadge } from '../../../components/shared'
import { buildEventManageActions } from '../eventManageActions'
import { SPACING } from '../../../styles/designSystem'
import { SPEAKER_LOCALE_LABELS } from '../../../config/localeMapping'

export interface EventPopoverContentProps {
  item: EventDashboardItem
  /** Resolved series name from the series enrichment map */
  seriesName?: string
  /** Resolved venue name from the venue enrichment map */
  venueName?: string
  /** Resolved creator name from the history enrichment map */
  creatorName?: string
  /** Pre-formatted date string, e.g. "MM/DD/YYYY" */
  formattedDate: string
  /** Pre-formatted last-modified string */
  formattedModified: string
  canWriteEvent: boolean
  canDeleteEvent: boolean
  /** Passes through to EventsDashboard's handleMenuAction */
  onAction: (key: string, item: EventDashboardItem) => void
  onClose: () => void
}

export const EventPopoverContent: React.FC<EventPopoverContentProps> = ({
  item,
  seriesName,
  venueName,
  creatorName,
  formattedDate,
  formattedModified,
  canWriteEvent,
  canDeleteEvent,
  onAction,
  onClose,
}) => {
  const navigate = useNavigate()
  const actions = buildEventManageActions({ item, canWriteEvent, canDeleteEvent })

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Contributor', value: item.contributor || '—' },
    { label: 'Series', value: seriesName || item.seriesId || '—' },
    {
      label: 'Date',
      value: formattedDate !== 'N/A' && item.localStartTime
        ? `${formattedDate} · ${item.localStartTime}`
        : formattedDate,
    },
    { label: 'Venue', value: venueName || item.venueName || '—' },
    { label: 'Language', value: item.defaultLocale ? (SPEAKER_LOCALE_LABELS[item.defaultLocale] || item.defaultLocale) : '—' },
    {
      label: 'RSVP',
      value: (
        <Link
          isQuiet
          onPress={() => { navigate(`/registrations/${item.eventId}`); onClose() }}
          UNSAFE_style={{ cursor: 'pointer', fontSize: '12px' }}
        >
          {item.attendeeCount ?? 0} / {item.attendeeLimit != null ? item.attendeeLimit : '—'}
        </Link>
      ),
    },
    { label: 'Creator', value: creatorName || item.createdBy || '—' },
    { label: 'Last modified', value: formattedModified },
  ]

  return (
    <div style={{ padding: SPACING.MD, minWidth: 280, maxWidth: 380 }}>
      {/* Title + status */}
      <div
        className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}
        style={{ marginBottom: SPACING.SM }}
      >
        <Heading level={4} UNSAFE_style={{ margin: 0, wordBreak: 'break-word' }}>
          {item.eventName}
        </Heading>
        <StatusBadge status={item.published ? 'published' : 'draft'} />
      </div>

      {/* Field list */}
      <div
        className={style({ display: 'flex', flexDirection: 'column' })}
        style={{ gap: 6, marginBottom: SPACING.MD }}
      >
        {fields.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Text
              UNSAFE_style={{
                fontSize: '12px',
                color: 'var(--spectrum-global-color-gray-600)',
                minWidth: 96,
                flexShrink: 0,
                paddingTop: 1,
              }}
            >
              {label}
            </Text>
            <Text UNSAFE_style={{ fontSize: '12px', wordBreak: 'break-word' }}>
              {value}
            </Text>
          </div>
        ))}
      </div>

      <Divider />

      {/* Icon-only action buttons */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.XXS, marginTop: SPACING.SM }}
        role="group"
        aria-label="Event actions"
      >
        {actions.map(action => (
          <TooltipTrigger key={action.key} delay={300}>
            <ActionButton
              isQuiet
              aria-label={action.label}
              onPress={() => {
                onAction(action.key, item)
                // Delete, publish, and unpublish open confirm dialogs managed by parent; don't close yet
                if (action.key !== 'delete' && action.key !== 'publish' && action.key !== 'unpublish') {
                  onClose()
                }
              }}
            >
              {action.icon}
            </ActionButton>
            <Tooltip>{action.label}</Tooltip>
          </TooltipTrigger>
        ))}
      </div>
    </div>
  )
}
