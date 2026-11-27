"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { Children, useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./home.module.css";

const interval = 10_000;

type SpecialistPreview = { id: string; name: string; photoUrl: string | null };

export function SpecialistCarousel({ children, specialists }: {
  children: ReactNode;
  specialists: SpecialistPreview[];
}) {
  const slides = Children.toArray(children);
  const slideId = useId();
  const carousel = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);

  useEffect(() => {
    const element = carousel.current;
    if (!element || slides.length < 2) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setMotionAllowed(!motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);

    const visibilityThreshold = 0.25;
    let inView = false;
    const syncVisibility = () => setVisible(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= visibilityThreshold;
      syncVisibility();
    }, { threshold: visibilityThreshold });
    observer.observe(element);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      motion.removeEventListener("change", syncMotion);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [slides.length]);

  useEffect(() => {
    if (!playing || !motionAllowed || !visible || hovered || cardFocused || slides.length < 2) return;
    const timeout = window.setTimeout(() => setActive((index) => (index + 1) % slides.length), interval);
    return () => window.clearTimeout(timeout);
  }, [active, playing, motionAllowed, visible, hovered, cardFocused, slides.length]);

  if (slides.length < 2) return <>{children}</>;

  return (
    <div
      ref={carousel}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        className={styles.specialistSlides}
        onFocusCapture={() => setCardFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setCardFocused(false);
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            id={`${slideId}-${index}`}
            className={styles.specialistSlide}
            data-active={index === active}
            aria-hidden={index !== active}
            inert={index !== active}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className={styles.specialistControls} aria-label="Выбор специалиста" role="group">
        <div className={styles.specialistRoster}>
          {specialists.map(({ id, name, photoUrl }, index) => (
            <button
              key={id}
              className={styles.specialistSelector}
              type="button"
              aria-controls={`${slideId}-${index}`}
              aria-pressed={index === active}
              onClick={() => {
                setActive(index);
                setPlaying(false);
              }}
            >
              {photoUrl && <Image src={photoUrl} alt="" width={48} height={48} />}
              <span>{name}</span>
            </button>
          ))}
        </div>
        {motionAllowed && (
          <button
            className={styles.specialistAutoplay}
            type="button"
            aria-label={playing ? "Остановить переключение" : "Включить переключение"}
            onClick={() => setPlaying((current) => !current)}
          >
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
