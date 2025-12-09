import type { Appointment } from "@/types";

export function formatTimeSlot(
  appointment: Appointment,
  includeDate: boolean = false
): string {
  const startDate = appointment.start;
  const endDate = appointment.end;

  const startTime = startDate
    ? startDate.toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const endTime = endDate
    ? endDate.toLocaleTimeString("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (!startDate || !endDate || !startTime || !endTime)
    return "Tidspunkt ikke oplyst";

  if (!includeDate) return `${startTime} - ${endTime}`;

  const date = startDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
  });
  return `d. ${date}, ${startTime} - ${endTime}`;
}

export function formatUpdatedAt(updatedAt: Date | null | undefined): string {
  if (!updatedAt) return "---";

  const date = new Date(updatedAt);
  return `🗓️${date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })} ⌚${date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}
