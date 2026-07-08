import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const [services, specialists, docs] = await Promise.all([
    prisma.service.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.specialist.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.legalDocument.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } })
  ]);

  return [
    { url: appUrl, lastModified: new Date() },
    ...services.map((service) => ({
      url: `${appUrl}/services/${service.slug}`,
      lastModified: service.updatedAt
    })),
    ...specialists.map((specialist) => ({
      url: `${appUrl}/specialists/${specialist.slug}`,
      lastModified: specialist.updatedAt
    })),
    ...docs.map((document) => ({
      url: `${appUrl}/legal/${document.slug}`,
      lastModified: document.updatedAt
    }))
  ];
}
