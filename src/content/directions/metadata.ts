import type { Metadata } from "next";
import type { DirectionContent } from "./types";

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
      images: [{ url: content.image.src, alt: content.image.alt }]
    },
    twitter: { card: "summary_large_image", title: content.seoTitle ?? content.title, description: content.metaDescription }
  };
}
