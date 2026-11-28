import { BadgeCheck, CalendarCheck, ShieldCheck, Stethoscope, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { CLINIC_LEGAL } from "@/config/clinic";
import styles from "./trust-strip.module.css";

type Fact = { icon: ReactNode; title: string; text: string };

const doctor: Fact = {
  icon: <Stethoscope size={18} aria-hidden="true" />,
  title: "Врач-дерматовенеролог",
  text: "Светлана Арутюновна Нерсисян, 29 лет врачебной практики"
};
const laserSpecialist: Fact = {
  icon: <BadgeCheck size={18} aria-hidden="true" />,
  title: "Специалист с медобразованием",
  text: "Лазерную эпиляцию проводит Нина Андреевна, 10 лет в эстетических процедурах"
};
const freeCheck: Fact = {
  icon: <CalendarCheck size={18} aria-hidden="true" />,
  title: "Бесплатный контрольный приём",
  text: "Через 2 недели после ботулинотерапии и контурной пластики"
};
const skinCheck: Fact = {
  icon: <CalendarCheck size={18} aria-hidden="true" />,
  title: "Осмотр кожи бесплатно",
  text: "Перед первым сеансом специалист проверит противопоказания и подберёт параметры"
};
const prices: Fact = {
  icon: <Wallet size={18} aria-hidden="true" />,
  title: "Цены без звёздочек",
  text: "Полный прайс на сайте, курсы выгоднее разовых сеансов до 16%"
};

function licenseFact(): Fact | null {
  if (!CLINIC_LEGAL.license) return null;
  return {
    icon: <ShieldCheck size={18} aria-hidden="true" />,
    title: "Медицинская лицензия",
    text: `№ ${CLINIC_LEGAL.license}`
  };
}

const VARIANTS: Record<"clinic" | "laser" | "cosmetology", Fact[]> = {
  clinic: [doctor, laserSpecialist, freeCheck, prices],
  laser: [laserSpecialist, skinCheck, doctor, prices],
  cosmetology: [doctor, freeCheck, prices]
};

/** Короткие факты о клинике рядом с ценами и кнопкой записи. Только проверенные данные. */
export function TrustStrip({ variant = "clinic" }: { variant?: "clinic" | "laser" | "cosmetology" }) {
  const license = licenseFact();
  const facts = [...(license ? [license] : []), ...VARIANTS[variant]].slice(0, 4);
  return (
    <ul className={styles.strip} aria-label="Почему «Сияние»">
      {facts.map((fact) => (
        <li key={fact.title} className={styles.item}>
          <span className={styles.icon}>{fact.icon}</span>
          <span>
            <span className={styles.title}>{fact.title}</span>
            <span className={styles.text}>{fact.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
