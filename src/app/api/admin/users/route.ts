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
  email: z.string().trim().email().toLowerCase(),
  name: z.string().min(2).max(160),
  phone: z.string().max(32).optional().or(z.literal("")),
  password: z.string().min(8),
  roleCodes: z.array(z.enum(["OWNER", "ADMIN", "SPECIALIST"])).min(1),
  status: z.enum(["ACTIVE", "INVITED", "BLOCKED"]).default("ACTIVE")
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.usersManage);
    const input = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("Пользователь с таким email уже существует");
    const passwordHash = await bcrypt.hash(input.password, 12);

    const created = await prisma.$transaction(async (tx) => {
      const result = await tx.user.create({
        omit: { passwordHash: true },
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          passwordHash,
          status: input.status
        }
      });
      const roles = await tx.role.findMany({ where: { code: { in: input.roleCodes } } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId: result.id, roleId: role.id }))
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "user.create",
        entityType: "User",
        entityId: result.id,
        description: "Пользователь создан"
      });
      return result;
    });

    return jsonOk({ user: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
