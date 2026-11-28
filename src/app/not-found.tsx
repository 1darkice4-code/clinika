import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ClinicPage } from "@/app/clinic-page";
import styles from "@/app/clinic-pages.module.css";
import direction from "@/app/direction.module.css";
import home from "@/app/home.module.css";
import { RelatedDirections } from "@/components/direction/direction-landing";
import { CLINIC_CONTACTS } from "@/config/clinic";

const POPULAR = [
  { path: "/lazernaya-epilyatsiya", name: "Лазерная эпиляция" },
  { path: "/prices", name: "Цены" },
  { path: "/akcii", name: "Акции" },
  { path: "/otzyvy", name: "Отзывы" },
  { path: "/booking", name: "Онлайн-запись" }
];

export default function NotFound() {
  return (
    <ClinicPage phone={CLINIC_CONTACTS.phone} address={CLINIC_CONTACTS.address} email={CLINIC_CONTACTS.email}>
      <main id="clinic-main" tabIndex={-1}>
        <section className={direction.masthead} aria-labelledby="not-found-title">
          <div className={`${home.shell} ${direction.mastheadInner}`}>
            <div className={direction.mastheadCopy}>
              <p className={direction.specialistRole}>Ошибка 404</p>
              <h1 id="not-found-title" className={`${home.title} ${direction.mastheadTitle}`}>Страница не найдена</h1>
              <p>Возможно, адрес изменился или страница больше не публикуется. Начните с главной или выберите раздел ниже.</p>
              <div className={styles.introActions}>
                <Link href="/" className={home.buttonBrass}>
                  На главную <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <Link href="/booking" className={home.heroLink}>
                  Записаться онлайн <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <div className={`${home.shell} ${styles.priceContent}`}>
          <RelatedDirections currentPath="/404" title="Популярные разделы" links={POPULAR} />
        </div>
      </main>
    </ClinicPage>
  );
}
