import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { createLocalNotification } from "@/domain/notification/notification.service";
import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/**
 * Real providers are not connected in the MVP, so "resend" re-creates a local
 * notification record from the original event, channel, recipient and links.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.notificationsWrite);
    const { id } = await context.params;

    const original = await prisma.notification.findUnique({ where: { id } });
    if (!original) throw new NotFoundError("Уведомление не найдено");

    const payload = original.payloadJson;
    const variables =
      payload && typeof payload === "object" && !Array.isArray(payload) && "variables" in payload
        ? (payload.variables as Record<string, string | number | null | undefined>)
        : {};

    const created = await prisma.$transaction(async (tx) => {
      const notification = await createLocalNotification({
        tx,
        eventType: original.eventType,
        channel: original.channel,
        recipient: original.recipient,
        recipientUserId: original.recipientUserId,
        clientId: original.clientId,
        appointmentId: original.appointmentId,
        leadId: original.leadId,
        variables
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "notification.resend",
        entityType: "Notification",
        entityId: notification.id,
        description: `Повторная отправка уведомления ${original.eventType}`
      });
      return notification;
    });

    return jsonOk({ notification: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
