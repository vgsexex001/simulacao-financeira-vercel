import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
  getDaysInMonth,
} from "date-fns";

/**
 * Returns the month range respecting a custom monthStartDay.
 *
 * monthStartDay=1  → standard calendar month (Feb 1–Feb 28)
 * monthStartDay=5  → custom cycle (Feb 5–Mar 4)
 *
 * If `date` falls before the start day, it belongs to the previous cycle.
 * Example: monthStartDay=5, date=Feb 3 → returns Jan 5–Feb 4
 */
export function getCustomMonthRange(
  date: Date,
  monthStartDay: number
): { start: Date; end: Date } {
  if (monthStartDay <= 1) {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  let startYear: number;
  let startMonth: number;

  if (day >= monthStartDay) {
    // Current cycle started this calendar month
    startYear = year;
    startMonth = month;
  } else {
    // Current cycle started last calendar month
    if (month === 0) {
      startYear = year - 1;
      startMonth = 11;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
  }

  // Clamp start day to max days in that month
  const maxDaysStart = getDaysInMonth(new Date(startYear, startMonth));
  const clampedStartDay = Math.min(monthStartDay, maxDaysStart);

  // End is the day before monthStartDay in the next month
  let endMonth: number;
  let endYear: number;
  if (startMonth === 11) {
    endMonth = 0;
    endYear = startYear + 1;
  } else {
    endMonth = startMonth + 1;
    endYear = startYear;
  }

  const maxDaysEnd = getDaysInMonth(new Date(endYear, endMonth));
  const clampedEndDay = Math.min(monthStartDay - 1, maxDaysEnd);

  const start = startOfDay(new Date(startYear, startMonth, clampedStartDay));
  const end = endOfDay(new Date(endYear, endMonth, clampedEndDay));

  return { start, end };
}

/**
 * Returns the month range for a specific month/year respecting monthStartDay.
 *
 * month is 1-indexed (1=Jan, 12=Dec).
 * monthStartDay=5, month=2, year=2026 → Feb 5 – Mar 4
 */
export function getCustomMonthRangeForMonth(
  month: number,
  year: number,
  monthStartDay: number
): { start: Date; end: Date } {
  if (monthStartDay <= 1) {
    return {
      start: startOfMonth(new Date(year, month - 1)),
      end: endOfMonth(new Date(year, month - 1)),
    };
  }

  const startMonth = month - 1; // 0-indexed
  const maxDaysStart = getDaysInMonth(new Date(year, startMonth));
  const clampedStartDay = Math.min(monthStartDay, maxDaysStart);

  let endMonth: number;
  let endYear: number;
  if (startMonth === 11) {
    endMonth = 0;
    endYear = year + 1;
  } else {
    endMonth = startMonth + 1;
    endYear = year;
  }

  const maxDaysEnd = getDaysInMonth(new Date(endYear, endMonth));
  const clampedEndDay = Math.min(monthStartDay - 1, maxDaysEnd);

  return {
    start: startOfDay(new Date(year, startMonth, clampedStartDay)),
    end: endOfDay(new Date(endYear, endMonth, clampedEndDay)),
  };
}

/**
 * Returns the previous month's range relative to the current custom range.
 */
export function getCustomPreviousMonthRange(
  date: Date,
  monthStartDay: number
): { start: Date; end: Date } {
  const currentRange = getCustomMonthRange(date, monthStartDay);
  const prevDate = subMonths(currentRange.start, 1);

  if (monthStartDay <= 1) {
    return { start: startOfMonth(prevDate), end: endOfMonth(prevDate) };
  }

  // Use the same day-based logic but one month earlier
  return getCustomMonthRange(
    new Date(prevDate.getFullYear(), prevDate.getMonth(), monthStartDay),
    monthStartDay
  );
}
