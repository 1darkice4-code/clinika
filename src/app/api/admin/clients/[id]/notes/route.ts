import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

const archiveSchema = z.object({
  noteId: z.string().min(1)
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.clientsWrite);
    const { id } = await context.params;
    const input = createSchema.parse(await request.json());

    const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!client) throw new NotFoundError("Клиент не найден");

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.clientNote.create({
        data: { clientId: id, authorUserId: user!.id, body: input.body }
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "client.note.create",
        entityType: "ClientNote",
        entityId: created.id,
        description: "Добавлена заметка о клиенте"
      });
      return created;
    });

    return jsonOk({ note }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.clientsWrite);
    const { id } = await context.params;
    const { noteId } = archiveSchema.parse(await request.json());

    const existing = await prisma.clientNote.findFirst({
      where: { id: noteId, clientId: id, deletedAt: null }
    });
    if (!existing) throw new NotFoundError("Заметка не найдена");

    await prisma.$transaction(async (tx) => {
      await tx.clientNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "client.note.archive",
        entityType: "ClientNote",
        entityId: noteId,
        description: "Заметка о клиенте удалена"
      });
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
