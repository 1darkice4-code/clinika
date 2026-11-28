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

/**
 * Профили клиники на других площадках — попадут в микроразметку (sameAs).
 * Добавьте сюда ссылки на карточки 2ГИС, Яндекс Карт, ПроДокторов, группу ВКонтакте,
 * как только они появятся. Ссылки из настроек CRM (соцсети) добавляются автоматически.
 */
export const CLINIC_PROFILES: string[] = [];
