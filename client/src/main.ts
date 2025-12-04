import type { Appointment } from "@/types";
import collapse from "@alpinejs/collapse";
import persist from "@alpinejs/persist";
import Alpine from "alpinejs";
import groupAppointments from "~/components/groupBy/groupAppointments";
import { getAppointments } from "~/data/appointments";
import "~/style.css";

Alpine.plugin(persist);
Alpine.plugin(collapse);

window.Alpine = Alpine;

const deasStore = {
  appointments: [] as Appointment[],
  updatedAt: null as Date | null,
  isLoading: false,

  async init() {
    this.isLoading = true;
    const payload = await getAppointments(false);
    this.isLoading = false;
    this.appointments = payload.appointments;
    this.updatedAt = payload.updatedAt;
  },

  async refresh() {
    this.isLoading = true;
    try {
      const payload = await getAppointments(true);
      this.appointments = payload.appointments;
      this.updatedAt = payload.updatedAt;
    } finally {
      this.isLoading = false;
    }
  },
};

Alpine.store("deas", deasStore);
Alpine.data("appointmentsGrouped", groupAppointments);

// Initialize data before starting Alpine
deasStore.init();

Alpine.start();
