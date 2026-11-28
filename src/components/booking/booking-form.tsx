"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Stethoscope,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { AttributionInput } from "@/domain/analytics/attribution";
import { LEGAL_DOCUMENT_VERSION } from "@/domain/legal/legal-documents";
import { cn, formatPrice } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  group: string | null;
  priceFrom: number | null;
  priceExact: number | null;
  durationMinutes: number;
  /** Set when the service runs on a shared resource (laser) → single queue, no operator picker. */
  requiresResourceId: string | null;
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

export type BookingFormProps = {
  services: ServiceOption[];
  specialists: SpecialistOption[];
  bookingDate: string;
  initialDirection?: BookingDirection;
  initialMode?: "appointment" | "lead";
  initialDate?: string;
  initialServiceId?: string;
  startWithTime?: boolean;
  attribution?: AttributionInput;
  utmSource?: string;
  /** Текст, который заранее подставляется в комментарий (например, пометка об акции). */
  initialComment?: string;
  marketingConsent?: { slug: string; version: string } | null;
};

export type BookingDirection = "doctor" | "laser";

type FieldErrors = Partial<
  Record<
    | "name"
    | "phone"
    | "email"
    | "date"
    | "slot"
    | "preferredContactTime"
    | "comment"
    | "personalDataConsentAccepted",
    string
  >
>;

function validateName(value: string) {
  const name = value.trim();
  if (name.length < 2) return "Укажите имя — минимум 2 символа";
  if (name.length > 80) return "Имя не должно быть длиннее 80 символов";
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(name)) {
    return "Используйте буквы, пробел, дефис или апостроф";
  }
  return null;
}

function validatePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return "Введите номер полностью — не менее 10 цифр";
  if (digits.length > 15) return "В номере должно быть не больше 15 цифр";
  return null;
}

