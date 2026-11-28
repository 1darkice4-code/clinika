import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { BookingForm } from "@/components/booking/booking-form";
import { readCampaignQuery } from "@/domain/analytics/attribution";
import { getPublicBookingCatalog } from "@/domain/booking/public-catalog";
import { CURRENT_PROMO, isPromoActive, promoOffers } from "@/domain/promo/current-promo";
import { LASER_COMBO, LASER_COMBO_SLUGS } from "@/domain/service/laser-combo";
import { prisma } from "@/lib/prisma";
import { ClinicPage } from "../clinic-page";
import styles from "../clinic-pages.module.css";
import home from "../home.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Записаться на приём в клинику в Чите",
  description: "Онлайн-запись в клинику «Сияние» в Чите. Выберите услугу и свободное время.",
  alternates: { canonical: "/booking" }
};

export default async function BookingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ services, specialists, bookingDate, contacts }, query, marketingConsent] =
    await Promise.all([
      getPublicBookingCatalog(),
      searchParams,
      prisma.legalDocument.findFirst({
        where: { type: "MARKETING_CONSENT", status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, version: true }
      })
    ]);
  const initialService = services.find((service) => service.slug === query.service);
  const initialDirection =
    initialService?.requiresResourceId || query.booking === "laser" ? "laser" : "doctor";
  const initialMode = query.request === "callback" ? "lead" : "appointment";
  const { attribution } = readCampaignQuery(query);
  const isLaserCombo = Boolean(initialService && LASER_COMBO_SLUGS.has(initialService.slug));
  // Запись по ссылке акции: помечаем комментарий и кампанию, чтобы администратор увидел акцию.
  const promoApplied = query.promo === CURRENT_PROMO.code && isPromoActive();
  const promoOffer = promoApplied
    ? (promoOffers().find((offer) => offer.cta?.href.includes(`service=${initialService?.slug ?? "-"}`)) ??
      promoOffers()[0])
    : null;
  const promoComment = promoOffer ? `Акция «${CURRENT_PROMO.name}»: ${promoOffer.bookingNote}.` : undefined;

  return (
    <ClinicPage phone={contacts.phone} address={contacts.address} email={contacts.email}>
      <main id="clinic-main" tabIndex={-1} className={`${styles.stage} ${styles.booking}`}>
        <div className={`${home.shell} ${styles.stageInner}`}>
          <div className={styles.intro}>
            <h1 className={`${home.title} ${styles.pageTitle}`}>Записаться на приём</h1>
            <p className={styles.description}>
              Выберите услугу и время. Администратор подтвердит запись.
            </p>
            <a href={`tel:${contacts.phone}`} className={home.heroLink}>
              <Phone size={16} aria-hidden="true" /> {contacts.phone}
            </a>
            {promoComment && (
              <p className={styles.promoNote} role="status">
                {promoComment} Скидку администратор учтёт при подтверждении записи.
              </p>
            )}
          </div>
          <div className={`light ${styles.bookingPanel}`}>
            <BookingForm
              key={`${initialMode}:${initialDirection}:${initialService?.id ?? ""}:${promoComment ?? ""}`}
              initialComment={promoComment}
              bookingDate={bookingDate}
              initialMode={initialMode}
              initialDirection={initialDirection}
              initialServiceId={initialService?.id}
              startWithTime={isLaserCombo}
              attribution={{
                ...attribution,
                ...(promoApplied && !attribution.utmCampaign ? { utmCampaign: CURRENT_PROMO.code } : {}),
                landingPage: initialService?.slug === LASER_COMBO.slug ? `/services/${LASER_COMBO.slug}` : undefined
              }}
              marketingConsent={marketingConsent}
              services={services}
              specialists={specialists}
            />
          </div>
        </div>
      </main>
    </ClinicPage>
  );
}
