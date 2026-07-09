/*
 * <license header>
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Heading,
  Text,
  Button,
  TextField,
  DatePicker,
  TimeField,
  Checkbox,
  SearchField,
  Form,
  SegmentedControl,
  SegmentedControlItem,
  ComboBox,
  ComboBoxItem,
} from "@react-spectrum/s2"
import {
  CalendarDate,
  Time,
} from "@internationalized/date";
import { Session, SessionLocalization } from "../../../types/sessions";
import { EventTag, SeriesSpeaker } from "../../../types/domain";
import { apiService } from "../../../services/api";
import { useEventFormContext, useToast } from "../../../contexts";
import { RichTextEditor, TagSelector } from "../../../components/shared";
import {
  dateAndTimeToISO,
  millisToNaiveDateTimeString,
  naiveDateTimeToUTCMillis,
  parseTimeFromDateTime,
  safeParseDateTimeString,
} from "../../../utils/dateTime";
import { SpeakerPickerDialog } from "../SpeakerPickerDialog";
import { VenueLocation } from "../LocationDialog";

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
  /** Original speaker IDs loaded for edit-mode change detection */
  originalSpeakerIds?: string[];
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
  /** Selected venue location ID for this session */
  locationId?: string;
  /** All locale slices from the API response — carried through to preserve non-active locales on save */
  localizations?: Record<string, SessionLocalization>;
  /** Round-tripped as-is from the API response — never modified by EMC */
  localizationOverrides?: Record<string, SessionLocalization>;
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

function parseTagsFromApi(tags: unknown): string[] {
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (Array.isArray(tags)) return (tags as string[]).map((t) => String(t).trim()).filter(Boolean);
  return [];
}

export function mapApiToSession(item: Record<string, unknown>, locale = "en-US"): Session {
  const allLocalizations = item.localizations as Record<string, SessionLocalization> | undefined
  const allLocalizationOverrides = item.localizationOverrides as Record<string, SessionLocalization> | undefined
  const loc = allLocalizations?.[locale] ?? {}
  return {
    id: String(item.sessionId ?? item.id ?? ""),
    name: String(loc.title ?? item.enTitle ?? item.title ?? ""),
    description: loc.description != null ? String(loc.description) : item.description != null ? String(item.description) : undefined,
    startDateTime: String(item.startDateTime ?? ""),
    endDateTime: String(item.endDateTime ?? ""),
    capacity: item.capacity != null ? Number(item.capacity) : undefined,
    tags: parseTagsFromApi(item.tags),
    localizations: allLocalizations,
    localizationOverrides: allLocalizationOverrides,
  }
}

// ============================================================================
// SESSION FORM (inline add / edit)
// ============================================================================

interface SessionFormProps {
  /** When null the form is blank (add mode). When provided the form is pre-filled (edit mode). */
  session: Session | null;
  onSave: (data: SessionFormData) => Promise<void>;
  onCancel: () => void;
  /** Pre-fetched venue locations from parent — avoids refetch on each expand */
  venueLocations?: VenueLocation[];
  /** Pre-fetched series speakers from parent — avoids refetch on each expand */
  seriesSpeakers?: SeriesSpeaker[];
  /** Callback to refresh series speakers (e.g. after creating a new speaker) */
  onSpeakersRefresh?: () => Promise<void>;
  /** Called when the form's dirty state changes (true = has unsaved edits) */
  onDirtyChange?: (isDirty: boolean) => void;
  /** All sibling sessions in this event — used for time/location overlap detection */
  allSessions?: Session[];
}

interface LoadedSnapshot {
  name: string
  description: string
  dateStr: string
  startTimeStr: string
  endTimeStr: string
  tagStr: string
  isAutoReg: boolean
  limitEnabled: boolean
  limitValue: string
  locationId: string
}

