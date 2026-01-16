import React, { useState } from 'react'
import { Flex, Heading, Text, Well, View, ActionButton, Button} from '@adobe/react-spectrum'
import { Session } from '../../../types/sessions'
import Chip from '../../../components/shared/Chip'
import { COLORS } from '../../../styles/designSystem'
import { EditIcon } from '../../../components/icons/edit'
import { DeleteIcon } from '../../../components/icons/delete'
import { AddIcon } from '../../../components/icons/add'
import { formatTime, formatDate } from '../../../utils/shared'
import { SessionDetailComponent } from './sessionDetail'

// Define props interface for SessionItem
interface SessionItemProps {
  session: Session
}

// Component receives props object
const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const startTime = formatTime(session.startDateTime)
  const endTime = formatTime(session.endDateTime)
  const sessionDate = formatDate(session.startDateTime)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const handleConfirmDelete = () => {
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
            <Heading level={3} margin="size-0" UNSAFE_style={{ color: COLORS.GRAY_700 }}>{session.name}</Heading>
            <Text>{sessionDate} | {startTime} - {endTime}</Text>
            <Flex gap="size-150" marginTop="size-100">
              {session.tags && session.tags.map((tag) => (
                <Chip key={tag} text={tag} />
              ))}
            </Flex>
          </Flex>  
        </View>
        <View>
          <Flex gap="size-100">
            <ActionButton isQuiet aria-label="Edit">
              <EditIcon />
            </ActionButton>
            <ActionButton isQuiet aria-label="Delete" onPress={handleDeleteClick}>
              <DeleteIcon />
            </ActionButton>
          </Flex>
        </View>
      </Flex>

      {/* Delete Confirmation Overlay */}
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
          <Text>
            Are you sure you want to delete this session?
          </Text>
          <Flex gap="size-150">
            <Button variant="secondary" onPress={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="negative" style="fill" onPress={handleConfirmDelete}>
              Delete
            </Button>
          </Flex>
        </View>
      )}
    </View>
  )
}

// Component receives props object and destructures 'sessions'
export const SessionsList: React.FC= () => {
  const [sessions, setSessions] = useState([{
    id: '1',
    name: 'Adobe Express Activation',
    startDateTime: '2024-12-18T08:00:00.000Z',
    endDateTime: '2024-12-18T21:30:00.000Z',
    tags: ['Activation', 'Adobe Express'],
  }, {
    id: '2',
    name: 'Opening Keynote',
    startDateTime: '2024-12-18T08:00:00.000Z',
    endDateTime: '2024-12-18T21:30:00.000Z',
    tags: ['Adobe Express', 'Keynote'],
  }, {
    id: '3',
    name: 'The business case of Content Supply Chain in the era of AI',
    startDateTime: '2024-12-18T08:00:00.000Z',
    endDateTime: '2024-12-18T21:30:00.000Z',
    tags: ['AI', 'Content Supply Chain', 'Business'],
  }])

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId))
  }

  return (
    <View >
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" gap="size-100">
          <Heading level={2}>Sessions</Heading>
          <Text>Breakdown your event into sessions and add details</Text>
        </Flex>
        <View>
          <SessionDetailComponent />
        </View>
      </Flex>

      {/* Check if there are sessions */}
      {sessions.length === 0 ? (
        <Well UNSAFE_style={{ textAlign: 'center', marginTop: '28px' }}>
          No sessions have been created yet for this event
        </Well>
      ) : (
        <Flex direction="column" gap="size-150" marginTop="size-150">
          {sessions.map((session) => (
            <SessionItem 
              key={session.id} 
              session={session} 
              onDelete={handleDeleteSession}
            />
          ))}
        </Flex>

      )}
    </View>
  )
}

export default SessionsList