import { findAssistantService } from "@/domain/booking/assistant-services";
import { createAppointmentSchema, createLeadSchema } from "@/domain/booking/booking.schemas";
import { createAppointment, createLead } from "@/domain/booking/booking.service";
import { getPublicBookingCatalog } from "@/domain/booking/public-catalog";
import { clientNameSchema, phoneSchema } from "@/domain/client/client.schemas";
import { normalizePhone } from "@/domain/client/phone";
import { LEGAL_DOCUMENT_VERSION } from "@/domain/legal/legal-documents";
import { getSlotGrid } from "@/domain/schedule/schedule.service";
import { createOpaqueToken } from "@/lib/crypto";
import { addDaysToDateKey, formatClinicDateTime } from "@/lib/date-time";
import { AppError } from "@/lib/errors";
import { formatPrice } from "@/lib/utils";
import type { BotButton, BotEvent, BotReply, MessengerPlatform } from "./platform";

type Step =
  "home" | "services" | "specialist" | "dates" | "slots" | "consent" | "name" | "phone" | "review";
export type BookingDraft = {
  step: Step;
  nonce?: string;
  mode?: "appointment" | "callback";
  direction?: "laser" | "doctor";
  serviceId?: string;
  specialistId?: string;
  date?: string;
  startsAt?: string;
  name?: string;
  phone?: string;
  consentVersion?: string;
  key?: string;
  choices?: string[];
};

