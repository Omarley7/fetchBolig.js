import Alpine from "alpinejs";
import "./style.css";

window.Alpine = Alpine;

type Appointment = {
  id: number;
  date: Date;
  title: string;
  start: Date;
  end: Date;
  rent: number;
  downPayment: number;
  imageUrl: string;
};

type GroupedAppointments = [string, Appointment[]][];

type GroupBy = "day" | "week" | "month";

const deasStore = {
  appointments: [
    {
      id: 1,
      date: new Date(2025, 11, 12),
      title: "Flinterenden 6,3 tv., 2300 København S",
      start: new Date(2025, 11, 12, 9, 30),
      end: new Date(2025, 11, 12, 10, 0),
      rent: 10100.0,
      downPayment: 70002.0,
      imageUrl: "https://placehold.co/600x400",
    } as Appointment,
    {
      id: 2,
      date: new Date(2025, 11, 12),
      title: "Flinterenden 6,2 th., 2300 København S",
      start: new Date(2025, 11, 12, 10, 0),
      end: new Date(2025, 11, 12, 10, 50),
      rent: 8100.0,
      downPayment: 70002.0,
      imageUrl: "https://placehold.co/400x400",
    } as Appointment,
    {
      id: 3,
      date: new Date(2025, 11, 19),
      title: "Bondehavevej 9,1 mf., 2880 Gladsaxe",
      start: new Date(2025, 11, 19, 9, 30),
      end: new Date(2025, 11, 19, 10, 0),
      rent: 8200.0,
      downPayment: 70002.0,
      imageUrl: "https://placehold.co/400x600",
    } as Appointment,
  ] as Appointment[],

  // Helpers
  _groupBy(fn: (appt: Appointment) => string): GroupedAppointments {
    const groups: Record<string, Appointment[]> = {};

    // use `this` so it still works if Alpine wraps the store
    this.appointments.forEach((appt: Appointment) => {
      const key = fn(appt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  },

  // pr. dag
  get appointmentsByDay(): GroupedAppointments {
    return this._groupBy((appt) => {
      // YYYY-MM-DD
      return appt.date.toISOString().slice(0, 10);
    });
  },

  // pr. uge (ISO-style, uge starter mandag). Key = mandagens dato (YYYY-MM-DD)
  get appointmentsByWeek(): GroupedAppointments {
    return this._groupBy((appt) => {
      const d = new Date(appt.date);
      const day = d.getDay(); // 0 = søn, 1 = man, ... 6 = lør
      const diff = day === 0 ? -6 : 1 - day; // flyt til mandag
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10); // mandag i ugen
    });
  },

  // pr. måned (kalendermåned)
  get appointmentsByMonth(): GroupedAppointments {
    return this._groupBy((appt) => {
      const year = appt.date.getFullYear();
      const month = String(appt.date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`; // fx "2025-12"
    });
  },

  // ---- Formatting helpers ----
  formatDay(key: string): string {
    return new Date(key).toLocaleDateString("da-DK", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
  },

  formatWeek(key: string): string {
    const start = new Date(key);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    // TS doesn't know about `week` yet, so we cast the options
    const weekNumber = new Intl.DateTimeFormat("da-DK", {
      // @ts-expect-error: `week` is not in TS lib yet
      week: "numeric",
    }).format(start);

    const startStr = start.toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
    });

    const endStr = end.toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
    });

    return `Uge ${weekNumber} (${startStr} - ${endStr})`;
  },

  formatMonth(key: string): string {
    const [year, month] = key.split("-");
    return new Date(`${year}-${month}-01`).toLocaleDateString("da-DK", {
      month: "long",
      year: "numeric",
    });
  },

  formatGroupKey(groupBy: GroupBy, key: string): string {
    if (groupBy === "day") return this.formatDay(key);
    if (groupBy === "week") return this.formatWeek(key);
    return this.formatMonth(key);
  },
};

Alpine.store("deas", deasStore);
Alpine.start();
