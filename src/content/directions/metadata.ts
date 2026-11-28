import type { Metadata } from "next";
import type { DirectionContent } from "./types";

const DEFAULT_SHARE_IMAGE = { src: "/clinic/treatment-room.webp", alt: "Процедурный кабинет клиники «Сияние»" };

/** Картинка для превью ссылок и schema.org: модель без фона туда не подходит. */
export function shareImageOf(content: DirectionContent) {
  if (!content.image.cutout) return { src: content.image.src, alt: content.image.alt };
  return content.shareImage ?? DEFAULT_SHARE_IMAGE;
}

export function directionMetadata(content: DirectionContent): Metadata {
  return {
    title: content.seoTitle ?? content.title,
    description: content.metaDescription,
    alternates: { canonical: content.path },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: "Сияние",
      url: content.path,
      title: content.seoTitle ?? content.title,
      description: content.metaDescription,
      images: [{ url: shareImageOf(content).src, alt: shareImageOf(content).alt }]
    },
    twitter: { card: "summary_large_image", title: content.seoTitle ?? content.title, description: content.metaDescription }
  };
}
