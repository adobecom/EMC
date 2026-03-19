/*
 * <license header>
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Heading,
  Text,
  View,
  Button,
  TextField,
  DatePicker,
  TimeField,
  ActionGroup,
  Item,
  Checkbox,
  ProgressCircle,
  SearchField,
  Form,
} from "@adobe/react-spectrum";
import {
  CalendarDate,
  Time,
} from "@internationalized/date";
import { Session } from "../../../types/sessions";
import { EventTag, SeriesSpeaker } from "../../../types/domain";
import { apiService, cachedApi } from "../../../services/api";
import { useEventFormContext } from "../../../contexts";
import { RichTextEditor, TagSelector } from "../../../components/shared";
import {
  dateAndTimeToISO,
  parseTimeFromDateTime,
  safeParseDateTimeString,
} from "../../../utils/dateTime";
import { SpeakerPickerDialog } from "../SpeakerPickerDialog";

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface SessionFormData {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags?: string[];
  creationTime?: number;
  modificationTime?: number;
  /** Speaker IDs; applied after session create/update on save */
  speakerIds?: string[];
  /** When true, attendees are auto-registered; when false, registration is required */
  isAutoRegistrationEnabled?: boolean;
  /** Maximum attendee capacity when registration is required */
  attendeeLimit?: number;
  /** Existing session-time id for edit flows */
  sessionTimeId?: string;
  /** Existing session-time creation timestamp for optimistic updates */
  sessionTimeCreationTime?: number;
  /** Existing session-time modification timestamp for optimistic updates */
  sessionTimeModificationTime?: number;
  /** IANA timezone inherited from the event (e.g. "America/Los_Angeles") */
  timezone?: string;
}

type SessionTimeRegistrationFields = {
  isAutoRegistrationEnabled?: boolean;
};

function getIsAutoRegistrationEnabled(
  primaryTime: SessionTimeRegistrationFields | null,
): boolean {
  if (primaryTime?.isAutoRegistrationEnabled !== undefined) {
    return primaryTime.isAutoRegistrationEnabled;
  }
  return false;
}

function stringsToEventTags(tags: string[] | undefined): EventTag[] {
  if (!tags?.length) return [];
  return tags.map((t) => ({ name: t, caasId: t }));
}

function tagsToString(tags: EventTag[]): string[] {
  return tags.map((t) => t.caasId ?? t.name);
}

export function mapApiToSession(item: Record<string, unknown>): Session {
  const loc = (
    item.localizations as Record<
      string,
      { title?: string; description?: string }
    >
  )?.["en-US"];
  return {
    id: String(item.sessionId ?? item.id ?? ""),
    name: String(item.enTitle ?? item.title ?? loc?.title ?? ""),
    description:
      item.description != null
        ? String(item.description)
        : loc?.description != null
          ? String(loc.description)
          : undefined,
    startDateTime: String(item.startDateTime ?? ""),
    endDateTime: String(item.endDateTime ?? ""),
    capacity: item.capacity != null ? Number(item.capacity) : undefined,
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
  };
}

// ============================================================================
// SESSION FORM (inline add / edit)
// ============================================================================

interface SessionFormProps {
  /** When null the form is blank (add mode). When provided the form is pre-filled (edit mode). */
  session: Session | null;
  onSave: (data: SessionFormData) => Promise<void>;
  onCancel: () => void;
}

