"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { PublicBookingCatalog } from "@/domain/booking/public-catalog";
import { LEGAL_DOCUMENT_VERSION } from "@/domain/legal/legal-documents";
import { addDaysToDateKey, formatDateInTimezone } from "@/lib/date-time";
import { readCampaignQuery } from "@/domain/analytics/attribution";
import { LASER_COMBO } from "@/domain/service/laser-combo";
import { formatPrice } from "@/lib/utils";

export type ChatBookingSelection = {
  mode: "appointment" | "lead";
  direction?: "doctor" | "laser";
  serviceId?: string;
  dayOffset?: number;
};

type Slot = { startsAtUtc: string; available: boolean; label: string };

async function loadSlots(
  serviceId: string,
  specialistId: string,
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal
) {
  const query = new URLSearchParams({ serviceId, dateFrom, dateTo });
  if (specialistId) query.set("specialistId", specialistId);
  const response = await fetch("/api/public/slots?" + query, { signal });
  if (!response.ok) throw new Error("Не получилось загрузить время. Попробуйте ещё раз.");
  const data = (await response.json()) as { timezone: string; slots: Slot[] };
  return { timezone: data.timezone, slots: data.slots.filter((slot) => slot.available) };
}

export function ChatBooking({
  catalog,
  selection,
  onBack
}: {
  catalog: PublicBookingCatalog;
  selection: ChatBookingSelection;
  onBack: () => void;
}) {
  const isAppointment = selection.mode === "appointment";
  const bookable = catalog.services.filter(
    (service) =>
      service.requiresResourceId ||
      catalog.specialists.some((specialist) =>
        specialist.services.some((item) => item.service.id === service.id)
      )
  );
  const [serviceId, setServiceId] = useState(selection.serviceId ?? "");
  const [direction, setDirection] = useState(selection.direction ?? "doctor");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(addDaysToDateKey(catalog.bookingDate, selection.dayOffset ?? 0));
  const [slot, setSlot] = useState("");
  const [slotResult, setSlotResult] = useState<{ key: string; items: Slot[] } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [contactsStep, setContactsStep] = useState(!isAppointment);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [complete, setComplete] = useState<{ number: string; confirmed: boolean }>();
  const [error, setError] = useState("");
  const idempotency = useRef("");
  const writing = useRef(false);

  const selectedService = bookable.find((service) => service.id === serviceId);
  const doctors = catalog.specialists.filter((doctor) =>
    doctor.services.some((item) => item.service.id === serviceId)
  );
  const specialistId = selectedService?.requiresResourceId
    ? ""
    : (doctors.find((doctor) => doctor.id === doctorId)?.id ?? doctors[0]?.id ?? "");
  const canLoad = Boolean(
    isAppointment && selectedService && date && (selectedService.requiresResourceId || specialistId)
  );
  const slotKey = [serviceId, specialistId, date, refresh].join(":");
  const slots = slotResult?.key === slotKey ? slotResult.items : null;

  useEffect(() => {
    if (!canLoad) return;
    const controller = new AbortController();
    loadSlots(serviceId, specialistId, date, date, controller.signal)
      .then((result) => setSlotResult({ key: slotKey, items: result.slots }))
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setSlotResult({ key: slotKey, items: [] });
          setError(caught instanceof Error ? caught.message : "Расписание недоступно.");
        }
      });
    return () => controller.abort();
  }, [canLoad, date, serviceId, slotKey, specialistId]);

  async function findNearest() {
    setSearching(true);
    setError("");
    try {
      const next = await loadSlots(serviceId, specialistId, date, addDaysToDateKey(date, 6));
      const first = next.slots[0];
      if (!first) {
        setError(
          "В ближайшие 7 дней свободного времени нет. Выберите другую дату или оставьте заявку на звонок."
        );
        return;
      }
      setDate(formatDateInTimezone(new Date(first.startsAtUtc), next.timezone));
      setSlot(first.startsAtUtc);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Расписание недоступно.");
    } finally {
      setSearching(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current) return;
    const digits = phone.replace(/\D/g, "").length;
    if (name.trim().length < 2 || digits < 10 || digits > 15 || !consent) {
      setError("Укажите имя, полный номер телефона и подтвердите согласие.");
      return;
    }
    writing.current = true;
    setSubmitting(true);
    setError("");
    idempotency.current ||= crypto.randomUUID();
    const { attribution } = readCampaignQuery(
      Object.fromEntries(new URLSearchParams(window.location.search))
    );
    const comboPath = `/services/${LASER_COMBO.slug}`;
    if (!attribution.utmCampaign && window.location.pathname === comboPath) {
      attribution.utmCampaign = LASER_COMBO.campaign;
    }
    try {
      const response = await fetch(
        isAppointment ? "/api/public/appointments" : "/api/public/leads",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            serviceId: serviceId || undefined,
            specialistId: isAppointment ? specialistId || undefined : undefined,
            startsAtUtc: isAppointment ? slot : undefined,
            personalDataConsentAccepted: consent,
            legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
            idempotencyKey: idempotency.current,
            ...attribution,
            utmSource: attribution.utmSource ?? "booking_assistant",
            landingPage: window.location.pathname
          })
        }
      );
      const result = (await response.json()) as {
        error?: string;
        publicNumber?: string;
        status?: string;
      };
      if (response.ok && result.publicNumber) {
        setComplete({ number: result.publicNumber, confirmed: result.status === "CONFIRMED" });
        return;
      }
      if (response.status === 409 && isAppointment) {
        setSlot("");
        setRefresh((value) => value + 1);
        setContactsStep(false);
        idempotency.current = "";
      } else if (response.status >= 500) {
        throw new Error("Не удалось получить подтверждение. Повторите отправку.");
      }
      throw new Error(
        result.error ?? "Не удалось отправить. Проверьте данные или попробуйте ещё раз."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить.");
    } finally {
      writing.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-metal-strong"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> В чат
      </button>
      {complete ? (
        <div
          role="status"
          className="space-y-2 rounded-xl border border-border bg-muted p-4 text-sm leading-6"
        >
          <CheckCircle2 className="h-5 w-5 text-metal-strong" aria-hidden="true" />
          <p className="text-base font-semibold">
            {isAppointment ? "Запись" : "Заявка"} № {complete.number}
          </p>
          <p>
            {isAppointment && !complete.confirmed
              ? "Администратор подтвердит время."
              : isAppointment
                ? "Время подтверждено."
                : "Администратор перезвонит вам."}
          </p>
        </div>
      ) : contactsStep ? (
        <form
          onSubmit={submit}
          className="space-y-3"
          aria-label={isAppointment ? "Подтверждение записи в чате" : "Заявка на звонок в чате"}
        >
          {isAppointment && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p>
                {selectedService?.name} · {date.split("-").reverse().join(".")} ·{" "}
                {slots?.find((time) => time.startsAtUtc === slot)?.label}
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setContactsStep(false)}
                className="mt-1 text-metal-strong underline"
              >
                Изменить время
              </button>
            </div>
          )}
          <label className="grid gap-1.5 text-sm">
            Имя
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={80}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Телефон
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
              maxLength={32}
              required
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-5">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1"
            />
            <span>
              Принимаю{" "}
              <Link href="/legal/personal-data-consent" target="_blank" className="underline">
                согласие на обработку персональных данных
              </Link>{" "}
              и ознакомлен(а) с{" "}
              <Link href="/legal/privacy-policy" target="_blank" className="underline">
                политикой
              </Link>
              .
            </span>
          </label>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Отправляю…" : isAppointment ? "Подтвердить запись" : "Отправить заявку"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <label className="grid gap-1.5 text-sm">
            Направление
            <Select
              value={direction}
              disabled={searching}
              onChange={(event) => {
                setDirection(event.target.value as "doctor" | "laser");
                setServiceId("");
                setSlot("");
                setError("");
              }}
            >
              <option value="doctor">Косметолог</option>
              <option value="laser">Лазерная эпиляция</option>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm">
            {direction === "laser" ? "Зона эпиляции" : "Услуга"}
            <Select
              value={serviceId}
              disabled={searching}
              onChange={(event) => {
                setServiceId(event.target.value);
                setSlot("");
                setError("");
              }}
            >
              <option value="">Выберите</option>
              {bookable
                .filter(
                  (service) => Boolean(service.requiresResourceId) === (direction === "laser")
                )
                .map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {formatPrice(service.priceFrom, service.priceExact)}
                  </option>
                ))}
            </Select>
          </label>
          {!selectedService?.requiresResourceId && doctors.length > 1 && (
            <label className="grid gap-1.5 text-sm">
              Специалист
              <Select
                value={specialistId}
                disabled={searching}
                onChange={(event) => {
                  setDoctorId(event.target.value);
                  setSlot("");
                }}
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.firstName} {doctor.lastName}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {selectedService && (
            <>
              <label className="grid gap-1.5 text-sm">
                Дата
                <Input
                  type="date"
                  value={date}
                  min={catalog.bookingDate}
                  disabled={searching}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSlot("");
                    setError("");
                  }}
                />
              </label>
              {canLoad && !slots && (
                <p role="status" className="text-sm text-muted-foreground">
                  Проверяю расписание…
                </p>
              )}
              {slots && slots.length > 0 && (
                <label className="grid gap-1.5 text-sm">
                  Свободное время
                  <Select value={slot} onChange={(event) => setSlot(event.target.value)}>
                    <option value="">Выберите время</option>
                    {slots.map((time) => (
                      <option key={time.startsAtUtc} value={time.startsAtUtc}>
                        {time.label}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              {slots && slots.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    На эту дату свободного времени нет.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void findNearest()}
                    disabled={searching}
                    className="w-full"
                  >
                    {searching ? "Ищу…" : "Найти ближайшее время"}
                  </Button>
                </div>
              )}
            </>
          )}
          <Button
            type="button"
            disabled={!slots?.some((time) => time.startsAtUtc === slot)}
            onClick={() => {
              setContactsStep(true);
              setError("");
            }}
            className="w-full"
          >
            Продолжить
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
