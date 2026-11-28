import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  CURRENT_PROMO,
  isPromoActive,
  promoBookingHref,
  promoLastDayLabel,
  promoOffers
} from "@/domain/promo/current-promo";
import { formatPrice } from "@/lib/utils";
import styles from "./promo.module.css";

/** Блок акции для страниц лазерной эпиляции и главной. После окончания акции не выводится. */
export function PromoBanner({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  if (!isPromoActive()) return null;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const offers = promoOffers().filter((offer) => offer.id !== "referral");

  return (
    <section className={styles.banner} aria-labelledby="promo-banner-title">
      <div>
        <p className={styles.eyebrow}>Акция до {promoLastDayLabel()}</p>
        <Heading id="promo-banner-title" className={styles.title}>
          {CURRENT_PROMO.name}
        </Heading>
      </div>
      <div className={styles.offers}>
        {offers.map((offer) => (
          <div key={offer.id} className={styles.offer}>
            <span className={styles.offerTitle}>{offer.title}</span>
            <span className={styles.offerValue}>
              {offer.price ? (
                <>
                  {formatPrice(null, offer.price.now)}
                  <span className={styles.was}>{formatPrice(null, offer.price.was)}</span>
                </>
              ) : (
                offer.badge
              )}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <Link href={promoBookingHref()} className={styles.cta}>
          Записаться со скидкой <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
        <Link href="/akcii" className={styles.link}>
          Все условия и «Приведи подругу» <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <p className={styles.fine}>Скидки не суммируются. Имеются противопоказания. Необходима консультация специалиста.</p>
    </section>
  );
}
