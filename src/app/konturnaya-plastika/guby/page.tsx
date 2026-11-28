import { DirectionLanding } from "@/components/direction/direction-landing";
import { ReviewsBlock } from "@/components/reviews/reviews-block";
import { directionMetadata } from "@/content/directions/metadata";
import { uvelichenieGub as content } from "@/content/directions/uvelichenie-gub";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { CONTOUR_SERVICES } from "@/domain/service/current-price-list";

export const metadata = directionMetadata(content);
export const dynamic = "force-dynamic";

export default async function LipAugmentationPage() {
  const contacts = await getPublicContacts();
  const offers = CONTOUR_SERVICES.flatMap((item) =>
    /липс|lips/i.test(item.name) && item.priceExact ? [{ name: item.name, price: item.priceExact }] : []
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
