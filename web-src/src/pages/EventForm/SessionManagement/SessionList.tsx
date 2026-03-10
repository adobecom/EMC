import React, { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Heading,
  Text,
  View,
  ActionButton,
  Button,
  TextField,
  TextArea,
  DatePicker,
  TimeField,
  ActionGroup,
  Item,
  Checkbox,
  ProgressCircle,
  SearchField,
  Form,
} from "@adobe/react-spectrum";
import ChevronRight from "@spectrum-icons/workflow/ChevronRight";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import Delete from "@spectrum-icons/workflow/Delete";
import {
  parseDateTime,
  CalendarDateTime,
  CalendarDate,
  Time,
} from "@internationalized/date";
import { Session } from "../../../types/sessions";
import { EventTag, SeriesSpeaker } from "../../../types/domain";
import Chip from "../../../components/shared/Chip";
import { COLORS } from "../../../styles/designSystem";
import { DeleteIcon } from "../../../components/icons/delete";
import { formatTime, formatDate } from "../../../utils/shared";
import { apiService, cachedApi } from "../../../services/api";
import { useEventFormContext } from "../../../contexts";
import { TagSelector } from "../../../components/shared";
import { SpeakerPickerDialog } from "../SpeakerPickerDialog";

export interface SessionFormData {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags?: string[];
  creationTime?: number;
  modificationTime?: number;
}

// ============================================================================
// DATE / TIME HELPERS
// ============================================================================

function safeParseDateTimeString(
  dateString: string | undefined | null,
): CalendarDateTime | null {
  if (!dateString) return null;
  try {
    const cleaned = dateString
      .replace(/\.\d{3}Z?$/, "")
      .replace(/[+-]\d{2}:\d{2}$/, "")
      .replace(/Z$/, "");
    return parseDateTime(cleaned);
  } catch {
    return null;
  }
}

function parseTimeFromDateTime(dateTimeStr: string | undefined): Time | null {
  if (!dateTimeStr) return null;
  const dt = safeParseDateTimeString(dateTimeStr);
  if (!dt) return null;
  return new Time(dt.hour, dt.minute, dt.second || 0);
}

function dateAndTimeToISO(date: CalendarDate, time: Time): string {
  const dt = new CalendarDateTime(
    date.year,
    date.month,
    date.day,
    time.hour,
    time.minute,
    time.second || 0,
  );
  return `${dt.toString()}.000Z`;
}

function stringsToEventTags(tags: string[] | undefined): EventTag[] {
  if (!tags?.length) return [];
  return tags.map((t) => ({ name: t, caasId: t }));
}

function eventTagsToStrings(tags: EventTag[]): string[] {
  return tags.map((t) => t.caasId ?? t.name);
}

