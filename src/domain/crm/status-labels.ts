import type { AppointmentStatus, LeadStatus, TaskStatus } from "@prisma/client/index";

export const leadStatusLabels = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  NO_CONTACT: "Не дозвонились",
  WAITING_FOR_CLIENT: "Ждем клиента",
  BOOKED: "Записан",
  DECLINED: "Отказ",
  SPAM: "Спам",
  CLOSED: "Закрыта"
} satisfies Record<LeadStatus, string>;

export const appointmentStatusLabels = {
  PENDING_CONFIRMATION: "Ждет подтверждения",
  CONFIRMED: "Подтверждена",
  ARRIVED: "Клиент пришел",
  COMPLETED: "Оказана",
  NO_SHOW: "Неявка",
  CANCELLED_BY_CLIENT: "Отмена клиентом",
  CANCELLED_BY_CLINIC: "Отмена клиникой",
  RESCHEDULED: "Перенесена"
} satisfies Record<AppointmentStatus, string>;

export const taskStatusLabels = {
  OPEN: "Открыта",
  DONE: "Готово",
  CANCELLED: "Отменена"
} satisfies Record<TaskStatus, string>;

// Each status carries a light pastel plus a matching dark-mode variant so pills
// stay readable in both themes (the admin defaults to light, but supports dark).
const amber = "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300";
const sky = "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300";
const orange = "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300";
const violet = "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300";
const emerald = "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300";
const rose = "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300";
const indigo = "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300";
const slate = "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300";

export const leadStatusClasses = {
  NEW: amber,
  IN_PROGRESS: sky,
  NO_CONTACT: orange,
  WAITING_FOR_CLIENT: violet,
  BOOKED: emerald,
  DECLINED: rose,
  SPAM: slate,
  CLOSED: slate
} satisfies Record<LeadStatus, string>;

export const appointmentStatusClasses = {
  PENDING_CONFIRMATION: amber,
  CONFIRMED: sky,
  ARRIVED: indigo,
  COMPLETED: emerald,
  NO_SHOW: rose,
  CANCELLED_BY_CLIENT: slate,
  CANCELLED_BY_CLINIC: slate,
  RESCHEDULED: violet
} satisfies Record<AppointmentStatus, string>;

export const taskStatusClasses = {
  OPEN: amber,
  DONE: emerald,
  CANCELLED: slate
} satisfies Record<TaskStatus, string>;
