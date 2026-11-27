import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/** Rejects unknown/deleted specialist ids before they hit the FK (clean 409, not 500). */
export async function assertOperatorsExist(operatorIds: string[]) {
  if (operatorIds.length === 0) return;
  const unique = [...new Set(operatorIds)];
  const found = await prisma.specialist.count({
    where: { id: { in: unique }, deletedAt: null }
  });
  if (found !== unique.length) throw new ConflictError("Среди операторов есть несуществующий специалист");
}

/** Rejects an unknown/deleted resource id before it hits the FK (clean 409, not 500). */
export async function assertResourceExists(resourceId: string | null | undefined) {
  if (!resourceId) return;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, deletedAt: null },
    select: { id: true }
  });
  if (!resource) throw new ConflictError("Выбранный ресурс не найден");
}

/** Rejects an unknown/deleted specialist id before it hits the FK (clean 409, not 500). */
export async function assertSpecialistExists(specialistId: string | null | undefined) {
  if (!specialistId) return;
  const specialist = await prisma.specialist.findFirst({
    where: { id: specialistId, deletedAt: null },
    select: { id: true }
  });
  if (!specialist) throw new ConflictError("Выбранный специалист не найден");
}
