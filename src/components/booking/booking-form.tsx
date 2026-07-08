"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
};

type SpecialistOption = {
  id: string;
  firstName: string;
  lastName: string;
  services: { service: { id: string } }[];
};

type Slot = {
  startsAtUtc: string;
  endsAtUtc: string;
  available: boolean;
  label: string;
};

type BookingFormProps = {
  services: ServiceOption[];
  specialists: SpecialistOption[];
};

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function BookingForm({ services, specialists }: BookingFormProps) {
  const [mode, setMode] = useState<"appointment" | "lead">("appointment");
  const appointmentIdempotencyKey = useRef(createIdempotencyKey());
  const leadIdempotencyKey = useRef(createIdempotencyKey());
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [specialistId, setSpecialistId] = useState("");
  const [date, setDate] = useState(tomorrowDate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableSpecialists = useMemo(
    () =>
      specialists.filter((specialist) =>
        specialist.services.some((item) => item.service.id === serviceId)
      ),
    [serviceId, specialists]
  );

  // Keep the chosen specialist valid for the selected service.
  useEffect(() => {
    if (availableSpecialists.length === 0) {
      setSpecialistId("");
      return;
    }
    if (!availableSpecialists.some((specialist) => specialist.id === specialistId)) {
      setSpecialistId(availableSpecialists[0].id);
    }
  }, [availableSpecialists, specialistId]);

  useEffect(() => {
    if (mode !== "appointment" || !serviceId || !specialistId || !date) {
      setSlots([]);
      setSlot("");
      return;
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    setError(null);
    fetch(
      `/api/public/slots?serviceId=${serviceId}&specialistId=${specialistId}&dateFrom=${date}&dateTo=${date}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось получить свободное время");
        return response.json() as Promise<{ slots: Slot[] }>;
      })
      .then((data) => {
        setSlots(data.slots);
        // Preselect the first free slot so the form is ready to submit.
        setSlot(data.slots.find((item) => item.available)?.startsAtUtc ?? "");
      })
      .catch((caughtError: unknown) => {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
        setSlots([]);
        setSlot("");
        setError(caughtError instanceof Error ? caughtError.message : "Ошибка загрузки слотов");
      })
      .finally(() => setLoadingSlots(false));

    return () => controller.abort();
  }, [date, mode, serviceId, specialistId]);

  const hasFreeSlots = slots.some((item) => item.available);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    // Capture the form node now: React nullifies `event.currentTarget` after the
    // handler returns, so reading it after `await` below would throw.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payloadBase = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      comment: String(form.get("comment") ?? ""),
      serviceId,
      personalDataConsentAccepted: form.get("personalDataConsentAccepted") === "on",
      marketingConsentAccepted: form.get("marketingConsentAccepted") === "on",
      legalDocumentVersion: "2026-01",
      idempotencyKey:
        mode === "appointment" ? appointmentIdempotencyKey.current : leadIdempotencyKey.current,
      honeypot: String(form.get("company") ?? ""),
      landingPage: window.location.pathname,
      referrer: document.referrer || undefined
    };

    const endpoint = mode === "appointment" ? "/api/public/appointments" : "/api/public/leads";
    const payload =
      mode === "appointment"
        ? { ...payloadBase, specialistId, startsAtUtc: slot }
        : {
            ...payloadBase,
            preferredContactTime: String(form.get("preferredContactTime") ?? "")
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; publicNumber?: string };
      if (!response.ok) throw new Error(data.error ?? "Не удалось отправить форму");

      setMessage(
        mode === "appointment"
          ? `Запись создана. Номер: ${data.publicNumber}`
          : `Заявка создана. Номер: ${data.publicNumber}`
      );
      if (mode === "appointment") {
        appointmentIdempotencyKey.current = createIdempotencyKey();
        // The booked slot is now taken — refresh the grid so it shows disabled.
        setSlots((current) =>
          current.map((item) =>
            item.startsAtUtc === slot ? { ...item, available: false } : item
          )
        );
        setSlot("");
      } else {
        leadIdempotencyKey.current = createIdempotencyKey();
      }
      formElement.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось отправить форму");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" aria-label="Форма онлайн-записи">
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/70 p-1">
        <button
          type="button"
          onClick={() => setMode("appointment")}
          className={`rounded-sm px-3 py-2 text-sm font-medium transition ${
            mode === "appointment"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Запись
        </button>
        <button
          type="button"
          onClick={() => setMode("lead")}
          className={`rounded-sm px-3 py-2 text-sm font-medium transition ${
            mode === "lead"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Звонок
        </button>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="serviceId">
          Услуга
        </label>
        <Select
          id="serviceId"
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </div>

      {mode === "appointment" && (
        <>
          <div>
            <label className="text-sm font-medium" htmlFor="specialistId">
              Специалист
            </label>
            <Select
              id="specialistId"
              value={specialistId}
              onChange={(event) => setSpecialistId(event.target.value)}
              disabled={availableSpecialists.length === 0}
            >
              {availableSpecialists.length === 0 && <option value="">Нет доступных специалистов</option>}
              {availableSpecialists.map((specialist) => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.firstName} {specialist.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="date">
              Дата
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              min={tomorrowDate()}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Время</span>
              <span className="text-xs text-muted-foreground">Слот 1 час</span>
            </div>

            <div className="mt-2 min-h-11" aria-live="polite">
              {loadingSlots ? (
                <div className="flex h-11 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загружаем свободное время…
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-md border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  В этот день приём не ведётся. Выберите другую дату.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="slot-grid">
                    {slots.map((item) => {
                      const selected = slot === item.startsAtUtc;
                      return (
                        <button
                          key={item.startsAtUtc}
                          type="button"
                          data-testid="slot"
                          data-available={item.available}
                          disabled={!item.available}
                          aria-pressed={selected}
                          title={item.available ? undefined : "Слот занят"}
                          onClick={() => item.available && setSlot(item.startsAtUtc)}
                          className={cn(
                            "h-11 rounded-md border text-sm font-medium tabular-nums transition",
                            item.available && selected && "border-primary bg-primary text-primary-foreground shadow-sm",
                            item.available && !selected && "bg-card hover:border-primary hover:text-primary",
                            !item.available &&
                              "cursor-not-allowed border-dashed bg-muted/60 text-muted-foreground line-through opacity-60"
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  {!hasFreeSlots && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      На этот день всё занято. Попробуйте другую дату.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm border bg-card" />
                      Свободно
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
                      Выбрано
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm border border-dashed bg-muted" />
                      Занято
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {mode === "lead" && (
        <div>
          <label className="text-sm font-medium" htmlFor="preferredContactTime">
            Удобное время звонка
          </label>
          <Input
            id="preferredContactTime"
            name="preferredContactTime"
            placeholder="Например, завтра после 14:00"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="name">
            Имя
          </label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="phone">
            Телефон
          </label>
          <Input
            id="phone"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+7..."
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" autoComplete="email" type="email" />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="comment">
          Комментарий
        </label>
        <Textarea id="comment" name="comment" />
      </div>

      <input className="hidden" name="company" tabIndex={-1} autoComplete="off" />

      <label className="flex items-start gap-2 text-sm">
        <input
          className="mt-1 accent-[hsl(var(--metal))]"
          type="checkbox"
          name="personalDataConsentAccepted"
          required
        />
        <span>Я согласен на обработку персональных данных.</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          className="mt-1 accent-[hsl(var(--metal))]"
          type="checkbox"
          name="marketingConsentAccepted"
        />
        <span>Я согласен получать информационные и рекламные сообщения.</span>
      </label>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-card p-3 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      )}

      <Button
        className="h-12 rounded-full shadow-lg shadow-[hsl(var(--metal-glow))]"
        type="submit"
        disabled={submitting || (mode === "appointment" && !slot)}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CalendarDays className="h-4 w-4" />
        )}
        {mode === "appointment" ? "Подтвердить запись" : "Отправить заявку"}
      </Button>
    </form>
  );
}
