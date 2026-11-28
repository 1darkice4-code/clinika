import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectionLanding } from "@/components/direction/direction-landing";
import { PromoBanner } from "@/components/promo/promo-banner";
import { directionMetadata } from "@/content/directions/metadata";
import { LASER_ZONE_LINKS, LASER_ZONE_PAGES } from "@/content/laser-zones/pages";
import { getPublicContacts } from "@/domain/booking/public-catalog";

type PageProps = { params: Promise<{ zone: string }> };

export const dynamic = "force-dynamic";

function findPage(zone: string) {
  return LASER_ZONE_PAGES.find((page) => page.content.path.endsWith(`/${zone}`));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = findPage((await params).zone);
  return page ? directionMetadata(page.content) : {};
}

export default async function LaserZonePage({ params }: PageProps) {
  const page = findPage((await params).zone);
  if (!page) notFound();
  const contacts = await getPublicContacts();
  return (
    <DirectionLanding
      content={page.content}
      offers={page.offers}
      contacts={contacts}
      related={{ title: "Лазерная эпиляция других зон", links: LASER_ZONE_LINKS }}
      afterPrices={<PromoBanner />}
    />
  );
}
