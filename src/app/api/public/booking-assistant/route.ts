import { readFile } from "node:fs/promises";
import { z } from "zod";
import { findAssistantService } from "@/domain/booking/assistant-services";
import { getPublicBookingCatalog } from "@/domain/booking/public-catalog";
import { AppError, RateLimitError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { assertRateLimit, createRateLimitKey } from "@/lib/rate-limit";

const schema = z.object({
  question: z.string().trim().min(1).max(320),
  history: z.array(z.string().max(320)).max(4).default([]),
  serviceSlug: z.string().max(150).optional()
});

const answerSchema = z.object({
  text: z.string().trim().min(8).max(650),
  action: z.enum(["none", "book", "callback", "prices", "phone"]),
  serviceSlug: z.string().nullish()
});

const providerResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1)
});

let providerKey: Promise<string> | undefined;

function removePersonalDetails(text: string) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(?:\+?\d[\s().-]*){10,}/g, "[номер]")
    .replace(/(?:меня зовут|мо[её] имя)\s*[:—-]?\s*(?:[\p{L}-]+[ ]*){1,3}/giu, "[имя]")
    .replace(/https?:\/\/\S+/gi, "[ссылка]");
}

const personalMedicalQuestion =
  /(?:беременн|кормлю|у меня (?:диагноз|бол|аллерг)|противопоказ|осложнен|побочн|принимаю лекарств|можно ли мне)/i;

function unavailable() {
  return new AppError("DeepSeek временно недоступен.", 503, "ASSISTANT_UNAVAILABLE");
}

async function askDeepSeek(input: z.infer<typeof schema>) {
  // Contact-taking happens in CRM forms and personal medical questions go to the clinician.
  if (personalMedicalQuestion.test(input.question)) return { action: "clinical" as const };
  const keyFile = process.env.BOOKING_ASSISTANT_KEY_FILE;
  if (!keyFile) throw unavailable();
  providerKey ??= readFile(keyFile, "utf8")
    .then((value) => value.trim())
    .catch(() => {
      providerKey = undefined;
      throw unavailable();
    });
  const key = await providerKey;
  if (!key) throw unavailable();
  const catalog = await getPublicBookingCatalog();
  const service =
    findAssistantService(input.question, catalog.services) ??
    catalog.services.find((item) => item.slug === input.serviceSlug);
  const context = {
    clinic: "Клиника эстетической медицины «Сияние», Чита",
    contacts: catalog.contacts,
    specialists: catalog.specialists.map(({ firstName, lastName, position, experienceYears }) => ({
      firstName,
      lastName,
      position,
      experienceYears
    })),
    selectedService: service?.slug,
    services: catalog.services.map(
      ({ slug, name, group, priceExact, priceFrom, durationMinutes, coursePrices }) => ({
        slug,
        name,
        group,
        priceExact,
        priceFrom,
        durationMinutes,
        coursePrices
      })
    )
  };

  try {
    const response = await fetch("https://spiderssense.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        model: "deepseek/deepseek-v4.1-flash",
        thinking: { type: "disabled" },
        max_tokens: 420,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "Ты виртуальный администратор клиники. Отвечай по-русски прямо на вопрос, естественно и кратко.",
              "Используй факты клиники из JSON. Учитывай предыдущие сообщения и выбранную услугу.",
              "Не выдумывай услуги, цены, время работы, имена, свободные слоты и подтверждения записи.",
              "Цена курса — полная сумма. one, four, six, ten относятся к 1, 4, 6, 10 сеансам соответственно.",
              "Точную цену бери из priceExact, priceFrom указывай как «от». Цены могут отличаться.",
              "Если в данных нет ответа, так и скажи и предложи связаться с клиникой.",
              "Не давай медицинских рекомендаций, не запрашивай и не повторяй персональные данные.",
              "При желании клиента записаться или узнать свободное время выбери book. Интерфейс покажет кнопку «Выбрать время». По ней пользователь увидит реальные свободные слоты и сможет отправить запись в CRM прямо в чате.",
              "При action book предложи выбрать время по кнопке. Не говори, что слоты нужно уточнять у администратора или ждать звонка. Если в новом сообщении просят записаться, не повторяй цены из предыдущего ответа.",
              "При просьбе перезвонить выбери callback. Кнопка откроет форму заявки на обратный звонок.",
              "Если полезна ссылка на прайс, выбери prices. Если надо уточнить у администратора по телефону, выбери phone. Иначе none.",
              "Верни JSON: text (до 500 символов, без Markdown), action (none/book/callback/prices/phone), serviceSlug (slug услуги или null).",
              "Контекст клиники: " + JSON.stringify(context)
            ].join("\n")
          },
          ...input.history
            .filter((question) => !personalMedicalQuestion.test(question))
            .map((question) => ({ role: "user", content: removePersonalDetails(question) })),
          { role: "user", content: removePersonalDetails(input.question) }
        ]
      })
    });
    if (!response.ok) throw unavailable();
    const payload = providerResponse.parse(await response.json());
    const answer = answerSchema.parse(JSON.parse(payload.choices[0].message.content));
    const selected = catalog.services.find((item) => item.slug === answer.serviceSlug);
    return {
      answer: answer.text,
      action: answer.action,
      serviceId: selected?.id,
      direction: selected ? (selected.requiresResourceId ? "laser" : "doctor") : undefined
    };
  } catch {
    throw unavailable();
  }
}

export async function POST(request: Request) {
  try {
    assertRateLimit(createRateLimitKey(request, "public:booking-assistant"), 15, 60_000);
    try {
      assertRateLimit("public:booking-assistant:provider", 60, 60_000);
    } catch (error) {
      if (error instanceof RateLimitError) throw unavailable();
      throw error;
    }
    return jsonOk(await askDeepSeek(schema.parse(await request.json())));
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    assertRateLimit(createRateLimitKey(request, "public:booking-assistant:catalog"), 45, 60_000);
    return jsonOk(await getPublicBookingCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
