import type { Prisma, PrismaClient } from "@prisma/client/index";
import { normalizePhone } from "@/domain/client/phone";

type UpsertClientInput = {
  tx: Prisma.TransactionClient | PrismaClient;
  name: string;
  phone: string;
  email?: string | null;
  attributionId?: string | null;
  personalDataConsent: boolean;
  marketingConsent: boolean;
};

export async function upsertClient(input: UpsertClientInput) {
  const normalizedPhone = normalizePhone(input.phone);
  const now = new Date();
  const email = input.email && input.email.length > 0 ? input.email : null;

  return input.tx.client.upsert({
    where: { normalizedPhone },
    update: {
      firstName: input.name,
      phone: input.phone,
      email,
      personalDataConsentAt: input.personalDataConsent ? now : undefined,
      marketingConsentAt: input.marketingConsent ? now : undefined
    },
    create: {
      firstName: input.name,
      phone: input.phone,
      normalizedPhone,
      email,
      firstAttributionId: input.attributionId,
      personalDataConsentAt: input.personalDataConsent ? now : null,
      marketingConsentAt: input.marketingConsent ? now : null
    }
  });
}
