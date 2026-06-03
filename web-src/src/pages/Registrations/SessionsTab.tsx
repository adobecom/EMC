/*
* <license header>
*/

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Text, SearchField, Picker, PickerItem, Badge, ActionButton } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Download from '@react-spectrum/s2/icons/Download'
import CalendarIllustration from '@react-spectrum/s2/illustrations/linear/Calendar'
import NoSearchResults from '@react-spectrum/s2/illustrations/linear/NoSearchResults'
import type { Attendee } from '../../types/attendee'
import type { SessionRow, SessionTimeAttendee, SessionTimeInfo } from '../../types/sessions'
import { apiService } from '../../services/api'
import { DataTable, TableColumn, ResourceEmptyState } from '../../components/shared'
import { COLORS } from '../../styles/designSystem'
import { useHasPermission } from '../../hooks/useHasPermission'
import { generateCsv, downloadCsv, sanitizeFilename, exportDatetime, CsvColumn } from '../../utils/csvExport'

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

function isPageSize(n: number): n is (typeof PAGE_SIZE_OPTIONS)[number] {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
}

interface EnrichedSessionAttendee {
  attendeeId: string
  registrationStatus: 'registered' | 'waitlisted'
  firstName?: string
  lastName?: string
  email?: string
}

const SESSION_CSV_COLUMNS: CsvColumn[] = [
  { key: 'sessionName', label: 'Session Name' },
  { key: 'attendeeName', label: 'Attendee Name' },
  { key: 'email', label: 'Email' },
  { key: 'registrationStatus', label: 'Registration Status' },
]

interface SessionsTabProps {
  eventId: string
  eventTitle: string
  attendees: Attendee[]
}

