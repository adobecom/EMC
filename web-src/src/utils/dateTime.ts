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
 * Formats an ISO datetime string as a user-facing time label.
 *
 * @param dateTimeString ISO datetime string
 * @returns Time string in `en-US` format (for example: `8:00 AM`)
 */
export function formatTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Formats an ISO datetime string as a user-facing date label.
 *
 * @param dateTimeString ISO datetime string
 * @returns Date string in `en-US` format (for example: `Dec 18, 2024`)
 */
export function formatDate(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
