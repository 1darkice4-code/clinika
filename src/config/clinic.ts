export const CLINIC_SITE_URL = "https://siyanieclinic.ru";

export const CLINIC_CONTACTS = {
  phone: "+7 (914) 480 1035",
  email: "siyanie-clinic75@yandex.ru",
  address: "Чита, ул. Суглинная, 2Б"
} as const;

/**
 * Юридические данные для подвала сайта. Заполните реальными значениями —
 * пустые поля на сайте не выводятся.
 */
export const CLINIC_LEGAL: {
  legalName: string | null;
  inn: string | null;
  ogrn: string | null;
  license: string | null;
} = {
  legalName: null, // например: "ООО «Сияние»"
  inn: null,
  ogrn: null,
  license: null // например: "Л041-01234-75/00123456 от 01.02.2024"
};
