"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessageCircle, Send, UserRound, X } from "lucide-react";
import { ChatBooking, type ChatBookingSelection } from "./chat-booking";
import { getBookingTopics } from "@/domain/booking/assistant-intents";
import { findAssistantService } from "@/domain/booking/assistant-services";
import type { PublicBookingCatalog } from "@/domain/booking/public-catalog";
import type { MessengerLinks } from "@/domain/messenger/platform";
import { formatPrice } from "@/lib/utils";

type Service = PublicBookingCatalog["services"][number];
type Reply = {
  text: string;
  booking?: ChatBookingSelection;
  link?: { href: string; label: string };
};
type Turn = { question: string; reply: Reply };
type ModelReply = {
  answer?: string;
  action: "none" | "book" | "callback" | "prices" | "phone" | "clinical";
  serviceId?: string;
  direction?: "doctor" | "laser";
};

function describePrice(service: Service, question: string) {
  const course = service.coursePrices;
  if (course && /курс|пакет|сеанс|(?:на|за)\s+(?:4|6|10)\b/i.test(question)) {
    const prices = { 4: course.four, 6: course.six, 10: course.ten };
    const quantity = question.match(/\b(4|6|10)\b/)?.[1] as "4" | "6" | "10" | undefined;
    if (quantity)
      return (
        service.name + " · " + quantity + " сеансов — " + formatPrice(null, prices[quantity]) + "."
      );
    return (
      service.name +
      " · 4 сеанса — " +
      formatPrice(null, course.four) +
      ", 6 — " +
      formatPrice(null, course.six) +
      ", 10 — " +
      formatPrice(null, course.ten) +
      "."
    );
  }
  return (
    service.name +
    " — " +
    formatPrice(service.priceFrom, service.priceExact) +
    (course ? " за сеанс." : ".")
  );
}

async function fetchCatalog() {
  const response = await fetch("/api/public/booking-assistant", {
    signal: AbortSignal.timeout(8500)
  });
  if (!response.ok) throw new Error("Каталог недоступен.");
  return response.json() as Promise<PublicBookingCatalog>;
}

