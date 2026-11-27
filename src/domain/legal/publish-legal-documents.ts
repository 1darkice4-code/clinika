import type { PrismaClient } from "@prisma/client/index";
import { LEGAL_DOCUMENTS, serializeLegalContent } from "./legal-documents";

export async function publishLegalDocuments(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    for (const document of LEGAL_DOCUMENTS) {
      const canonical = await tx.legalDocument.findUnique({ where: { slug: document.slug } });
      if (canonical && canonical.version !== document.version) {
        await tx.legalDocument.update({
          where: { id: canonical.id },
          data: {
            slug: `${document.slug}-${canonical.version}`,
            status: "ARCHIVED"
          }
        });
      }

      await tx.legalDocument.upsert({
        where: { type_version: { type: document.type, version: document.version } },
        update: {
          slug: document.slug,
          title: document.title,
          content: serializeLegalContent(document.content),
          status: "PUBLISHED",
          publishedAt: new Date()
        },
        create: {
          type: document.type,
          slug: document.slug,
          title: document.title,
          content: serializeLegalContent(document.content),
          version: document.version,
          status: "PUBLISHED",
          publishedAt: new Date()
        }
      });
    }
  });
}
