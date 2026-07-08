"use client";

import Link from "next/link";
import { CalendarDays, Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export interface SiteHeaderProps {
  phone?: string;
}

const navLinks = [
  { href: "#services", label: "Услуги" },
  { href: "#specialists", label: "Специалисты" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#contacts", label: "Контакты" }
];

const DEFAULT_PHONE = "+7 (999) 000-00-00";

export function SiteHeader({ phone = DEFAULT_PHONE }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/[0.88] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold">
            <BrandMark className="h-8 w-8" />
            <span>
              <span className="brand-word-tight block text-xl leading-none">Сияние</span>
              <span className="block text-xs font-normal text-muted-foreground">эстетическая медицина</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Основная навигация" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <a key={link.href} className="hover:text-foreground" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href={`tel:${phone}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-card"
              aria-label="Позвонить"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href="#booking"
              className="hidden h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-105 sm:inline-flex"
            >
              <CalendarDays className="h-4 w-4" />
              Запись
            </a>

            {/* Burger toggle */}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-card md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay — rendered outside <header> so the header's backdrop-filter
          doesn't become the containing block for this position:fixed layer. */}
      {open && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          <div className="flex h-full flex-col px-4 pt-5">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold" onClick={() => setOpen(false)}>
                <BrandMark className="h-8 w-8" />
                <span>
                  <span className="brand-word-tight block text-xl leading-none">Сияние</span>
                  <span className="block text-xs font-normal text-muted-foreground">эстетическая медицина</span>
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-card"
                  onClick={() => setOpen(false)}
                  aria-label="Закрыть меню"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <nav className="mt-12 flex flex-col gap-6 text-2xl font-semibold">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-4 pb-8 text-sm text-muted-foreground">
              <a href={`tel:${phone}`} className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-metal" />
                {phone}
              </a>
              <a
                href="#booking"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                <CalendarDays className="h-4 w-4" />
                Записаться онлайн
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
