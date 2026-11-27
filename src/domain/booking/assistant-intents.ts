export const bookingTopics = [
  "callback",
  "contacts",
  "prices",
  "appointment",
  "laser",
  "doctor"
] as const;

export type BookingTopic = (typeof bookingTopics)[number];

const intentPatterns: Record<BookingTopic, RegExp> = {
  callback: /перезвон|позвоните|обратн\S*\s+звон|заявк|связаться со мной/,
  contacts: /адрес|телефон|где (?:вы|клиник|наход)|добраться|как найти|контакт/,
  prices: /сколько|почем|стоимост|цен[ауые]|прайс|курс|пакет/,
  appointment: /запи(?:сь|са|ши)|заброни|свободн|окошк|время|завтра|послезавтра|слот|ближайш/,
  laser: /лазер|эпиляц|бикини|подмыш|голен|усики|верхн\S*\s+губ/,
  doctor: /косметолог|консультац|дерматолог|нерсисян|светлан|(?:^|\s)врач/
};

export function getBookingTopics(message: string) {
  const normalized = message.toLowerCase().replaceAll("ё", "е");
  return bookingTopics.filter((topic) => intentPatterns[topic].test(normalized));
}
