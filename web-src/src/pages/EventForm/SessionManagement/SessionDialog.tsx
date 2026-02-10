/*
 * <license header>
 */

import React, { useState, useEffect } from "react";
import {
  Heading,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  Flex,
  TextField,
  TextArea,
  DatePicker,
  TimeField,
  ActionGroup,
  Item,
  Text,
  Checkbox,
} from "@adobe/react-spectrum";
import {
  parseDateTime,
  CalendarDateTime,
  CalendarDate,
  Time,
} from "@internationalized/date";
import { Session } from "../../../types/sessions";
import { EventTag } from "../../../types/domain";
import { apiService } from "../../../services/api";
import { useEventFormContext } from "../../../contexts";
import { TagSelector, SpeakerSelector } from "../../../components/shared";

export interface SessionFormData {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags?: string[];
  /** From GET session; required by API for update body */
  creationTime?: number;
  modificationTime?: number;
}

interface SessionDialogProps {
  /** Called when dialog should close (e.g. Cancel or after Save) */
  close: () => void;
  /** When null, form is blank (add mode). When provided, form is pre-filled (edit mode). */
  session: Session | null;
  /** Called with form data on Save. Caller can add or update session. May return a Promise. */
  onSave: (data: SessionFormData) => void | Promise<void>;
}

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

/** Map API session response to UI Session shape */
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

function stringsToEventTags(tags: string[] | undefined): EventTag[] {
  if (!tags?.length) return [];
  return tags.map((t) => ({ name: t, caasId: t }));
}

function eventTagsToStrings(tags: EventTag[]): string[] {
  return tags.map((t) => t.caasId ?? t.name);
}

export const SessionDialog: React.FC<SessionDialogProps> = ({
  close,
  session,
  onSave,
}) => {
  const isEditMode = session !== null;
  const { seriesId: contextSeriesId, formData } = useEventFormContext();
  // Use context seriesId as source of truth, fall back to formData.seriesId
  // (RESET_FORM_DATA from storage only updates formData, not state.seriesId)
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
      if (res.success && res.data) {
        const raw = res.data as unknown as Record<string, unknown>;
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
      } else {
        setDetailError(res.error ?? "Failed to load session");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (!session) {
      setName("");
      setDescription("");
      setSelectedTags([]);
      setDate(null);
      setStartTime(null);
      setEndTime(null);
      setSessionTimestamps({});
    }
  }, [session]);

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
      close();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(name.trim() && date && startTime && endTime);

  return (
    <Dialog>
      <Heading>{isEditMode ? "Edit Session" : "Session Details"}</Heading>
      <Content marginTop="size-100">
        {loadingDetails ? (
          <Text>Loading session details...</Text>
        ) : detailError ? (
          <Flex direction="column" gap="size-100">
            <Text
              UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)" }}
            >
              {detailError}
            </Text>
            <Text>Showing cached data. You can still edit and save.</Text>
          </Flex>
        ) : null}
        {!loadingDetails && (
          <Flex direction="column" gap="size-200" width="100%">
            <Flex direction="column" gap="size-100">
              <Text>Title *</Text>
              <TextField
                isRequired
                width="100%"
                value={name}
                onChange={setName}
              />
            </Flex>

            <Flex direction="column" gap="size-100">
              <Text>Description *</Text>
              <TextArea
                width="100%"
                value={description}
                onChange={setDescription}
              />
            </Flex>

            <Flex direction="row" gap="size-100">
              <Flex direction="column" gap="size-100">
                <Text>Date</Text>
                <DatePicker
                  isRequired
                  width="100%"
                  value={date ?? undefined}
                  onChange={(v) => setDate(v ?? null)}
                />
              </Flex>
              <Flex direction="column" gap="size-100">
                <Text>Start Time</Text>
                <TimeField
                  isRequired
                  hourCycle={12}
                  width="100%"
                  value={startTime ?? undefined}
                  onChange={(v) => setStartTime(v ?? null)}
                />
              </Flex>
              <Flex direction="column" gap="size-100">
                <Text>End Time</Text>
                <TimeField
                  isRequired
                  hourCycle={12}
                  width="100%"
                  value={endTime ?? undefined}
                  onChange={(v) => setEndTime(v ?? null)}
                />
              </Flex>
            </Flex>

            <Flex direction="column" gap="size-100">
              <Text>Session registration</Text>
              <ActionGroup
                selectionMode="single"
                selectedKeys={
                  registrationRequired ? ["registration"] : ["automatic"]
                }
                onAction={(key) => {
                  setRegistrationRequired(key === "registration");
                }}
              >
                <Item key="automatic">Automatic</Item>
                <Item key="registration">Registration required</Item>
              </ActionGroup>

              <Flex direction="row" gap="size-100">
                <Checkbox
                  isSelected={capacityLimitEnabled}
                  onChange={setCapacityLimitEnabled}
                  isDisabled={!registrationRequired}
                >
                  Set capacity limit
                </Checkbox>
                <TextField
                  isRequired={capacityLimitEnabled}
                  isDisabled={!registrationRequired}
                  type="number"
                />
              </Flex>
            </Flex>

            <SpeakerSelector
              seriesId={seriesId}
              sessionId={session?.id}
            />

            <Flex direction="column" gap="size-100">
              <Text>Tags</Text>
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
              />
            </Flex>
          </Flex>
        )}
      </Content>
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
      <ButtonGroup>
        <Button variant="secondary" onPress={close} isDisabled={saving}>
          Cancel
        </Button>
        <Button
          variant="accent"
          onPress={handleSave}
          isDisabled={!canSave || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </ButtonGroup>
    </Dialog>
  );
};

export default SessionDialog;
