import persist from "@alpinejs/persist";
import Alpine from "alpinejs";
import groupAppointments from "./groupAppointments";
import "./style.css";

Alpine.plugin(persist);

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
};

Alpine.store("deas", deasStore);
Alpine.data("appointmentsGrouped", () =>
  groupAppointments(deasStore.appointments)
);
Alpine.start();
