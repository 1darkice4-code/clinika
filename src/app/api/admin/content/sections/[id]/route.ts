import { z } from "zod";
import type { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().max(200).nullable().optional(),
  subtitle: z.string().max(500).nullable().optional(),
  configJson: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const data: Prisma.PageSectionUpdateInput = {
      title: input.title,
      subtitle: input.subtitle,
      configJson: input.configJson as Prisma.InputJsonValue | undefined,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible
    };

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.pageSection.findUnique({ where: { id } });
      if (!before) throw new NotFoundError("Секция не найдена");
      const section = await tx.pageSection.update({
        where: { id },
        data
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "content.section.update",
        entityType: "PageSection",
        entityId: id,
        description: "Секция лендинга изменена",
        beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
        afterJson: JSON.parse(JSON.stringify(section))
      });
      return section;
    });

    return jsonOk({ section: updated });
  } catch (error) {
    return jsonError(error);
  }
}
