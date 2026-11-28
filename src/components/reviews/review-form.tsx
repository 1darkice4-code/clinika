"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import styles from "./reviews.module.css";

type Topic = "laser" | "cosmetology" | "clinic";

const TOPICS: { value: Topic; label: string }[] = [
  { value: "laser", label: "Лазерная эпиляция (Нина Андреевна)" },
  { value: "cosmetology", label: "Косметология (Светлана Арутюновна)" },
  { value: "clinic", label: "Клиника в целом" }
];

export function ReviewForm({ defaultTopic = "laser" }: { defaultTopic?: Topic }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rating = Number(form.get("rating"));
    if (!rating) {
      setError("Поставьте оценку от 1 до 5");
      return;
    }
    setError(null);
    setState("sending");
    try {
      const response = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          text: String(form.get("text") ?? ""),
          rating,
          topic: String(form.get("topic") ?? "clinic"),
          personalDataConsentAccepted: form.get("consent") === "on",
          honeypot: String(form.get("company") ?? "")
        })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось отправить отзыв");
      }
      setState("sent");
    } catch (submitError) {
      setState("idle");
      setError(
        submitError instanceof Error
          ? `${submitError.message}. Попробуйте ещё раз или позвоните нам.`
          : "Не удалось отправить отзыв. Попробуйте ещё раз."
      );
    }
  }

  if (state === "sent") {
    return (
      <div className={styles.success} role="status">
        Спасибо! Отзыв отправлен. Он появится на сайте после проверки администратором — обычно в течение дня.
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="review-topic">О чём отзыв</label>
        <select id="review-topic" name="topic" className={styles.select} defaultValue={defaultTopic}>
          {TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>{topic.label}</option>
          ))}
        </select>
      </div>

      <fieldset className={styles.rating}>
        <legend className={styles.label}>Оценка</legend>
        {[5, 4, 3, 2, 1].map((value) => (
          <label key={value} className={styles.ratingOption}>
            <input type="radio" name="rating" value={value} id={`review-rating-${value}`} aria-label={`${value} из 5`} />
            <span aria-hidden="true">{value}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="review-text">Отзыв</label>
        <textarea
          id="review-text"
          name="text"
          className={styles.textarea}
          minLength={20}
          maxLength={2000}
          required
          placeholder="Что понравилось, что можно улучшить, как прошла процедура"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="review-name">Имя</label>
        <input id="review-name" name="name" className={styles.input} maxLength={60} required autoComplete="given-name" />
        <span className={styles.hint}>Так оно будет подписано на сайте. Можно только имя или инициалы.</span>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="review-company">Компания</label>
        <input id="review-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <label className={styles.consent}>
        <input type="checkbox" name="consent" id="review-consent" required />
        <span>
          Согласен(на) на обработку персональных данных и публикацию отзыва с моим именем на сайте.{" "}
          <Link href="/legal/personal-data-consent">Согласие</Link> и{" "}
          <Link href="/legal/privacy-policy">политика конфиденциальности</Link>.
        </span>
      </label>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button type="submit" className={styles.submit} disabled={state === "sending"}>
        {state === "sending" ? "Отправляем…" : "Отправить отзыв"}
      </button>
    </form>
  );
}
