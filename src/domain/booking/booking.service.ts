import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client/index";
import { inferSource } from "@/domain/analytics/attribution";
import type { CreateAppointmentInput, CreateLeadInput } from "@/domain/booking/booking.schemas";
import { hashIdempotencyKey } from "@/domain/booking/idempotency";
import { upsertClient } from "@/domain/client/client.service";
import { recordConsent } from "@/domain/legal/consent.service";
import { createLocalNotification } from "@/domain/notification/notification.service";
import { deliverAppointmentTelegramNotification } from "@/domain/notification/telegram.service";
import { getAvailableSlotOrThrow } from "@/domain/schedule/schedule.service";
import { writeAudit } from "@/domain/audit/audit.service";
import { formatDateInTimezone, nextDateInTimezone } from "@/lib/date-time";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

function publicNumber(prefix: "L" | "A") {
  return `${prefix}-${nanoid(8).toUpperCase()}`;
}

async function createAttribution(
  tx: Prisma.TransactionClient,
  input: CreateLeadInput | CreateAppointmentInput
) {
  return tx.uTMAttribution.create({
    data: {
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      referrer: input.referrer,
      landingPage: input.landingPage,
      source: inferSource(input),
      conversionType: "startsAtUtc" in input ? "APPOINTMENT" : "LEAD"
    }
  });
}

async function recordRequiredConsents(
  tx: Prisma.TransactionClient,
  clientId: string,
  input: CreateLeadInput | CreateAppointmentInput,
  source: "PUBLIC_BOOKING" | "CALLBACK_FORM"
) {
  await recordConsent({
    tx,
    clientId,
    type: "PERSONAL_DATA_CONSENT",
    version: input.legalDocumentVersion,
    source
  });

  if (input.marketingConsentAccepted) {
    await recordConsent({
      tx,
      clientId,
      type: "MARKETING_CONSENT",
      version: input.marketingConsentVersion ?? input.legalDocumentVersion,
      source
    });
  }
}

