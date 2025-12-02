import collapse from "@alpinejs/collapse";
import persist from "@alpinejs/persist";
import Alpine from "alpinejs";
import groupAppointments from "~/components/groupBy/groupAppointments";
import { getAppointments } from "~/data/appointments";
import "~/style.css";
import type { Appointment } from "~/types";

Alpine.plugin(persist);
Alpine.plugin(collapse);

window.Alpine = Alpine;

const deasStore = {
  appointments: [] as Appointment[],
  updatedAt: null as Date | null,

  init() {
    const payload = getAppointments(false);
    this.appointments = payload.appointments;
    this.updatedAt = payload.updatedAt;
  },

  refresh() {
    const payload = getAppointments(true);
    this.appointments = payload.appointments;
    this.updatedAt = payload.updatedAt;
  },
};

Alpine.store("deas", deasStore);
Alpine.data("appointmentsGrouped", () =>
  groupAppointments(deasStore.appointments)
);

// Initialize data before starting Alpine
deasStore.init();

Alpine.start();
