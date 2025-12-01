type Group = "day" | "week" | "month";

type GroupedAppointments = [string, Appointment[]][];

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

export default (initialAppointments: Appointment[]) => ({
  init() {
    console.log(
      "groupBy initialized with",
      initialAppointments.length,
      "appointments"
    );
  },

  appointments: initialAppointments,

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

  getGroupedAppointments(groupBy: Group): GroupedAppointments {
    console.log("Getting grouped appointments by", groupBy);
    if (groupBy === "day") return this.appointmentsByDay;
    if (groupBy === "week") return this.appointmentsByWeek;
    return this.appointmentsByMonth;
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

  formatGroupKey(groupBy: Group, key: string): string {
    if (groupBy === "day") return this.formatDay(key);
    if (groupBy === "week") return this.formatWeek(key);
    return this.formatMonth(key);
  },

  // ---- Internal grouping logic ----
  _groupBy(getKey: (appt: Appointment) => string): GroupedAppointments {
    const groups: Record<string, Appointment[]> = {};
    this.appointments.forEach((appt: Appointment) => {
      const key = getKey(appt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  },
});
