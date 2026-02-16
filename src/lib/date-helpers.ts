import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export function getMonthRange(date: Date = new Date()) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function getPreviousMonthRange(date: Date = new Date()) {
  const prev = subMonths(date, 1);
  return { start: startOfMonth(prev), end: endOfMonth(prev) };
}
