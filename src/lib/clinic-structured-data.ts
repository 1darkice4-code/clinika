import { CLINIC_SITE_URL } from "@/config/clinic";

/**
 * Общие узлы JSON-LD. У клиники и сайта постоянные @id, поэтому поисковик склеивает
 * их на всех страницах в одну сущность, а страницы ссылаются на неё через @id.
 */
export const CLINIC_ID = `${CLINIC_SITE_URL}/#clinic`;
export const WEBSITE_ID = `${CLINIC_SITE_URL}/#website`;

/** Дата последнего обновления контента страниц — для dateModified и lastmod в sitemap. */
export const CONTENT_UPDATED_AT = "2026-11-28";

export type ClinicSchemaContacts = {
  phone: string;
  address: string;
  email?: string;
  /** Часы работы из настроек CRM: { weekdays: "09:00-21:00", weekend: "10:00-18:00" }. */
  workingHours?: unknown;
  /** Ссылки на профили клиники (ВКонтакте, Telegram-канал, карты, ПроДокторов). */
  sameAs?: readonly string[];
};

const HOURS = /^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/;

function openingHours(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const groups: [string, string[]][] = [
    ["weekdays", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]],
    ["weekend", ["Saturday", "Sunday"]]
  ];
  return groups.flatMap(([key, days]) => {
    const match = typeof record[key] === "string" ? HOURS.exec((record[key] as string).trim()) : null;
    return match ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: match[1], closes: match[2] }] : [];
  });
}

export function clinicNode(contacts: ClinicSchemaContacts) {
  const [locality, ...street] = contacts.address.split(",").map((part) => part.trim());
  const hours = openingHours(contacts.workingHours);
  return {
    "@type": "MedicalClinic",
    "@id": CLINIC_ID,
    name: "Сияние",
    alternateName: "Клиника эстетической медицины «Сияние»",
    url: `${CLINIC_SITE_URL}/`,
    logo: `${CLINIC_SITE_URL}/brand/siyanie-round.webp`,
    image: [`${CLINIC_SITE_URL}/clinic/treatment-room.webp`, `${CLINIC_SITE_URL}/clinic/laser-equipment.webp`],
    telephone: contacts.phone.replace(/[^+\d]/g, ""),
    ...(contacts.email ? { email: contacts.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: street.join(", "),
      addressLocality: locality,
      addressRegion: "Забайкальский край",
      addressCountry: "RU"
    },
    areaServed: { "@type": "City", name: locality },
    medicalSpecialty: "Dermatology",
    priceRange: "₽₽",
    currenciesAccepted: "RUB",
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(contacts.sameAs?.length ? { sameAs: [...contacts.sameAs] } : {})
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${CLINIC_SITE_URL}/`,
    name: "Сияние",
    inLanguage: "ru-RU",
    publisher: { "@id": CLINIC_ID }
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbNode(path: string, crumbs: readonly Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${CLINIC_SITE_URL}${path}#breadcrumbs`,
    itemListElement: [{ name: "Главная", path: "/" }, ...crumbs].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${CLINIC_SITE_URL}${crumb.path}`
    }))
  };
}

export function webPageNode({
  path,
  name,
  description,
  image,
  hasBreadcrumbs = true,
  about,
  type = "WebPage"
}: {
  path: string;
  name: string;
  description: string;
  image?: string;
  hasBreadcrumbs?: boolean;
  /** @id главной сущности страницы, например услуги. */
  about?: string;
  type?: "WebPage" | "MedicalWebPage" | "AboutPage" | "CollectionPage" | "ProfilePage";
}) {
  const url = `${CLINIC_SITE_URL}${path}`;
  return {
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "ru-RU",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": CLINIC_ID },
    dateModified: CONTENT_UPDATED_AT,
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: `${CLINIC_SITE_URL}${image}` } } : {}),
    ...(hasBreadcrumbs ? { breadcrumb: { "@id": `${url}#breadcrumbs` } } : {}),
    ...(about ? { about: { "@id": about }, mainEntity: { "@id": about } } : {})
  };
}

export function jsonLdGraph(nodes: readonly object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** JSON для <script type="application/ld+json">, безопасный для вставки в HTML. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
