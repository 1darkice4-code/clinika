import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react";
import Image from "next/image";
import { BookingForm } from "@/components/booking/booking-form";
import { FadeIn } from "@/components/ui/fade-in";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { prisma } from "@/lib/prisma";
import { buildDirectionsUrl, buildMapEmbedUrl } from "@/lib/map";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const [categories, specialists, reviews, settings] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" }
        }
      }
    }),
    prisma.specialist.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        photo: true,
        services: { where: { isActive: true }, include: { service: true } }
      }
    }),
    prisma.review.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { reviewDate: "desc" },
      take: 6
    }),
    prisma.clinicSettings.findFirst()
  ]);

  return { categories, specialists, reviews, settings };
}

const trustItems = [
  {
    icon: ShieldCheck,
    label: "Экспертный подход",
    description: "Каждый протокол выстроен на диагностике и опыте врачей клиники."
  },
  {
    icon: Sparkles,
    label: "Индивидуальные протоколы",
    description: "Программа ухода создаётся под вашу кожу, задачи и ритм жизни."
  },
  {
    icon: CalendarDays,
    label: "Приём по записи",
    description: "Комфортное время без спешки и очередей — только вы и ваш специалист."
  }
];

const heroFacts: [string, string][] = [
  ["Персонально", "протокол под вашу кожу"],
  ["Чита", "ул. Суглинная, 2Б"],
  ["По записи", "приём в комфортном ритме"]
];

const approachItems: [string, string][] = [
  ["Диагностика", "Детально изучаем состояние кожи, учитываем противопоказания и ваши пожелания."],
  ["Персональный протокол", "Формируем выверенную программу — только процедуры, которые действительно работают."],
  ["Сопровождение", "Подбираем домашний уход и ведём вас до результата, к которому вы стремитесь."]
];

const visitSteps: [string, string, string][] = [
  ["01", "Заявка", "Выберите услугу на сайте или оставьте заявку — мы подберём формат приёма под вашу задачу."],
  ["02", "Консьерж-сервис", "Администратор согласует удобное время, специалиста и расскажет о подготовке к процедуре."],
  ["03", "Консультация", "Врач проводит диагностику кожи, изучает запрос и формирует индивидуальный протокол."],
  ["04", "Процедура и уход", "Проводим процедуру по премиальным протоколам и сопровождаем вас после визита."]
];

const contactNotes = [
  "Начните с консультации — основы безупречного результата",
  "Персональный администратор подтвердит удобное для вас время",
  "Финальная стоимость определяется индивидуально после диагностики"
];

