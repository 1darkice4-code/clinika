import Image from "next/image";
import type { CSSProperties } from "react";
import direction from "@/app/direction.module.css";

type MastheadFigureProps = { src: string; alt: string; width: number; height: number };

/**
 * Модель на прозрачном фоне в тёмной шапке страницы: свечение, кольцо и звёзды из логотипа.
 * Фото должно касаться только нижнего края кадра — этот срез ставится на кромку шапки.
 */
export function MastheadFigure({ src, alt, width, height }: MastheadFigureProps) {
  return (
    <div className={direction.mastheadFigure} style={{ "--figure-ratio": width / height } as CSSProperties}>
      <div className={direction.figureStage}>
        <span className={direction.figureGlow} aria-hidden="true" />
        <span className={direction.figureRing} aria-hidden="true" />
        <CompassStar className={`${direction.figureStar} ${direction.figureStarLarge}`} />
        <CompassStar className={`${direction.figureStar} ${direction.figureStarSmall}`} />
        <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 760px) 86vw, 34rem" preload className={direction.figureImage} />
      </div>
    </div>
  );
}

/** Восьмилучевая звезда, как в логотипе «Сияния»: у каждого луча светлая и тёмная грань. */
function CompassStar({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      <path d="M0 0L0.00 -50.00 -4.40 -10.62Z M0 0L25.46 -25.46 4.40 -10.62Z M0 0L50.00 0.00 10.62 -4.40Z M0 0L25.46 25.46 10.62 4.40Z M0 0L0.00 50.00 4.40 10.62Z M0 0L-25.46 25.46 -4.40 10.62Z M0 0L-50.00 0.00 -10.62 4.40Z M0 0L-25.46 -25.46 -10.62 -4.40Z" fill="#e3c48c" />
      <path d="M0 0L0.00 -50.00 4.40 -10.62Z M0 0L25.46 -25.46 10.62 -4.40Z M0 0L50.00 0.00 10.62 4.40Z M0 0L25.46 25.46 4.40 10.62Z M0 0L0.00 50.00 -4.40 10.62Z M0 0L-25.46 25.46 -10.62 4.40Z M0 0L-50.00 0.00 -10.62 -4.40Z M0 0L-25.46 -25.46 -4.40 -10.62Z" fill="#a3834c" />
    </svg>
  );
}
