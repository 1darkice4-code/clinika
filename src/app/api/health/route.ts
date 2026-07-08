import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({ status: "ok", time: new Date().toISOString() });
  } catch (error) {
    return jsonError(error);
  }
}
