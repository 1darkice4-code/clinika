import type { LegalDocumentType, Prisma, PrismaClient } from "@prisma/client/index";
import { NotFoundError } from "@/lib/errors";

type ConsentInput = {
  tx: Prisma.TransactionClient | PrismaClient;
  clientId: string;
  type: LegalDocumentType;
  version: string;
  source: "PUBLIC_BOOKING" | "CALLBACK_FORM" | "ADMIN" | "IMPORT";
  ipHash?: string | null;
  userAgentHash?: string | null;
};

export async function recordConsent(input: ConsentInput) {
  const legalDocument = await input.tx.legalDocument.findUnique({
    where: { type_version: { type: input.type, version: input.version } }
  });

  if (!legalDocument || legalDocument.status !== "PUBLISHED") {
    throw new NotFoundError("Актуальная версия согласия не найдена");
  }

  return input.tx.consent.create({
    data: {
      clientId: input.clientId,
      legalDocumentId: legalDocument.id,
      type: input.type,
      acceptedAt: new Date(),
      source: input.source,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash
    }
  });
}
