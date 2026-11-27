import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LASER_SERVICES } from "@/domain/service/current-price-list";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

// Страницы отдельных услуг — это одна строка прайса (цена и длительность) и почти
// дублируют друг друга. Закрываем их от индексации (noindex, follow), чтобы поисковики
// продвигали /lazernaya-epilyatsiya и /prices, а не десятки «малоценных» страниц.
// Комплекс laser-bikini-underarms имеет собственную страницу и индексируется.
const laserZoneSlugs = new Set<string>(LASER_SERVICES.map((service) => service.slug));

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await prisma.service.findUnique({ where: { slug }, include: { seoMetadata: true } });
  if (!service) return {};

  return {
    title: service.seoMetadata?.title ?? service.name,
    description: service.seoMetadata?.description ?? service.shortDescription,
    alternates: { canonical: `/services/${service.slug}` },
    robots: { index: false, follow: true }
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = await prisma.service.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      specialistServices: {
        where: { isActive: true },
        include: { specialist: true }
      }
    }
  });

  if (!service) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        {laserZoneSlugs.has(service.slug) ? (
          <Link href="/lazernaya-epilyatsiya" className="text-sm text-primary">
            ← Лазерная эпиляция: все зоны и цены
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/prices" className="text-sm text-primary">
              ← Все услуги и цены
            </Link>
            <Badge>{service.category.name}</Badge>
          </div>
        )}
        <h1 className="mt-4 text-4xl font-semibold">{service.name}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{service.shortDescription}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Стоимость</p>
            <p className="mt-2 text-xl font-semibold">{formatPrice(service.priceFrom, service.priceExact)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Длительность</p>
            <p className="mt-2 text-xl font-semibold">{service.durationMinutes} мин</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Запись</p>
            <Link href="/booking" className="mt-2 inline-flex text-primary">
              Выбрать время
            </Link>
          </Card>
        </div>
        <section className="mt-10 rounded-md border bg-card p-6">
          <h2 className="text-2xl font-semibold">Описание</h2>
          <p className="mt-4 whitespace-pre-line text-muted-foreground">{service.fullDescription}</p>
          {service.contraindications && (
            <p className="mt-6 rounded-md border border-destructive/30 p-4 text-sm text-muted-foreground">
              {service.contraindications}
            </p>
          )}
          {service.disclaimer && <p className="mt-4 text-sm text-muted-foreground">{service.disclaimer}</p>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