export async function createLead(input: CreateLeadInput) {
  const idempotencyKeyHash = hashIdempotencyKey(input.idempotencyKey);
  const existing = await prisma.lead.findUnique({ where: { idempotencyKeyHash } });
  if (existing) return existing;

  try {
    return await prisma.$transaction(async (tx) => {
      const attribution = await createAttribution(tx, input);
      const client = await upsertClient({
        tx,
        name: input.name,
        phone: input.phone,
        attributionId: attribution.id,
        personalDataConsent: input.personalDataConsentAccepted,
        marketingConsent: input.marketingConsentAccepted ?? false
      });

      await recordRequiredConsents(tx, client.id, input, "CALLBACK_FORM");

      const lead = await tx.lead.create({
        data: {
          publicNumber: publicNumber("L"),
          clientId: client.id,
          serviceId: input.serviceId,
          comment: input.comment,
          preferredContactTime: input.preferredContactTime,
          source: attribution.source,
          attributionId: attribution.id,
          idempotencyKeyHash
        }
      });

      await tx.leadStatusHistory.create({
        data: { leadId: lead.id, toStatus: "NEW", reason: "Создано с сайта" }
      });

      await createLocalNotification({
        tx,
        eventType: "lead.created",
        leadId: lead.id,
        clientId: client.id,
        variables: {
          clientName: client.firstName,
          serviceName: input.serviceId ?? "не указана"
        }
      });

      await writeAudit({
        tx,
        action: "lead.create.public",
        entityType: "Lead",
        entityId: lead.id,
        description: "Публичная заявка создана"
      });

      return lead;
    });
  } catch (error) {
    // Гонка идемпотентности: параллельный запрос с тем же ключом успел создать заявку.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.lead.findUnique({ where: { idempotencyKeyHash } });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

export async function createAppointment(input: CreateAppointmentInput) {
  const idempotencyKeyHash = hashIdempotencyKey(input.idempotencyKey);
  const existing = await prisma.appointment.findUnique({ where: { idempotencyKeyHash } });
  if (existing) return existing;

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirst({
        where: { id: input.serviceId, isActive: true, deletedAt: null }
      });
      if (!service) throw new NotFoundError("Услуга не найдена");

      // Владелец календаря брони: ресурс (общий аппарат) для resource-bound услуг,
      // иначе конкретный специалист. Для лазера оператор при записи не выбирается.
      const resourceId = service.requiresResourceId;
      let specialistService = null;
      if (resourceId) {
        const resource = await tx.resource.findFirst({
          where: { id: resourceId, isActive: true, deletedAt: null }
        });
        if (!resource) throw new ConflictError("Аппарат для услуги недоступен");
      } else {
        if (!input.specialistId) throw new ConflictError("Специалист не указан");
        specialistService = await tx.specialistService.findFirst({
          where: {
            serviceId: input.serviceId,
            specialistId: input.specialistId,
            isActive: true,
            specialist: { isActive: true, deletedAt: null }
          }
        });
        if (!specialistService) throw new ConflictError("Специалист не оказывает выбранную услугу");
      }

      const startsAtUtc = new Date(input.startsAtUtc);
      const settings = await tx.clinicSettings.findFirst();
      if (!settings) throw new NotFoundError("Настройки клиники не найдены");
      const bookingDate = formatDateInTimezone(startsAtUtc, settings.timezone);
      if (bookingDate < nextDateInTimezone(new Date(), settings.timezone)) {
        throw new ValidationError("Онлайн-запись доступна начиная с завтрашнего дня");
      }
      // Ключ лока — дата в часовом поясе клиники, чтобы совпадать с зоной расчёта слотов
      // (иначе на границе UTC-суток два пересекающихся слота берут разные локи → двойная запись).
      const lockDate = bookingDate;
      // Лок берём по владельцу очереди: по аппарату для лазера (единая очередь на всех
      // операторов), иначе по специалисту.
      const lockOwnerId = resourceId ?? input.specialistId!;

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockOwnerId}), hashtext(${lockDate}))`;

      const slot = await getAvailableSlotOrThrow(
        {
          serviceId: input.serviceId,
          specialistId: resourceId ? undefined : input.specialistId,
          startsAtUtc: input.startsAtUtc
        },
        { tx }
      );

      const attribution = await createAttribution(tx, input);
      const client = await upsertClient({
        tx,
        name: input.name,
        phone: input.phone,
        email: input.email,
        attributionId: attribution.id,
        personalDataConsent: input.personalDataConsentAccepted,
        marketingConsent: input.marketingConsentAccepted ?? false
      });

      await recordRequiredConsents(tx, client.id, input, "PUBLIC_BOOKING");

      const appointment = await tx.appointment.create({
        data: {
          publicNumber: publicNumber("A"),
          clientId: client.id,
          serviceId: service.id,
          specialistId: resourceId ? null : input.specialistId,
          resourceId: resourceId ?? null,
          startsAtUtc: slot.startsAtUtc,
          endsAtUtc: slot.endsAtUtc,
          clinicTimezone: slot.clinicTimezone,
          priceAtBooking:
            specialistService?.customPriceFrom ?? service.priceExact ?? service.priceFrom,
          currency: service.currency,
          source: attribution.source,
          attributionId: attribution.id,
          clientComment: input.comment,
          creationMethod: "SITE",
          idempotencyKeyHash
        }
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          toStatus: appointment.status,
          reason: "Создано с сайта"
        }
      });

      await createLocalNotification({
        tx,
        eventType: "appointment.created",
        appointmentId: appointment.id,
        clientId: client.id,
        variables: {
          clientName: client.firstName,
          serviceName: service.name,
          startsAt: slot.startsAtUtc.toISOString()
        }
      });

      await writeAudit({
        tx,
        action: "appointment.create.public",
        entityType: "Appointment",
        entityId: appointment.id,
        description: "Публичная запись создана"
      });

      return appointment;
    });
    try {
      await deliverAppointmentTelegramNotification(appointment.id);
    } catch (error) {
      // Notification delivery must never make a successful booking fail.
      log("error", "Telegram appointment notification setup failed", {
        appointmentId: appointment.id,
        error: error instanceof Error ? error.message : error
      });
    }
    return appointment;
  } catch (error) {
    // Гонка идемпотентности: параллельный запрос с тем же ключом успел создать запись.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.appointment.findUnique({ where: { idempotencyKeyHash } });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}
