import "dotenv/config";
import { PrismaClient } from "@prisma/client/index";
import { publishLegalDocuments } from "../src/domain/legal/publish-legal-documents";

const prisma = new PrismaClient();

publishLegalDocuments(prisma)
  .then(() => console.info("Legal documents published."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
