"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BookingAssistantWidget } from "@/components/booking/booking-experience";
import { CLINIC_CONTACTS } from "@/config/clinic";
import { CLINIC_CHROME_COLOR, THEME_COLORS } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface SiteHeaderProps {
  phone?: string;
  address?: string;
  appearance?: "cinematic";
  bookingHref?: string;
}

const navLinks = [
  { href: "/#services", label: "Услуги" },
  { href: "/prices", label: "Прайс" },
  { href: "/#specialists", label: "Специалисты" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/#contacts", label: "Контакты" }
];

export function SiteHeader({
  phone = CLINIC_CONTACTS.phone,
  address = CLINIC_CONTACTS.address,
  appearance,
  bookingHref = "/booking"
}: SiteHeaderProps) {
  const cinematic = appearance === "cinematic";
  const [open, setOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const phonePopoverRef = useRef<HTMLDivElement>(null);
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    menuDialogRef.current?.close();
    setOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!cinematic) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;

    meta.content = CLINIC_CHROME_COLOR;
    return () => {
      if (meta.content === CLINIC_CHROME_COLOR) {
        meta.content =
          THEME_COLORS[document.documentElement.classList.contains("light") ? "light" : "dark"];
      }
    };
  }, [cinematic]);

  useEffect(() => {
    if (!open) return;
    const dialog = menuDialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeMenuButtonRef.current?.focus();
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!phoneOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPhoneOpen(false);
        phonePopoverRef.current?.querySelector("button")?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !phonePopoverRef.current?.contains(event.target)) {
        setPhoneOpen(false);
      }
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [phoneOpen]);

  return (
    <>
      <header
        className={cn(
          "site-header inset-x-0 top-0 z-[70]",
          cinematic
            ? "site-header-cinematic pointer-events-none fixed"
            : "sticky border-b bg-background sm:fixed sm:bg-background/[0.88] sm:backdrop-blur-xl"
        )}
        data-testid="site-header"
      >
        <div
          className={cn(
            "mx-auto flex h-16 items-center justify-between gap-2",
            cinematic
              ? "site-header-frame pointer-events-auto px-3 sm:px-5"
              : "max-w-7xl px-3 sm:px-6 lg:px-8"
          )}
        >
          <Link href="/" aria-label="Сияние — главная" className="inline-flex items-center gap-2">
            <BrandMark
              className={
                cinematic ? "h-10 w-10 sm:h-[50px] sm:w-[50px]" : "h-11 w-11 sm:h-14 sm:w-14"
              }
            />
            <span className={cinematic ? "hidden min-[360px]:block" : "hidden min-[420px]:block"}>
              <span
                className={cn(
                  "block leading-none",
                  cinematic ? "site-wordmark text-base sm:text-lg" : "brand-word-tight text-xl"
                )}
              >
                Сияние
              </span>
              {!cinematic && (
                <span className="block text-xs font-normal text-muted-foreground">
                  эстетическая медицина
                </span>
              )}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Основная навигация"
            className={cn(
              "hidden items-center text-sm text-muted-foreground lg:flex",
              cinematic ? "gap-6 xl:gap-9" : "gap-5"
            )}
          >
            {navLinks.map((link) => (
              <Link key={link.href} className="hover:text-foreground" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {!cinematic && <ThemeToggle defaultLight />}
            <a
              href={`tel:${phone}`}
              className="hidden h-11 w-11 items-center justify-center rounded-md border bg-card min-[500px]:inline-flex sm:hidden"
              aria-label="Позвонить"
            >
              <Phone className="h-4 w-4" />
            </a>
            <div ref={phonePopoverRef} className="relative hidden sm:block">
              <button
                type="button"
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center border transition hover:border-metal",
                  cinematic ? "rounded-full bg-transparent" : "rounded-md bg-card"
                )}
                aria-label="Показать номер телефона"
                aria-expanded={phoneOpen}
                aria-controls="desktop-phone-popover"
                onClick={() => setPhoneOpen((value) => !value)}
                data-testid="desktop-phone-toggle"
              >
                <Phone className="h-4 w-4" />
              </button>
              {phoneOpen && (
                <div
                  id="desktop-phone-popover"
                  role="dialog"
                  aria-label="Телефон клиники"
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-10 w-64 rounded-xl border bg-card p-4 text-left shadow-[0_18px_50px_hsl(var(--soft-shadow))]"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Телефон клиники
                  </p>
                  <a
                    href={`tel:${phone}`}
                    className="mt-2 block text-lg font-medium text-foreground transition hover:text-metal-strong"
                    onClick={() => setPhoneOpen(false)}
                  >
                    {phone}
                  </a>
                </div>
              )}
            </div>
            <button
              ref={menuButtonRef}
              type="button"
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center border lg:hidden",
                cinematic ? "rounded-full bg-transparent" : "rounded-md bg-card"
              )}
              onClick={() => setOpen(true)}
              aria-label="Открыть меню"
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link
              href={bookingHref}
              className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:px-5"
            >
              Записаться
              {cinematic && <ArrowUpRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />}
            </Link>
          </div>
        </div>
      </header>
      {/* Only the desktop fixed header needs a matching spacer. */}
      <div
        className={cn("site-header-spacer hidden", !cinematic && "sm:block")}
        aria-hidden="true"
      />
      <BookingAssistantWidget phone={phone} address={address} />

      {/* Mobile overlay — rendered outside <header> so the header's backdrop-filter
          doesn't become the containing block for this position:fixed layer. */}
      {open && (
        <dialog
          ref={menuDialogRef}
          aria-label="Меню сайта"
          onCancel={(event) => {
            event.preventDefault();
            closeMenu();
          }}
          className={cn(
            "site-mobile-overlay fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-background lg:hidden",
            cinematic && "site-header-cinematic site-menu-cinematic"
          )}
        >
          <div className="flex min-h-full flex-col gap-5 px-4 pt-5">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-base font-semibold"
                onClick={closeMenu}
              >
                <BrandMark />
                <span>
                  <span
                    className={cn(
                      "block text-xl leading-none",
                      cinematic ? "site-wordmark" : "brand-word-tight"
                    )}
                  >
                    Сияние
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    эстетическая медицина
                  </span>
                </span>
              </Link>
              <div className="flex items-center gap-2">
                {!cinematic && <ThemeToggle defaultLight />}
                <button
                  ref={closeMenuButtonRef}
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border bg-card"
                  onClick={closeMenu}
                  aria-label="Закрыть меню"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <nav
              aria-label="Основная навигация"
              className={cn(
                "flex flex-col gap-3 py-2 text-2xl font-semibold sm:gap-5",
                cinematic && "text-[2rem] tracking-tight"
              )}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-4 pb-5 text-sm text-muted-foreground">
              <a href={`tel:${phone}`} className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-metal" />
                {phone}
              </a>
              <Link
                href={bookingHref}
                onClick={closeMenu}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Записаться онлайн
              </Link>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
