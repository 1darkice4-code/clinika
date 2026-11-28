import { CLINIC_SITE_URL } from "@/config/clinic";
import {
  breadcrumbNode,
  clinicNode,
  CLINIC_ID,
  jsonLdGraph,
  webPageNode,
  websiteNode,
  type ClinicSchemaContacts
} from "@/lib/clinic-structured-data";

export { serializeJsonLd } from "@/lib/clinic-structured-data";

export type DirectionOffer = { name: string; price: number; url?: string; unitText?: string };

/**
 * JSON-LD для страниц услуг: клиника, сайт, страница, услуга с ценами, FAQ и хлебные крошки —
 * связанные через @id в один граф.
 */
export function buildDirectionStructuredData({
  path,
  title,
  description,
  serviceType,
  breadcrumb,
  parent,
  image = "/clinic/treatment-room.webp",
  offers,
  questions,
  ...contacts
}: ClinicSchemaContacts & {
  path: string;
  title: string;
  description: string;
  serviceType: string;
  breadcrumb: string;
  /** Родительская страница для хлебных крошек (без главной). */
  parent?: { name: string; path: string };
  image?: string;
  offers: DirectionOffer[];
  questions: readonly { question: string; answer: string }[];
}) {
  const pageUrl = `${CLINIC_SITE_URL}${path}`;
  const serviceId = `${pageUrl}#service`;
  const prices = offers.map((offer) => offer.price);
  const [locality] = contacts.address.split(",").map((part) => part.trim());

  const service = {
    "@type": "Service",
    "@id": serviceId,
    name: title,
    serviceType,
    description,
    url: pageUrl,
    image: `${CLINIC_SITE_URL}${image}`,
    provider: { "@id": CLINIC_ID },
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
              availability: "https://schema.org/InStock",
              seller: { "@id": CLINIC_ID },
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
  };

  const faq = questions.length
    ? [
        {
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          url: pageUrl,
          mainEntity: questions.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer }
          }))
        }
      ]
    : [];

  return jsonLdGraph([
    clinicNode(contacts),
    websiteNode(),
    webPageNode({ path, name: title, description, image, about: serviceId, type: "MedicalWebPage" }),
    service,
    ...faq,
    breadcrumbNode(path, [...(parent ? [parent] : []), { name: breadcrumb, path }])
  ]);
}