export function BookingAssistantWidget({ address, phone }: { address: string; phone: string }) {
  const [open, setOpen] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false);
  const [catalog, setCatalog] = useState<PublicBookingCatalog>();
  const [booking, setBooking] = useState<ChatBookingSelection>();
  const [lastService, setLastService] = useState<Service>();
  const [direction, setDirection] = useState<"doctor" | "laser">();
  const [message, setMessage] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [messengers, setMessengers] = useState<MessengerLinks>({});
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const catalogRequest = useRef<Promise<PublicBookingCatalog> | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const chatId = useId();
  const headingId = useId();

  function loadCatalog() {
    catalogRequest.current ??= fetchCatalog().catch((error: unknown) => {
      catalogRequest.current = undefined;
      throw error;
    });
    return catalogRequest.current;
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/messenger-links", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setMessengers((await response.json()) as MessengerLinks);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (open) heading.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const panel = dialog.current;
    if (!open || !viewport || !panel) return;

    const update = () => {
      const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const editing =
        panel.contains(document.activeElement) &&
        document.activeElement?.matches("input, textarea");
      panel.dataset.keyboard = editing && viewport.scale === 1 && bottom > 80 ? "open" : "closed";
      panel.style.setProperty("--chat-viewport-bottom", `${bottom}px`);
      panel.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
    };
  }, [open]);

  useEffect(() => {
    if (open && !booking && transcript.current) {
      transcript.current.scrollTop = transcript.current.scrollHeight;
    }
  }, [open, turns, busy, booking, pendingQuestion]);

  useEffect(() => {
    if (!open) return;
    function hideOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", hideOnEscape);
    return () => document.removeEventListener("keydown", hideOnEscape);
  }, [open]);

  async function startBooking(selection: ChatBookingSelection) {
    setBusy(true);
    try {
      // Refresh the starting date and visible services for a newly started booking.
      const data = await fetchCatalog();
      catalogRequest.current = Promise.resolve(data);
      setCatalog(data);
      setBooking(selection);
    } catch {
      setTurns((current) => [
        ...current,
        {
          question: "Запись",
          reply: {
            text: "Сейчас не удалось загрузить расписание в чате. Попробуйте открыть форму записи.",
            link: { href: "/booking", label: "Открыть запись" }
          }
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function send(value: string) {
    const question = value.trim();
    if (!question || sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    setPendingQuestion(question);
    try {
      const [data, model] = await Promise.all([
        loadCatalog().catch(() => undefined),
        fetch("/api/public/booking-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            serviceSlug: lastService?.slug,
            history: turns.slice(-4).map((turn) => turn.question)
          }),
          signal: AbortSignal.timeout(12_000)
        })
          .then(async (response) =>
            response.ok ? ((await response.json()) as ModelReply) : undefined
          )
          .catch(() => undefined)
      ]);
      const normalized = question.toLowerCase().replaceAll("ё", "е");
      const match =
        data &&
        (data.services.find((item) => item.id === model?.serviceId) ??
          findAssistantService(question, data.services));
      const service = match ?? lastService;
      const topics = getBookingTopics(question);
      const nextDirection = match
        ? match.requiresResourceId
          ? "laser"
          : "doctor"
        : topics.includes("laser")
          ? "laser"
          : topics.includes("doctor")
            ? "doctor"
            : direction;
      // A short question such as "а на 6?" can refer to the last named zone.
      const courseFollowUp = Boolean(
        lastService?.coursePrices &&
        /^(?:а\s+)?(?:на|за)?\s*(?:4|6|10)(?:\s+сеанс\S*)?\??$/.test(normalized)
      );
      const topic = topics[0];
      const intent: ChatBookingSelection = {
        mode: "appointment",
        direction: model?.direction ?? nextDirection,
        serviceId:
          match?.id ??
          (service && Boolean(service.requiresResourceId) === (nextDirection === "laser")
            ? service.id
            : undefined),
        dayOffset: /послезавтра/.test(normalized) ? 1 : 0
      };
      let reply: Reply;
      if (
        model?.action === "clinical" ||
        /противопоказ|беременн|кормлю|можно ли мне|аллерги|осложнен|болит|побочн/.test(normalized)
      ) {
        reply = {
          text: "Если вопрос о противопоказаниях или реакции на процедуру, лучше обсудить его с врачом. Могу помочь записаться на консультацию.",
          booking: { mode: "appointment", direction: "doctor" }
        };
      } else if (model?.answer) {
        reply = { text: model.answer };
        if (model.action === "book" || model.action === "callback") {
          reply.booking = { ...intent, mode: model.action === "callback" ? "lead" : "appointment" };
        }
        if (model.action === "phone") reply.link = { href: "tel:" + phone, label: phone };
        if (model.action === "prices") reply.link = { href: "/prices", label: "Весь прайс" };
      } else if (
        topic === "contacts" ||
        /где вы|где находится|почта|почту|парковк/.test(normalized)
      ) {
        reply = {
          text:
            (data?.contacts.address ?? address) +
            ". Почта: " +
            (data?.contacts.email ?? "siyanie-clinic75@yandex.ru") +
            ".",
          link: { href: "tel:" + phone, label: phone }
        };
      } else if (/график|режим работ|до скольк.*работ|во сколько откры/.test(normalized)) {
        reply = {
          text: "Свободное время приёма можно проверить по расписанию. Часы работы администратора лучше уточнить по телефону.",
          booking: intent,
          link: { href: "tel:" + phone, label: phone }
        };
      } else if (topic === "callback") {
        reply = {
          text: "Оставьте имя и номер здесь в чате. Администратор увидит заявку и перезвонит.",
          booking: { ...intent, mode: "lead" }
        };
      } else if (
        /кто (?:принима|врач)|какие врачи|стаж|опыт врач/.test(normalized) &&
        data?.specialists.length
      ) {
        const doctor = data.specialists[0];
        reply = {
          text:
            doctor.firstName +
            " " +
            doctor.lastName +
            " — " +
            doctor.position +
            ". Стаж — " +
            doctor.experienceYears +
            " лет.",
          booking: { mode: "appointment", direction: "doctor" }
        };
      } else if (topic === "prices" || courseFollowUp) {
        reply = service
          ? {
              text:
                describePrice(service, question) +
                " Актуальную стоимость можно уточнить у администратора.",
              booking: intent
            }
          : {
              text: "Подскажу цену. Напишите название услуги или зоны, например «консультация» или «подмышки».",
              link: { href: "/prices", label: "Весь прайс" }
            };
      } else if (topic === "appointment" || topic === "laser" || topic === "doctor" || match) {
        reply = {
          text: match
            ? "Могу записать вас на «" + match.name + "». Посмотрим свободное время?"
            : "Могу записать вас здесь. Выберите услугу, а я покажу свободное время.",
          booking: intent
        };
      } else if (/услуг|процедур|что делаете|чем занима/.test(normalized)) {
        reply = {
          text: "В клинике есть консультации косметолога, ботулинотерапия, контурная пластика и лазерная эпиляция.",
          link: { href: "/prices", label: "Услуги и цены" }
        };
      } else {
        reply = {
          text: "Сейчас не удалось получить ответ в чате. Вы можете записаться здесь или уточнить вопрос по телефону.",
          booking: { mode: "appointment" },
          link: { href: "tel:" + phone, label: phone }
        };
      }
      if (match) setLastService(match);
      setDirection(nextDirection);
      setTurns((current) => [...current.slice(-9), { question, reply }]);
    } finally {
      sending.current = false;
      setBusy(false);
      setPendingQuestion("");
    }
  }

  return (
    <>
      <div className="site-floating-request fixed z-[60] flex flex-col items-end gap-2.5">
        {!open && (messengers.telegram || messengers.max) && (
          <div className="flex items-center gap-2" aria-label="Мессенджеры клиники">
            {messengers.telegram && (
              <a
                href={messengers.telegram}
                target="_blank"
                rel="noreferrer"
                aria-label="Бот в Telegram"
                title="Telegram"
                className="inline-grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-[#087fb6] text-white shadow-lg transition hover:brightness-110"
              >
                <Send className="h-[19px] w-[19px]" aria-hidden="true" />
              </a>
            )}
            {messengers.max && (
              <a
                href={messengers.max}
                target="_blank"
                rel="noreferrer"
                aria-label="Бот в MAX"
                title="MAX"
                className="inline-grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-[#553cd8] text-xs font-bold text-white shadow-lg transition hover:brightness-110"
              >
                MAX
              </a>
            )}
          </div>
        )}
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={openedOnce ? chatId : undefined}
          onClick={() => {
            setOpenedOnce(true);
            setOpen((visible) => !visible);
            if (!open) void loadCatalog().catch(() => undefined);
          }}
          className="floating-request-button inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-2"
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="floating-request-label">Помощь</span>
        </button>
      </div>
      {openedOnce && (
        <section
          ref={dialog}
          id={chatId}
          role="dialog"
          aria-labelledby={headingId}
          className={
            "site-booking-chat fixed z-[75] flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl " +
            (open ? "flex" : "hidden")
          }
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-metal bg-muted text-metal-strong">
              <UserRound className="h-5 w-5" aria-hidden="true" />
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-emerald-500"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                ref={heading}
                id={headingId}
                tabIndex={-1}
                className="text-sm font-semibold outline-none"
              >
                Администратор «Сияния»
              </h2>
              <p className="text-xs text-muted-foreground">Виртуальный помощник · на связи</p>
            </div>
            <button
              type="button"
              aria-label="Закрыть чат"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {booking && catalog ? (
            <ChatBooking
              catalog={catalog}
              selection={booking}
              onBack={() => setBooking(undefined)}
            />
          ) : (
            <>
              <div
                ref={transcript}
                role="log"
                aria-label="Диалог записи"
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
              >
                <p className="max-w-[94%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-6">
                  Здравствуйте! Я на связи. Могу ответить на вопросы о клинике, подобрать свободное
                  время и записать вас прямо здесь.
                </p>
                {turns.map(({ question, reply }, index) => (
                  <div key={index} className="space-y-2">
                    <p className="ml-auto max-w-[90%] break-words rounded-2xl rounded-tr-sm border border-metal px-3.5 py-2.5 text-sm">
                      {question}
                    </p>
                    <div className="max-w-[94%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-6">
                      <p>{reply.text}</p>
                      {reply.booking && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void startBooking(reply.booking!)}
                          className="mt-2 inline-flex min-h-9 items-center gap-1.5 font-semibold text-metal-strong underline underline-offset-4"
                        >
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          {reply.booking.mode === "lead" ? "Оставить контакты" : "Выбрать время"}
                        </button>
                      )}
                      {reply.link && (
                        <Link
                          href={reply.link.href}
                          className="mt-2 block font-semibold text-metal-strong underline"
                        >
                          {reply.link.label}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {pendingQuestion && (
                  <p className="ml-auto max-w-[90%] break-words rounded-2xl rounded-tr-sm border border-metal px-3.5 py-2.5 text-sm">
                    {pendingQuestion}
                  </p>
                )}
                {busy && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Печатаю…
                  </p>
                )}
              </div>
              <div className="shrink-0 space-y-3 border-t border-border px-3 py-3 sm:px-4">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void startBooking({
                        mode: "appointment",
                        direction,
                        serviceId: lastService?.id
                      })
                    }
                    className="min-h-9 rounded-full border px-2.5 text-xs font-medium hover:border-metal"
                  >
                    Записаться
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send("Подскажите цены")}
                    className="min-h-9 rounded-full border px-2.5 text-xs font-medium hover:border-metal"
                  >
                    Узнать цену
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startBooking({ mode: "lead" })}
                    className="min-h-9 rounded-full border px-2.5 text-xs font-medium hover:border-metal"
                  >
                    Перезвоните мне
                  </button>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send(message);
                  }}
                  className="flex min-w-0 gap-2"
                >
                  <input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    aria-label="Сообщение администратору"
                    maxLength={320}
                    placeholder="Напишите сообщение"
                    className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy || !message.trim()}
                    className="h-11 shrink-0 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Отправить
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
