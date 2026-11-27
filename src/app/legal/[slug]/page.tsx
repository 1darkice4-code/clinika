import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CLINIC_CONTACTS } from "@/config/clinic";
import { resolveLegalContent, type LegalOperator } from "@/domain/legal/legal-documents";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await prisma.legalDocument.findUnique({ where: { slug } });
  return document ? { title: document.title, robots: { index: false } } : {};
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;
  const [document, settings] = await Promise.all([
    prisma.legalDocument.findFirst({ where: { slug, status: "PUBLISHED" } }),
    prisma.clinicSettings.findFirst()
  ]);

  if (!document) notFound();

  const operator: LegalOperator = {
    clinicName: settings?.clinicName ?? "Сияние",
    legalName:
      settings?.legalName ?? settings?.clinicName ?? "Клиника эстетической медицины «Сияние»",
    taxId: settings?.taxId ?? "не указан",
    address: settings?.address ?? "Чита, ул. Суглинная, 2Б",
    phone: settings?.phone ?? "+7 (999) 000-00-00",
    email: settings?.email ?? CLINIC_CONTACTS.email
  };
  const content = resolveLegalContent(document.content, operator);
  const publishedDate = (document.publishedAt ?? document.updatedAt).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Chita"
  });

  return (
    <>
      <SiteHeader phone={operator.phone} />
      <main>
        <header className="border-b border-border surface-soft">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-metal-strong">
              Правовая информация
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              {document.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>Версия: {document.version}</span>
              <span>Опубликовано: {publishedDate}</span>
            </div>
          </div>
        </header>

        <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {content ? (
            <>
              <p className="max-w-3xl text-lg leading-8 text-foreground">{content.lead}</p>
              <div className="mt-12 space-y-12">
                {content.sections.map((section) => (
                  <section key={section.title} className="border-t border-border pt-7">
                    <h2 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
                      {section.title}
                    </h2>
                    {section.paragraphs && (
                      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                        {section.paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                    {section.items && (
                      <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-muted-foreground marker:text-metal-strong sm:text-base sm:leading-8">
                        {section.items.map((item) => (
                          <li key={item} className="list-disc pl-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div className="whitespace-pre-line leading-8 text-muted-foreground">
              {document.content}
            </div>
          )}
        </article>
      </main>
      <SiteFooter phone={operator.phone} email={operator.email} address={operator.address} />
    </>
  );
}
