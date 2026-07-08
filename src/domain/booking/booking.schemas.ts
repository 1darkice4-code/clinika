import { z } from "zod";
import { attributionSchema } from "@/domain/analytics/attribution";
import { clientNameSchema, optionalEmailSchema, phoneSchema } from "@/domain/client/client.schemas";

const consentSchema = z.object({
  personalDataConsentAccepted: z
    .boolean()
    .refine((value) => value, "Необходимо согласие на обработку персональных данных"),
  marketingConsentAccepted: z.boolean().optional().default(false),
  legalDocumentVersion: z.string().min(1).default("2026-01")
});

const antiSpamSchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  honeypot: z.string().max(0).optional().or(z.literal(""))
});

export const createLeadSchema = z
  .object({
    name: clientNameSchema,
    phone: phoneSchema,
    serviceId: z.string().optional(),
    preferredContactTime: z.string().max(120).optional(),
    comment: z.string().max(1000).optional()
  })
  .merge(consentSchema)
  .merge(antiSpamSchema)
  .merge(attributionSchema);

export const createAppointmentSchema = z
  .object({
    serviceId: z.string().min(1),
    specialistId: z.string().min(1),
    startsAtUtc: z.string().datetime(),
    name: clientNameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    comment: z.string().max(1000).optional()
  })
  .merge(consentSchema)
  .merge(antiSpamSchema)
  .merge(attributionSchema);

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
