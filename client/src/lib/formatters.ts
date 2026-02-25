import type { Appointment } from "@/types";
export function formatTimeSlot(appointment: Appointment, includeDate = false): string {
  if (!appointment.date) return "";
  const date = new Date(appointment.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
  });
  const startTime = appointment.start;
  const endTime = appointment.end;
  if (!includeDate) return `${startTime} - ${endTime}`;
  return `d. ${date}, ${startTime} - ${endTime}`;
}
export function formatUpdatedAt(updatedAt: Date | null): { date: string; time: string } | null {
  if (!updatedAt) return null;
  const d = new Date(updatedAt);
  const dateStr = d.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return { date: dateStr, time: timeStr };
}
export type StalenessLevel = "fresh" | "aging" | "stale";
export function getStalenessLevel(updatedAt: Date | null): StalenessLevel {
  if (!updatedAt) return "stale";
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const oneHour = 60 * 60 * 1000;
  const twentyFourHours = 24 * oneHour;
  if (ageMs < oneHour) return "fresh";
  if (ageMs < twentyFourHours) return "aging";
  return "stale";
}
export function formatRelativeTime(
  updatedAt: Date | null,
  t: (key: string, params?: unknown[]) => string,
): string {
  if (!updatedAt) return "---";
  const now = Date.now();
  const then = new Date(updatedAt).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (minutes < 1) return t("sync.justNow");
  if (minutes < 60) return t("sync.minutesAgo", [minutes]);
  if (hours < 24) return t("sync.hoursAgo", [hours]);
  return t("sync.daysAgo", [days]);
}
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
  });
}
