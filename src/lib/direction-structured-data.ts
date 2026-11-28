import { CLINIC_SITE_URL } from "@/config/clinic";

export type DirectionOffer = { name: string; price: number; url?: string; unitText?: string };

/**
 * JSON-LD для страниц направлений: клиника, услуга с ценами, FAQ и хлебные крошки.
 */
export function buildDirectionStructuredData({
  path,
  title,
  description,
  serviceType,
  breadcrumb,
  parent,
  phone,
  address,
  email,
  offers,
  questions
}: {
  path: string;
  title: string;
  description: string;
  serviceType: string;
  breadcrumb: string;
  /** Родительская страница для хлебных крошек (без главной). */
  parent?: { name: string; path: string };
  phone: string;
  address: string;
  email?: string;
  offers: DirectionOffer[];
  questions: readonly { question: string; answer: string }[];
}) {
  const pageUrl = `${CLINIC_SITE_URL}${path}`;
  const clinicId = `${CLINIC_SITE_URL}/#clinic`;
  const [locality, ...street] = address.split(",").map((part) => part.trim());
  const prices = offers.map((offer) => offer.price);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalClinic",
        "@id": clinicId,
        name: "Сияние",
        url: `${CLINIC_SITE_URL}/`,
        telephone: phone,
        ...(email ? { email } : {}),
        image: `${CLINIC_SITE_URL}/clinic/treatment-room.webp`,
        address: {
          "@type": "PostalAddress",
          addressCountry: "RU",
          addressLocality: locality,
          streetAddress: street.join(", ")
        }
      },
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: title,
        serviceType,
        description,
        url: pageUrl,
        provider: { "@id": clinicId },
        areaServed: { "@type": "City", name: locality },
        ...(offers.length
          ? {
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "RUB",
                lowPrice: Math.min(...prices),
                highPrice: Math.max(...prices),
                offerCount: offers.length,
                offers: offers.map((offer) => ({
                  "@type": "Offer",
                  name: offer.name,
                  price: offer.price,
                  priceCurrency: "RUB",
                  ...(offer.url ? { url: `${CLINIC_SITE_URL}${offer.url}` } : {}),
                  ...(offer.unitText
                    ? {
                        priceSpecification: {
                          "@type": "UnitPriceSpecification",
                          price: offer.price,
                          priceCurrency: "RUB",
                          unitText: offer.unitText
                        }
                      }
                    : {})
                }))
              }
            }
          : {})
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: questions.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer }
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: "Главная", item: `${CLINIC_SITE_URL}/` },
          ...(parent ? [{ name: parent.name, item: `${CLINIC_SITE_URL}${parent.path}` }] : []),
          { name: breadcrumb, item: pageUrl }
        ].map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry }))
      }
    ]
  };
}

/** JSON для <script type="application/ld+json">, безопасный для вставки в HTML. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
