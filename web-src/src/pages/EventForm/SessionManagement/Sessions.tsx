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
      const response = await apiService.getSessions(eventId);
      if (response && "error" in response) {
        setLoadError(response.error?.message || String(response.error));
        setSessions([]);
        return;
      }
      const raw = response?.sessions ?? response?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list.map((item: any) => mapApiSessionToSession(item));
      setSessions(sortSessionsByDate(mapped));
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
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      tags: data.tags,
      isAutoRegistered: data.isAutoRegistered,
      capacityLimit: data.capacityLimit,
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

    setSessions((prev) => sortSessionsByDate([...prev, newSession]));
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
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      tags: data.tags,
      isAutoRegistered: data.isAutoRegistered,
      capacityLimit: data.capacityLimit,
    };
    if (data.creationTime != null) payload.creationTime = data.creationTime;
    if (data.modificationTime != null)
      payload.modificationTime = data.modificationTime;
    const res = await apiService.updateSession(sessionId, eventId, payload);
    if ("error" in res) {
      const msg = res.error?.message || String(res.error);
      throw new Error(msg);
    }

    await syncSessionSpeakers(sessionId, data.speakerIds ?? []);

    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? mapApiSessionToSession(res as any) : s,
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