function initials(firstName: string, lastName: string) {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`;
}

function SectionLabel({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {index && <span className="text-metal-strong">{index}</span>}
      <span className="h-px w-8 bg-border" />
      {children}
    </p>
  );
}

const ctaPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_16px_40px_hsl(var(--metal-glow))] transition hover:brightness-105";
const ctaGhost =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/60 px-6 text-sm font-medium text-foreground backdrop-blur transition hover:border-metal";

export default async function HomePage() {
  const { categories, specialists, reviews, settings } = await getHomeData();
  const services = categories.flatMap((category) => category.services);
  const phone = settings?.phone ?? "+7 (999) 000-00-00";
  const email = settings?.email ?? "hello@siyanie.test";
  const address = settings?.address ?? "Чита, ул. Суглинная, 2Б";
  const mapEmbedUrl = buildMapEmbedUrl(address, settings?.mapEmbedUrl);
  const directionsUrl = buildDirectionsUrl(address);

  return (
    <>
      <SiteHeader phone={phone} />
      <main className="landing-page overflow-hidden">
        {/* Hero */}
        <section className="relative isolate border-b border-border">
          <div className="landing-hero-bg absolute inset-0" />
          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
            <FadeIn className="max-w-2xl">
              <SectionLabel>Эстетическая медицина · Чита</SectionLabel>
              <h1 className="mt-7 text-5xl leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
                <span className="italic text-metal-strong">Сияние</span>
                <span className="mt-2 block font-normal">
                  искусство ухода за кожей
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                Клиника эстетической медицины в Чите. Индивидуальные протоколы, безупречная эстетика
                и внимание к каждой детали — от первой консультации до совершенного результата.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#booking" className={ctaPrimary}>
                  Записаться на приём
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href={`tel:${phone}`} className={ctaGhost}>
                  <Phone className="h-4 w-4 text-metal" />
                  Позвонить
                </a>
              </div>

              <div className="mt-12 grid max-w-lg grid-cols-3 gap-6">
                {heroFacts.map(([value, label]) => (
                  <div key={value} className="border-l border-metal pl-4">
                    <p className="text-xl font-medium text-foreground">{value}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={140} className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/5 blur-3xl" />
              <div className="hero-editorial-frame soft-shadow relative overflow-hidden rounded-2xl border border-border p-3">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/70">
                  <Image
                    src="/brand/hero-portrait.jpg"
                    alt="Спокойный портрет для эстетической клиники"
                    fill
                    priority
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="hero-editorial-image object-cover"
                  />
                  <div className="hero-editorial-vignette absolute inset-0" />
                  <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.2em] text-white/80">
                    <span>skin studio</span>
                    <span>since 2026</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="editorial-rule mb-5 h-px" />
                    <p className="display-serif max-w-sm text-3xl leading-tight text-white sm:text-4xl">
                      красота начинается с точной диагностики
                    </p>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-white/90 drop-shadow-sm">
                      Мы предлагаем только то, что раскрывает вашу естественную красоту.
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Trust band */}
        <section className="border-b border-border surface-soft">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-3 lg:px-8">
            {trustItems.map((item, index) => (
              <FadeIn key={item.label} delay={index * 80} className="flex items-start gap-4">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-metal text-metal">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Booking */}
        <section id="booking" className="border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
            <FadeIn className="max-w-xl lg:sticky lg:top-24 lg:self-start">
              <SectionLabel index="01">Онлайн-запись</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight text-foreground sm:text-5xl">
                Запишитесь на консультацию или процедуру
              </h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                Выберите услугу, специалиста и удобное время. Если хотите довериться экспертам,
                оставьте заявку — персональный администратор подберёт оптимальный формат приёма.
              </p>
              <div className="mt-8 grid gap-3 text-sm">
                {contactNotes.map((note) => (
                  <p key={note} className="flex items-start gap-2.5 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-metal" />
                    {note}
                  </p>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <div className="soft-shadow rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="text-2xl text-foreground">
                    Запись в <span className="italic text-metal-strong">Сияние</span>
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    После отправки заявки администратор согласует детали и подтвердит запись.
                  </p>
                </div>
                <BookingForm
                  services={services.map((service) => ({ id: service.id, name: service.name }))}
                  specialists={specialists.map((specialist) => ({
                    id: specialist.id,
                    firstName: specialist.firstName,
                    lastName: specialist.lastName,
                    services: specialist.services.map((item) => ({ service: { id: item.service.id } }))
                  }))}
                />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* About */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <FadeIn>
                <SectionLabel index="02">О клинике</SectionLabel>
                <h2 className="mt-6 text-4xl leading-tight text-foreground sm:text-5xl">
                  Клиника, где красота — это внимание к деталям
                </h2>
                <p className="mt-6 leading-8 text-muted-foreground">
                  <span className="italic text-metal-strong">Сияние</span> — клиника эстетической
                  медицины в Чите для тех, кто ценит безупречный результат. Мы уделяем время каждому
                  гостю, выстраиваем индивидуальные протоколы и сопровождаем вас на каждом этапе.
                </p>
              </FadeIn>
              <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                {approachItems.map(([title, description], index) => (
                  <FadeIn key={title} delay={index * 90} className="bg-card p-6">
                    <span className="text-sm text-metal-strong">0{index + 1}</span>
                    <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="border-b border-border surface-soft">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <FadeIn className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <SectionLabel index="03">Услуги</SectionLabel>
                <h2 className="mt-6 max-w-xl text-4xl leading-tight text-foreground sm:text-5xl">
                  Процедуры премиального уровня
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Цены на сайте указаны для ориентира. Финальная стоимость формируется индивидуально —
                после диагностики и с учётом препаратов и объёма работы.
              </p>
            </FadeIn>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {services.map((service, index) => (
                <FadeIn key={service.id} delay={index * 45}>
                  <a
                    href="#booking"
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card p-7 transition hover:border-metal hover:shadow-[0_20px_60px_hsl(var(--soft-shadow))]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-2xl leading-snug text-foreground">{service.name}</h3>
                      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-metal opacity-70" />
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
                      {service.shortDescription}
                    </p>
                    <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                      <span className="text-lg text-metal-strong">
                        {formatPrice(service.priceFrom, service.priceExact)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {service.durationMinutes} мин
                      </span>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-metal-strong transition group-hover:gap-2.5">
                      Записаться
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </a>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Visit steps */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <FadeIn className="max-w-2xl">
              <SectionLabel index="04">Визит</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight text-foreground sm:text-5xl">Ваш путь к результату</h2>
            </FadeIn>
            <div className="mt-12 grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
              {visitSteps.map(([number, title, description], index) => (
                <FadeIn key={number} delay={index * 80}>
                  <div className="border-t border-metal pt-6">
                    <p className="text-3xl font-light text-metal-strong">{number}</p>
                    <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Specialists */}
        <section id="specialists" className="border-b border-border surface-soft">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <FadeIn className="max-w-2xl">
              <SectionLabel index="05">Специалисты</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight text-foreground sm:text-5xl">
                Врачи, которым доверяют вашу красоту
              </h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                Команда опытных специалистов с профильным образованием и вниманием к каждому гостю.
                Ваш врач знает вашу историю и ведёт вас к результату на протяжении всего пути.
              </p>
            </FadeIn>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {specialists.map((specialist, index) => (
                <FadeIn key={specialist.id} delay={index * 90}>
                  <div className="group h-full overflow-hidden rounded-2xl border border-border bg-card transition hover:border-metal">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      {specialist.photo?.publicUrl ? (
                        <Image
                          src={specialist.photo.publicUrl}
                          alt={specialist.photo.alt ?? `${specialist.firstName} ${specialist.lastName}`}
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="hero-editorial-image object-cover transition duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="panel-gradient flex h-full items-center justify-center">
                          <div className="panel-glow absolute inset-0" />
                          <p className="relative text-6xl text-metal-strong">
                            {initials(specialist.firstName, specialist.lastName)}
                          </p>
                        </div>
                      )}
                      <div className="hero-editorial-vignette absolute inset-0" />
                      <div className="absolute inset-x-0 bottom-0 p-6">
                        <h3 className="text-2xl text-white drop-shadow-sm">
                          {specialist.firstName} {specialist.lastName}
                        </h3>
                        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-white/85 drop-shadow-sm">
                          {specialist.position}
                        </p>
                      </div>
                    </div>
                    <p className="p-6 text-sm leading-6 text-muted-foreground">{specialist.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section id="reviews" className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <FadeIn className="max-w-2xl">
              <SectionLabel index="06">Отзывы</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight text-foreground sm:text-5xl">Истории наших гостей</h2>
            </FadeIn>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {reviews.map((review, index) => (
                <FadeIn key={review.id} delay={index * 60}>
                  <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-8">
                    <Quote className="h-7 w-7 text-metal opacity-60" />
                    <blockquote className="mt-5 flex-1 text-lg leading-8 text-foreground">
                      {review.text}
                    </blockquote>
                    <figcaption className="mt-6 flex items-center justify-between border-t border-border pt-5">
                      <span className="font-medium text-foreground">{review.clientDisplayName}</span>
                      <span className="inline-flex items-center gap-1 text-sm text-metal-strong">
                        <Star className="h-4 w-4 fill-current" />
                        {review.rating}/5
                      </span>
                    </figcaption>
                  </figure>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section id="contacts" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
            <FadeIn>
              <SectionLabel>Контакты</SectionLabel>
              <h2 className="mt-6 text-4xl leading-tight text-foreground sm:text-5xl">Мы в Чите</h2>
              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                Рекомендуем записаться заранее — так мы подберём удобное время и подготовим всё
                необходимое к вашему визиту.
              </p>
              <div className="mt-8 grid gap-4 text-sm">
                <p className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-metal" />
                  {address}
                </p>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-3 text-foreground transition hover:text-metal-strong"
                >
                  <Phone className="h-4 w-4 text-metal" />
                  {phone}
                </a>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-3 text-foreground transition hover:text-metal-strong"
                >
                  <MessageCircle className="h-4 w-4 text-metal" />
                  {email}
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <div className="soft-shadow overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[16/11] w-full bg-muted">
                  <iframe
                    title="Карта проезда к клинике Сияние"
                    src={mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 h-full w-full"
                    style={{ border: 0 }}
                  />
                </div>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-6 py-5 text-sm font-medium transition hover:bg-muted"
                >
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-metal" />
                    {address}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-metal-strong">
                    Построить маршрут
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </a>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>
      <SiteFooter phone={phone} email={email} address={address} />
    </>
  );
}
