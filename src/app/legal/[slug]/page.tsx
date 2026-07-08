import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
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
  const document = await prisma.legalDocument.findFirst({
    where: { slug, status: "PUBLISHED" }
  });

  if (!document) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">{document.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Версия: {document.version}</p>
        <article className="mt-8 whitespace-pre-line leading-8 text-muted-foreground">{document.content}</article>
      </main>
      <SiteFooter />
    </>
  );
}
