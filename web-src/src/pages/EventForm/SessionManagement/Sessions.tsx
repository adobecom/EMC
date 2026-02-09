/* 
* <license header>
*/

import React, { useState } from 'react'
import {
  Flex,
  Heading,
  Text,
  Well,
  View,
  Button,
  DialogTrigger,
} from '@adobe/react-spectrum'
import { Session } from '../../../types/sessions'
import { AddIcon } from '../../../components/icons/add'
import { SessionDialog } from './SessionDialog'
import type { SessionFormData } from './SessionDialog'
import { SessionsList } from './SessionList'

const INITIAL_SESSIONS: Session[] = [
  {
    id: '1',
    name: 'Adobe Express Activation',
    startDateTime: '2024-12-18T08:00:00.000Z',
    endDateTime: '2024-12-18T21:30:00.000Z',
    tags: ['Activation', 'Adobe Express'],
  },
  {
    id: '2',
    name: 'Opening Keynote',
    startDateTime: '2024-12-18T08:00:00.000Z',
    endDateTime: '2024-12-18T21:30:00.000Z',
    tags: ['Adobe Express', 'Keynote'],
  },
  {
    id: '3',
    name: 'The business case of Content Supply Chain in the era of AI',
    startDateTime: '2024-12-18T08:00:00.000Z',
    endDateTime: '2024-12-18T21:30:00.000Z',
    tags: ['AI', 'Content Supply Chain', 'Business'],
  },
]

export const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS)

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  const handleAddSession = (data: SessionFormData) => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: data.name,
      description: data.description,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      tags: data.tags ?? [],
    }
    setSessions((prev) => [...prev, newSession])
  }

  const handleUpdateSession = (sessionId: string, data: SessionFormData) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              name: data.name,
              description: data.description ?? s.description,
              startDateTime: data.startDateTime,
              endDateTime: data.endDateTime,
              tags: data.tags ?? s.tags ?? [],
            }
          : s
      )
    )
  }

  return (
    <View>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" gap="size-100">
          <Heading level={2}>Sessions</Heading>
          <Text>Breakdown your event into sessions and add details</Text>
        </Flex>
        <View>
          <DialogTrigger>
            <Button variant="secondary" style="fill" aria-label="Add new session">
              <AddIcon />
              <Text>Add new session</Text>
            </Button>
            {(close) => (
              <SessionDialog
                close={close}
                session={null}
                onSave={handleAddSession}
              />
            )}
          </DialogTrigger>
        </View>
      </Flex>

      {sessions.length === 0 ? (
        <Well UNSAFE_style={{ textAlign: 'center', marginTop: '28px' }}>
          No sessions have been created yet for this event
        </Well>
      ) : (
        <SessionsList
          sessions={sessions}
          onDelete={handleDeleteSession}
          onSave={handleUpdateSession}
        />
      )}
    </View>
  )
}

export default Sessions
