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
} from "@adobe/react-spectrum";
import {
  parseDateTime,
  CalendarDateTime,
  CalendarDate,
  Time,
} from "@internationalized/date";
import { Session } from "../../../types/sessions";

export interface SessionFormData {
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags?: string[];
}

interface SessionDialogProps {
  /** Called when dialog should close (e.g. Cancel or after Save) */
  close: () => void;
  /** When null, form is blank (add mode). When provided, form is pre-filled (edit mode). */
  session: Session | null;
  /** Called with form data on Save. Caller can add or update session. */
  onSave: (data: SessionFormData) => void;
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

export const SessionDialog: React.FC<SessionDialogProps> = ({
  close,
  session,
  onSave,
}) => {
  const isEditMode = session !== null;

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

  useEffect(() => {
    if (session) {
      setName(session.name);
      setDescription(session.description ?? "");
      const startDt = safeParseDateTimeString(session.startDateTime);
      setDate(
        startDt
          ? new CalendarDate(startDt.year, startDt.month, startDt.day)
          : null,
      );
      setStartTime(parseTimeFromDateTime(session.startDateTime));
      setEndTime(parseTimeFromDateTime(session.endDateTime));
    } else {
      setName("");
      setDescription("");
      setDate(null);
      setStartTime(null);
      setEndTime(null);
    }
  }, [session]);

  const handleSave = () => {
    if (!date || !startTime || !endTime || !name.trim()) return;
    const startDateTime = dateAndTimeToISO(date, startTime);
    const endDateTime = dateAndTimeToISO(date, endTime);
    onSave({
      name: name.trim(),
      description: description.trim(),
      startDateTime,
      endDateTime,
      tags: session?.tags,
    });
    close();
  };

  const canSave = Boolean(name.trim() && date && startTime && endTime);

  return (
    <Dialog>
      <Heading>{isEditMode ? "Edit Session" : "Session Details"}</Heading>
      <Content marginTop="size-100">
        <Flex direction="column" gap="size-100" width="100%">
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
          <Flex direction="row" gap="size-100">
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
        </Flex>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={close}>
          Cancel
        </Button>
        <Button variant="accent" onPress={handleSave} isDisabled={!canSave}>
          Save
        </Button>
      </ButtonGroup>
    </Dialog>
  );
};

export default SessionDialog;
