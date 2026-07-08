"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Ban, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localDateTimeToUtc } from "@/lib/date-time";
import { cn } from "@/lib/utils";

type ScheduleRow = {
  weekday: number;
  startsAtLocalTime: string;
  endsAtLocalTime: string;
  breaksJson: { startsAtLocalTime: string; endsAtLocalTime: string }[];
};

type SpecialistSchedule = {
  id: string;
  firstName: string;
  lastName: string;
  workSchedules: ScheduleRow[];
};

type ScheduleManagerProps = {
  specialists: SpecialistSchedule[];
  timezone: string;
};

const days = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" }
];

function parseBreak(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const [startsAtLocalTime, endsAtLocalTime] = raw.split("-").map((part) => part.trim());
  if (!startsAtLocalTime || !endsAtLocalTime) return [];
  return [{ startsAtLocalTime, endsAtLocalTime }];
}

async function send(endpoint: string, method: "POST" | "PUT", payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить изменения");
}

export function ScheduleManager({ specialists, timezone }: ScheduleManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Tracks each day's checkbox so disabled days visibly dim and can't be edited.
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({});

  async function submitSchedules(event: FormEvent<HTMLFormElement>, specialistId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const schedules = days.flatMap((day) => {
      if (form.get(`enabled-${day.value}`) !== "on") return [];
      return [
        {
          weekday: day.value,
          startsAtLocalTime: String(form.get(`start-${day.value}`) ?? ""),
          endsAtLocalTime: String(form.get(`end-${day.value}`) ?? ""),
          breaksJson: parseBreak(form.get(`break-${day.value}`))
        }
      ];
    });

    setPending(`schedule-${specialistId}`);
    setMessage(null);

    try {
      await send("/api/admin/schedule/work-schedules", "PUT", { specialistId, schedules });
      setMessage("Расписание обновлено");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить расписание");
    } finally {
      setPending(null);
    }
  }

  async function submitBlock(event: FormEvent<HTMLFormElement>, specialistId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const date = String(form.get("date") ?? "");
    const startsAtLocalTime = String(form.get("startsAtLocalTime") ?? "");
    const endsAtLocalTime = String(form.get("endsAtLocalTime") ?? "");

    setPending(`block-${specialistId}`);
    setMessage(null);

    try {
      await send("/api/admin/schedule/time-blocks", "POST", {
        specialistId,
        startsAtUtc: localDateTimeToUtc(date, startsAtLocalTime, timezone).toISOString(),
        endsAtUtc: localDateTimeToUtc(date, endsAtLocalTime, timezone).toISOString(),
        reason: String(form.get("reason") ?? "")
      });
      setMessage("Время заблокировано");
      router.refresh();
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось заблокировать время");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-4">
      {message && <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">{message}</p>}
      {specialists.map((specialist) => (
        <Card key={specialist.id} className="p-5">
          <h2 className="text-xl font-semibold">
            {specialist.firstName} {specialist.lastName}
          </h2>

          <form className="mt-4 grid gap-3" onSubmit={(event) => submitSchedules(event, specialist.id)}>
            <div className="grid gap-3 xl:grid-cols-7">
              {days.map((day) => {
                const schedule = specialist.workSchedules.find((item) => item.weekday === day.value);
                const breakText = schedule?.breaksJson[0]
                  ? `${schedule.breaksJson[0].startsAtLocalTime}-${schedule.breaksJson[0].endsAtLocalTime}`
                  : "";
                const dayKey = `${specialist.id}-${day.value}`;
                const enabled = enabledDays[dayKey] ?? Boolean(schedule);

                return (
                  <div key={day.value} className="rounded-md border p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        name={`enabled-${day.value}`}
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) =>
                          setEnabledDays((current) => ({ ...current, [dayKey]: event.target.checked }))
                        }
                      />
                      {day.label}
                    </label>
                    <div className={cn("mt-3 grid gap-2 transition-opacity", !enabled && "opacity-40")}>
                      <Input
                        name={`start-${day.value}`}
                        type="time"
                        disabled={!enabled}
                        defaultValue={schedule?.startsAtLocalTime ?? "09:00"}
                        aria-label={`${day.label}: начало`}
                      />
                      <Input
                        name={`end-${day.value}`}
                        type="time"
                        disabled={!enabled}
                        defaultValue={schedule?.endsAtLocalTime ?? "18:00"}
                        aria-label={`${day.label}: окончание`}
                      />
                      <Input
                        name={`break-${day.value}`}
                        placeholder="13:00-14:00"
                        disabled={!enabled}
                        defaultValue={breakText}
                        aria-label={`${day.label}: перерыв`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              type="submit"
              disabled={pending === `schedule-${specialist.id}`}
              className="w-fit"
              data-testid="schedule-save"
            >
              <Save className="h-4 w-4" />
              Сохранить график
            </Button>
          </form>

          <form
            className="mt-5 grid gap-3 rounded-md border bg-muted/30 p-4 md:grid-cols-[150px_120px_120px_1fr_auto]"
            onSubmit={(event) => submitBlock(event, specialist.id)}
          >
            <Input name="date" type="date" required aria-label="Дата блокировки" />
            <Input name="startsAtLocalTime" type="time" required aria-label="Начало блокировки" />
            <Input name="endsAtLocalTime" type="time" required aria-label="Окончание блокировки" />
            <Input name="reason" required placeholder="Причина блокировки" aria-label="Причина блокировки" />
            <Button
              type="submit"
              disabled={pending === `block-${specialist.id}`}
              variant="secondary"
              data-testid="schedule-block"
            >
              <Ban className="h-4 w-4" />
              Блок
            </Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
