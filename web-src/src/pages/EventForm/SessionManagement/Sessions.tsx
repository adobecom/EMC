import React, { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Heading,
  Text,
  Well,
  View,
  Button,
  DialogTrigger,
} from "@adobe/react-spectrum";
import { Session } from "../../../types/sessions";
import { AddIcon } from "../../../components/icons/add";
import { SessionDialog } from "./SessionDialog";
import type { SessionFormData } from "./SessionDialog";
import { SessionsList } from "./SessionList";
import { useEventFormContext } from "../../../contexts";
import { apiService } from "../../../services/api";

/** Map API session shape to UI Session (handles sessionId/enTitle vs id/name) */
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

export const Sessions: React.FC = () => {
  const { eventId } = useEventFormContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!eventId) {
      setSessions([]);
      return;
    }
    setLoadError(null);
    try {
      const response = (await apiService.getSessions(eventId)) as {
        data?: Session[];
        sessions?: unknown[];
      };
      const raw = response?.data ?? response?.sessions ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setSessions(
        list.map((item: Record<string, unknown>) =>
          mapApiSessionToSession(item),
        ),
      );
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
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } else {
      setLoadError(res.error ?? "Failed to delete session");
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
    };
    const res = await apiService.createSession(eventId, payload);
    if (res.success && res.data) {
      const raw = res.data as Record<string, unknown>;
      setSessions((prev) => [...prev, mapApiSessionToSession(raw)]);
    } else {
      setLoadError(res.error ?? "Failed to create session");
      throw new Error(res.error ?? "Failed to create session");
    }
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
    };
    if (data.creationTime != null) payload.creationTime = data.creationTime;
    if (data.modificationTime != null)
      payload.modificationTime = data.modificationTime;
    const res = await apiService.updateSession(sessionId, eventId, payload);
    if (res.success && res.data) {
      const raw = res.data as Record<string, unknown>;
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? mapApiSessionToSession(raw) : s)),
      );
    } else {
      setLoadError(res.error ?? "Failed to update session");
      throw new Error(res.error ?? "Failed to update session");
    }
  };

  return (
    <View>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" gap="size-100">
          <Heading level={2}>Sessions</Heading>
          <Text>Breakdown your event into sessions and add details</Text>
        </Flex>
        <View>
          <DialogTrigger>
            <Button
              variant="secondary"
              style="fill"
              aria-label="Add new session"
            >
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

      {loadError ? (
        <Well UNSAFE_style={{ textAlign: "center", marginTop: "28px" }}>
          <Text>{loadError}</Text>
        </Well>
      ) : sessions.length === 0 ? (
        <Well UNSAFE_style={{ textAlign: "center", marginTop: "28px" }}>
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
  );
};

export default Sessions;
