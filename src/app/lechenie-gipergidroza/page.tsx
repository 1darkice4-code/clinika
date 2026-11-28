import { DirectionLanding } from "@/components/direction/direction-landing";
import { ReviewsBlock } from "@/components/reviews/reviews-block";
import { lechenieGipergidroza as content } from "@/content/directions/lechenie-gipergidroza";
import { directionMetadata } from "@/content/directions/metadata";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { botulinumPriceRange } from "@/domain/service/current-price-list";

export const metadata = directionMetadata(content);
export const dynamic = "force-dynamic";

export default async function HyperhidrosisPage() {
  const contacts = await getPublicContacts();
  const { min, max } = botulinumPriceRange("hyperhidrosis");
  return (
    <DirectionLanding
      content={content}
      contacts={contacts}
      beforeFaq={<ReviewsBlock title="Отзывы пациентов" specialistSlug="svetlana-nersisyan" topic="cosmetology" />}
      offers={[
        { name: "Лечение гипергидроза ботулинотерапией — минимальная дозировка", price: min, url: content.bookingHref },
        { name: "Лечение гипергидроза ботулинотерапией — максимальная дозировка", price: max, url: content.bookingHref }
      ]}
    />
  );
}
