import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";
import { CLINIC_SITE_URL } from "@/config/clinic";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { getPublishedReviews } from "@/domain/review/public-reviews";
import { breadcrumbNode, clinicNode, CLINIC_ID, jsonLdGraph, webPageNode, websiteNode } from "@/lib/clinic-structured-data";
import { PUBLIC_HIDDEN_SERVICE_SLUGS } from "@/domain/service/current-price-list";

const reviewDateFormat = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "Asia/Chita" });
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const specialist = await prisma.specialist.findUnique({
    where: { slug },
    include: { seoMetadata: true, photo: true }
  });
  if (!specialist) return {};
  const name = `${specialist.firstName} ${specialist.lastName}`.trim();
  const generatedTitle = `${name} — ${specialist.position.toLowerCase()} в Чите`;
  // Вместе с « | Сияние» title должен укладываться примерно в 60 символов.
  const title =
    specialist.seoMetadata?.title ??
    (generatedTitle.length <= 52 ? generatedTitle : `${name} — ${specialist.position.toLowerCase()}`);
  const fallbackDescription = `${name} — ${specialist.position.toLowerCase()} клиники «Сияние» в Чите. Стаж ${specialist.experienceYears} лет. ${specialist.description} Онлайн-запись.`;
  const description =
    specialist.seoMetadata?.description ??
    (specialist.description.length >= 70 ? specialist.description : fallbackDescription);
  const path = `/specialists/${specialist.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "profile",
      locale: "ru_RU",
      siteName: "Сияние",
      url: path,
      title,
      description,
      images: [{ url: specialist.photo?.publicUrl ?? "/clinic/treatment-room.webp", alt: name }]
    }
  };
}

export default async function SpecialistPage({ params }: PageProps) {
  const { slug } = await params;
  const specialist = await prisma.specialist.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      photo: true,
      services: { where: { isActive: true }, include: { service: true } }
    }
  });

  if (!specialist) notFound();
  const [reviews, schemaContacts] = await Promise.all([
    getPublishedReviews({ specialistSlug: specialist.slug, limit: 10 }),
    getPublicContacts()
  ]);
  const fullName = `${specialist.firstName} ${specialist.lastName}`.trim();
  const path = `/specialists/${specialist.slug}`;
  const personId = `${CLINIC_SITE_URL}${path}#person`;
  const isPhysician = /врач|дерматолог|венеролог/i.test(`${specialist.position} ${specialist.specialization}`);
  const structuredData = jsonLdGraph([
    clinicNode(schemaContacts),
    websiteNode(),
    webPageNode({ path, name: fullName, description: specialist.description, type: "ProfilePage", about: personId }),
    {
      "@type": isPhysician ? ["Person", "Physician"] : "Person",
      "@id": personId,
      name: fullName,
      jobTitle: specialist.position,
      description: specialist.description,
      url: `${CLINIC_SITE_URL}${path}`,
      ...(specialist.photo?.publicUrl
        ? { image: new URL(specialist.photo.publicUrl, CLINIC_SITE_URL).toString() }
        : {}),
      worksFor: { "@id": CLINIC_ID },
      ...(isPhysician ? { medicalSpecialty: "Dermatology" } : {}),
      ...(specialist.education
        ? {
            alumniOf: specialist.education
              .split(/;\s*/)
              .map((part) => part.split(",")[0].trim())
              .filter(Boolean)
              .map((name) => ({ "@type": "EducationalOrganization", name }))
          }
        : {})
    },
    breadcrumbNode(path, [{ name: fullName, path }])
  ]);
  const publicServices = specialist.services.filter(
    (item) => !PUBLIC_HIDDEN_SERVICE_SLUGS.has(item.service.slug)
  );

  const name = `${specialist.firstName} ${specialist.lastName}`.trim();

  return (
    <>
      <JsonLd data={structuredData} />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-md border bg-muted">
            {specialist.photo?.publicUrl && (
              <Image
                src={specialist.photo.publicUrl}
                alt={specialist.photo.alt ?? name}
                fill
                sizes="320px"
                className="object-cover"
              />
            )}
          </div>
          <div>
            <Badge>{specialist.position}</Badge>
            <h1 className="mt-4 text-4xl font-semibold">
              {name}
            </h1>
            <p className="mt-3 text-primary">{specialist.specialization}</p>
            <p className="mt-5 text-muted-foreground">{specialist.description}</p>
            <p className="mt-5 text-sm text-muted-foreground">
              Опыт: {specialist.experienceYears} лет{specialist.slug === "nina-andreevna" && " в эстетических процедурах"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Образование: {specialist.education}</p>
            {publicServices.length > 0 && (
              <Link
                href="/booking"
                className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Записаться
              </Link>
            )}
          </div>
        </div>
        {publicServices.length > 0 && (
          <Card className="mt-10 p-6">
            <h2 className="text-2xl font-semibold">Услуги специалиста</h2>
            <div className="mt-4 grid gap-3">
              {publicServices.map((item) => (
                <Link key={item.serviceId} href={`/services/${item.service.slug}`} className="rounded-md border p-4">
                  {item.service.name}
                </Link>
              ))}
            </div>
          </Card>
        )}
        <Card className="mt-10 p-6" aria-labelledby="specialist-reviews">
          <h2 id="specialist-reviews" className="text-2xl font-semibold">Отзывы</h2>
          {reviews.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-md border p-4">
                  <p className="text-sm text-amber-700" aria-label={`Оценка ${review.rating} из 5`}>
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="mt-2 whitespace-pre-line">{review.text}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {review.name} · {reviewDateFormat.format(review.date)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">Отзывов на сайте пока нет — будьте первым.</p>
          )}
          <Link
            href={`/otzyvy?o=${specialist.slug === "nina-andreevna" ? "laser" : "cosmetology"}#form`}
            className="mt-4 inline-flex text-primary"
          >
            Оставить отзыв
          </Link>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
