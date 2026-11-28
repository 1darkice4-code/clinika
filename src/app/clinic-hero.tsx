"use client";

import { ArrowUpRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./home.module.css";

const rooms = [
  {
    src: "/clinic/treatment-room.webp",
    alt: "Лазерный кабинет с белым креслом и аппаратом"
  },
  {
    src: "/clinic/consultation-room.webp",
    alt: "Процедурный кабинет с белым креслом"
  },
  { src: "/clinic/massage-room.webp", alt: "Кабинет массажа со столом и креслом" }
];

const brand = "Сияние";
const slideDuration = 6_000;

export type HeroPromo = { label: string; href: string };

export function ClinicHero({
  address,
  promo,
  laserBookingHref = "/booking?booking=laser"
}: {
  address: string;
  /** Строка действующей акции; без неё блок не выводится. */
  promo?: HeroPromo | null;
  laserBookingHref?: string;
}) {
  const hero = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setMotionAllowed(!motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => motion.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    const element = hero.current;
    if (!element) return;

    let inView = !("IntersectionObserver" in window);
    const syncVisibility = () => setVisible(inView && document.visibilityState === "visible");
    const observer = inView
      ? undefined
      : new IntersectionObserver(
          ([entry]) => {
            inView = entry.intersectionRatio >= 0.25;
            syncVisibility();
          },
          { threshold: 0.25 }
        );
    observer?.observe(element);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!motionAllowed || !visible) return;
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % rooms.length),
      slideDuration
    );
    return () => window.clearTimeout(timer);
  }, [active, motionAllowed, visible]);

  return (
    <section ref={hero} className={styles.hero} aria-labelledby="home-title">
      <div id="clinic-rooms" className={styles.heroMedia}>
        {rooms.map((room, index) => (
          <div
            key={room.src}
            className={styles.heroFrame}
            data-active={index === active}
            aria-hidden={index !== active}
          >
            <Image
              src={room.src}
              alt={room.alt}
              fill
              sizes="(max-width: 619px) max(100vw, 134svh), 100vw"
              preload={index === 0}
              className={styles.heroPhoto}
            />
          </div>
        ))}
      </div>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroLight} aria-hidden="true" />
      <div className={styles.heroContent}>
        <div className={styles.heroCopy}>
          <h1 id="home-title" className={styles.heroHeading} aria-label={`Клиника эстетической медицины «${brand}»`}>
            <span className={styles.eyebrow}>
              <span className={styles.brandSpark} aria-hidden="true" /> Клиника эстетической медицины
            </span>{" "}
            <span className={styles.heroTitle}>
              <span className={styles.heroWord} aria-hidden="true">
                {Array.from(brand, (letter, index) => (
                  <span key={index}>{letter}</span>
                ))}
              </span>
            </span>
          </h1>
          <p className={styles.heroDescription}>
            Лазерная эпиляция, ботулинотерапия и контурная пластика в Чите. Приём врача-дерматолога.
          </p>
          {promo && (
            <Link href={promo.href} className={styles.heroPromo}>
              <span className={styles.heroPromoDot} aria-hidden="true" />
              {promo.label}
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          )}
          <div className={styles.heroActions}>
            <Link id="booking" href={laserBookingHref} className={styles.buttonBrass}>
              Записаться на лазер <ArrowUpRight aria-hidden="true" size={19} />
            </Link>
            <Link href="/booking?booking=doctor&service=cosmetologist-consultation" className={styles.heroLink}>
              Консультация врача <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>
        <div className={styles.heroAddress} data-testid="hero-facts">
          <p>
            <a href="#contacts">
              <MapPin aria-hidden="true" size={17} />
              {address}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
