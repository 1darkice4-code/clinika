import "dotenv/config";
import { PrismaClient } from "@prisma/client/index";
import { publishCurrentPriceList } from "../src/domain/service/publish-current-price-list";

const prisma = new PrismaClient();

publishCurrentPriceList(prisma)
  .then(({ consultation, cosmetologyServiceCount, laserServiceCount }) =>
    console.info(
      `Current price list published: ${consultation?.priceExact ?? "request"} RUB chief consultation, ${cosmetologyServiceCount} cosmetology services, ${laserServiceCount} laser zones`
    )
  )
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
