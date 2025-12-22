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

export function formatUpdatedAt(updatedAt: Date | null): string {
  if (!updatedAt) return "---";

  const date = new Date(updatedAt);
  const dateStr = date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const timeStr = date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `🗓️${dateStr}\n⌚${timeStr}`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
  });
}
