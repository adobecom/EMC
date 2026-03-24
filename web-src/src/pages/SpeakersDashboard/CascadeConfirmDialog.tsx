/* 
* <license header>
*/

/**
 * CascadeConfirmDialog - Dialog for confirming actions with cascade options
 * 
 * Used when a user wants to update or delete a speaker that is linked to events.
 * Provides options to:
 * - Update/Delete only the series-level speaker
 * - Cascade the change to all linked events
 */

import React, { useMemo } from 'react'
import {
  Dialog,
  DialogTrigger,
  Heading,
  Divider,
  Content,
  ButtonGroup,
  View,
  Flex,
  Text
} from '@adobe/react-spectrum'
import { Button } from '@react-spectrum/s2'
import Alert from '@spectrum-icons/workflow/Alert'
import Link from '@spectrum-icons/workflow/Link'
import { SpeakerDashboardItem } from './SpeakersDashboard'
import { EventApiResponse } from '../../types/domain'
import { COLORS } from '../../styles/designSystem'

export type CascadeAction = 'update' | 'delete'

interface CascadeConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (cascadeToEvents: boolean) => void
  speaker: SpeakerDashboardItem | null
  action: CascadeAction
  events: EventApiResponse[]
}

export const CascadeConfirmDialog: React.FC<CascadeConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  speaker,
  action,
  events
}) => {
  const speakerName = speaker ? `${speaker.firstName} ${speaker.lastName}` : ''
  const eventCount = events.length
  
  const actionText = useMemo(() => {
    switch (action) {
      case 'update':
        return {
          title: 'Update Speaker with Linked Events',
          description: 'This speaker is linked to events. How would you like to proceed?',
          cascadeLabel: 'Update Speaker & Cascade to Events',
          cascadeDescription: 'Update the speaker details and propagate changes to all linked events.',
          localLabel: 'Update Series Speaker Only',
          localDescription: 'Only update the series-level speaker. Event-level speaker data will remain unchanged.'
        }
      case 'delete':
        return {
          title: 'Delete Speaker with Linked Events',
          description: 'This speaker is linked to events. How would you like to proceed?',
          cascadeLabel: 'Delete & Remove from All Events',
          cascadeDescription: 'Delete the speaker from the series AND remove them from all linked events.',
          localLabel: 'Delete Series Speaker Only',
          localDescription: 'Delete the series-level speaker. The speaker will remain in linked events with potentially stale data.'
        }
      default:
        return {
          title: 'Confirm Action',
          description: '',
          cascadeLabel: 'Apply to All',
          cascadeDescription: '',
          localLabel: 'Apply Locally Only',
          localDescription: ''
        }
    }
  }, [action])
  
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="M">
        <Heading>{actionText.title}</Heading>
        <Divider />
        <Content>
          <Flex direction="column" gap="size-300">
            {/* Warning Header */}
            <View
              padding="size-200"
              borderRadius="medium"
              UNSAFE_style={{
                backgroundColor: 'var(--spectrum-global-color-yellow-100)',
                border: '1px solid var(--spectrum-global-color-yellow-400)'
              }}
            >
              <Flex alignItems="center" gap="size-150">
                <Alert size="S" UNSAFE_style={{ color: 'var(--spectrum-global-color-yellow-600)' }} />
                <Text>
                  <strong>{speakerName}</strong> is currently linked to{' '}
                  <strong>{eventCount} {eventCount === 1 ? 'event' : 'events'}</strong>.
                </Text>
              </Flex>
            </View>
            
            <Text>{actionText.description}</Text>
            
            {/* Linked Events Preview */}
            {eventCount > 0 && (
              <View
                padding="size-200"
                borderWidth="thin"
                borderColor="gray-300"
                borderRadius="medium"
                backgroundColor="gray-50"
                maxHeight="size-2000"
                UNSAFE_style={{ overflowY: 'auto' }}
              >
                <Flex direction="column" gap="size-100">
                  <Flex alignItems="center" gap="size-100">
                    <Link size="S" />
                    <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      Linked Events:
                    </Text>
                  </Flex>
                  <Flex direction="column" gap="size-50" marginStart="size-300">
                    {events.slice(0, 5).map(event => (
                      <Text key={event.eventId} UNSAFE_style={{ fontSize: '13px' }}>
                        • {event.enTitle || event.title || event.eventId}
                      </Text>
                    ))}
                    {eventCount > 5 && (
                      <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-600)' }}>
                        ... and {eventCount - 5} more
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </View>
            )}
            
            {/* Action Options */}
            <Flex direction="column" gap="size-200">
              {/* Cascade Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onConfirm(true)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm(true)}
                style={{
                  padding: '16px',
                  border: '1px solid var(--spectrum-global-color-gray-300)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Flex direction="column" gap="size-50">
                  <Text UNSAFE_style={{ fontWeight: 'bold', color: action === 'delete' ? COLORS.RED_600 : 'inherit' }}>
                    {actionText.cascadeLabel}
                  </Text>
                  <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    {actionText.cascadeDescription}
                  </Text>
                </Flex>
              </div>
              
              {/* Local Only Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onConfirm(false)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm(false)}
                style={{
                  padding: '16px',
                  border: '1px solid var(--spectrum-global-color-gray-300)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Flex direction="column" gap="size-50">
                  <Text UNSAFE_style={{ fontWeight: 'bold' }}>
                    {actionText.localLabel}
                  </Text>
                  <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    {actionText.localDescription}
                  </Text>
                </Flex>
              </div>
            </Flex>
          </Flex>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogTrigger>
  )
}
