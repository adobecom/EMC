/* 
* <license header>
*/

/**
 * SpeakerEventConnectionsDialog - Dialog showing all events linked to a speaker
 * 
 * Displays a list of events where the speaker is assigned, with:
 * - Event name and status
 * - Date information
 * - Link to edit the event
 */

import React from 'react'
import { ActionButton, Text, Button, ButtonGroup, Dialog, DialogTrigger, Content, Heading, ProgressCircle } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Edit from '@react-spectrum/s2/icons/Edit'
import Calendar from '@react-spectrum/s2/icons/Calendar'
import Link from '@react-spectrum/s2/icons/Link'
import { SpeakerDashboardItem } from './SpeakersDashboard'
import { EventApiResponse } from '../../types/domain'
import { StatusBadge } from '../../components/shared'

interface SpeakerEventConnectionsDialogProps {
  isOpen: boolean
  onClose: () => void
  speaker: SpeakerDashboardItem | null
  /** `undefined` means unresolved (never fetched or fetch failed) — distinct from an empty array */
  events: EventApiResponse[] | undefined
  /** Connections still resolving; suppresses the "not linked to any events" empty state */
  isLoading?: boolean
}

export const SpeakerEventConnectionsDialog: React.FC<SpeakerEventConnectionsDialogProps> = ({
  isOpen,
  onClose,
  speaker,
  events,
  isLoading = false
}) => {
  // Three states: loading, unresolved (fetch failed), resolved. Collapsing the middle one
  // into "0 events" would assert the speaker has no linked events when we simply don't know.
  const resolvedEvents = events ?? []
  const isUnresolved = !isLoading && events === undefined
  const speakerName = speaker ? `${speaker.firstName} ${speaker.lastName}` : ''
  
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'No date'
    try {
      const parts = dateString.split('-')
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`
      }
      return dateString
    } catch {
      return dateString
    }
  }
  
  const handleEditEvent = (eventId: string) => {
    window.location.hash = `#/events/edit/${eventId}`
    onClose()
  }
  
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="L">
        {({close}) => (
          <>
            <Heading slot="title">Event Connections</Heading>
            <Content>
              <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
                {/* Speaker Info Header */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    backgroundColor: 'var(--spectrum-global-color-gray-100)',
                  }}
                >
                  <div className={style({display: 'flex', alignItems: 'center', gap: 16})}>
                    {/* Speaker Avatar */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: 'var(--spectrum-global-color-gray-300)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {speaker?.photo?.imageUrl ? (
                        <img
                          src={speaker.photo.imageUrl}
                          alt={speakerName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Text UNSAFE_style={{ fontWeight: 'bold', color: 'var(--spectrum-global-color-gray-600)' }}>
                          {speaker?.firstName?.[0]}{speaker?.lastName?.[0]}
                        </Text>
                      )}
                    </div>

                    <div className={style({display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1})}>
                      <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        {speakerName}
                      </Text>
                      {speaker?.title && (
                        <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)' }}>
                          {speaker.title}
                        </Text>
                      )}
                    </div>

                    <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
                      <Link />
                      <Text UNSAFE_style={{ fontWeight: 'bold' }}>
                        {isLoading
                          ? 'Loading...'
                          : isUnresolved
                            ? 'Unknown'
                            : `${resolvedEvents.length} ${resolvedEvents.length === 1 ? 'event' : 'events'}`}
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Events List */}
                {isLoading ? (
                  <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
                    <ProgressCircle isIndeterminate aria-label="Loading linked events" />
                  </div>
                ) : isUnresolved ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
                      Linked events could not be loaded. Close this dialog and try again.
                    </Text>
                  </div>
                ) : resolvedEvents.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
                      This speaker is not linked to any events.
                    </Text>
                  </div>
                ) : (
                  <div style={{ maxHeight: 368, overflowY: 'auto' }}>
                    <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
                      {resolvedEvents.map(event => (
                        <div
                          key={event.eventId}
                          style={{
                            padding: 16,
                            border: '1px solid var(--spectrum-global-color-gray-300)',
                            borderRadius: 8,
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <div className={style({display: 'flex', alignItems: 'center', gap: 16})}>
                            {/* Event Info */}
                            <div className={style({display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1})}>
                              <Text UNSAFE_style={{ fontWeight: 'bold' }}>
                                {event.enTitle || event.title || 'Untitled Event'}
                              </Text>
                              <div className={style({display: 'flex', alignItems: 'center', gap: 12})}>
                                <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
                                  <Calendar aria-hidden />
                                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                                    {formatDate(event.localStartDate)}
                                  </Text>
                                </div>
                                <StatusBadge status={event.published ? 'published' : 'draft'} />
                              </div>
                            </div>

                            {/* Actions */}
                            <ActionButton
                              isQuiet
                              onPress={() => handleEditEvent(event.eventId)}
                              aria-label={`Edit ${event.enTitle || 'event'}`}
                            >
                              <Edit />
                              <Text>Edit</Text>
                            </ActionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Content>
            <ButtonGroup>
              <Button variant="accent" onPress={() => { onClose(); close() }}>
                Close
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  )
}