export async function advanceBotBooking(
  platform: MessengerPlatform,
  previous: BookingDraft | undefined,
  event: BotEvent,
  origin: string
): Promise<{ draft: BookingDraft; reply: BotReply }> {
  let draft: BookingDraft = previous ?? { step: "home" };
  const input = (event.text ?? "").trim().slice(0, 320);
  const command = input.toLowerCase().split(/\s/)[0];
  const button = (text: string, action: string): BotButton => ({ text, action });
  const menu = (text = "Здравствуйте! Это бот клиники «Сияние». Чем помочь?") => {
    draft = { step: "home" };
    return {
      text,
      buttons: [
        [button("Записаться", "book"), button("Перезвоните мне", "callback")],
        [button("Адрес и телефон", "contacts"), { text: "Услуги и цены", url: origin + "/prices" }]
      ]
    };
  };
  let reply: BotReply;
  if (command === "/start" || command === "/cancel" || event.action === "home") {
    reply = menu(command === "/cancel" ? "Запись отменена. Чем ещё помочь?" : undefined);
    return { draft, reply };
  }

  const catalog = await getPublicBookingCatalog();
  const timezone = catalog.contacts.timezone ?? "Asia/Chita";
  const services = catalog.services.filter(
    (service) =>
      service.requiresResourceId ||
      catalog.specialists.some((person) =>
        person.services.some(({ service: assigned }) => assigned.id === service.id)
      )
  );
  const back = [button("Главное меню", "home")];
  const list = (
    step: Step,
    text: string,
    choices: { id: string; label: string }[],
    extra?: BotButton[]
  ) => {
    const nonce = createOpaqueToken(6);
    draft = { ...draft, step, nonce, choices: choices.map(({ id }) => id) };
    return {
      text,
      buttons: [
        ...choices.map(({ label }, index) => [button(label.slice(0, 60), nonce + ":" + index)]),
        ...(extra?.length ? [extra] : []),
        back
      ]
    };
  };
  const [nonce, index] = (event.action ?? "").split(":");
  const choice =
    nonce === previous?.nonce && /^\d+$/.test(index ?? "")
      ? previous?.choices?.[Number(index)]
      : undefined;
  const datePage = (offset = 0, notice = "") =>
    list(
      "dates",
      notice + "Выберите дату. Время указывается по Чите.",
      Array.from({ length: 6 }, (_, i) => {
        const id = addDaysToDateKey(catalog.bookingDate, offset + i);
        return { id, label: id.split("-").reverse().join(".") };
      }),
      [button("Следующие даты", "dates:" + (offset + 6))]
    );
  const servicePage = (offset = 0) => {
    const choices = services.filter(
      (item) => Boolean(item.requiresResourceId) === (draft.direction === "laser")
    );
    const start = offset < choices.length ? offset : 0;
    return list(
      "services",
      "Выберите услугу или напишите её название.",
      choices.slice(start, start + 6).map((item) => ({ id: item.id, label: item.name })),
      start + 6 < choices.length ? [button("Ещё услуги", "services:" + (start + 6))] : undefined
    );
  };
  const selectService = (id: string) => {
    const service = services.find((item) => item.id === id);
    if (!service) return menu("Услуга сейчас недоступна для записи. Можно заказать звонок.");
    draft = { step: "specialist", mode: "appointment", serviceId: id };
    if (service.requiresResourceId) return datePage();
    const specialists = catalog.specialists.filter((person) =>
      person.services.some(({ service }) => service.id === id)
    );
    if (specialists.length === 1) {
      draft.specialistId = specialists[0].id;
      return datePage();
    }
    return list(
      "specialist",
      "Выберите специалиста.",
      specialists.map((person) => ({
        id: person.id,
        label: person.firstName + " " + person.lastName
      }))
    );
  };
  const showSlots = async (date: string, offset = 0) => {
    if (!draft.serviceId || date < catalog.bookingDate) return datePage();
    const grid = await getSlotGrid({
      serviceId: draft.serviceId,
      specialistId: draft.specialistId,
      dateFrom: date,
      dateTo: date
    });
    const slots = grid.slots.filter((slot) => slot.available);
    if (!slots.length)
      return datePage(
        Math.max(0, Math.round((Date.parse(date) - Date.parse(catalog.bookingDate)) / 86_400_000)),
        "На эту дату свободного времени нет. "
      );
    draft = { ...draft, date };
    return list(
      "slots",
      "Выберите свободное время.",
      slots.slice(offset, offset + 8).map((slot) => ({
        id: slot.startsAtUtc.toISOString(),
        label: formatClinicDateTime(slot.startsAtUtc, grid.timezone)
      })),
      [
        button("Другая дата", "dates:0"),
        ...(offset + 8 < slots.length ? [button("Ещё время", "slots:" + (offset + 8))] : [])
      ]
    );
  };
  const askConsent = () =>
    list(
      "consent",
      "Для записи нужно согласие на обработку персональных данных.",
      [{ id: "consent", label: "Даю согласие" }],
      [
        { text: "Согласие", url: origin + "/legal/personal-data-consent" },
        { text: "Политика", url: origin + "/legal/privacy-policy" }
      ]
    );
  const match = () => findAssistantService(input, services);

  if (event.action === "callback") {
    draft = { step: "consent", mode: "callback" };
    reply = askConsent();
  } else if (
    event.action === "book" ||
    (draft.step === "home" && /запис/.test(input.toLowerCase()))
  ) {
    const service = match();
    if (service) reply = selectService(service.id);
    else {
      draft = { step: "services", mode: "appointment" };
      reply = {
        text: "Выберите направление.",
        buttons: [[button("Косметология", "doctor"), button("Лазерная эпиляция", "laser")], back]
      };
    }
  } else if (
    event.action === "contacts" ||
    (draft.step === "home" && /адрес|телефон|как найти|где наход/.test(input.toLowerCase()))
  ) {
    reply = menu(
      [catalog.contacts.address, catalog.contacts.phone, catalog.contacts.email]
        .filter(Boolean)
        .join("\n")
    );
  } else if (draft.step === "services" && (event.action === "laser" || event.action === "doctor")) {
    draft = { ...draft, direction: event.action };
    reply = servicePage();
  } else if (draft.step === "services" && /^services:\d+$/.test(event.action ?? "")) {
    reply = servicePage(Number(index));
  } else if (draft.step === "services" && (choice || input)) {
    const serviceId = choice ?? match()?.id;
    reply = serviceId ? selectService(serviceId) : servicePage();
  } else if (draft.step === "specialist" && choice) {
    draft = { ...draft, specialistId: choice };
    reply = datePage();
  } else if (["dates", "slots"].includes(draft.step) && /^dates:\d+$/.test(event.action ?? "")) {
    reply = datePage(Math.min(360, Number(index)));
  } else if (draft.step === "dates" && choice) {
    reply = await showSlots(choice);
  } else if (draft.step === "slots" && /^slots:\d+$/.test(event.action ?? "") && draft.date) {
    reply = await showSlots(draft.date, Number(index));
  } else if (draft.step === "slots" && choice) {
    draft = { ...draft, startsAt: choice };
    reply = askConsent();
  } else if (draft.step === "consent" && choice === "consent") {
    draft = { ...draft, step: "name", consentVersion: LEGAL_DOCUMENT_VERSION };
    reply = { text: "Как к вам обращаться?", buttons: [back] };
  } else if (draft.step === "name" && input) {
    const name = clientNameSchema.safeParse(input);
    if (name.success) draft = { ...draft, step: "phone", name: name.data };
    reply = {
      text: name.success
        ? "Напишите номер телефона, по которому с вами можно связаться."
        : "Укажите имя длиной от 2 до 80 символов.",
      buttons: [back]
    };
  } else if (draft.step === "phone" && input) {
    try {
      const phone = normalizePhone(phoneSchema.parse(input));
      draft = { ...draft, phone, key: createOpaqueToken() };
      const service = services.find((item) => item.id === draft.serviceId);
      const summary =
        draft.startsAt && service
          ? service.name + " · " + formatClinicDateTime(new Date(draft.startsAt), timezone)
          : "Заявка на обратный звонок";
      reply = list("review", summary + "\nОтправить в клинику?", [
        { id: "submit", label: "Подтвердить" }
      ]);
    } catch {
      reply = { text: "Проверьте номер и отправьте его ещё раз.", buttons: [back] };
    }
  } else if (draft.step === "review" && choice === "submit") {
    const common = {
      name: draft.name,
      phone: draft.phone,
      idempotencyKey: draft.key,
      personalDataConsentAccepted: Boolean(draft.consentVersion),
      legalDocumentVersion: draft.consentVersion,
      utmSource: platform + "_bot"
    };
    try {
      if (draft.mode === "callback") {
        const lead = await createLead(createLeadSchema.parse(common));
        reply = menu("Заявка № " + lead.publicNumber + ". Администратор перезвонит вам.");
      } else {
        const appointment = await createAppointment(
          createAppointmentSchema.parse({
            ...common,
            serviceId: draft.serviceId,
            specialistId: draft.specialistId,
            startsAtUtc: draft.startsAt
          })
        );
        reply = menu(
          "Запись № " +
            appointment.publicNumber +
            ". " +
            (appointment.status === "CONFIRMED"
              ? "Время подтверждено."
              : "Администратор подтвердит время.")
        );
      }
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409 && draft.mode === "appointment") {
        draft = {
          ...draft,
          name: undefined,
          phone: undefined,
          consentVersion: undefined,
          key: undefined
        };
        reply = datePage(0, "Это время уже недоступно. ");
      } else {
        throw error;
      }
    }
  } else if (draft.step === "home" && input) {
    const service = match();
    const course = /\b(4|6|10)\b/.exec(input)?.[1];
    const prices = service?.coursePrices;
    const coursePrice =
      course === "4"
        ? prices?.four
        : course === "6"
          ? prices?.six
          : course === "10"
            ? prices?.ten
            : undefined;
    const price =
      typeof coursePrice === "number"
        ? formatPrice(undefined, coursePrice)
        : formatPrice(service?.priceFrom, service?.priceExact);
    if (service) {
      reply = menu(
        service.name + " — " + price + ". Актуальную стоимость можно уточнить по телефону."
      );
      reply.buttons?.unshift([button("Записаться на эту услугу", "service:" + service.id)]);
    } else {
      reply = menu(
        "Могу записать на приём, принять заявку на звонок и подсказать цену услуги по её названию."
      );
    }
  } else if (draft.step === "home" && event.action?.startsWith("service:") && index) {
    reply = selectService(index);
  } else {
    reply = {
      text: "Выберите вариант под последним сообщением или начните сначала.",
      buttons: [back]
    };
  }
  return { draft, reply };
}
