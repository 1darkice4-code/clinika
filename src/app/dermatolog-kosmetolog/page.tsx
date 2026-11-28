import { DirectionLanding } from "@/components/direction/direction-landing";
import { ReviewsBlock } from "@/components/reviews/reviews-block";
import { dermatologKosmetolog as content } from "@/content/directions/dermatolog-kosmetolog";
import { directionMetadata } from "@/content/directions/metadata";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { CONSULTATION_SERVICES } from "@/domain/service/current-price-list";

export const metadata = directionMetadata(content);
export const dynamic = "force-dynamic";

export default async function DermatologistPage() {
  const contacts = await getPublicContacts();
  const offers = CONSULTATION_SERVICES.flatMap((item) =>
    item.priceExact ? [{ name: item.name, price: item.priceExact, url: `/booking?booking=doctor&service=${item.slug}` }] : []
  );
  return (
    <DirectionLanding
      content={content}
      contacts={contacts}
      offers={offers}
      beforeFaq={<ReviewsBlock title="Отзывы пациентов" specialistSlug="svetlana-nersisyan" topic="cosmetology" />}
    />
  );
}
