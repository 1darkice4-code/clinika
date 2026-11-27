import { CLINIC_SITE_URL } from "@/config/clinic";
import { LASER_SERVICES } from "@/domain/service/current-price-list";

type Zone = { slug: string; priceExact: number | null; priceFrom: number | null };

const zoneNames = new Map<string, { zone: string; group: string }>(
  LASER_SERVICES.map((service) => [service.slug, { zone: service.zone, group: service.group }])
);

export function buildLaserStructuredData({
  pageUrl,
  title,
  description,
  phone,
  address,
  email,
  zones,
  questions
}: {
  pageUrl: string;
  title: string;
  description: string;
  phone: string;
  address: string;
  email?: string;
  zones: Zone[];
  questions: { question: string; answer: string }[];
}) {
  const clinicId = `${CLINIC_SITE_URL}/#clinic`;
  const [locality, ...street] = address.split(",").map((part) => part.trim());

  const offers = zones.flatMap((zone) => {
    const price = zone.priceExact ?? zone.priceFrom;
    const names = zoneNames.get(zone.slug);
    if (price === null || !names) return [];
    return [
      {
        "@type": "Offer",
        name: `Лазерная эпиляция — ${names.group.toLowerCase()}, ${names.zone.toLowerCase()} (1 сеанс)`,
        price,
        priceCurrency: "RUB",
        url: `${CLINIC_SITE_URL}/booking?booking=laser&service=${zone.slug}`
      }
    ];
  });

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
        serviceType: "Лазерная эпиляция",
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
                offers
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
          { "@type": "ListItem", position: 1, name: "Главная", item: `${CLINIC_SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Лазерная эпиляция", item: pageUrl }
        ]
      }
    ]
  };
}

/** JSON для <script type="application/ld+json">, безопасный для вставки в HTML. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
