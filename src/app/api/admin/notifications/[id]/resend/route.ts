import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { createLocalNotification } from "@/domain/notification/notification.service";
import { deliverAppointmentTelegramNotification } from "@/domain/notification/telegram.service";
import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.notificationsWrite);
    const { id } = await context.params;

    const original = await prisma.notification.findUnique({ where: { id } });
    if (!original) throw new NotFoundError("Уведомление не найдено");

    if (original.channel === "TELEGRAM") {
      if (!original.appointmentId) {
        throw new NotFoundError("Запись для Telegram-уведомления не найдена");
      }
      const notification = await deliverAppointmentTelegramNotification(original.appointmentId);
      if (!notification) {
        throw new NotFoundError("Telegram-уведомления отключены");
      }
      await prisma.$transaction((tx) =>
        writeAudit({
          tx,
          userId: user?.id,
          action: "notification.resend",
          entityType: "Notification",
          entityId: notification.id,
          description: `Повторная отправка уведомления ${original.eventType}`
        })
      );
      return jsonOk({ notification }, { status: 201 });
    }

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
