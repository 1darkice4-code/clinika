import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  clinicName: z.string().min(2).max(160),
  legalName: z.string().min(2).max(240),
  taxId: z.string().max(32).optional().or(z.literal("")),
  address: z.string().min(2).max(300),
  phone: z.string().min(5).max(40),
  email: z.string().email(),
  timezone: z.string().min(2).max(80),
  mapEmbedUrl: z.string().url().optional().or(z.literal("")),
  bookingMinLeadMinutes: z.number().int().min(0).max(43200),
  bookingMaxHorizonDays: z.number().int().min(1).max(365)
});

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.settingsWrite);
    const input = schema.parse(await request.json());

    const settings = await prisma.$transaction(async (tx) => {
      const before = await tx.clinicSettings.findFirst();
      const data = {
        ...input,
        taxId: input.taxId || null,
        mapEmbedUrl: input.mapEmbedUrl || null
      };
      const updated = before
        ? await tx.clinicSettings.update({ where: { id: before.id }, data })
        : await tx.clinicSettings.create({ data });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "settings.update",
        entityType: "ClinicSettings",
        entityId: updated.id,
        description: "Настройки клиники обновлены",
        beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
        afterJson: JSON.parse(JSON.stringify(updated))
      });
      return updated;
    });

    return jsonOk({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