export const SessionForm: React.FC<SessionFormProps> = ({
  session,
  onSave,
  onCancel,
  venueLocations: venueLocationsProp,
  seriesSpeakers: seriesSpeakersProp,
  onSpeakersRefresh: onSpeakersRefreshProp,
  onDirtyChange,
  allSessions,
}) => {
  const isEditMode = session !== null;
  const { seriesId: contextSeriesId, formData, locale, seriesCustomTagsUrl } = useEventFormContext();
  const localizationsRef = React.useRef<Record<string, SessionLocalization> | undefined>(
    session?.localizations,
  );
  const localizationOverridesRef = React.useRef<Record<string, SessionLocalization> | undefined>(
    session?.localizationOverrides,
  );
  const toast = useToast();
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

  // Speaker picker state — use props from parent, no internal fetch
  const seriesSpeakers = seriesSpeakersProp ?? [];
  const [selectedSpeakers, setSelectedSpeakers] = useState<SeriesSpeaker[]>([]);
  const [originalSpeakerIds, setOriginalSpeakerIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Location state — use props from parent, no internal fetch
  const venueLocations = venueLocationsProp ?? [];
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(session?.locationId ?? null);

  // ---- Dirty detection ----
  const loadedSnapshot = useRef<LoadedSnapshot | null>(isEditMode ? null : {
    name: '', description: '', dateStr: '', startTimeStr: '', endTimeStr: '',
    tagStr: '', isAutoReg: false, limitEnabled: false, limitValue: '', locationId: '',
  })

  const currentDateStr = date ? `${date.year}-${date.month}-${date.day}` : ''
  const currentStartStr = startTime ? `${startTime.hour}:${startTime.minute}` : ''
  const currentEndStr = endTime ? `${endTime.hour}:${endTime.minute}` : ''
  const currentTagStr = selectedTags.map((t) => t.caasId ?? t.name).sort().join(',')
  const currentSpeakerStr = selectedSpeakers.map((s) => s.speakerId).sort().join(',')
  const originalSpeakerStr = [...originalSpeakerIds].sort().join(',')

  const isDirty = useMemo(() => {
    const snap = loadedSnapshot.current
    if (!snap) return false // still loading edit-mode data
    const speakersDirty = currentSpeakerStr !== originalSpeakerStr
    return (
      name !== snap.name ||
      description !== snap.description ||
      currentDateStr !== snap.dateStr ||
      currentStartStr !== snap.startTimeStr ||
      currentEndStr !== snap.endTimeStr ||
      currentTagStr !== snap.tagStr ||
      isAutoRegistrationEnabled !== snap.isAutoReg ||
      attendeeLimitEnabled !== snap.limitEnabled ||
      attendeeLimit !== snap.limitValue ||
      (selectedLocationId ?? '') !== snap.locationId ||
      speakersDirty
    )
  }, [name, description, currentDateStr, currentStartStr, currentEndStr,
      currentTagStr, isAutoRegistrationEnabled, attendeeLimitEnabled, attendeeLimit,
      selectedLocationId, currentSpeakerStr, originalSpeakerStr])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const selectedSpeakerIds = new Set(
    selectedSpeakers.map((s) => s.speakerId),
  );

  useEffect(() => {
    if (!session?.id) return;
    let cancelled = false;
    apiService.getSessionSpeakers(session.id, { skipStaleGroupRecovery: true }).then((res) => {
      if (cancelled) return;
      if (res && !("error" in res)) {
        const list = (res as any)?.speakers ?? [];
        if (Array.isArray(list)) {
          const ids = list.map((s: SeriesSpeaker) => String(s.speakerId));
          setOriginalSpeakerIds(ids);
          if (ids.length > 0) {
            setSelectedSpeakers((prev) => {
              if (prev.length > 0) return prev;
              return seriesSpeakers.filter((s) => ids.includes(s.speakerId));
            });
          }
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
    if (onSpeakersRefreshProp) await onSpeakersRefreshProp();
  }, [onSpeakersRefreshProp]);

  useEffect(() => {
    if (!session?.id) {
      setLoadingDetails(false);
      setSessionTimeMeta({});
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    setDetailError(null);

    // Only fetch session detail — session-time data is already cached on session.sessionTime
    apiService.getSingleSession(session.id, { skipStaleGroupRecovery: true }).then((res) => {
      if (cancelled) return;
      setLoadingDetails(false);
      if (res && "error" in res) {
        setDetailError(res.error?.message || String(res.error));
        return;
      }
      const raw = res as Record<string, unknown>;
      const mapped = mapApiToSession(raw, locale);
      localizationsRef.current = mapped.localizations;
      localizationOverridesRef.current = mapped.localizationOverrides;
      const sessionTime = session.sessionTime ?? null;

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
      const tz = sessionTime?.timezone || formData.timezone || "UTC";
      const primaryStart =
        sessionTime?.startTimeMillis != null
          ? millisToNaiveDateTimeString(Number(sessionTime.startTimeMillis), tz)
          : mapped.startDateTime;
      const primaryEnd =
        sessionTime?.endTimeMillis != null
          ? millisToNaiveDateTimeString(Number(sessionTime.endTimeMillis), tz)
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

      // Snapshot loaded values for dirty detection
      const loadedStartTime = parseTimeFromDateTime(primaryStart);
      const loadedEndTime = parseTimeFromDateTime(primaryEnd);
      const resolvedLimitEnabled = !resolvedIsAutoRegistrationEnabled && cap != null && Number(cap) > 0;
      loadedSnapshot.current = {
        name: mapped.name,
        description: mapped.description ?? "",
        dateStr: startDt ? `${startDt.year}-${startDt.month}-${startDt.day}` : '',
        startTimeStr: loadedStartTime ? `${loadedStartTime.hour}:${loadedStartTime.minute}` : '',
        endTimeStr: loadedEndTime ? `${loadedEndTime.hour}:${loadedEndTime.minute}` : '',
        tagStr: (mapped.tags ?? []).sort().join(','),
        isAutoReg: resolvedIsAutoRegistrationEnabled,
        limitEnabled: resolvedLimitEnabled,
        limitValue: resolvedLimitEnabled ? String(cap) : '',
        locationId: session?.locationId ?? '',
      };
    });
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  const handleSave = async () => {
    if (!date || !startTime || !endTime || !name.trim() || !description.trim()) return;
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
        attendeeLimit: !isAutoRegistrationEnabled && attendeeLimitEnabled && attendeeLimit
          ? Number(attendeeLimit)
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
        ...(isEditMode ? { originalSpeakerIds } : {}),
        timezone: formData.timezone || undefined,
        locationId: selectedLocationId ?? undefined,
        localizations: localizationsRef.current,
        localizationOverrides: localizationOverridesRef.current,
      });
      toast.success(isEditMode ? "Session updated successfully" : "Session created successfully");
      onCancel(); // unmounts this component — no state updates after this
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setSaveError(msg);
      toast.error(msg, { duration: 8000 });
      setSaving(false);
    }
  };

  const eventStartDate = safeParseDateTimeString(formData.startDateTime ?? undefined);
  const eventEndDate = safeParseDateTimeString(formData.endDateTime ?? undefined);
  const minDate = eventStartDate
    ? new CalendarDate(eventStartDate.year, eventStartDate.month, eventStartDate.day)
    : undefined;
  const maxDate = eventEndDate
    ? new CalendarDate(eventEndDate.year, eventEndDate.month, eventEndDate.day)
    : undefined;

  const isDateOutOfRange = Boolean(
    date && ((minDate && date.compare(minDate) < 0) || (maxDate && date.compare(maxDate) > 0)),
  );

  // On the event's start date, session start time must not be before the event start time.
  const isOnEventStartDate = Boolean(date && minDate && date.compare(minDate) === 0);
  const isStartTimeBeforeEventStart = Boolean(
    isOnEventStartDate && startTime && eventStartDate &&
    (startTime.hour < eventStartDate.hour ||
      (startTime.hour === eventStartDate.hour && startTime.minute < eventStartDate.minute)),
  );

  // On the event's end date, session end time must not be after the event end time.
  const isOnEventEndDate = Boolean(date && maxDate && date.compare(maxDate) === 0);
  const isEndTimeAfterEventEnd = Boolean(
    isOnEventEndDate && endTime && eventEndDate &&
    (endTime.hour > eventEndDate.hour ||
      (endTime.hour === eventEndDate.hour && endTime.minute > eventEndDate.minute)),
  );

  const dateErrorMessage = isDateOutOfRange
    ? `Session date must be within the event dates (${minDate?.toString() ?? ""} to ${maxDate?.toString() ?? ""})`
    : undefined;

  const isEndTimeInvalid = Boolean(
    startTime && endTime && (endTime.hour < startTime.hour ||
      (endTime.hour === startTime.hour && endTime.minute <= startTime.minute)),
  );

  const isCapacityMissing = Boolean(
    !isAutoRegistrationEnabled && attendeeLimitEnabled &&
    (!attendeeLimit.trim() || Number(attendeeLimit) <= 0),
  );

  const hasLocationConflict = useMemo(() => {
    if (!selectedLocationId || !date || !startTime || !endTime) return false
    if (isEndTimeInvalid) return false
    const tz = formData.timezone || 'UTC'
    const currentStart = naiveDateTimeToUTCMillis(dateAndTimeToISO(date, startTime), tz)
    const currentEnd = naiveDateTimeToUTCMillis(dateAndTimeToISO(date, endTime), tz)
    return (allSessions ?? []).some((s) => {
      if (s.id === session?.id) return false
      if (s.locationId !== selectedLocationId) return false
      const sStart = s.sessionTime?.startTimeMillis
      const sEnd = s.sessionTime?.endTimeMillis
      if (sStart == null || sEnd == null) return false
      return currentStart < sEnd && currentEnd > sStart
    })
  }, [selectedLocationId, date, startTime, endTime, allSessions, session?.id, formData.timezone, isEndTimeInvalid])

  const canSave = Boolean(
    name.trim() && description.trim() && date && startTime && endTime &&
    !isDateOutOfRange && !isEndTimeInvalid &&
    !isStartTimeBeforeEventStart && !isEndTimeAfterEventEnd &&
    !isCapacityMissing && !hasLocationConflict,
  );

  const renderSpeakers = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

      <div
        onClick={() => setPickerOpen(true)}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: "pointer" }}
      >
        <SearchField
          label="Speakers"
          placeholder="Search or select session speakers"
          UNSAFE_style={{ width: "100%" }}
          isReadOnly
          aria-label="Open speaker picker"
        />
      </div>

      {selectedSpeakers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "row", gap: "12px", flexWrap: "wrap" }}>
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
        </div>
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
    </div>
  );

  const renderLocations = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <ComboBox
        label="Location"
        placeholder="Select session location"
        UNSAFE_style={{ width: "100%" }}
        selectedKey={selectedLocationId ?? undefined}
        onSelectionChange={(key) => setSelectedLocationId(key ? String(key) : null)}
        isDisabled={venueLocations.length === 0}
        isInvalid={hasLocationConflict}
      >
        {venueLocations.map((loc) => (
          <ComboBoxItem key={loc.locationId} id={loc.locationId}>{loc.name}</ComboBoxItem>
        ))}
      </ComboBox>
      {hasLocationConflict && (
        <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)", fontSize: "12px" }}>
          This location is already booked for another session at an overlapping time.
        </Text>
      )}
      {venueLocations.length === 0 && (
        <Text UNSAFE_style={{ fontSize: "12px", color: "var(--spectrum-global-color-gray-600)" }}>
          No locations available for the selected venue.
        </Text>
      )}
    </div>
  );

  const renderTags = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} placement="top" tagsUrl={seriesCustomTagsUrl || undefined}/>
    </div>
  );

  if (loadingDetails) {
    return (
      <div style={{ padding: "16px" }}>
        <Text>Loading session details…</Text>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid var(--spectrum-global-color-gray-300)",
        borderRadius: "4px",
        marginTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Heading level={3} UNSAFE_style={{ margin: 0 }}>
          {isEditMode ? "Edit Session" : "Session Details"}
        </Heading>
        <div style={{ display: "flex", gap: "8px" }}>
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
        </div>
      </div>

      {detailError && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)" }}>
            {detailError}
          </Text>
          <Text>Showing cached data. You can still edit and save.</Text>
        </div>
      )}

      <Form>
        <TextField
          label="Title"
          isRequired
          UNSAFE_style={{ width: "100%" }}
          value={name}
          onChange={setName}
        />

        <RichTextEditor
          label="Description"
          isRequired
          value={description}
          onChange={setDescription}
          height="280px"
        />

        <div style={{ display: "flex", flexDirection: "row", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "4px" }}>
            <DatePicker
              label="Date"
              isRequired
              UNSAFE_style={{ width: "100%" }}
              value={date ?? undefined}
              onChange={(v) => setDate(v ?? null)}
              minValue={minDate}
              maxValue={maxDate}
              isInvalid={isDateOutOfRange}
            />
            {isDateOutOfRange && (
              <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)", fontSize: "12px" }}>
                {dateErrorMessage}
              </Text>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "4px" }}>
            <TimeField
              label="Start Time"
              isRequired
              hourCycle={12}
              UNSAFE_style={{ width: "100%" }}
              value={startTime ?? undefined}
              onChange={(v) => setStartTime(v ?? null)}
              isInvalid={isStartTimeBeforeEventStart}
            />
            {isStartTimeBeforeEventStart && (
              <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)", fontSize: "12px" }}>
                Start time cannot be before the event start time
              </Text>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "4px" }}>
            <TimeField
              label="End Time"
              isRequired
              hourCycle={12}
              UNSAFE_style={{ width: "100%" }}
              value={endTime ?? undefined}
              onChange={(v) => setEndTime(v ?? null)}
              isInvalid={isEndTimeInvalid || isEndTimeAfterEventEnd}
            />
            {isEndTimeInvalid && (
              <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)", fontSize: "12px" }}>
                End time must be after start time
              </Text>
            )}
            {!isEndTimeInvalid && isEndTimeAfterEventEnd && (
              <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)", fontSize: "12px" }}>
                End time cannot be after the event end time
              </Text>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Text UNSAFE_style={{ fontSize: "14px", color: "var(--spectrum-global-color-gray-600)" }}>Session registration</Text>
          <div style={{ display: "flex", flexDirection: "row", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <SegmentedControl
              selectedKey={isAutoRegistrationEnabled ? "automatic" : "registration"}
              onSelectionChange={(key) => {
                const isAuto = key !== "registration"
                setIsAutoRegistrationEnabled(isAuto)
                if (isAuto) {
                  setAttendeeLimitEnabled(false)
                  setAttendeeLimit("")
                }
              }}
            >
              <SegmentedControlItem id="automatic">Automatic</SegmentedControlItem>
              <SegmentedControlItem id="registration">Registration required</SegmentedControlItem>
            </SegmentedControl>
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
              inputMode="numeric"
              UNSAFE_style={{ width: "96px" }}
              value={attendeeLimit}
              onChange={(v) => setAttendeeLimit(v)}
              isDisabled={!attendeeLimitEnabled}
              isInvalid={isCapacityMissing}
              errorMessage="Capacity is required"
            />
          </div>
        </div>

        {renderSpeakers()}
        {renderLocations()}
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
    </div>
  );
};

export default SessionForm;
