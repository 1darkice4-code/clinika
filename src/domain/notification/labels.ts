import type { NotificationChannel, NotificationStatus } from "@prisma/client/index";

export const channelLabels = {
  EMAIL: "Email",
  SMS: "SMS",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
  IN_APP: "В приложении"
} satisfies Record<NotificationChannel, string>;

export const notificationStatusLabels = {
  PENDING: "В очереди",
  SENT: "Отправлено",
  DELIVERED: "Доставлено",
  FAILED: "Ошибка",
  CANCELLED: "Отменено"
} satisfies Record<NotificationStatus, string>;

export const notificationStatusClasses = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  SENT: "border-sky-200 bg-sky-50 text-sky-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700"
} satisfies Record<NotificationStatus, string>;

const eventTypeLabels: Record<string, string> = {
  "lead.created": "Новая заявка",
  "lead.status_changed": "Смена статуса заявки",
  "appointment.created": "Новая запись",
  "appointment.confirmed": "Запись подтверждена",
  "appointment.reminder": "Напоминание о записи",
  "appointment.rescheduled": "Запись перенесена",
  "appointment.cancelled": "Запись отменена"
};

export function notificationEventLabel(eventType: string): string {
  return eventTypeLabels[eventType] ?? eventType;
}

export const notificationStatusOptions: NotificationStatus[] = [
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "CANCELLED"
];
