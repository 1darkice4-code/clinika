export type DirectionTextSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  note?: string;
};

export type DirectionPriceRow = { name: string; price: string };

export type DirectionContent = {
  /** Путь страницы, например "/botulinoterapiya". */
  path: string;
  /** H1 и основа <title>. */
  title: string;
  metaDescription: string;
  /** Короткое название для хлебных крошек и перекрёстных ссылок. */
  shortName: string;
  serviceType: string;
  lead: string;
  /** Плашка в шапке, например «от 150 ₽ за 1 ед.». */
  priceBadge: string;
  image: { src: string; alt: string };
  bookingHref: string;
  bookingLabel: string;
  prices: {
    title: string;
    rows: readonly DirectionPriceRow[];
    note: string;
  };
  doctorNote: string;
  /** Разделы; соседние элементы массива-пары выводятся в две колонки. */
  sections: readonly (DirectionTextSection | readonly [DirectionTextSection, DirectionTextSection])[];
  contraindications: { intro: string; items: readonly string[]; note: string };
  questions: readonly { question: string; answer: string }[];
};
