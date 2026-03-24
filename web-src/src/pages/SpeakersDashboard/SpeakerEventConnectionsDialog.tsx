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
import {
  Dialog,
  DialogTrigger,
  Heading,
  Divider,
  Content,
  ButtonGroup,
  View,
  Flex,
  Text,
  ActionButton
} from '@adobe/react-spectrum'
import { Button } from '@react-spectrum/s2'
import Edit from '@spectrum-icons/workflow/Edit'
import Calendar from '@spectrum-icons/workflow/Calendar'
import Link from '@spectrum-icons/workflow/Link'
import { SpeakerDashboardItem } from './SpeakersDashboard'
import { EventApiResponse } from '../../types/domain'
import { StatusBadge } from '../../components/shared'

interface SpeakerEventConnectionsDialogProps {
  isOpen: boolean
  onClose: () => void
  speaker: SpeakerDashboardItem | null
  events: EventApiResponse[]
}

export const SpeakerEventConnectionsDialog: React.FC<SpeakerEventConnectionsDialogProps> = ({
  isOpen,
  onClose,
  speaker,
  events
}) => {
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
        <Heading>Event Connections</Heading>
        <Divider />
        <Content>
          <Flex direction="column" gap="size-300">
            {/* Speaker Info Header */}
            <View
              padding="size-200"
              borderRadius="medium"
              backgroundColor="gray-100"
            >
              <Flex alignItems="center" gap="size-200">
                {/* Speaker Avatar */}
                <View
                  UNSAFE_style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    backgroundColor: 'var(--spectrum-global-color-gray-300)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
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
                </View>
                
                <Flex direction="column" gap="size-50" flex={1}>
                  <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    {speakerName}
                  </Text>
                  {speaker?.title && (
                    <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      {speaker.title}
                    </Text>
                  )}
                </Flex>
                
                <Flex alignItems="center" gap="size-100">
                  <Link size="S" />
                  <Text UNSAFE_style={{ fontWeight: 'bold' }}>
                    {events.length} {events.length === 1 ? 'event' : 'events'}
                  </Text>
                </Flex>
              </Flex>
            </View>
            
            {/* Events List */}
            {events.length === 0 ? (
              <View
                padding="size-400"
                UNSAFE_style={{ textAlign: 'center' }}
              >
                <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
                  This speaker is not linked to any events.
                </Text>
              </View>
            ) : (
              <View
                maxHeight="size-4600"
                UNSAFE_style={{ overflowY: 'auto' }}
              >
                <Flex direction="column" gap="size-100">
                  {events.map(event => (
                    <View
                      key={event.eventId}
                      padding="size-200"
                      borderWidth="thin"
                      borderColor="gray-300"
                      borderRadius="medium"
                      UNSAFE_style={{
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer'
                      }}
                      // @ts-ignore - Spectrum View doesn't expose these but they work
                      onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)'}
                      onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Flex alignItems="center" gap="size-200">
                        {/* Event Info */}
                        <Flex direction="column" gap="size-50" flex={1}>
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>
                            {event.enTitle || event.title || 'Untitled Event'}
                          </Text>
                          <Flex alignItems="center" gap="size-150">
                            <Flex alignItems="center" gap="size-75">
                              <Calendar size="XS" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-500)' }} />
                              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                                {formatDate(event.localStartDate)}
                              </Text>
                            </Flex>
                            <StatusBadge status={event.published ? 'published' : 'draft'} />
                          </Flex>
                        </Flex>
                        
                        {/* Actions */}
                        <ActionButton
                          isQuiet
                          onPress={() => handleEditEvent(event.eventId)}
                          aria-label={`Edit ${event.enTitle || 'event'}`}
                        >
                          <Edit />
                          <Text>Edit</Text>
                        </ActionButton>
                      </Flex>
                    </View>
                  ))}
                </Flex>
              </View>
            )}
          </Flex>
        </Content>
        <ButtonGroup>
          <Button variant="accent" onPress={onClose}>
            Close
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogTrigger>
  )
}
