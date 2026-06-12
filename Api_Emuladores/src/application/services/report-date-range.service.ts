import { AppError } from "../../shared/errors/app-error";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;
const EXPLICIT_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REPORT_RANGE_DAYS = 15;

export interface ReportDateRange {
  startAt?: Date;
  endExclusive?: Date;
}

export class ReportDateRangeService {
  static normalize(from?: string, to?: string): ReportDateRange {
    const startAt = from ? this.parseStart(from) : undefined;
    const endExclusive = to ? this.parseEndExclusive(to) : undefined;

    if (startAt && endExclusive) {
      if (endExclusive.getTime() <= startAt.getTime()) {
        throw new AppError("Report end date must be greater than start date", 422, "REPORT_DATE_RANGE_INVALID");
      }

      if (endExclusive.getTime() - startAt.getTime() > MAX_REPORT_RANGE_DAYS * DAY_MS) {
        throw new AppError("Report range cannot exceed 15 days", 422, "REPORT_DATE_RANGE_TOO_LARGE");
      }

      const selectedDays = this.selectedCalendarDays(from, to);
      if (selectedDays !== null && selectedDays > MAX_REPORT_RANGE_DAYS) {
        throw new AppError("Report range cannot exceed 15 days", 422, "REPORT_DATE_RANGE_TOO_LARGE");
      }
    }

    return { startAt, endExclusive };
  }

  private static parseStart(value: string): Date {
    const trimmed = value.trim();
    if (DATE_ONLY_PATTERN.test(trimmed)) {
      return this.parseDateOnly(trimmed);
    }

    return this.parseDateTime(trimmed);
  }

  private static parseEndExclusive(value: string): Date {
    const trimmed = value.trim();
    if (DATE_ONLY_PATTERN.test(trimmed)) {
      return this.addUtcDays(this.parseDateOnly(trimmed), 1);
    }

    return this.parseDateTime(trimmed);
  }

  private static parseDateOnly(value: string): Date {
    const match = value.match(DATE_ONLY_PATTERN);
    if (!match) {
      throw new AppError("Invalid report date", 422, "REPORT_DATE_RANGE_INVALID");
    }

    const [, year, month, day] = match;
    return this.validDateOrThrow(
      Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0),
      Number(year),
      Number(month),
      Number(day)
    );
  }

  private static selectedCalendarDays(from?: string, to?: string): number | null {
    const startDay = from ? this.utcDayIndexFromInput(from) : null;
    const endDay = to ? this.utcDayIndexFromInput(to) : null;
    if (startDay === null || endDay === null) {
      return null;
    }

    return endDay - startDay + 1;
  }

  private static utcDayIndexFromInput(value: string): number | null {
    const match = value.trim().match(DATE_PREFIX_PATTERN);
    if (!match) {
      return null;
    }

    const [, year, month, day] = match;
    return Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0) / DAY_MS;
  }

  private static parseDateTime(value: string): Date {
    if (EXPLICIT_ZONE_PATTERN.test(value)) {
      return this.validDateOrThrow(Date.parse(value));
    }

    const match = value.match(LOCAL_DATE_TIME_PATTERN);
    if (!match) {
      throw new AppError("Invalid report date range", 422, "REPORT_DATE_RANGE_INVALID");
    }

    const [, year, month, day, hour, minute, second = "0", millisecond = "0"] = match;
    const paddedMs = millisecond.padEnd(3, "0");
    return this.validDateOrThrow(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        Number(paddedMs)
      ),
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  private static validDateOrThrow(
    timestamp: number,
    expectedYear?: number,
    expectedMonth?: number,
    expectedDay?: number,
    expectedHour?: number,
    expectedMinute?: number,
    expectedSecond?: number
  ): Date {
    if (!Number.isFinite(timestamp)) {
      throw new AppError("Invalid report date range", 422, "REPORT_DATE_RANGE_INVALID");
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      throw new AppError("Invalid report date range", 422, "REPORT_DATE_RANGE_INVALID");
    }

    if (
      expectedYear !== undefined &&
      (
        date.getUTCFullYear() !== expectedYear ||
        date.getUTCMonth() + 1 !== expectedMonth ||
        date.getUTCDate() !== expectedDay ||
        (expectedHour !== undefined && date.getUTCHours() !== expectedHour) ||
        (expectedMinute !== undefined && date.getUTCMinutes() !== expectedMinute) ||
        (expectedSecond !== undefined && date.getUTCSeconds() !== expectedSecond)
      )
    ) {
      throw new AppError("Invalid report date range", 422, "REPORT_DATE_RANGE_INVALID");
    }

    return date;
  }

  private static addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }
}
