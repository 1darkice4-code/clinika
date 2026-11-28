import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Prata } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { BrandMark } from "@/components/ui/brand-mark";
import { CLINIC_LEGAL } from "@/config/clinic";
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
          <div className={styles.footerGrid}>
            <Link href="/" aria-label="Сияние — главная" className={styles.footerBrand}>
              <BrandMark />
              <span>
                <strong>Сияние</strong>
                <span>Клиника красоты и здоровья</span>
              </span>
            </Link>
            <nav aria-label="Разделы сайта" className={styles.footerNav}>
              <Link href="/#services">Услуги</Link>
              <Link href="/prices">Прайс</Link>
              <Link href="/#specialists">Специалисты</Link>
              <Link href="/#contacts">Контакты</Link>
            </nav>
            <Link href={bookingHref} className={styles.footerBooking}>
              Записаться <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
          <nav aria-label="Направления" className={styles.footerLegal}>
            <Link href="/lazernaya-epilyatsiya">Лазерная эпиляция</Link>
            <Link href="/botulinoterapiya">Ботулинотерапия</Link>
            <Link href="/lechenie-gipergidroza">Лечение гипергидроза</Link>
            <Link href="/konturnaya-plastika">Контурная пластика</Link>
            <Link href="/akcii">Акции</Link>
          </nav>
          <div className={styles.footerLegal}>
            <Link href="/legal/privacy-policy">Политика конфиденциальности</Link>
            <Link href="/legal/personal-data-consent">Согласие на обработку данных</Link>
            {email && <a href={`mailto:${email}`}>{email}</a>}
          </div>
          {legalLine && <p className={styles.footerLegal}>{legalLine}</p>}
        </div>
      </footer>
    </div>
  );
}
