/*
 * <license header>
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flex,
  Item,
  Text,
  ComboBox,
  ProgressCircle,
} from "@adobe/react-spectrum";
import { SeriesSpeaker } from "../../types/domain";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts";
import { AddIcon } from "../icons/add";
import { SpeakerFormDialog } from "../../pages/SpeakersDashboard";

interface SessionSpeaker {
  speakerId: string;
  speakerType?: string;
  ordinal?: number;
}

export interface SpeakerSelectorProps {
  /** Series ID used to load the full list of available speakers. */
  seriesId: string;
  /** Session ID used to load speakers already assigned to this session. */
  sessionId?: string;
}

export const SpeakerSelector: React.FC<SpeakerSelectorProps> = ({
  seriesId,
  sessionId,
}) => {
  const toast = useToast();

  // All speakers loaded from the series
  const [speakers, setSpeakers] = useState<SeriesSpeaker[]>([]);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false);
  const [speakersError, setSpeakersError] = useState<string | null>(null);

  // Speakers already assigned to this session
  const [sessionSpeakers, setSessionSpeakers] = useState<SessionSpeaker[]>([]);
  const [loadingSessionSpeakers, setLoadingSessionSpeakers] = useState(false);

  const [selectedSpeakerKey, setSelectedSpeakerKey] = useState<string | null>(
    null,
  );
  const [addSpeakerDialogOpen, setAddSpeakerDialogOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load all speakers for the series (modelled after SpeakersDashboard)
  // ---------------------------------------------------------------------------
  const loadSpeakers = useCallback(async () => {
    if (!seriesId) {
      setSpeakers([]);
      return;
    }

    setIsLoadingSpeakers(true);
    setSpeakersError(null);

    try {
      const response = await apiService.getSpeakers(seriesId);

      if ("error" in response) {
        throw new Error(response.error);
      }

      const speakersData: SeriesSpeaker[] =
        response.speakers || response || [];
      setSpeakers(speakersData);
    } catch (err) {
      console.error("Error loading speakers:", err);
      setSpeakersError("Failed to load speakers");
    } finally {
      setIsLoadingSpeakers(false);
    }
  }, [seriesId]);

  // Trigger speaker list load when seriesId changes
  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  // ---------------------------------------------------------------------------
  // Load session-level speakers (speakers already assigned to this session)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) {
      setSessionSpeakers([]);
      return;
    }
    let cancelled = false;
    setLoadingSessionSpeakers(true);
    apiService.getSessionSpeakers(sessionId).then((res) => {
      if (cancelled) return;
      setLoadingSessionSpeakers(false);
      if (res && "error" in res) {
        setSessionSpeakers([]);
        return;
      }
      const speakers = (res as any)?.speakers ?? [];
      setSessionSpeakers(Array.isArray(speakers) ? speakers : []);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  // Set of speaker IDs already assigned to this session
  const sessionSpeakerIds = useMemo(
    () => new Set(sessionSpeakers.map((s) => s.speakerId)),
    [sessionSpeakers],
  );

  // ComboBox items: all series speakers + "Add new speaker" option
  const speakerComboItems = useMemo(() => {
    const items = speakers.map((s) => ({
      key: s.speakerId,
      label: `${s.firstName} ${s.lastName}`.trim() || s.speakerId,
      isSessionSpeaker: sessionSpeakerIds.has(s.speakerId),
    }));
    items.push({
      key: "__add__",
      label: "Add new speaker",
      isSessionSpeaker: false,
    });
    return items;
  }, [speakers, sessionSpeakerIds]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFormSubmit = useCallback(
    async (speakerData: any) => {
      if (!seriesId) return;

      setActionInProgress("new");

      try {
        const result = await apiService.createSpeaker(speakerData, seriesId);

        if ("error" in result) {
          throw new Error(result.error);
        }

        toast.success("Speaker created successfully!");

        setAddSpeakerDialogOpen(false);
        await loadSpeakers();
      } catch (err) {
        console.error("Error saving speaker:", err);
        toast.error("Failed to create speaker");
      } finally {
        setActionInProgress(null);
      }
    },
    [seriesId, loadSpeakers, toast],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Flex direction="column" gap="size-100">
      <Flex alignItems="center" gap="size-150">
        <Text>Speakers</Text>
        {(isLoadingSpeakers || loadingSessionSpeakers) && (
          <ProgressCircle
            size="S"
            isIndeterminate
            aria-label="Loading speakers"
          />
        )}
      </Flex>
      {speakersError && (
        <Text
          UNSAFE_style={{
            color: "var(--spectrum-global-color-red-600)",
            fontSize: "12px",
          }}
        >
          {speakersError}
        </Text>
      )}
      <ComboBox
        width="100%"
        aria-label="Session speakers"
        selectedKey={selectedSpeakerKey ?? undefined}
        onSelectionChange={(key) => {
          const k = key as string | null;
          setSelectedSpeakerKey(k ?? null);
          if (k === "__add__") setAddSpeakerDialogOpen(true);
        }}
        items={speakerComboItems}
      >
        {(item) => (
          <Item key={item.key} textValue={item.label}>
            {item.key === "__add__" ? (
              <>
                <AddIcon />
                <Text>Add new speaker</Text>
              </>
            ) : (
              <Text width="100%">
                {item.isSessionSpeaker ? `\u2713 ${item.label}` : item.label}
              </Text>
            )}
          </Item>
        )}
      </ComboBox>
      <SpeakerFormDialog
        isOpen={addSpeakerDialogOpen}
        onClose={() => {
          setAddSpeakerDialogOpen(false);
        }}
        onSubmit={handleFormSubmit}
        speaker={null}
        seriesId={seriesId}
        isSubmitting={!!actionInProgress}
      />
    </Flex>
  );
};
