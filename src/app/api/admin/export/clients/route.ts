import Papa from "papaparse";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.clientsExport);

    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    await writeAudit({
      tx: prisma,
      userId: user?.id,
      action: "clients.export",
      entityType: "Client",
      description: "Экспорт клиентов CSV"
    });

    const csv = Papa.unparse(
      clients.map((client) => ({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName ?? "",
        phone: client.phone,
        email: client.email ?? "",
        createdAt: client.createdAt.toISOString()
      }))
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=clients.csv"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
