import type { MetadataRoute } from "next";
import { CLINIC_SITE_URL as appUrl } from "@/config/clinic";
import { LASER_ZONE_PAGES } from "@/content/laser-zones/pages";
import { LASER_COMBO } from "@/domain/service/laser-combo";
import { CONTENT_UPDATED_AT } from "@/lib/clinic-structured-data";
import { prisma } from "@/lib/prisma";

// В sitemap — только индексируемые страницы с каноническими адресами.
// Не попадают: /services/[slug] (noindex, кроме комплекса со своей страницей),
// юридические документы (noindex), служебные /booking, /login, /admin.
const indexableServiceSlugs = new Set<string>([LASER_COMBO.slug]);

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

function page(path: string, priority: number, changeFrequency: Entry["changeFrequency"] = "monthly"): Entry {
  return { url: `${appUrl}${path}`, lastModified: CONTENT_UPDATED_AT, changeFrequency, priority };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, specialists] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true, deletedAt: null, slug: { in: [...indexableServiceSlugs] } },
      select: { slug: true, updatedAt: true }
    }),
    prisma.specialist.findMany({
      where: { isActive: true, deletedAt: null },
      select: { slug: true, updatedAt: true }
    })
  ]);

  return [
    page("/", 1, "weekly"),
    page("/lazernaya-epilyatsiya", 0.9, "weekly"),
    ...LASER_ZONE_PAGES.map((zone) => page(zone.content.path, 0.8)),
    page("/botulinoterapiya", 0.8),
    page("/lechenie-gipergidroza", 0.8),
    page("/konturnaya-plastika", 0.8),
    page("/prices", 0.8, "weekly"),
    page("/akcii", 0.7, "weekly"),
    page("/otzyvy", 0.6, "weekly"),
    ...services.map((service) => ({
      url: `${appUrl}/services/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7
    })),
    ...specialists.map((specialist) => ({
      url: `${appUrl}/specialists/${specialist.slug}`,
      lastModified: specialist.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6
    }))
  ];
}
