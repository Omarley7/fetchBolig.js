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
const LOCALE_MAP: Record<string, string> = { da: "da-DK", en: "en-GB" };
function toDateLocale(locale: string): string {
  return LOCALE_MAP[locale] ?? locale;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDay(key: string, locale: string): string {
  return capitalize(new Date(key).toLocaleDateString(toDateLocale(locale), {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }));
}

export function formatWeek(key: string, locale: string, weekLabel: string): string {
  const weekStart = new Date(key);
  const weekNumber = getISOWeek(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dl = toDateLocale(locale);
  const startStr = weekStart.toLocaleDateString(dl, {
    day: "2-digit",
    month: "2-digit",
  });

  const endStr = weekEnd.toLocaleDateString(dl, {
    day: "2-digit",
    month: "2-digit",
  });

  return `${weekLabel} ${weekNumber} (${startStr} - ${endStr})`;
}

export function formatMonth(key: string, locale: string): string {
  const [year, month] = key.split("-");
  return capitalize(new Date(`${year}-${month}-01`).toLocaleDateString(toDateLocale(locale), {
    month: "long",
    year: "numeric",
  }));
}
