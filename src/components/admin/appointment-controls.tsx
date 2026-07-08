"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { CalendarClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { appointmentStatusLabels } from "@/domain/crm/status-labels";
import { localDateTimeToUtc } from "@/lib/date-time";

type AppointmentStatus = keyof typeof appointmentStatusLabels;

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

// Mirrors assertAppointmentReschedulable on the server: only active visits move.
const reschedulableStatuses: AppointmentStatus[] = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "RESCHEDULED"
];

type AppointmentControlsProps = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  startsAtUtc: string;
  timezone: string;
};

function getZonedPart(date: Date, timezone: string, type: Intl.DateTimeFormatPartTypes) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(date)
    .find((part) => part.type === type)?.value;
}

function getClinicDefaults(startsAtUtc: string, timezone: string) {
  const date = new Date(startsAtUtc);
  const year = getZonedPart(date, timezone, "year");
  const month = getZonedPart(date, timezone, "month");
  const day = getZonedPart(date, timezone, "day");
  const hour = getZonedPart(date, timezone, "hour");
  const minute = getZonedPart(date, timezone, "minute");

  return {
    date: year && month && day ? `${year}-${month}-${day}` : "",
    time: hour && minute ? `${hour}:${minute}` : ""
  };
}

async function postJson(endpoint: string, payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить изменения");
}

export function AppointmentControls({ appointmentId, currentStatus, startsAtUtc, timezone }: AppointmentControlsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nextStatuses = appointmentTransitions[currentStatus];
  const canReschedule = reschedulableStatuses.includes(currentStatus);
  const defaults = getClinicDefaults(startsAtUtc, timezone);

  async function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);

    try {
      await postJson(`/api/admin/appointments/${appointmentId}/status`, {
        status: String(form.get("status")),
        reason: String(form.get("reason") ?? "") || undefined
      });
      setMessage("Статус обновлен");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить статус");
    } finally {
      setPending(false);
    }
  }

  async function submitReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date") ?? "");
    const time = String(form.get("time") ?? "");
    setPending(true);
    setMessage(null);

    try {
      await postJson(`/api/admin/appointments/${appointmentId}/reschedule`, {
        startsAtUtc: localDateTimeToUtc(date, time, timezone).toISOString(),
        reason: String(form.get("reason") ?? "") || undefined
      });
      setMessage("Запись перенесена");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось перенести запись");
    } finally {
      setPending(false);
    }
  }

  const hasActions = nextStatuses.length > 0 || canReschedule;

  return (
    <div className="grid w-64 gap-3">
      {!hasActions && <span className="text-xs text-muted-foreground">Нет доступных действий</span>}

      {nextStatuses.length > 0 && (
        <form className="grid gap-2" onSubmit={submitStatus}>
          <Select name="status" aria-label="Новый статус записи" defaultValue={nextStatuses[0]}>
            {nextStatuses.map((status) => (
              <option key={status} value={status}>
                {appointmentStatusLabels[status]}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              name="reason"
              placeholder="Комментарий"
              aria-label="Комментарий к статусу"
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={pending}
              aria-label="Сохранить статус записи"
              data-testid="appointment-status-save"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {canReschedule && (
        <form className="grid gap-2 border-t pt-3" onSubmit={submitReschedule}>
          <div className="grid grid-cols-2 gap-2">
            <Input name="date" type="date" defaultValue={defaults.date} aria-label="Новая дата записи" />
            <Input name="time" type="time" defaultValue={defaults.time} aria-label="Новое время записи" />
          </div>
          <Input name="reason" placeholder="Причина переноса" aria-label="Причина переноса" />
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            aria-label="Перенести запись"
            data-testid="appointment-reschedule"
          >
            <CalendarClock className="h-4 w-4" />
            Перенести
          </Button>
        </form>
      )}

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
