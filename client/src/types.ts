export type Appointment = {
  id: number;
  date: Date;
  title: string;
  start: Date;
  end: Date;
  rent: number;
  downPayment: number;
  imageUrl: string;
};

export type AppointmentsPayload = {
  updatedAt: Date;
  appointments: Appointment[];
};
