import type { NotificationChannel, Prisma, PrismaClient } from "@prisma/client/index";
import { renderTemplate } from "@/domain/notification/template-renderer";

type CreateNotificationInput = {
  tx: Prisma.TransactionClient | PrismaClient;
  eventType: string;
  channel?: NotificationChannel;
  recipient?: string | null;
  recipientUserId?: string | null;
  clientId?: string | null;
  appointmentId?: string | null;
  leadId?: string | null;
  variables: Record<string, string | number | null | undefined>;
};

export async function createLocalNotification(input: CreateNotificationInput) {
  const channel = input.channel ?? "IN_APP";
  const template = await input.tx.notificationTemplate.findUnique({
    where: {
      eventType_channel: {
        eventType: input.eventType,
        channel
      }
    }
  });

  const body = template
    ? renderTemplate(template.body, input.variables)
    : JSON.stringify(input.variables);

  return input.tx.notification.create({
    data: {
      templateId: template?.id,
      channel,
      recipient: input.recipient,
      recipientUserId: input.recipientUserId,
      clientId: input.clientId,
      appointmentId: input.appointmentId,
      leadId: input.leadId,
      eventType: input.eventType,
      payloadJson: {
        variables: input.variables,
        body
      },
      status: "SENT",
      attempts: 1,
      sentAt: new Date()
    }
  });
}
