import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Prata } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { BrandMark } from "@/components/ui/brand-mark";
import { CLINIC_LEGAL } from "@/config/clinic";
import { buildDirectionsUrl } from "@/lib/map";
import styles from "./home.module.css";

const wordmark = Prata({
  subsets: ["cyrillic"],
  weight: "400",
  display: "swap",
  variable: "--font-wordmark"
});

export function ClinicPage({
  phone,
  address,
  email,
  bookingHref = "/booking",
  children
}: {
  phone: string;
  address: string;
  email?: string;
  bookingHref?: string;
  children: ReactNode;
}) {
  const legalLine = [
    CLINIC_LEGAL.legalName,
    CLINIC_LEGAL.inn && `ИНН ${CLINIC_LEGAL.inn}`,
    CLINIC_LEGAL.ogrn && `ОГРН ${CLINIC_LEGAL.ogrn}`,
    CLINIC_LEGAL.license && `Лицензия на медицинскую деятельность № ${CLINIC_LEGAL.license}`
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div data-clinic-page className={`${styles.home} ${wordmark.variable}`}>
      <a className="site-skip-link" href="#clinic-main">К основному содержанию</a>
      <SiteHeader phone={phone} address={address} appearance="cinematic" bookingHref={bookingHref} />
      {children}
      <footer className={styles.footer}>
        <div className={styles.shell}>
          <div className={styles.footerColumns}>
            <div className={styles.footerAbout}>
              <Link href="/" className={styles.footerBrand}>
                <BrandMark />
                <span>
                  <strong>Сияние</strong>
                  <span>Клиника эстетической медицины</span>
                </span>
              </Link>
              <address className={styles.footerContacts}>
                <a href={buildDirectionsUrl(address)}>{address}</a>
                <a href={`tel:${phone}`}>{phone}</a>
                {email && <a href={`mailto:${email}`}>{email}</a>}
              </address>
              <Link href={bookingHref} className={styles.footerBooking}>
                Записаться онлайн <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <nav aria-labelledby="footer-services" className={styles.footerColumn}>
              <p id="footer-services" className={styles.footerHeading}>Услуги</p>
              <ul>
                <li><Link href="/lazernaya-epilyatsiya">Лазерная эпиляция</Link></li>
                <li><Link href="/botulinoterapiya">Ботулинотерапия</Link></li>
                <li><Link href="/lechenie-gipergidroza">Лечение гипергидроза</Link></li>
                <li><Link href="/konturnaya-plastika">Контурная пластика</Link></li>
                <li><Link href="/konturnaya-plastika/guby">Увеличение губ</Link></li>
                <li><Link href="/dermatolog-kosmetolog">Дерматолог-косметолог</Link></li>
              </ul>
            </nav>
            <nav aria-labelledby="footer-clients" className={styles.footerColumn}>
              <p id="footer-clients" className={styles.footerHeading}>Клиентам</p>
              <ul>
                <li><Link href="/prices">Цены</Link></li>
                <li><Link href="/akcii">Акции</Link></li>
                <li><Link href="/otzyvy">Отзывы</Link></li>
                <li><Link href="/#specialists">Специалисты</Link></li>
                <li><Link href="/booking">Онлайн-запись</Link></li>
                <li><Link href="/#contacts">Как нас найти</Link></li>
              </ul>
            </nav>
          </div>
          <div className={styles.footerBottom}>
            <p>© {new Date().getFullYear()} «Сияние», Чита{legalLine ? ` · ${legalLine}` : ""}</p>
            <nav aria-label="Документы">
              <Link href="/legal/privacy-policy">Политика конфиденциальности</Link>
              <Link href="/legal/personal-data-consent">Согласие на обработку данных</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
