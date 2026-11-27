import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const specialist = await prisma.specialist.findUnique({
    where: { slug },
    include: { seoMetadata: true }
  });
  if (!specialist) return {};
  return {
    title: specialist.seoMetadata?.title ?? `${specialist.firstName} ${specialist.lastName}`.trim(),
    description: specialist.seoMetadata?.description ?? specialist.description,
    alternates: { canonical: `/specialists/${specialist.slug}` }
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

  const name = `${specialist.firstName} ${specialist.lastName}`.trim();

  return (
    <>
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
            {specialist.services.length > 0 && (
              <Link
                href="/booking"
                className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Записаться
              </Link>
            )}
          </div>
        </div>
        {specialist.services.length > 0 && (
          <Card className="mt-10 p-6">
            <h2 className="text-2xl font-semibold">Услуги специалиста</h2>
            <div className="mt-4 grid gap-3">
              {specialist.services.map((item) => (
                <Link key={item.serviceId} href={`/services/${item.service.slug}`} className="rounded-md border p-4">
                  {item.service.name}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
