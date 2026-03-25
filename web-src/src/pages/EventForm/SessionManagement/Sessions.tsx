import React, { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Heading,
  Text,
  Well,
  View,
  Button,
} from "@adobe/react-spectrum";
import { Session } from "../../../types/sessions";
import { AddIcon } from "../../../components/icons/add";
import { SessionsList } from "./SessionList";
import type { SessionFormData } from "./SessionForm";
import { useEventFormContext } from "../../../contexts";
import { apiService } from "../../../services/api";

interface SessionTimeData {
  sessionTimeId?: string;
  startTimeMillis?: number;
  endTimeMillis?: number;
  attendeeLimit?: number;
  isAutoRegistrationEnabled?: boolean;
  creationTime?: number;
  modificationTime?: number;
}

function mapApiSessionToSession(item: Record<string, unknown>): Session {
  return {
    id: String(item.id ?? item.sessionId ?? ""),
    name: String(item.name ?? item.enTitle ?? item.title ?? ""),
    description:
      item.description != null ? String(item.description) : undefined,
    startDateTime: String(item.startDateTime ?? ""),
    endDateTime: String(item.endDateTime ?? ""),
    capacity: item.capacity != null ? Number(item.capacity) : undefined,
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
  };
}

function sortSessionsByDate(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) =>
    a.startDateTime.localeCompare(b.startDateTime),
  );
}

async function hydrateSessionWithTime(session: Session): Promise<Session> {
  const timesRes = await apiService.getSessionTimes(session.id);
  if (timesRes && "error" in timesRes) return session;

  const times = Array.isArray((timesRes as any)?.sessionTimes)
    ? ((timesRes as any).sessionTimes as SessionTimeData[])
    : [];

  // Current UI supports exactly one session-time per session, so we use the first item.
  const sessionTime = times[0];
  if (!sessionTime) return session;

  const startDateTime =
    sessionTime.startTimeMillis != null
      ? new Date(Number(sessionTime.startTimeMillis)).toISOString()
      : session.startDateTime;
  const endDateTime =
    sessionTime.endTimeMillis != null
      ? new Date(Number(sessionTime.endTimeMillis)).toISOString()
      : session.endDateTime;

  return {
    ...session,
    startDateTime,
    endDateTime,
    capacity:
      sessionTime.isAutoRegistrationEnabled === false &&
      sessionTime.attendeeLimit != null
        ? Number(sessionTime.attendeeLimit)
        : session.capacity,
  };
}

async function createSessionTimeForSession(
  eventId: string,
  sessionId: string,
  data: SessionFormData,
): Promise<void> {
  const startTimeMillis = new Date(data.startDateTime + 'Z').getTime();
  const endTimeMillis = new Date(data.endDateTime + 'Z').getTime();
  const sessionTimeRes = await apiService.createSessionTime({
    eventId,
    sessionId,
    startTimeMillis,
    endTimeMillis,
    isAutoRegistrationEnabled: data.isAutoRegistrationEnabled !== false,
    ...(data.isAutoRegistrationEnabled === false && data.attendeeLimit != null
      ? { attendeeLimit: data.attendeeLimit }
      : {}),
  });

  if ("error" in sessionTimeRes) {
    throw new Error(
      sessionTimeRes.error?.message || String(sessionTimeRes.error),
    );
  }
}

async function upsertSessionTimeForSession(
  eventId: string,
  sessionId: string,
  data: SessionFormData,
): Promise<void> {
  const startTimeMillis = new Date(data.startDateTime + 'Z').getTime();
  const endTimeMillis = new Date(data.endDateTime + 'Z').getTime();
  if (!data.sessionTimeId) {
    await createSessionTimeForSession(eventId, sessionId, data);
    return;
  }

  const existingTimeRes = await apiService.getSessionTime(data.sessionTimeId);
  if ("error" in existingTimeRes) {
    throw new Error(
      existingTimeRes.error?.message || String(existingTimeRes.error),
    );
  }

  const existingTime = existingTimeRes as SessionTimeData;
  const updateTimeRes = await apiService.updateSessionTime(
    data.sessionTimeId,
    {
      sessionId,
      eventId,
      startTimeMillis,
      endTimeMillis,
      isAutoRegistrationEnabled: data.isAutoRegistrationEnabled !== false,
      ...(data.isAutoRegistrationEnabled === false
        ? (data.attendeeLimit != null
            ? { attendeeLimit: data.attendeeLimit }
            : (existingTime.attendeeLimit != null
                ? { attendeeLimit: existingTime.attendeeLimit }
                : {}))
        : {}),
      allowWaitlisting: (existingTime as any).allowWaitlisting ?? false,
      waitlistAttendeeLimit:
        (existingTime as any).waitlistAttendeeLimit ?? 100,
      creationTime:
        data.sessionTimeCreationTime ?? existingTime.creationTime,
      modificationTime:
        data.sessionTimeModificationTime ?? existingTime.modificationTime,
    },
  );

  if ("error" in updateTimeRes) {
    throw new Error(
      updateTimeRes.error?.message || String(updateTimeRes.error),
    );
  }
}

