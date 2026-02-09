/* 
* <license header>
*/

import React, { useState } from 'react'
import {
  Flex,
  Heading,
  Text,
  View,
  ActionButton,
  Button,
  DialogTrigger,
} from '@adobe/react-spectrum'
import { Session } from '../../../types/sessions'
import Chip from '../../../components/shared/Chip'
import { COLORS } from '../../../styles/designSystem'
import { EditIcon } from '../../../components/icons/edit'
import { DeleteIcon } from '../../../components/icons/delete'
import { formatTime, formatDate } from '../../../utils/shared'
import { SessionDialog } from './SessionDialog'
import type { SessionFormData } from './SessionDialog'

export interface SessionItemProps {
  session: Session
  onDelete: (sessionId: string) => void
  onSave: (sessionId: string, data: SessionFormData) => void
}

export const SessionItem: React.FC<SessionItemProps> = ({ session, onDelete, onSave }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const startTime = formatTime(session.startDateTime)
  const endTime = formatTime(session.endDateTime)
  const sessionDate = formatDate(session.startDateTime)

  const handleDeleteClick = () => setShowDeleteConfirm(true)
  const handleCancelDelete = () => setShowDeleteConfirm(false)
  const handleConfirmDelete = () => {
    onDelete(session.id)
    setShowDeleteConfirm(false)
  }

  return (
    <View
      paddingTop="size-150"
      paddingBottom="size-150"
      paddingStart="size-200"
      paddingEnd="size-200"
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      UNSAFE_style={{ position: 'relative' }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <View>
          <Flex direction="column" gap="size-100">
            <Heading
              level={3}
              margin="size-0"
              UNSAFE_style={{ color: COLORS.GRAY_700 }}
            >
              {session.name}
            </Heading>
            <Text>
              {sessionDate} | {startTime} - {endTime}
            </Text>
            <Flex gap="size-150" marginTop="size-100">
              {session.tags?.map((tag) => <Chip key={tag} text={tag} />)}
            </Flex>
          </Flex>
        </View>
        <View>
          <Flex gap="size-100">
            <DialogTrigger>
              <ActionButton isQuiet aria-label="Edit">
                <EditIcon />
              </ActionButton>
              {(close) => (
                <SessionDialog
                  close={close}
                  session={session}
                  onSave={(data) => onSave(session.id, data)}
                />
              )}
            </DialogTrigger>
            <ActionButton
              isQuiet
              aria-label="Delete"
              onPress={handleDeleteClick}
            >
              <DeleteIcon />
            </ActionButton>
          </Flex>
        </View>
      </Flex>

      {showDeleteConfirm && (
        <View
          UNSAFE_style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '16px',
            padding: '12px 16px',
            zIndex: 10,
          }}
        >
          <Text>Are you sure you want to delete this session?</Text>
          <Flex gap="size-150">
            <Button variant="secondary" onPress={handleCancelDelete}>
              Cancel
            </Button>
            <Button
              variant="negative"
              style="fill"
              onPress={handleConfirmDelete}
            >
              Delete
            </Button>
          </Flex>
        </View>
      )}
    </View>
  )
}

export interface SessionsListProps {
  sessions: Session[]
  onDelete: (sessionId: string) => void
  onSave: (sessionId: string, data: SessionFormData) => void
}

export const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  onDelete,
  onSave,
}) => {
  return (
    <Flex direction="column" gap="size-150" marginTop="size-150">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          onDelete={onDelete}
          onSave={onSave}
        />
      ))}
    </Flex>
  )
}