function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Проверьте формат email";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function LaserZonePicker({
  services,
  value,
  onChange
}: {
  services: ServiceOption[];
  value: string;
  onChange: (serviceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const selectedService = services.find((service) => service.id === value);
  const groups = useMemo(() => {
    const grouped = new Map<string, ServiceOption[]>();
    for (const service of services) {
      const group = service.group ?? "Зоны";
      grouped.set(group, [...(grouped.get(group) ?? []), service]);
    }
    return Array.from(grouped, ([name, items]) => ({ name, items }));
  }, [services]);

  useEffect(() => {
    if (!open) return;
    const options = optionsRef.current;
    const initialOption = options?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?? options?.querySelector<HTMLButtonElement>('[role="option"]');
    initialOption?.focus({ preventScroll: true });
    initialOption?.scrollIntoView({ block: "nearest" });

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  return (
    <div ref={pickerRef} className="relative">
      <span id="laser-zone-label" className="text-sm font-medium">
        Зона эпиляции
      </span>
      <button
        ref={pickerButtonRef}
        id="serviceId"
        type="button"
        aria-labelledby="laser-zone-label serviceId"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="laser-zone-options"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="mt-2 flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition hover:border-metal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">
            {selectedService?.name ?? "Выберите зону"}
          </span>
          {selectedService && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {formatPrice(selectedService.priceFrom, selectedService.priceExact)} ·{" "}
              {selectedService.durationMinutes} мин
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          ref={optionsRef}
          id="laser-zone-options"
          role="listbox"
          aria-labelledby="laser-zone-label"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              pickerButtonRef.current?.focus();
              return;
            }

            if (event.key === "Tab") {
              pickerButtonRef.current?.focus();
              setOpen(false);
              return;
            }

            const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
            if (!options.length) return;
            const index = options.findIndex((option) => option === document.activeElement);
            let next = index;
            if (event.key === "ArrowDown") next = (index + 1) % options.length;
            else if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = options.length - 1;
            else return;

            event.preventDefault();
            options[next]?.focus();
          }}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto overscroll-contain rounded-2xl border bg-card p-3 shadow-[0_24px_70px_hsl(var(--soft-shadow))]"
        >
          <div className="grid gap-4">
            {groups.map((group) => (
              <div key={group.name} role="group" aria-label={group.name}>
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-metal-strong">
                  {group.name}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {group.items.map((service) => {
                    const selected = service.id === value;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={selected}
                        onClick={() => {
                          onChange(service.id);
                          setOpen(false);
                          pickerButtonRef.current?.focus();
                        }}
                        className={cn(
                          "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-transparent bg-muted/45 text-foreground hover:border-metal hover:bg-muted"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{service.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {service.durationMinutes} мин
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-metal-strong">
                          {formatPrice(service.priceFrom, service.priceExact)}
                          {selected && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingForm({
  services,
  specialists,
  bookingDate,
  initialDirection = "doctor",
  initialMode = "appointment",
  initialDate,
  initialServiceId,
  startWithTime,
  attribution,
  utmSource,
  initialComment,
  marketingConsent
}: BookingFormProps) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(startWithTime && initialMode === "appointment" ? 1 : 0);
  const [refreshSlots, setRefreshSlots] = useState(0);
  const stepTitle = useRef<HTMLParagraphElement>(null);
  const appointmentIdempotencyKey = useRef(createIdempotencyKey());
  const leadIdempotencyKey = useRef(createIdempotencyKey());
  const [serviceId, setServiceId] = useState(
    () =>
      services.find((service) => service.id === initialServiceId)?.id ??
      services.find((service) =>
        initialDirection === "laser" ? service.requiresResourceId : !service.requiresResourceId
      )?.id ??
      services[0]?.id ??
      ""
  );
  const [specialistId, setSpecialistId] = useState("");
  const [date, setDate] = useState(
    initialDate && initialDate >= bookingDate ? initialDate : bookingDate
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const selectedService = services.find((service) => service.id === serviceId);
  const direction: BookingDirection = selectedService?.requiresResourceId ? "laser" : "doctor";
  const visibleServices = useMemo(
    () =>
      services.filter((service) =>
        direction === "laser" ? service.requiresResourceId : !service.requiresResourceId
      ),
    [direction, services]
  );
  const availableSpecialists = useMemo(
    () =>
      specialists.filter((specialist) =>
        specialist.services.some((item) => item.service.id === serviceId)
      ),
    [serviceId, specialists]
  );

  // Resource-bound services (laser) share one machine: a single queue, no operator
  // choice. Slots are queried by service alone and the operator is assigned later.
  const isResourceService = Boolean(selectedService?.requiresResourceId);
  const needsSlots = mode === "appointment" && step > 0;

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
    if (!needsSlots || !serviceId || !date || (!isResourceService && !specialistId)) {
      setSlots([]);
      setSlot("");
      setLoadingSlots(false);
      return;
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    setSlots([]);
    setSlot("");
    setError(null);
    const specialistParam = isResourceService ? "" : `&specialistId=${specialistId}`;
    fetch(
      `/api/public/slots?serviceId=${serviceId}${specialistParam}&dateFrom=${date}&dateTo=${date}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось получить свободное время");
        return response.json() as Promise<{ slots: Slot[] }>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setSlots(data.slots);
      })
      .catch((caughtError: unknown) => {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
        setSlots([]);
        setSlot("");
        setError(caughtError instanceof Error ? caughtError.message : "Ошибка загрузки слотов");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });

    return () => controller.abort();
  }, [date, needsSlots, serviceId, specialistId, isResourceService, refreshSlots]);

  const hasFreeSlots = slots.some((item) => item.available);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function setBlurError(field: keyof FieldErrors, message: string | null) {
    setFieldErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function selectDirection(nextDirection: BookingDirection) {
    const nextService = services.find((service) =>
      nextDirection === "laser" ? service.requiresResourceId : !service.requiresResourceId
    );
    setServiceId(nextService?.id ?? "");
    setSlot("");
    setMessage(null);
    setError(null);
    setFieldErrors({});
  }

  function goToStep(next: number) {
    setStep(next);
    setError(null);
    requestAnimationFrame(() => stepTitle.current?.focus());
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "appointment" && step < 2) {
      if (step === 0 && selectedService) goToStep(1);
      if (step === 1 && slot && !loadingSlots) goToStep(2);
      return;
    }

    // Capture the form node now: React nullifies `event.currentTarget` after the
    // handler returns, so reading it after `await` below would throw.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "");
    const phone = String(form.get("phone") ?? "");
    const email = String(form.get("email") ?? "");
    const comment = String(form.get("comment") ?? "");
    const preferredContactTime = String(form.get("preferredContactTime") ?? "");
    const nextFieldErrors: FieldErrors = {};
    const nameError = validateName(name);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);

    if (nameError) nextFieldErrors.name = nameError;
    if (phoneError) nextFieldErrors.phone = phoneError;
    if (emailError) nextFieldErrors.email = emailError;
    if (comment.length > 1000) nextFieldErrors.comment = "Комментарий — не более 1000 символов";
    if (mode === "lead" && preferredContactTime.length > 120) {
      nextFieldErrors.preferredContactTime = "Укажите время короче — до 120 символов";
    }
    if (mode === "appointment") {
      if (!date) nextFieldErrors.date = "Выберите дату";
      else if (date < bookingDate) nextFieldErrors.date = "Выберите дату начиная с завтрашнего дня";
      if (!slot) nextFieldErrors.slot = "Выберите свободное время";
    }
    if (form.get("personalDataConsentAccepted") !== "on") {
      nextFieldErrors.personalDataConsentAccepted =
        "Подтвердите согласие на обработку персональных данных";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      requestAnimationFrame(() => {
        formElement.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    const payloadBase = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      comment: comment.trim(),
      serviceId: serviceId || undefined,
      personalDataConsentAccepted: form.get("personalDataConsentAccepted") === "on",
      marketingConsentAccepted: form.get("marketingConsentAccepted") === "on",
      marketingConsentVersion: marketingConsent?.version,
      legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
      idempotencyKey:
        mode === "appointment" ? appointmentIdempotencyKey.current : leadIdempotencyKey.current,
      honeypot: String(form.get("company") ?? ""),
      ...attribution,
      utmSource: attribution?.utmSource ?? utmSource,
      landingPage: attribution?.landingPage ?? window.location.pathname,
      referrer: document.referrer.slice(0, 500) || undefined
    };

    const endpoint = mode === "appointment" ? "/api/public/appointments" : "/api/public/leads";
    const payload =
      mode === "appointment"
        ? { ...payloadBase, ...(isResourceService ? {} : { specialistId }), startsAtUtc: slot }
        : {
            ...payloadBase,
            preferredContactTime: preferredContactTime.trim()
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; publicNumber?: string };
      if (response.status === 409 && mode === "appointment") {
        goToStep(1);
        setSlot("");
        setRefreshSlots((value) => value + 1);
        setFieldErrors({ slot: data.error ?? "Это время уже занято. Выберите другое." });
        appointmentIdempotencyKey.current = createIdempotencyKey();
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "Не удалось отправить форму");

      setMessage(
        mode === "appointment"
          ? `Запись № ${data.publicNumber}. Администратор подтвердит время.`
          : `Заявка № ${data.publicNumber}. Администратор перезвонит вам.`
      );
      if (mode === "appointment") {
        appointmentIdempotencyKey.current = createIdempotencyKey();
        // The booked slot is now taken — refresh the grid so it shows disabled.
        setSlots((current) =>
          current.map((item) => (item.startsAtUtc === slot ? { ...item, available: false } : item))
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
    <form onSubmit={onSubmit} className="grid gap-4" aria-label="Форма онлайн-записи" noValidate>
      {!message && mode === "appointment" && (
        <ol aria-label="Шаги записи" className="grid grid-cols-3 gap-2">
          {["Услуга", "Свободное время", "Контакты"].map((title, index) => (
            <li key={title} aria-current={index === step ? "step" : undefined}>
              <button
                type="button"
                disabled={index >= step || submitting}
                onClick={() => goToStep(index)}
                className={cn(
                  "min-h-12 w-full border-t-2 pt-1 text-left text-xs font-semibold sm:text-sm",
                  index <= step
                    ? "border-metal text-metal-strong"
                    : "border-border text-muted-foreground",
                  index < step && "underline underline-offset-4"
                )}
              >
                {index + 1}. {title}
              </button>
            </li>
          ))}
        </ol>
      )}
      {!message && (
        <p
          ref={stepTitle}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight outline-none"
        >
          {mode === "lead"
            ? "Заявка на звонок"
            : ["Выберите услугу", "Выберите дату и время", "Оставьте контакты"][step]}
        </p>
      )}

      <div className={!message && mode === "appointment" && step === 0 ? "grid gap-4" : "hidden"}>
        <fieldset>
          <legend className="text-sm font-medium">Направление записи</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={direction === "doctor"}
              onClick={() => selectDirection("doctor")}
              className={cn(
                "flex min-h-20 items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                direction === "doctor"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-foreground hover:border-primary"
              )}
            >
              <Stethoscope className="h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Светлана Арутюновна</span>
                <span
                  className={cn(
                    "mt-1 block text-xs",
                    direction === "doctor" ? "text-primary-foreground/75" : "text-muted-foreground"
                  )}
                >
                  Косметология
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-pressed={direction === "laser"}
              onClick={() => selectDirection("laser")}
              className={cn(
                "flex min-h-20 items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                direction === "laser"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-foreground hover:border-primary"
              )}
            >
              <Zap className="h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Лазерная эпиляция</span>
                <span
                  className={cn(
                    "mt-1 block text-xs",
                    direction === "laser" ? "text-primary-foreground/75" : "text-muted-foreground"
                  )}
                >
                  Выбор зоны
                </span>
              </span>
            </button>
          </div>
        </fieldset>

        {direction === "laser" ? (
          <LaserZonePicker services={visibleServices} value={serviceId} onChange={setServiceId} />
        ) : (
          <div>
            <label className="text-sm font-medium" htmlFor="cosmetologyServiceId">
              Услуга
            </label>
            <Select
              id="cosmetologyServiceId"
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setSlot("");
                clearFieldError("slot");
              }}
              className="mt-2 h-14 rounded-xl"
            >
              {Array.from(
                new Set(visibleServices.map((service) => service.group ?? "Косметология"))
              ).map((group) => (
                <optgroup key={group} label={group}>
                  {visibleServices
                    .filter((service) => (service.group ?? "Косметология") === group)
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} — {formatPrice(service.priceFrom, service.priceExact)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            {selectedService && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-metal" />
                {selectedService.durationMinutes} мин
              </p>
            )}
          </div>
        )}
      </div>

      {mode === "appointment" && (
        <div className={!message && step === 1 ? "grid gap-4" : "hidden"}>
          {startWithTime && selectedService && (
            <p className="flex flex-wrap justify-between gap-2 text-sm font-semibold">
              <span>{selectedService.name}</span>
              <span>{formatPrice(selectedService.priceFrom, selectedService.priceExact)}</span>
            </p>
          )}
          {isResourceService ? (
            <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              В клинике один лазерный аппарат: все зоны записываются в общую очередь без
              пересечений. Специалиста назначит администратор.
            </p>
          ) : availableSpecialists.length === 1 ? (
            <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Приём ведёт {availableSpecialists[0].firstName} {availableSpecialists[0].lastName}
            </div>
          ) : (
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
                {availableSpecialists.length === 0 && (
                  <option value="">Нет доступных специалистов</option>
                )}
                {availableSpecialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.firstName} {specialist.lastName}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium" htmlFor="date">
              Дата
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              min={bookingDate}
              required
              aria-invalid={Boolean(fieldErrors.date)}
              aria-describedby={fieldErrors.date ? "date-error" : undefined}
              className={fieldErrors.date ? "border-destructive" : undefined}
              onChange={(event) => {
                setDate(event.target.value);
                clearFieldError("date");
                clearFieldError("slot");
              }}
            />
            <FieldError id="date-error" message={fieldErrors.date} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Время</span>
              {selectedService && (
                <span className="text-xs text-muted-foreground">
                  Слот {selectedService.durationMinutes} мин
                </span>
              )}
            </div>

            <div
              className="mt-2 min-h-11"
              aria-live="polite"
              aria-invalid={Boolean(fieldErrors.slot)}
              tabIndex={fieldErrors.slot ? -1 : undefined}
            >
              {loadingSlots ? (
                <div className="flex h-11 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загружаем свободное время…
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-md border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  На выбранную дату свободного времени нет.
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
                          onClick={() => {
                            if (!item.available) return;
                            setSlot(item.startsAtUtc);
                            clearFieldError("slot");
                          }}
                          className={cn(
                            "h-11 rounded-md border text-sm font-medium tabular-nums transition",
                            item.available &&
                              selected &&
                              "border-primary bg-primary text-primary-foreground shadow-sm",
                            item.available &&
                              !selected &&
                              "bg-card hover:border-primary hover:text-primary",
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
              <FieldError id="slot-error" message={fieldErrors.slot} />
            </div>
          </div>
        </div>
      )}

      <div className={!message && (mode === "lead" || step === 2) ? "grid gap-4" : "hidden"}>
        {mode === "appointment" && step === 2 && (
          <div className="rounded-xl border border-border bg-muted/45 px-4 py-3 text-sm">
            <p className="font-semibold">{selectedService?.name}</p>
            <p className="mt-1 text-muted-foreground">
              {date.split("-").reverse().join(".")} ·{" "}
              {slots.find((item) => item.startsAtUtc === slot)?.label} по Чите
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="name">
              Имя
            </label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Ваше имя"
              minLength={2}
              maxLength={80}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              className={fieldErrors.name ? "border-destructive" : undefined}
              onChange={() => clearFieldError("name")}
              onBlur={(event) => setBlurError("name", validateName(event.target.value))}
            />
            <FieldError id="name-error" message={fieldErrors.name} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="phone">
              Телефон
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+7 (___) ___-__-__"
              minLength={10}
              maxLength={32}
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "phone-error" : "phone-hint"}
              className={fieldErrors.phone ? "border-destructive" : undefined}
              onChange={() => clearFieldError("phone")}
              onBlur={(event) => setBlurError("phone", validatePhone(event.target.value))}
            />
            <p id="phone-hint" className="mt-1.5 text-xs text-muted-foreground">
              Например, +7 914 123-45-67
            </p>
            <FieldError id="phone-error" message={fieldErrors.phone} />
          </div>
        </div>

        <details
          className="order-2 rounded-xl border border-border px-4 py-2.5"
          open={
            Boolean(fieldErrors.email || fieldErrors.comment || fieldErrors.preferredContactTime) ||
            undefined
          }
        >
          <summary className="cursor-pointer text-sm font-semibold text-metal-strong">
            Добавить детали
          </summary>
          <div className="mt-4 grid gap-4">
            {mode === "lead" && (
              <>
                <label className="grid gap-1 text-sm font-medium">
                  Услуга для консультации
                  <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                    <option value="">Не выбрана</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <div>
                  <label className="text-sm font-medium" htmlFor="preferredContactTime">
                    Удобное время звонка
                  </label>
                  <Input
                    id="preferredContactTime"
                    name="preferredContactTime"
                    placeholder="Например, завтра после 14:00"
                    maxLength={120}
                    aria-invalid={Boolean(fieldErrors.preferredContactTime)}
                    aria-describedby={
                      fieldErrors.preferredContactTime ? "preferred-contact-time-error" : undefined
                    }
                    onChange={() => clearFieldError("preferredContactTime")}
                  />
                  <FieldError
                    id="preferred-contact-time-error"
                    message={fieldErrors.preferredContactTime}
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                name="email"
                autoComplete="email"
                type="email"
                spellCheck={false}
                placeholder="name@example.ru (необязательно)"
                maxLength={254}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={fieldErrors.email ? "border-destructive" : undefined}
                onChange={() => clearFieldError("email")}
                onBlur={(event) => setBlurError("email", validateEmail(event.target.value))}
              />
              <FieldError id="email-error" message={fieldErrors.email} />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="comment">
                Комментарий
              </label>
              <Textarea
                id="comment"
                name="comment"
                maxLength={1000}
                defaultValue={initialComment}
                placeholder="Пожелания или важная информация (необязательно)"
                aria-invalid={Boolean(fieldErrors.comment)}
                aria-describedby={fieldErrors.comment ? "comment-error" : "comment-hint"}
                className={fieldErrors.comment ? "border-destructive" : undefined}
                onChange={() => clearFieldError("comment")}
              />
              <p id="comment-hint" className="mt-1.5 text-xs text-muted-foreground">
                До 1000 символов
              </p>
              <FieldError id="comment-error" message={fieldErrors.comment} />
            </div>
            {marketingConsent && (
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  className="mt-1 accent-[hsl(var(--metal))]"
                  type="checkbox"
                  name="marketingConsentAccepted"
                />
                <span>
                  Я согласен получать{" "}
                  <Link href={"/legal/" + marketingConsent.slug} className="underline">
                    информационные и рекламные сообщения
                  </Link>
                  .
                </span>
              </label>
            )}
          </div>
        </details>

        <input className="hidden" name="company" tabIndex={-1} autoComplete="off" />

        <div className="flex items-start gap-2 text-sm">
          <input
            id="personalDataConsentAccepted"
            className="mt-1 accent-[hsl(var(--metal))]"
            type="checkbox"
            name="personalDataConsentAccepted"
            required
            aria-invalid={Boolean(fieldErrors.personalDataConsentAccepted)}
            aria-describedby={
              fieldErrors.personalDataConsentAccepted ? "personal-consent-error" : undefined
            }
            onChange={() => clearFieldError("personalDataConsentAccepted")}
          />
          <label htmlFor="personalDataConsentAccepted" className="leading-6">
            Я принимаю{" "}
            <Link href="/legal/personal-data-consent" className="underline underline-offset-2">
              согласие на обработку персональных данных
            </Link>{" "}
            и подтверждаю, что ознакомился с{" "}
            <Link href="/legal/privacy-policy" className="underline underline-offset-2">
              Политикой обработки персональных данных
            </Link>
            .
          </label>
        </div>
        <FieldError id="personal-consent-error" message={fieldErrors.personalDataConsentAccepted} />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-primary/30 bg-card p-3 text-sm text-primary"
        >
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      )}

      {!message && (
        <Button
          className="h-12 rounded-full shadow-lg shadow-[hsl(var(--metal-glow))]"
          type="submit"
          disabled={
            submitting ||
            (mode === "appointment" &&
              (step === 0 ? !selectedService : step === 1 ? !slot || loadingSlots : false))
          }
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarDays className="h-4 w-4" />
          )}
          {mode === "lead"
            ? "Отправить заявку"
            : step === 0
              ? "Выбрать время"
              : step === 1
                ? "Продолжить"
                : "Подтвердить запись"}
        </Button>
      )}
      {!message && mode === "appointment" && step > 0 && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => goToStep(step - 1)}
          className="justify-self-start text-sm font-medium text-metal-strong underline underline-offset-4 sm:justify-self-center"
        >
          Назад
        </button>
      )}
      {!message && (mode === "lead" || step === 0) && (
        <button
          type="button"
          onClick={() => {
            setMode(mode === "lead" ? "appointment" : "lead");
            setFieldErrors({});
            goToStep(0);
          }}
          className="justify-self-start text-sm font-medium text-metal-strong underline underline-offset-4 sm:justify-self-center"
        >
          {mode === "lead" ? "Выбрать время приёма" : "Перезвоните мне"}
        </button>
      )}
    </form>
  );
}