async function syncSessionSpeakers(
  sessionId: string,
  selectedIds: string[],
): Promise<void> {
  const speakersRes = await apiService.getSessionSpeakers(sessionId);
  const currentIds: string[] =
    speakersRes && !("error" in speakersRes)
      ? ((speakersRes as any)?.speakers ?? []).map((s: any) =>
          String(s.speakerId),
        )
      : [];
  const toRemove = currentIds.filter((id) => !selectedIds.includes(id));
  const toAdd = selectedIds.filter((id) => !currentIds.includes(id));
  await Promise.all(
    toRemove.map((id) => apiService.deleteSessionSpeaker(sessionId, id)),
  );
  const baseOrdinal = currentIds.length - toRemove.length;
  await Promise.all(
    toAdd.map((id, index) =>
      apiService.addSessionSpeaker(sessionId, {
        speakerId: id,
        speakerType: "Speaker",
        ordinal: baseOrdinal + index + 1,
      }),
    ),
  );
}

export const Sessions: React.FC = () => {
  const { eventId } = useEventFormContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!eventId) {
      setSessions([]);
      return;
    }
    setLoadError(null);
    try {
      const response = await apiService.getAllEventSessions(eventId);
      if (response && "error" in response) {
        setLoadError(response.error?.message || String(response.error));
        setSessions([]);
        return;
      }
      const raw = response?.sessions ?? response?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list.map((item: any) => mapApiSessionToSession(item));
      // Session list UI reads date/time/capacity from Session objects, so hydrate
      // each session with its single session-time data before storing state.
      const withTimes = await Promise.all(mapped.map(hydrateSessionWithTime));
      setSessions(sortSessionsByDate(withTimes));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load sessions";
      setLoadError(message);
      setSessions([]);
    }
  }, [eventId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    const res = await apiService.deleteSession(sessionId);
    if ("error" in res) {
      setLoadError(res.error?.message || String(res.error));
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  };

  const handleAddSession = async (data: SessionFormData) => {
    if (!eventId) throw new Error("Event ID is required to create a session");
    const payload = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      ...(data.timezone ? { timezone: data.timezone } : {}),
    };
    const res = await apiService.createSession(eventId, payload);
    if ("error" in res) {
      const msg = res.error?.message || String(res.error);
      throw new Error(msg);
    }
    const newSession = mapApiSessionToSession(res as any);

    if (data.speakerIds && data.speakerIds.length > 0 && newSession.id) {
      const speakerPromises = data.speakerIds.map((speakerId, index) =>
        apiService.addSessionSpeaker(newSession.id, {
          speakerId,
          speakerType: "Speaker",
          ordinal: index + 1,
        })
      );
      await Promise.allSettled(speakerPromises);
    }

    try {
      await createSessionTimeForSession(eventId, newSession.id, data);
    } catch (err) {
      throw err;
    }

    const sessionWithTime: Session = {
      ...newSession,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      ...(data.isAutoRegistrationEnabled === false && data.attendeeLimit != null
        ? { capacity: data.attendeeLimit }
        : {}),
    };
    setSessions((prev) => sortSessionsByDate([...prev, sessionWithTime]));
    setIsAddingNew(false);
  };

  const handleUpdateSession = async (
    sessionId: string,
    data: SessionFormData,
  ) => {
    if (!eventId) throw new Error("Event ID is required to update a session");
    const payload: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      tags: data.tags,
      ...(data.timezone ? { timezone: data.timezone } : {}),
    };
    if (data.creationTime != null) payload.creationTime = data.creationTime;
    if (data.modificationTime != null)
      payload.modificationTime = data.modificationTime;
    const res = await apiService.updateSession(sessionId, eventId, payload);
    if ("error" in res) {
      const msg = res.error?.message || String(res.error);
      throw new Error(msg);
    }

    await upsertSessionTimeForSession(eventId, sessionId, data);

    await syncSessionSpeakers(sessionId, data.speakerIds ?? []);

    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? {
              ...mapApiSessionToSession(res as any),
              startDateTime: data.startDateTime,
              endDateTime: data.endDateTime,
              ...(data.isAutoRegistrationEnabled === false && data.attendeeLimit != null
                ? { capacity: data.attendeeLimit }
                : {}),
            }
          : s,
      );
      return sortSessionsByDate(updated);
    });
  };

  return (
    <View>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" gap="size-100">
          <Heading level={2}>Sessions</Heading>
          <Text>Breakdown your event into sessions and add details</Text>
        </Flex>
        <View>
          <Button
            variant="secondary"
            style="fill"
            aria-label="Add new session"
            onPress={() => setIsAddingNew(true)}
            isDisabled={isAddingNew}
          >
            <AddIcon />
            <Text>Add new session</Text>
          </Button>
        </View>
      </Flex>

      {loadError ? (
        <Well UNSAFE_style={{ textAlign: "center", marginTop: "28px" }}>
          <Text>{loadError}</Text>
        </Well>
      ) : sessions.length === 0 && !isAddingNew ? (
        <Well UNSAFE_style={{ textAlign: "center", marginTop: "28px" }}>
          No sessions have been created yet for this event
        </Well>
      ) : (
        <SessionsList
          sessions={sessions}
          isAddingNew={isAddingNew}
          onCancelAdd={() => setIsAddingNew(false)}
          onAdd={handleAddSession}
          onDelete={handleDeleteSession}
          onSave={handleUpdateSession}
        />
      )}
    </View>
  );
};

export default Sessions;
