import type { Appointment } from "@/types";

export function exportToCalendar(appointment: Appointment): boolean {
  const { title, date, start, end, residence } = appointment;

  if (!date || !start || !end) {
    return false;
  }

  // Combine date with time to create full datetime
  const startDateTime = new Date(`${date}T${start}`);
  const endDateTime = new Date(`${date}T${end}`);

  // Format dates for ICS file (YYYYMMDDTHHMMSS)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const address = `${residence.adressLine1}, ${residence.adressLine2}`;

  // Create ICS file content
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:Åbent hus: ${title}`,
    `LOCATION:${address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  // Create and download the ICS file
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return true;
}
