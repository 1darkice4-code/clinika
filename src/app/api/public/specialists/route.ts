import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const specialists = await prisma.specialist.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        photo: true,
        services: {
          where: { isActive: true },
          include: { service: true }
        }
      }
    });
    return jsonOk({ specialists });
  } catch (error) {
    return jsonError(error);
  }
}
