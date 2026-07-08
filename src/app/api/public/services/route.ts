import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" }
        }
      }
    });
    return jsonOk({ categories });
  } catch (error) {
    return jsonError(error);
  }
}
