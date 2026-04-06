import {
  parseDateTime,
  CalendarDateTime,
  CalendarDate,
  Time,
} from "@internationalized/date";

/**
 * Safely parses an ISO-like datetime string into a Spectrum `CalendarDateTime`.
 * Normalizes trailing milliseconds/timezone markers so values from different
 * API sources can be consumed by Spectrum date/time components.
 *
 * @param dateString Datetime string (for example: `2026-03-19T10:30:00.000Z`)
 * @returns Parsed `CalendarDateTime`, or `null` when missing/invalid.
 * Return example: `CalendarDateTime(2026-03-19T10:30:00)` with
 * `year=2026, month=3, day=19, hour=10, minute=30, second=0`.
 *
 * @example
 * safeParseDateTimeString("2026-03-19T10:30:00.000Z")
 * // => CalendarDateTime for 2026-03-19 10:30:00
 */
export function safeParseDateTimeString(
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

/**
 * Extracts a Spectrum `Time` value from a datetime string.
 * Used to prefill `TimeField` controls from persisted session datetimes.
 *
 * @param dateTimeStr Datetime string
 * @returns `Time` for the hour/minute/second portion, or `null` when invalid.
 * Return example: `Time(10:30:00)` with `hour=10, minute=30, second=0`.
 *
 * @example
 * parseTimeFromDateTime("2026-03-19T10:30:00.000Z")
 * // => Time for 10:30:00
 */
export function parseTimeFromDateTime(
  dateTimeStr: string | undefined,
): Time | null {
  if (!dateTimeStr) return null;
  const dt = safeParseDateTimeString(dateTimeStr);
  if (!dt) return null;
  return new Time(dt.hour, dt.minute, dt.second || 0);
}

/**
 * Combines a Spectrum `CalendarDate` and `Time` into the ISO string format
 * expected by session APIs: `YYYY-MM-DDTHH:mm:ss.000Z`.
 *
 * @param date Date selected in the form
 * @param time Time selected in the form
 * @returns ISO-style UTC-suffixed datetime string.
 * Return example: `"2026-03-19T10:30:00.000Z"`.
 *
 * @example
 * dateAndTimeToISO(new CalendarDate(2026, 3, 19), new Time(10, 30, 0))
 * // => "2026-03-19T10:30:00.000Z"
 */
export function dateAndTimeToISO(date: CalendarDate, time: Time): string {
  const dt = new CalendarDateTime(
    date.year,
    date.month,
    date.day,
    time.hour,
    time.minute,
    time.second || 0,
  );
  return dt.toString();
}

/**
 * Converts UTC milliseconds to a naive datetime string in the given IANA timezone.
 * The result has no timezone indicator (no 'Z', no offset), matching the format
 * EventInfoComponent uses for event datetimes.
 *
 * @example
 * millisToNaiveDateTimeString(1776074400000, "America/Los_Angeles")
 * // => "2026-04-13T03:00:00"  (3 AM PDT, not UTC)
 */
export function millisToNaiveDateTimeString(millis: number, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(millis)).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}

/**
 * Converts a naive datetime string (no timezone indicator) representing wall-clock
 * time in the given IANA timezone to UTC milliseconds.
 * Mirrors the save approach in EventInfoComponent: wall-clock time + separate timezone.
 *
 * @example
 * naiveDateTimeToUTCMillis("2026-04-13T03:00:00", "America/Los_Angeles")
 * // => 1776074400000  (3 AM PDT = 10:00 AM UTC)
 */
export function naiveDateTimeToUTCMillis(dateTimeStr: string, timezone: string): number {
  // Treat the naive string as UTC to get a reference probe point
  const probe = new Date(dateTimeStr + "Z").getTime();

  // Find what wall-clock time the probe shows in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(probe)).map((p) => [p.type, p.value]),
  );
  const h = parts.hour === "24" ? "00" : parts.hour;
  const localMs = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${h}:${parts.minute}:${parts.second}Z`,
  ).getTime();

  // Shift the probe by the difference to land on the correct UTC instant
  return probe + (probe - localMs);
}

/**
 * Formats an ISO datetime string as a user-facing time label.
 * Reads the hour/minute values directly without UTC→local conversion,
 * because session datetimes are stored as wall-clock times (the Z suffix
 * is nominal and does not indicate true UTC).
 *
 * @param dateTimeString ISO datetime string
 * @returns Time string in `en-US` format (for example: `8:00 AM`)
 */
export function formatTime(dateTimeString: string): string {
  const dt = safeParseDateTimeString(dateTimeString);
  if (!dt) return "";
  return new Date(2000, 0, 1, dt.hour, dt.minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats an ISO datetime string as a user-facing date label.
 * Reads year/month/day directly without UTC→local conversion,
 * because session datetimes are stored as wall-clock times.
 *
 * @param dateTimeString ISO datetime string
 * @returns Date string in `en-US` format (for example: `Dec 18, 2024`)
 */
export function formatDate(dateTimeString: string): string {
  const dt = safeParseDateTimeString(dateTimeString);
  if (!dt) return "";
  return new Date(dt.year, dt.month - 1, dt.day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
