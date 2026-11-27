import type { MetadataRoute } from "next";
import { CLINIC_SITE_URL as appUrl } from "@/config/clinic";
import { LASER_SERVICES } from "@/domain/service/current-price-list";
import { prisma } from "@/lib/prisma";

// Страницы зон лазерной эпиляции закрыты noindex — в sitemap их не отдаём.
const laserZoneSlugs = new Set<string>(LASER_SERVICES.map((service) => service.slug));

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, specialists, docs] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      select: { slug: true, updatedAt: true }
    }),
    prisma.specialist.findMany({
      where: { isActive: true, deletedAt: null },
      select: { slug: true, updatedAt: true }
    }),
    prisma.legalDocument.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true }
    })
  ]);

  return [
    { url: `${appUrl}/` },
    { url: `${appUrl}/lazernaya-epilyatsiya` },
    { url: `${appUrl}/prices` },
    { url: `${appUrl}/booking` },
    ...services.filter((service) => !laserZoneSlugs.has(service.slug)).map((service) => ({
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
