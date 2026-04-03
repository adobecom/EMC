import React, { useState, useEffect, useCallback } from "react";
import { ProgressCircle, Button, Heading, Text, InlineAlert } from "@react-spectrum/s2";
import AddCircle from "@react-spectrum/s2/icons/AddCircle";
import { Session, SessionTimeInfo } from "../../../types/sessions";
import { SessionsList } from "./SessionList";
import type { SessionFormData } from "./SessionForm";
import { useEventFormContext } from "../../../contexts";
import { EventApiResponse } from "../../../types/domain";
import { apiService, cachedApi } from "../../../services/api";
import { COLORS, SURFACES } from "../../../styles/designSystem";

function parseTagsFromApi(tags: unknown): string[] {
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (Array.isArray(tags)) return (tags as string[]).map((t) => String(t).trim()).filter(Boolean);
  return [];
}

function serializeTagsForApi(tags: string[] | undefined): string {
  return (tags ?? []).join(",");
}

function normalizeOptionalString(value: string | undefined): string {
  return (value ?? "").trim();
}

function normalizeOptionalNumber(value: number | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function normalizeIdList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))].sort();
}

function getNormalizedSessionFields(session: Session) {
  return {
    name: normalizeOptionalString(session.name),
    description: normalizeOptionalString(session.description),
    tags: serializeTagsForApi(session.tags),
  };
}

function getNormalizedSessionFieldsFromForm(data: SessionFormData) {
  return {
    name: normalizeOptionalString(data.name),
    description: normalizeOptionalString(data.description),
    tags: serializeTagsForApi(data.tags),
  };
}

function getNormalizedSessionTimeFields(session: Session) {
  return {
    startDateTime: session.startDateTime,
    endDateTime: session.endDateTime,
    isAutoRegistrationEnabled: session.sessionTime?.isAutoRegistrationEnabled !== false,
    attendeeLimit:
      session.sessionTime?.isAutoRegistrationEnabled === false
        ? normalizeOptionalNumber(session.sessionTime?.attendeeLimit)
        : undefined,
    locationId: session.locationId ?? undefined,
  };
}

function getNormalizedSessionTimeFieldsFromForm(data: SessionFormData) {
  return {
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    isAutoRegistrationEnabled: data.isAutoRegistrationEnabled !== false,
    attendeeLimit:
      data.isAutoRegistrationEnabled === false
        ? normalizeOptionalNumber(data.attendeeLimit)
        : undefined,
    locationId: data.locationId ?? undefined,
  };
}

function hasSessionFieldChanges(session: Session, data: SessionFormData): boolean {
  const current = getNormalizedSessionFields(session);
  const next = getNormalizedSessionFieldsFromForm(data);
  return (
    current.name !== next.name ||
    current.description !== next.description ||
    current.tags !== next.tags
  );
}

function hasSessionTimeFieldChanges(session: Session, data: SessionFormData): boolean {
  const current = getNormalizedSessionTimeFields(session);
  const next = getNormalizedSessionTimeFieldsFromForm(data);
  return (
    current.startDateTime !== next.startDateTime ||
    current.endDateTime !== next.endDateTime ||
    current.isAutoRegistrationEnabled !== next.isAutoRegistrationEnabled ||
    current.attendeeLimit !== next.attendeeLimit ||
    current.locationId !== next.locationId
  );
}

