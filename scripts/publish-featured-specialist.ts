import "dotenv/config";
import { PrismaClient } from "@prisma/client/index";
import { publishFeaturedSpecialist } from "../src/domain/specialist/publish-featured-specialist";

const prisma = new PrismaClient();

publishFeaturedSpecialist(prisma)
  .then((specialist) => console.info(`Featured specialist published: ${specialist.slug}`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
