import type { DirectionPerformer } from "./types";

export function svetlanaPerformer(note: string): DirectionPerformer {
  return {
    name: "Светлана Арутюновна Нерсисян",
    heading: "Кто проводит процедуру",
    photo: "/doctors/svetlana-nersisyan-hd.webp",
    alt: "Врач-дерматовенеролог Светлана Арутюновна Нерсисян",
    text: `Светлана Арутюновна Нерсисян — врач-дерматовенеролог, 29 лет врачебной практики. ${note}`,
    href: "/specialists/svetlana-nersisyan",
    linkLabel: "О враче"
  };
}

export const NINA_PERFORMER: DirectionPerformer = {
  name: "Нина Андреевна",
  heading: "Кто проводит процедуру",
  photo: "/doctors/nina-andreevna.png",
  alt: "Специалист по лазерной эпиляции Нина Андреевна",
  text:
    "Лазерную эпиляцию в «Сиянии» проводит Нина Андреевна — специалист по лазерной эпиляции, 10 лет в эстетических процедурах, окончила Сургутский медицинский колледж. Перед первым сеансом она осматривает кожу, уточняет противопоказания и подбирает параметры аппарата под ваш тип кожи и волос. В клинике принимает врач-дерматолог — если возникнут вопросы, специалист подскажет, когда к нему обратиться.",
  href: "/specialists/nina-andreevna",
  linkLabel: "О специалисте"
};
