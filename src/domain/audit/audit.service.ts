import type { Prisma, PrismaClient } from "@prisma/client/index";

type AuditInput = {
  tx: Prisma.TransactionClient | PrismaClient;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  beforeJson?: Prisma.InputJsonValue;
  afterJson?: Prisma.InputJsonValue;
  requestId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
};

export async function writeAudit(input: AuditInput) {
  return input.tx.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
      requestId: input.requestId,
      ipHash: input.ipHash,
      userAgentHash: input.userAgentHash
    }
  });
}
