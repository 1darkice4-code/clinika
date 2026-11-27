import "dotenv/config";
import { PrismaClient } from "@prisma/client/index";
import { publishFeaturedReviews } from "../src/domain/review/publish-featured-reviews";

const prisma = new PrismaClient();

publishFeaturedReviews(prisma)
  .then((count) => console.info(`Featured reviews published: ${count}`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
