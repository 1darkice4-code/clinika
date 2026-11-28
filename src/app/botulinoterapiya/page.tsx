import { DirectionLanding } from "@/components/direction/direction-landing";
import { ReviewsBlock } from "@/components/reviews/reviews-block";
import { botulinoterapiya as content } from "@/content/directions/botulinoterapiya";
import { directionMetadata } from "@/content/directions/metadata";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { botulinumPriceRange } from "@/domain/service/current-price-list";

export const metadata = directionMetadata(content);
export const dynamic = "force-dynamic";

export default async function BotulinumTherapyPage() {
  const contacts = await getPublicContacts();
  const { min } = botulinumPriceRange("wrinkles");
  return (
    <DirectionLanding
      content={content}
      contacts={contacts}
      beforeFaq={<ReviewsBlock title="Отзывы пациентов" specialistSlug="svetlana-nersisyan" topic="cosmetology" />}
      offers={[
        {
          name: "Коррекция мимических морщин ботулинотерапией",
          price: min,
          unitText: "за 1 единицу препарата",
          url: content.bookingHref
        }
      ]}
    />
  );
}