function mapApiToSession(item: Record<string, unknown>): Session {
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

function getCaasTagDisplayLabel(caasId: string): string {
  const withoutPrefix = caasId.replace(/^caas:/, "").trim();
  const segments = withoutPrefix.split("/").filter(Boolean);
  const last = segments.length > 0 ? segments[segments.length - 1] : caasId;
  const normalized = last.replace(/-/g, " ");
  if (normalized.length <= 4 && /^[a-zA-Z]+$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  return normalized
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================================
// SESSION INLINE FORM
// ============================================================================

interface SessionInlineFormProps {
  session: Session | null;
  onSave: (data: SessionFormData) => Promise<void>;
  onCancel: () => void;
}

const SessionInlineForm: React.FC<SessionInlineFormProps> = ({
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
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [capacityLimitEnabled, setCapacityLimitEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessionTimestamps, setSessionTimestamps] = useState<{
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
    setSelectedSpeakers((prev) => {
      if (prev.some((s) => s.speakerId === speaker.speakerId)) return prev;
      return [...prev, speaker];
    });
    setPickerOpen(false);
  }, []);

  const handleRemoveSpeaker = useCallback((speakerId: string) => {
    setSelectedSpeakers((prev) => prev.filter((s) => s.speakerId !== speakerId));
  }, []);

  const refreshSeriesSpeakers = useCallback(async () => {
    await loadSeriesSpeakers();
  }, [loadSeriesSpeakers]);

  useEffect(() => {
    if (!session?.id) {
      setLoadingDetails(false);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    setDetailError(null);
    apiService.getSession(session.id).then((res) => {
      if (cancelled) return;
      setLoadingDetails(false);
      if (res && "error" in res) {
        setDetailError(res.error?.message || String(res.error));
        return;
      }
      const raw = res as Record<string, unknown>;
      const mapped = mapApiToSession(raw);
      setName(mapped.name);
      setDescription(mapped.description ?? "");
      setSelectedTags(stringsToEventTags(mapped.tags));
      const startDt = safeParseDateTimeString(mapped.startDateTime);
      setDate(
        startDt
          ? new CalendarDate(startDt.year, startDt.month, startDt.day)
          : null,
      );
      setStartTime(parseTimeFromDateTime(mapped.startDateTime));
      setEndTime(parseTimeFromDateTime(mapped.endDateTime));
      const ct = raw.creationTime as number | undefined;
      const mt = raw.modificationTime as number | undefined;
      setSessionTimestamps(
        typeof ct === "number" || typeof mt === "number"
          ? { creationTime: ct, modificationTime: mt }
          : {},
      );
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
        tags: eventTagsToStrings(selectedTags),
        ...(isEditMode &&
        (sessionTimestamps.creationTime != null ||
          sessionTimestamps.modificationTime != null)
          ? {
              creationTime: sessionTimestamps.creationTime,
              modificationTime: sessionTimestamps.modificationTime,
            }
          : {}),
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

      {selectedSpeakers.length > 0 && (
        <Flex direction="column" gap="size-100">
          {selectedSpeakers.map((speaker) => {
            const displayTitle =
              speaker.localizations?.[locale]?.title ||
              speaker.title ||
              "";
            return (
              <Flex
                key={speaker.speakerId}
                alignItems="center"
                gap="size-150"
                UNSAFE_style={{
                  padding: "8px 12px",
                  border: "1px solid var(--spectrum-global-color-gray-300)",
                  borderRadius: "6px",
                  backgroundColor: "var(--spectrum-global-color-gray-50)",
                }}
              >
                {speaker.photo?.imageUrl ? (
                  <img
                    src={speaker.photo.imageUrl}
                    alt={`${speaker.firstName} ${speaker.lastName}`}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--spectrum-global-color-gray-300)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--spectrum-global-color-gray-600)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {speaker.firstName?.[0] || ""}
                    {speaker.lastName?.[0] || ""}
                  </div>
                )}
                <Flex direction="column" flex={1} minWidth={0}>
                  <Text UNSAFE_style={{ fontWeight: 600, fontSize: "13px" }}>
                    {speaker.firstName} {speaker.lastName}
                  </Text>
                  {displayTitle && (
                    <Text
                      UNSAFE_style={{
                        fontSize: "11px",
                        color: "var(--spectrum-global-color-gray-600)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayTitle}
                    </Text>
                  )}
                </Flex>
                <ActionButton
                  isQuiet
                  aria-label="Remove speaker"
                  onPress={() => handleRemoveSpeaker(speaker.speakerId)}
                >
                  <Delete size="S" />
                </ActionButton>
              </Flex>
            );
          })}
        </Flex>
      )}

      <div
        onClick={() => setPickerOpen(true)}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: "pointer" }}
      >
        <SearchField
          labelPosition="side"
          placeholder="Search speakers…"
          width="100%"
          isReadOnly
          aria-label="Open speaker picker"
        />
      </div>

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

      <Form>
        <TextField
          label="Title"
          isRequired
          width="100%"
          value={name}
          onChange={setName}
        />

        <TextArea
          label="Description"
          width="100%"
          value={description}
          onChange={setDescription}
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
                registrationRequired ? ["registration"] : ["automatic"]
              }
              onAction={(key) =>
                setRegistrationRequired(key === "registration")
              }
            >
              <Item key="automatic">Automatic</Item>
              <Item key="registration">Registration required</Item>
            </ActionGroup>
            <Checkbox
              isSelected={capacityLimitEnabled}
              onChange={setCapacityLimitEnabled}
              isDisabled={!registrationRequired}
            >
              Set capacity limit
            </Checkbox>
            <TextField
              aria-label="Capacity"
              isRequired={capacityLimitEnabled}
              isDisabled={!registrationRequired || !capacityLimitEnabled}
              type="number"
              width="size-1200"
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

// ============================================================================
// SESSION ITEM (collapsible)
// ============================================================================

export interface SessionItemProps {
  session: Session;
  isExpanded: boolean;
  onToggle: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onSave: (sessionId: string, data: SessionFormData) => Promise<void>;
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isExpanded,
  onToggle,
  onDelete,
  onSave,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const startTime = formatTime(session.startDateTime);
  const endTime = formatTime(session.endDateTime);
  const sessionDate = formatDate(session.startDateTime);

  const handleDeleteClick = () => setShowDeleteConfirm(true);
  const handleCancelDelete = () => setShowDeleteConfirm(false);
  const handleConfirmDelete = () => {
    onDelete(session.id);
    setShowDeleteConfirm(false);
  };

  return (
    <View
      paddingTop="size-150"
      paddingBottom="size-150"
      paddingStart="size-200"
      paddingEnd="size-200"
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      UNSAFE_style={{ position: "relative" }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggle(session.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(session.id);
            }
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            outline: "none",
          }}
        >
          <View
            UNSAFE_style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {isExpanded ? (
              <ChevronDown size="S" />
            ) : (
              <ChevronRight size="S" />
            )}
          </View>
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
            {session.tags && session.tags.length > 0 && (
              <Flex gap="size-150" marginTop="size-100">
                {session.tags.map((tag) => (
                  <Chip key={tag} text={getCaasTagDisplayLabel(tag)} />
                ))}
              </Flex>
            )}
          </Flex>
        </div>

        <ActionButton isQuiet aria-label="Delete" onPress={handleDeleteClick}>
          <DeleteIcon />
        </ActionButton>
      </Flex>

      {isExpanded && (
        <SessionInlineForm
          session={session}
          onSave={(data) => onSave(session.id, data)}
          onCancel={() => onToggle(session.id)}
        />
      )}

      {showDeleteConfirm && (
        <View
          UNSAFE_style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "16px",
            padding: "12px 16px",
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
  );
};

// ============================================================================
// SESSIONS LIST
// ============================================================================

export interface SessionsListProps {
  sessions: Session[];
  isAddingNew: boolean;
  onCancelAdd: () => void;
  onAdd: (data: SessionFormData) => Promise<void>;
  onDelete: (sessionId: string) => void;
  onSave: (sessionId: string, data: SessionFormData) => Promise<void>;
}

export const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  isAddingNew,
  onCancelAdd,
  onAdd,
  onDelete,
  onSave,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (sessionId: string) => {
    setExpandedId((prev) => (prev === sessionId ? null : sessionId));
  };

  return (
    <Flex direction="column" gap="size-150" marginTop="size-150">
      {isAddingNew && (
        <SessionInlineForm
          session={null}
          onSave={onAdd}
          onCancel={onCancelAdd}
        />
      )}
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isExpanded={expandedId === session.id}
          onToggle={handleToggle}
          onDelete={onDelete}
          onSave={onSave}
        />
      ))}
    </Flex>
  );
};
