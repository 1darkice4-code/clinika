import type { MetadataRoute } from "next";
import { CLINIC_SITE_URL as appUrl } from "@/config/clinic";
import { LASER_ZONE_PAGES } from "@/content/laser-zones/pages";
import { LASER_COMBO } from "@/domain/service/laser-combo";
import { prisma } from "@/lib/prisma";

// Страницы отдельных услуг (/services/[slug]) закрыты noindex — в sitemap их не отдаём.
// Исключение — комплекс лазерной эпиляции, у него собственная страница.
const indexableServiceSlugs = new Set<string>([LASER_COMBO.slug]);

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
    ...LASER_ZONE_PAGES.map((page) => ({ url: `${appUrl}${page.content.path}` })),
    { url: `${appUrl}/botulinoterapiya` },
    { url: `${appUrl}/lechenie-gipergidroza` },
    { url: `${appUrl}/konturnaya-plastika` },
    { url: `${appUrl}/prices` },
    { url: `${appUrl}/booking` },
    ...services.filter((service) => indexableServiceSlugs.has(service.slug)).map((service) => ({
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
