import { LASER_SERVICES } from "@/domain/service/current-price-list";
import { buildDirectionStructuredData, type DirectionOffer } from "@/lib/direction-structured-data";

type Zone = { slug: string; priceExact: number | null; priceFrom: number | null };

const zoneNames = new Map<string, { zone: string; group: string }>(
  LASER_SERVICES.map((service) => [service.slug, { zone: service.zone, group: service.group }])
);

export function buildLaserStructuredData({
  zones,
  ...rest
}: Omit<Parameters<typeof buildDirectionStructuredData>[0], "offers" | "serviceType" | "breadcrumb"> & {
  zones: Zone[];
}) {
  const offers: DirectionOffer[] = zones.flatMap((zone) => {
    const price = zone.priceExact ?? zone.priceFrom;
    const names = zoneNames.get(zone.slug);
    if (price === null || !names) return [];
    return [
      {
        name: `Лазерная эпиляция — ${names.group.toLowerCase()}, ${names.zone.toLowerCase()} (1 сеанс)`,
        price,
        url: `/booking?booking=laser&service=${zone.slug}`
      }
    ];
  });
  return buildDirectionStructuredData({
    ...rest,
    serviceType: "Лазерная эпиляция",
    breadcrumb: "Лазерная эпиляция",
    offers
  });
}

export { serializeJsonLd } from "@/lib/direction-structured-data";
