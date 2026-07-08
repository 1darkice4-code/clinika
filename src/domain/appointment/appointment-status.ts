import type { AppointmentStatus, LeadStatus } from "@prisma/client/index";
import { ConflictError } from "@/lib/errors";

const appointmentTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC"],
  CONFIRMED: ["ARRIVED", "NO_SHOW", "CANCELLED_BY_CLIENT", "CANCELLED_BY_CLINIC", "RESCHEDULED"],
  ARRIVED: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED_BY_CLIENT: [],
  CANCELLED_BY_CLINIC: [],
  RESCHEDULED: ["CONFIRMED"]
};

const leadTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["IN_PROGRESS", "SPAM"],
  IN_PROGRESS: ["NO_CONTACT", "WAITING_FOR_CLIENT", "BOOKED", "DECLINED"],
  NO_CONTACT: ["IN_PROGRESS"],
  WAITING_FOR_CLIENT: ["IN_PROGRESS"],
  BOOKED: ["CLOSED"],
  DECLINED: ["CLOSED"],
  SPAM: ["CLOSED"],
  CLOSED: []
};

export function assertAppointmentTransition(from: AppointmentStatus, to: AppointmentStatus) {
  if (!appointmentTransitions[from].includes(to)) {
    throw new ConflictError(`Переход записи ${from} -> ${to} недоступен`);
  }
}

// Перенести можно только активную (не завершённую и не отменённую) запись.
const reschedulableStatuses: AppointmentStatus[] = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "RESCHEDULED"
];

export function assertAppointmentReschedulable(from: AppointmentStatus) {
  if (!reschedulableStatuses.includes(from)) {
    throw new ConflictError(`Запись в статусе ${from} нельзя перенести`);
  }
}

export function assertLeadTransition(from: LeadStatus, to: LeadStatus) {
  if (!leadTransitions[from].includes(to)) {
    throw new ConflictError(`Переход заявки ${from} -> ${to} недоступен`);
  }
}
