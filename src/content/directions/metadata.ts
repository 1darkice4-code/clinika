import type { Metadata } from "next";
import type { DirectionContent } from "./types";

export function directionMetadata(content: DirectionContent): Metadata {
  return {
    title: content.title,
    description: content.metaDescription,
    alternates: { canonical: content.path },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: "Сияние",
      url: content.path,
      title: content.title,
      description: content.metaDescription,
      images: [content.image.src]
    }
  };
}
