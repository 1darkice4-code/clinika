import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]).optional(),
  text: z.string().min(2).max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.review.findUnique({ where: { id } });
      if (!before) throw new NotFoundError("Отзыв не найден");
      const review = await tx.review.update({ where: { id }, data: input });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "review.update",
        entityType: "Review",
        entityId: id,
        description: "Отзыв изменен",
        beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
        afterJson: JSON.parse(JSON.stringify(review))
      });
      return review;
    });

    return jsonOk({ review: updated });
  } catch (error) {
    return jsonError(error);
  }
}
