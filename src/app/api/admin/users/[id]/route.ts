import bcrypt from "bcryptjs";
import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { ConflictError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email().toLowerCase().optional(),
  name: z.string().min(2).max(160).optional(),
  phone: z.string().max(32).nullable().optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  roleCodes: z
    .array(z.enum(["OWNER", "ADMIN", "SPECIALIST"]))
    .min(1)
    .optional(),
  status: z.enum(["ACTIVE", "INVITED", "BLOCKED", "DELETED"]).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser();
    assertPermission(actor, permissions.usersManage);
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { password, roleCodes, ...data } = input;
    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id)
        throw new ConflictError("Пользователь с таким email уже существует");
    }

    const user = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id },
        omit: { passwordHash: true },
        include: { roles: { include: { role: true } } }
      });
      const updated = await tx.user.update({
        where: { id },
        omit: { passwordHash: true },
        data: {
          ...data,
          phone: data.phone === "" ? null : data.phone,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {})
        }
      });
      if (roleCodes) {
        const roles = await tx.role.findMany({ where: { code: { in: roleCodes } } });
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: id, roleId: role.id }))
        });
      }
      await writeAudit({
        tx,
        userId: actor?.id,
        action: "user.update",
        entityType: "User",
        entityId: id,
        description: "Пользователь обновлен",
        beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
        afterJson: JSON.parse(JSON.stringify(updated))
      });
      return updated;
    });

    return jsonOk({ user });
  } catch (error) {
    return jsonError(error);
  }
}