function hasSessionSpeakersChanges(data: SessionFormData): boolean {
  const current = normalizeIdList(data.originalSpeakerIds);
  const next = normalizeIdList(data.speakerIds);
  if (current.length !== next.length) return true;
  return current.some((id, index) => id !== next[index]);
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
    tags: parseTagsFromApi(item.tags),
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
    ? ((timesRes as any).sessionTimes as SessionTimeInfo[])
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
    locationId: sessionTime.locationId,
    sessionTime,
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
    ...(data.attendeeLimit && Number(data.attendeeLimit) > 0
      ? { attendeeLimit: Number(data.attendeeLimit) }
      : {}),
    ...(data.timezone ? { timezone: data.timezone } : {}),
    ...(data.locationId ? { locationId: data.locationId } : {}),
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

  const updateTimeRes = await apiService.updateSessionTime(
    data.sessionTimeId,
    {
      sessionId,
      eventId,
      startTimeMillis,
      endTimeMillis,
      creationTime: data.sessionTimeCreationTime,
      modificationTime: data.sessionTimeModificationTime,
      isAutoRegistrationEnabled: data.isAutoRegistrationEnabled !== false,
      ...(data.attendeeLimit != null && data.attendeeLimit > 0
        ? { attendeeLimit: data.attendeeLimit }
        : {}),
      ...(data.timezone ? { timezone: data.timezone } : {}),
      ...(data.locationId ? { locationId: data.locationId } : {}),
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
  const {
    eventId,
    mergeEventResponse,
    venueLocations,
    seriesSpeakers,
    setSeriesSpeakers,
    seriesId: contextSeriesId,
    formData,
  } = useEventFormContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const seriesId = contextSeriesId || formData.seriesId || "";

  const loadSeriesSpeakersIfNeeded = useCallback(async () => {
    if (!seriesId) return;
    if (seriesSpeakers.length > 0) return;
    try {
      const response = await cachedApi.getSpeakers(seriesId);
      if (response && !("error" in response)) {
        const speakers = response.speakers || response || [];
        setSeriesSpeakers(Array.isArray(speakers) ? speakers : []);
      }
    } catch (err) {
      console.error("Failed to load series speakers:", err);
    }
  }, [seriesId, seriesSpeakers.length, setSeriesSpeakers]);

  const refreshSeriesSpeakers = useCallback(async () => {
    if (!seriesId) return;
    try {
      const response = await cachedApi.getSpeakers(seriesId);
      if (response && !("error" in response)) {
        const speakers = response.speakers || response || [];
        setSeriesSpeakers(Array.isArray(speakers) ? speakers : []);
      }
    } catch (err) {
      console.error("Failed to load series speakers:", err);
    }
  }, [seriesId, setSeriesSpeakers]);

  const loadSessions = useCallback(async () => {
    if (!eventId) {
      setSessions([]);
      return;
    }
    setLoadError(null);
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const refreshEventConcurrencyMetadata = useCallback(
    async (id: string) => {
      cachedApi.invalidateCache(id);
      const refreshed = await apiService.getEventExternal(id);
      if ("error" in refreshed) return;
      const r = refreshed as EventApiResponse;
      const patch: Partial<EventApiResponse> = {};
      if (r.modificationTime != null) patch.modificationTime = r.modificationTime;
      if (r.creationTime != null) patch.creationTime = r.creationTime;
      if (Object.keys(patch).length > 0) mergeEventResponse(patch);
    },
    [mergeEventResponse],
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadSeriesSpeakersIfNeeded();
  }, [loadSeriesSpeakersIfNeeded]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!eventId) return;
    const res = await apiService.deleteSession(sessionId);
    if ("error" in res) {
      setLoadError(res.error?.message || String(res.error));
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await refreshEventConcurrencyMetadata(eventId);
    }
  };

  const handleAddSession = async (data: SessionFormData) => {
    if (!eventId) throw new Error("Event ID is required to create a session");
    const payload = {
      name: data.name,
      description: data.description,
      tags: serializeTagsForApi(data.tags),
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

    await refreshEventConcurrencyMetadata(eventId);

    const sessionWithTime: Session = {
      ...newSession,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      ...(data.isAutoRegistrationEnabled === false && data.attendeeLimit != null
        ? { capacity: data.attendeeLimit }
        : {}),
      locationId: data.locationId,
      sessionTime: {
        startTimeMillis: new Date(data.startDateTime + 'Z').getTime(),
        endTimeMillis: new Date(data.endDateTime + 'Z').getTime(),
        isAutoRegistrationEnabled: data.isAutoRegistrationEnabled,
        attendeeLimit: data.attendeeLimit != null ? Number(data.attendeeLimit) : undefined,
        locationId: data.locationId,
      },
    };
    setSessions((prev) => sortSessionsByDate([...prev, sessionWithTime]));
    setIsAddingNew(false);
  };

  const handleUpdateSession = async (
    sessionId: string,
    data: SessionFormData,
  ) => {
    if (!eventId) throw new Error("Event ID is required to update a session");
    const existingSession = sessions.find((s) => s.id === sessionId);
    if (!existingSession) {
      throw new Error("Session not found in current state");
    }

    const shouldUpdateSession = hasSessionFieldChanges(existingSession, data);
    const shouldUpdateSessionTime = hasSessionTimeFieldChanges(existingSession, data);

    let updatedSessionApi = existingSession;
    if (shouldUpdateSession) {
      const payload: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        tags: serializeTagsForApi(data.tags),
        creationTime: data.creationTime,
        modificationTime: data.modificationTime,
      };
      const res = await apiService.updateSession(sessionId, eventId, payload);
      if ("error" in res) {
        const msg = res.error?.message || String(res.error);
        throw new Error(msg);
      }
      updatedSessionApi = mapApiSessionToSession(res as any);
    }

    if (shouldUpdateSessionTime) {
      await upsertSessionTimeForSession(eventId, sessionId, data);
    }

    const shouldUpdateSpeakers = hasSessionSpeakersChanges(data);
    if (shouldUpdateSpeakers) {
      await syncSessionSpeakers(sessionId, data.speakerIds ?? []);
    }

    if (shouldUpdateSession || shouldUpdateSessionTime || shouldUpdateSpeakers) {
      await refreshEventConcurrencyMetadata(eventId);
    }

    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? {
              ...updatedSessionApi,
              startDateTime: data.startDateTime,
              endDateTime: data.endDateTime,
              capacity:
                data.isAutoRegistrationEnabled === false && data.attendeeLimit != null
                  ? Number(data.attendeeLimit)
                  : undefined,
              locationId: data.locationId,
              sessionTime: {
                ...s.sessionTime,
                startTimeMillis: new Date(data.startDateTime + 'Z').getTime(),
                endTimeMillis: new Date(data.endDateTime + 'Z').getTime(),
                isAutoRegistrationEnabled: data.isAutoRegistrationEnabled,
                attendeeLimit:
                  data.isAutoRegistrationEnabled === false && data.attendeeLimit != null
                    ? Number(data.attendeeLimit)
                    : undefined,
                locationId: data.locationId,
                sessionTimeId: data.sessionTimeId ?? s.sessionTime?.sessionTimeId,
              },
            }
          : s,
      );
      return sortSessionsByDate(updated);
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Heading level={2}>Sessions</Heading>
          <Text>Break down your event into sessions and add details.</Text>
        </div>
        <Button
          variant="secondary"
          aria-label="Add new session"
          onPress={() => setIsAddingNew(true)}
          isDisabled={isAddingNew}
        >
          <AddCircle />
          <Text>Add new session</Text>
        </Button>
      </div>

      {loadError ? (
        <InlineAlert variant="negative" UNSAFE_style={{ marginTop: "28px" }}>
          <Text>{loadError}</Text>
        </InlineAlert>
      ) : isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "32px" }}>
          <ProgressCircle isIndeterminate aria-label="Loading sessions" />
          <Text>Loading sessions</Text>
        </div>
      ) : sessions.length === 0 && !isAddingNew ? (
        <div
          style={{
            background: SURFACES.INPUT,
            border: `1px solid ${SURFACES.BORDER}`,
            borderRadius: "8px",
            height: "89px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            marginTop: "12px",
          }}
        >
          <span style={{ color: COLORS.DARK_GRAY, fontSize: "18px" }}>
            No sessions have been created yet for this event
          </span>
        </div>
      ) : (
        <SessionsList
          sessions={sessions}
          isAddingNew={isAddingNew}
          onCancelAdd={() => setIsAddingNew(false)}
          onAdd={handleAddSession}
          onDelete={handleDeleteSession}
          onSave={handleUpdateSession}
          venueLocations={venueLocations}
          seriesSpeakers={seriesSpeakers}
          onSpeakersRefresh={refreshSeriesSpeakers}
        />
      )}
    </div>
  );
};

export default Sessions;
