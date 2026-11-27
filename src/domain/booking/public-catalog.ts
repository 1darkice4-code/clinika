import { CLINIC_CONTACTS } from "@/config/clinic";
import { LASER_SERVICES, PUBLIC_HIDDEN_SERVICE_SLUGS } from "@/domain/service/current-price-list";
import { LASER_COMBO } from "@/domain/service/laser-combo";
import { nextDateInTimezone } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";

const laserMetadata = new Map(LASER_SERVICES.map((service) => [service.slug, service]));

export async function getPublicBookingCatalog() {
  const [categories, specialists, settings] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            priceExact: true,
            priceFrom: true,
            durationMinutes: true,
            requiresResourceId: true
          }
        }
      }
    }),
    prisma.specialist.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        experienceYears: true,
        services: { where: { isActive: true }, select: { service: { select: { id: true } } } }
      }
    }),
    prisma.clinicSettings.findFirst({
      select: { phone: true, email: true, address: true, timezone: true }
    })
  ]);

  const services = categories.flatMap((category) =>
    category.services.filter((service) => !PUBLIC_HIDDEN_SERVICE_SLUGS.has(service.slug)).map((service) => {
      const laser = laserMetadata.get(service.slug);
      return {
        ...service,
        name: laser?.zone ?? service.name,
        group: laser?.group ?? category.name,
        coursePrices: laser?.prices ?? null
      };
    })
  );

  return {
    services,
    specialists,
    bookingDate: nextDateInTimezone(new Date(), settings?.timezone ?? "Asia/Chita"),
    contacts: { ...CLINIC_CONTACTS, ...settings }
  };
}

export type PublicBookingCatalog = Awaited<ReturnType<typeof getPublicBookingCatalog>>;

export async function getPublicLaserPricing() {
  const { services, contacts } = await getPublicBookingCatalog();
  const bookableZones = services
    .filter((service) => service.coursePrices && service.requiresResourceId)
    .map(({ slug, priceExact, priceFrom, durationMinutes }) => ({ slug, priceExact, priceFrom, durationMinutes }));
  const knownPrices = bookableZones.map(({ priceExact, priceFrom }) => priceExact ?? priceFrom)
    .filter((price) => price !== null);
  return {
    contacts,
    bookableZones,
    combo: services.find(
      (service) =>
        service.slug === LASER_COMBO.slug &&
        service.requiresResourceId &&
        service.priceExact !== null
    ),
    startingPrice: knownPrices.length ? Math.min(...knownPrices) : null
  };
}

/** Контакты клиники для публичных страниц: настройки из CRM поверх значений по умолчанию. */
export async function getPublicContacts() {
  const settings = await prisma.clinicSettings.findFirst({
    select: { phone: true, email: true, address: true }
  });
  return {
    phone: settings?.phone || CLINIC_CONTACTS.phone,
    email: settings?.email || CLINIC_CONTACTS.email,
    address: settings?.address || CLINIC_CONTACTS.address
  };
}
