export function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getISOWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = søn, 1 = man, ... 6 = lør
  const diff = day === 0 ? -6 : 1 - day; // flyt til mandag
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10); // mandag i ugen
}

// ---- Formatting helpers ----
export function formatDay(key: string): string {
  return new Date(key).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatWeek(key: string): string {
  const weekStart = new Date(key);
  const weekNumber = getISOWeek(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startStr = weekStart.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
  });

  const endStr = weekEnd.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
  });

  return `Uge ${weekNumber} (${startStr} - ${endStr})`;
}

export function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  return new Date(`${year}-${month}-01`).toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });
}