export const SessionForm: React.FC<SessionFormProps> = ({
  session,
  onSave,
  onCancel,
}) => {
  const isEditMode = session !== null;
  const { seriesId: contextSeriesId, formData, locale } = useEventFormContext();
  const seriesId = contextSeriesId || formData.seriesId || "";

  const [loadingDetails, setLoadingDetails] = useState(
    isEditMode && !!session?.id,
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const [name, setName] = useState(session?.name ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [date, setDate] = useState<CalendarDate | null>(() => {
    if (session?.startDateTime) {
      const dt = safeParseDateTimeString(session.startDateTime);
      return dt ? new CalendarDate(dt.year, dt.month, dt.day) : null;
    }
    return null;
  });
  const [startTime, setStartTime] = useState<Time | null>(() =>
    parseTimeFromDateTime(session?.startDateTime ?? undefined),
  );
  const [endTime, setEndTime] = useState<Time | null>(() =>
    parseTimeFromDateTime(session?.endDateTime ?? undefined),
  );
  const [selectedTags, setSelectedTags] = useState<EventTag[]>(() =>
    stringsToEventTags(session?.tags),
  );
  const [isAutoRegistrationEnabled, setIsAutoRegistrationEnabled] = useState(false);
  const [attendeeLimitEnabled, setAttendeeLimitEnabled] = useState(false);
  const [attendeeLimit, setAttendeeLimit] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessionTimestamps, setSessionTimestamps] = useState<{
    creationTime?: number;
    modificationTime?: number;
  }>({});
  const [sessionTimeMeta, setSessionTimeMeta] = useState<{
    sessionTimeId?: string;
    creationTime?: number;
    modificationTime?: number;
  }>({});

  // Speaker picker state
  const [seriesSpeakers, setSeriesSpeakers] = useState<SeriesSpeaker[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<SeriesSpeaker[]>([]);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedSpeakerIds = new Set(
    selectedSpeakers.map((s) => s.speakerId),
  );

  const loadSeriesSpeakers = useCallback(async () => {
    if (!seriesId) return;
    setIsLoadingSpeakers(true);
    try {
      const response = await cachedApi.getSpeakers(seriesId);
      if (response && !("error" in response)) {
        const list = response.speakers || response || [];
        setSeriesSpeakers(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Failed to load series speakers:", err);
    } finally {
      setIsLoadingSpeakers(false);
    }
  }, [seriesId]);

  useEffect(() => {
    loadSeriesSpeakers();
  }, [loadSeriesSpeakers]);

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    apiService.getSessionSpeakers(session.id).then((res) => {
      if (cancelled) return;
      if (res && !("error" in res)) {
        const list = (res as any)?.speakers ?? [];
        if (Array.isArray(list) && list.length > 0) {
          const ids = list.map((s: any) => String(s.speakerId));
          setSelectedSpeakers((prev) => {
            if (prev.length > 0) return prev;
            return seriesSpeakers.filter((s) => ids.includes(s.speakerId));
          });
        }
      }
    });
    return () => { cancelled = true; };
  }, [session?.id, seriesSpeakers]);

  const handlePickerSelect = useCallback((speaker: SeriesSpeaker) => {
    if (selectedSpeakers.some((s) => s.speakerId === speaker.speakerId)) {
      setPickerOpen(false);
      return;
    }
    setSelectedSpeakers((prev) => [...prev, speaker]);
    setPickerOpen(false);
  }, [selectedSpeakers]);

  const handleRemoveSpeaker = useCallback((speakerId: string) => {
    setSelectedSpeakers((prev) => prev.filter((s) => s.speakerId !== speakerId));
  }, []);

  const refreshSeriesSpeakers = useCallback(async () => {
    await loadSeriesSpeakers();
  }, [loadSeriesSpeakers]);

  useEffect(() => {
    if (!session?.id) {
      setLoadingDetails(false);
      setSessionTimeMeta({});
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    setDetailError(null);
    // TODO: Re-enable getSessionTimes once session-time APIs are stable.
    Promise.all([
      apiService.getSession(session.id),
      // apiService.getSessionTimes(session.id),
    ]).then(([res]) => {
      if (cancelled) return;
      setLoadingDetails(false);
      if (res && "error" in res) {
        setDetailError(res.error?.message || String(res.error));
        return;
      }
      const raw = res as Record<string, unknown>;
      const mapped = mapApiToSession(raw);
      // const timesRaw =
      //   timesRes && !("error" in timesRes)
      //     ? ((timesRes as any)?.sessionTimes ?? [])
      //     : [];
      // const sessionTimes = Array.isArray(timesRaw) ? timesRaw : [];
      // Current UI supports exactly one session-time per session, so we use the first item.
      // const sessionTime = sessionTimes[0] ?? null;
      const sessionTime = null;

      setName(mapped.name);
      setDescription(mapped.description ?? "");
      setSelectedTags(stringsToEventTags(mapped.tags));
      const resolvedIsAutoRegistrationEnabled = getIsAutoRegistrationEnabled(
        sessionTime,
      );
      setIsAutoRegistrationEnabled(resolvedIsAutoRegistrationEnabled);
      const cap = !resolvedIsAutoRegistrationEnabled
        ? (sessionTime?.attendeeLimit ?? raw.attendeeLimit ?? raw.capacity)
        : undefined;
      if (!resolvedIsAutoRegistrationEnabled && cap != null && Number(cap) > 0) {
        setAttendeeLimitEnabled(true);
        setAttendeeLimit(String(cap));
      } else {
        setAttendeeLimitEnabled(false);
        setAttendeeLimit("");
      }
      const primaryStart =
        sessionTime?.startTimeMillis != null
          ? new Date(Number(sessionTime.startTimeMillis)).toISOString()
          : mapped.startDateTime;
      const primaryEnd =
        sessionTime?.endTimeMillis != null
          ? new Date(Number(sessionTime.endTimeMillis)).toISOString()
          : mapped.endDateTime;

      const startDt = safeParseDateTimeString(primaryStart);
      setDate(
        startDt
          ? new CalendarDate(startDt.year, startDt.month, startDt.day)
          : null,
      );
      setStartTime(parseTimeFromDateTime(primaryStart));
      setEndTime(parseTimeFromDateTime(primaryEnd));
      const ct = raw.creationTime as number | undefined;
      const mt = raw.modificationTime as number | undefined;
      setSessionTimestamps(
        typeof ct === "number" || typeof mt === "number"
          ? { creationTime: ct, modificationTime: mt }
          : {},
      );
      setSessionTimeMeta({
        sessionTimeId: String(sessionTime?.sessionTimeId ?? "") || undefined,
        creationTime: sessionTime?.creationTime,
        modificationTime: sessionTime?.modificationTime,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  const handleSave = async () => {
    if (!date || !startTime || !endTime || !name.trim()) return;
    setSaveError(null);
    setSaving(true);
    const startDateTime = dateAndTimeToISO(date, startTime);
    const endDateTime = dateAndTimeToISO(date, endTime);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        startDateTime,
        endDateTime,
        tags: tagsToString(selectedTags),
        isAutoRegistrationEnabled,
        attendeeLimit:
          attendeeLimitEnabled && attendeeLimit
            ? (() => {
                const n = parseInt(attendeeLimit, 10);
                return !Number.isNaN(n) ? n : undefined;
              })()
            : undefined,
        ...(isEditMode &&
        (sessionTimestamps.creationTime != null ||
          sessionTimestamps.modificationTime != null)
          ? {
              creationTime: sessionTimestamps.creationTime,
              modificationTime: sessionTimestamps.modificationTime,
            }
          : {}),
        ...(isEditMode && sessionTimeMeta.sessionTimeId
          ? {
              sessionTimeId: sessionTimeMeta.sessionTimeId,
              sessionTimeCreationTime: sessionTimeMeta.creationTime,
              sessionTimeModificationTime: sessionTimeMeta.modificationTime,
            }
          : {}),
        speakerIds: selectedSpeakers.map((s) => s.speakerId),
        timezone: formData.timezone || undefined,
      });
      onCancel();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(name.trim() && date && startTime && endTime);

  const renderSpeakers = () => (
    <Flex direction="column" gap="size-100">
      <Flex alignItems="center" gap="size-150">
        <Text>Speakers</Text>
        {isLoadingSpeakers && (
          <ProgressCircle
            size="S"
            isIndeterminate
            aria-label="Loading speakers"
          />
        )}
      </Flex>

      <div
        onClick={() => setPickerOpen(true)}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: "pointer" }}
      >
        <SearchField
          labelPosition="side"
          placeholder="Search or select session speakers"
          width="100%"
          isReadOnly
          aria-label="Open speaker picker"
        />
      </div>

      {selectedSpeakers.length > 0 && (
        <Flex direction="row" gap="size-150" wrap>
          {selectedSpeakers.map((speaker) => (
            <div
              key={speaker.speakerId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px 6px 6px",
                borderRadius: "9px",
                backgroundColor: "var(--spectrum-global-color-gray-200)",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {speaker.photo?.imageUrl ? (
                <img
                  src={speaker.photo.imageUrl}
                  alt={`${speaker.firstName} ${speaker.lastName}`}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "var(--spectrum-global-color-gray-400)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {speaker.firstName?.[0] || ""}
                  {speaker.lastName?.[0] || ""}
                </div>
              )}
              <span>
                {speaker.firstName} {speaker.lastName}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveSpeaker(speaker.speakerId)}
                aria-label={`Remove ${speaker.firstName} ${speaker.lastName}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--spectrum-global-color-gray-700)",
                  fontSize: "16px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </Flex>
      )}

      <SpeakerPickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        seriesSpeakers={seriesSpeakers}
        selectedSpeakerIds={selectedSpeakerIds}
        seriesId={seriesId}
        locale={locale}
        onSpeakersRefresh={refreshSeriesSpeakers}
      />
    </Flex>
  );

  const renderTags = () => (
    <Flex direction="column" gap="size-100">
      <Text>Tags</Text>
      <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} />
    </Flex>
  );

  if (loadingDetails) {
    return (
      <View padding="size-200">
        <Text>Loading session details…</Text>
      </View>
    );
  }

  return (
    <View
      paddingTop="size-200"
      paddingBottom="size-200"
      paddingStart="size-200"
      paddingEnd="size-200"
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      marginTop="size-150"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        marginBottom="size-200"
      >
        <Heading level={3} margin="size-0">
          {isEditMode ? "Edit Session" : "Session Details"}
        </Heading>
        <Flex gap="size-100">
          <Button variant="secondary" onPress={onCancel} isDisabled={saving}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onPress={handleSave}
            isDisabled={!canSave || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Flex>
      </Flex>

      {detailError && (
        <Flex direction="column" gap="size-100" marginBottom="size-200">
          <Text
            UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)" }}
          >
            {detailError}
          </Text>
          <Text>Showing cached data. You can still edit and save.</Text>
        </Flex>
      )}

      <Form UNSAFE_style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <TextField
          label="Title"
          isRequired
          width="100%"
          value={name}
          onChange={setName}
        />

        <RichTextEditor
          label="Description"
          value={description}
          onChange={setDescription}
          height="280px"
        />

        <Flex direction="row" gap="size-200">
          <DatePicker
            label="Date"
            isRequired
            width="100%"
            value={date ?? undefined}
            onChange={(v) => setDate(v ?? null)}
          />
          <TimeField
            label="Start Time"
            isRequired
            hourCycle={12}
            width="100%"
            value={startTime ?? undefined}
            onChange={(v) => setStartTime(v ?? null)}
          />
          <TimeField
            label="End Time"
            isRequired
            hourCycle={12}
            width="100%"
            value={endTime ?? undefined}
            onChange={(v) => setEndTime(v ?? null)}
          />
        </Flex>

        <Flex direction="column" gap="size-100">
          <Text>Session registration</Text>
          <Flex direction="row" gap="size-200" alignItems="center" wrap>
            <ActionGroup
              selectionMode="single"
              selectedKeys={
                isAutoRegistrationEnabled ? ["automatic"] : ["registration"]
              }
              onAction={(key) =>
                setIsAutoRegistrationEnabled(key !== "registration")
              }
            >
              <Item key="automatic">Automatic</Item>
              <Item key="registration">Registration required</Item>
            </ActionGroup>
            <Checkbox
              isSelected={attendeeLimitEnabled}
              onChange={setAttendeeLimitEnabled}
              isDisabled={isAutoRegistrationEnabled}
            >
              Set capacity limit
            </Checkbox>
            <TextField
              aria-label="Capacity"
              isRequired={attendeeLimitEnabled}
              isDisabled={isAutoRegistrationEnabled || !attendeeLimitEnabled}
              type="number"
              width="size-1200"
              value={attendeeLimit}
              onChange={setAttendeeLimit}
            />
          </Flex>
        </Flex>

        {renderSpeakers()}
        {renderTags()}
      </Form>

      {saveError && (
        <Text
          UNSAFE_style={{
            color: "var(--spectrum-global-color-red-600)",
            marginTop: "8px",
          }}
        >
          {saveError}
        </Text>
      )}
    </View>
  );
};

export default SessionForm;