export const SessionsTab: React.FC<SessionsTabProps> = ({
  eventId,
  eventTitle,
  attendees,
}) => {
  const isAdmin = useHasPermission('user', 'read')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set())
  const [sessionAttendeeMap, setSessionAttendeeMap] = useState<Record<string, EnrichedSessionAttendee[]>>({})
  const [loadingSessionIds, setLoadingSessionIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE)

  // Build a lookup map from attendeeId → Attendee for fast cross-reference
  const attendeeMap = useMemo(() => {
    const map = new Map<string, Attendee>()
    for (const a of attendees) {
      map.set(a.attendeeId, a)
    }
    return map
  }, [attendees])

  // ---- Data loading ----

  const loadSessions = useCallback(async () => {
    if (!eventId) {
      setSessions([])
      return
    }

    setIsLoadingSessions(true)
    try {
      const response = await apiService.getAllEventSessions(eventId)
      if (response && 'error' in response) {
        setSessions([])
        return
      }

      const raw = response?.sessions ?? response?.data ?? []
      const list = Array.isArray(raw) ? raw : []

      // Hydrate each session with its session-time data (attendeeCount, etc.)
      const rows: SessionRow[] = await Promise.all(
        list.map(async (item: Record<string, unknown>) => {
          const sessionId = String(item.id ?? item.sessionId ?? '')
          const name = String(item.name ?? item.enTitle ?? item.title ?? '')

          let sessionTimeId = ''
          let attendeeCount = 0
          let waitlistAttendeeCount = 0
          let attendeeLimit: number | undefined

          try {
            const timesRes = await apiService.getSessionTimes(sessionId)
            if (timesRes && !('error' in timesRes)) {
              const times: SessionTimeInfo[] = Array.isArray(timesRes?.sessionTimes)
                ? timesRes.sessionTimes
                : []
              const sessionTime = times[0]
              if (sessionTime) {
                sessionTimeId = sessionTime.sessionTimeId ?? ''
                attendeeCount = sessionTime.attendeeCount ?? 0
                waitlistAttendeeCount = sessionTime.waitlistAttendeeCount ?? 0
                attendeeLimit = sessionTime.attendeeLimit
              }
            }
          } catch {
            // If session-time fetch fails, show 0 counts
          }

          return {
            sessionId,
            sessionTimeId,
            name,
            attendeeCount,
            waitlistAttendeeCount,
            attendeeLimit,
          }
        })
      )

      setSessions(rows)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }, [eventId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Reset all state when event changes
  useEffect(() => {
    setSessions([])
    setExpandedSessionIds(new Set())
    setSessionAttendeeMap({})
    setLoadingSessionIds(new Set())
    setSearchQuery('')
    setTablePageSize(DEFAULT_PAGE_SIZE)
  }, [eventId])

  // ---- Export ----

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const allRows = await Promise.all(
        sessions.map(async (session) => {
          let attendeeList = sessionAttendeeMap[session.sessionId]

          if (!attendeeList && session.sessionTimeId) {
            try {
              const result = await apiService.getSessionTimeAttendees(session.sessionTimeId)
              if (result && !('error' in result)) {
                const raw: SessionTimeAttendee[] = Array.isArray(result?.attendees) ? result.attendees : []
                attendeeList = raw.map(sta => {
                  const match = attendeeMap.get(sta.attendeeId)
                  return {
                    attendeeId: sta.attendeeId,
                    registrationStatus: sta.registrationStatus,
                    firstName: match?.firstName,
                    lastName: match?.lastName,
                    email: match?.email,
                  }
                })
              }
            } catch {
              // Skip sessions whose attendees fail to load
            }
          }

          if (!attendeeList) return []

          return attendeeList.map(attendee => ({
            sessionName: session.name,
            attendeeName: [attendee.firstName, attendee.lastName].filter(Boolean).join(' ') || attendee.email || attendee.attendeeId,
            email: attendee.email ?? '',
            registrationStatus: attendee.registrationStatus === 'registered' ? 'Registered' : 'Waitlisted',
          }))
        })
      )

      const rows = allRows.flat()
      const csv = generateCsv(rows, SESSION_CSV_COLUMNS)
      downloadCsv(csv, `${sanitizeFilename(eventTitle || 'event')}_sessions_registrations_${exportDatetime()}.csv`)
    } finally {
      setIsExporting(false)
    }
  }, [sessions, sessionAttendeeMap, attendeeMap, eventTitle])

  // ---- Expand / collapse ----

  const loadSessionAttendees = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId)
    if (!session?.sessionTimeId) return

    setLoadingSessionIds(prev => new Set(prev).add(sessionId))
    try {
      const result = await apiService.getSessionTimeAttendees(session.sessionTimeId)
      if (result && !('error' in result)) {
        const raw: SessionTimeAttendee[] = Array.isArray(result?.attendees) ? result.attendees : []
        const enriched: EnrichedSessionAttendee[] = raw.map(sta => {
          const match = attendeeMap.get(sta.attendeeId)
          return {
            attendeeId: sta.attendeeId,
            registrationStatus: sta.registrationStatus,
            firstName: match?.firstName,
            lastName: match?.lastName,
            email: match?.email,
          }
        })
        setSessionAttendeeMap(prev => ({ ...prev, [sessionId]: enriched }))
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingSessionIds(prev => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }, [sessions, attendeeMap])

  const handleToggleSessionExpand = useCallback((sessionId: string) => {
    setExpandedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
        // Lazy load on first expand
        if (!sessionAttendeeMap[sessionId]) {
          loadSessionAttendees(sessionId)
        }
      }
      return next
    })
  }, [sessionAttendeeMap, loadSessionAttendees])

  // ---- Expanded content renderer ----

  const renderExpandedContent = useCallback((session: SessionRow) => {
    const attendeeList = sessionAttendeeMap[session.sessionId] || []
    const isLoading = loadingSessionIds.has(session.sessionId)

    if (!session.sessionTimeId) {
      return (
        <div style={{ padding: 24 }}>
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            No session time configured
          </Text>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div style={{ padding: 24 }}>
          <Text>Loading registrants...</Text>
        </div>
      )
    }

    if (attendeeList.length === 0) {
      return (
        <div style={{ padding: 24 }}>
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            No registrants for this session
          </Text>
        </div>
      )
    }

    return (
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        <div className="user-card-list">
          {attendeeList.map(attendee => {
            const displayName = [attendee.firstName, attendee.lastName].filter(Boolean).join(' ')
              || attendee.email
              || attendee.attendeeId

            return (
              <div className="user-card" key={attendee.attendeeId}>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'start'})}>
                  <Text UNSAFE_style={{ fontWeight: 600 }}>
                    {displayName}
                  </Text>
                  {attendee.email && (
                    <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      {attendee.email}
                    </Text>
                  )}
                </div>
                <Badge variant={attendee.registrationStatus === 'registered' ? 'positive' : 'neutral'}>
                  {attendee.registrationStatus === 'registered' ? 'Registered' : 'Waitlisted'}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [sessionAttendeeMap, loadingSessionIds])

  // ---- Search / filter ----

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(s => s.name.toLowerCase().includes(q))
  }, [sessions, searchQuery])

  // ---- Table columns ----

  const columns: TableColumn<SessionRow>[] = useMemo(() => [
    {
      key: 'name',
      name: 'SESSION',
      width: 300,
      sortable: true,
      render: (session) => (
        <Text UNSAFE_style={{ fontWeight: 600 }}>{session.name}</Text>
      )
    },
    {
      key: 'attendeeCount',
      name: 'REGISTRATIONS',
      width: 150,
      sortable: true,
      render: (session) => (
        <Text>
          {session.attendeeCount}
          {session.attendeeLimit != null && (
            <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
              {' / '}{session.attendeeLimit}
            </Text>
          )}
        </Text>
      )
    },
    {
      key: 'waitlistAttendeeCount',
      name: 'WAITLISTED',
      width: 120,
      sortable: true,
      render: (session) => (
        <Text>{session.waitlistAttendeeCount}</Text>
      )
    },
  ], [])

  // ---- Empty states ----

  const emptyState = useMemo(() => {
    if (!eventId) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<CalendarIllustration aria-hidden />}
          title="Select an event"
          description="Choose an event to view session registrations."
        />
      )
    }
    if (isLoadingSessions) return undefined
    if (sessions.length === 0) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<CalendarIllustration aria-hidden />}
          title="No sessions"
          description="This event has no sessions configured yet."
        />
      )
    }
    if (filteredSessions.length === 0) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<NoSearchResults aria-hidden />}
          title="No matching sessions"
          description="Try adjusting your search to find sessions."
        />
      )
    }
    return undefined
  }, [eventId, isLoadingSessions, sessions.length, filteredSessions.length])

  if (!eventId) {
    return (
      <div style={{ padding: '32px' }}>
        <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
          Select an event to view session registrations
        </Text>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ backgroundColor: 'var(--spectrum-global-color-gray-100)', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <div className={style({display: 'flex', gap: 48, flexWrap: 'wrap'})}>
          <StatItem label="Total Sessions" value={sessions.length} />
          <StatItem
            label="Total Registrations"
            value={sessions.reduce((sum, s) => sum + s.attendeeCount, 0)}
          />
          <StatItem
            label="Total Waitlisted"
            value={sessions.reduce((sum, s) => sum + s.waitlistAttendeeCount, 0)}
          />
        </div>
      </div>

      {/* Table tools */}
      {sessions.length > 0 && (
        <div
          className={style({
            display: 'flex',
            justifyContent: 'end',
            alignItems: 'end',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          })}
        >
          <Picker
            label="Rows per page"
            selectedKey={String(tablePageSize)}
            onSelectionChange={(key) => {
              const n = Number(key)
              if (isPageSize(n)) setTablePageSize(n)
            }}
            styles={style({ width: 120 })}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <PickerItem key={n} id={String(n)}>
                {String(n)}
              </PickerItem>
            ))}
          </Picker>
          {isAdmin && (
            <ActionButton
              aria-label="Export sessions to CSV"
              onPress={handleExport}
              isPending={isExporting}
            >
              <Download />
            </ActionButton>
          )}
          <div className={style({ width: 240 })}>
            <SearchField
              label="Search sessions"
              placeholder="Search by session name"
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              styles={style({ width: '[100%]' })}
            />
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <DataTable
          columns={columns}
          data={filteredSessions}
          getItemKey={(item) => item.sessionId}
          pageSize={tablePageSize}
          emptyState={emptyState}
          renderExpandedContent={renderExpandedContent}
          expandedKeys={expandedSessionIds}
          onToggleExpand={handleToggleSessionExpand}
        />
      </div>
    </div>
  )
}

const StatItem: React.FC<{
  label: string
  value: number
}> = ({ label, value }) => (
  <div className={style({display: 'flex', flexDirection: 'column', gap: 4})}>
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

export default SessionsTab
