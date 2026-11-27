import type { Metadata, Viewport } from "next";
import { Manrope, Cormorant } from "next/font/google";
import { CLINIC_SITE_URL } from "@/config/clinic";
import { CLINIC_CHROME_COLOR, DAY_START_HOUR, NIGHT_START_HOUR, THEME_COLORS } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

// Cormorant: high-contrast editorial serif with Cyrillic — the "quiet luxury" display face.
const cormorant = Cormorant({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL(CLINIC_SITE_URL),
  title: {
    default: "Сияние",
    template: "%s | Сияние"
  },
  description:
    "Клиника эстетической медицины Сияние в Чите: консультации, уходовые и аппаратные процедуры по записи.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg"
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Сияние"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    try {
      localStorage.removeItem("theme");
      var override = sessionStorage.getItem("themeOverride");
      var hour = new Date().getHours();
      if (!Number.isFinite(hour)) {
        var parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Chita",
          hour: "2-digit",
          hourCycle: "h23"
        }).formatToParts(new Date());
        hour = Number(parts.find(function (part) { return part.type === "hour"; }).value);
      }
      var section = location.pathname.split("/")[1];
      var internalPage = section === "admin" || section === "login";
      var automaticTheme = !internalPage || (hour >= ${DAY_START_HOUR} && hour < ${NIGHT_START_HOUR}) ? "light" : "dark";
      var theme = override === "dark" || override === "light" ? override : automaticTheme;
      if (theme === "light") {
        document.documentElement.classList.add("light");
        document.documentElement.dataset.theme = "light";
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.dataset.theme = "dark";
      }
      var themeColor = document.querySelector('meta[name="theme-color"]');
      var clinicPage = ["", "booking", "prices", "lazernaya-epilyatsiya"].includes(section);
      var colors = ${JSON.stringify(THEME_COLORS)};
      if (themeColor) themeColor.setAttribute("content", clinicPage ? ${JSON.stringify(CLINIC_CHROME_COLOR)} : colors[theme]);
    } catch (_) {}
  `;

  const safeAreaScript = `
    (function () {
      var root = document.documentElement;

      function cssPixels(name) {
        var value = getComputedStyle(root).getPropertyValue(name);
        var pixels = Number.parseFloat(value);
        return Number.isFinite(pixels) ? pixels : 0;
      }

      function updateSafeAreaFallback() {
        var ua = navigator.userAgent || "";
        var isIOS = /iP(?:hone|ad|od)/.test(ua) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        var isTelegram = /Telegram/i.test(ua) ||
          /(?:^|[?&])tgWebApp/i.test(location.search) ||
          Boolean(window.Telegram && window.Telegram.WebApp);
        var isSafari = /Version\\/[\\d.]+.*Safari\\//.test(ua);
        var isStandalone = navigator.standalone === true ||
          (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
        var isIOSWebView = isIOS && !isStandalone && (isTelegram || !isSafari);
        root.toggleAttribute("data-ios-webview", isIOSWebView);
        var isPortrait = window.innerHeight >= window.innerWidth;
        var deliveredInset = Math.max(
          cssPixels("--browser-safe-area-top"),
          cssPixels("--tg-safe-area-inset-top"),
          cssPixels("--tg-content-safe-area-inset-top")
        );
        var fallback = 0;
        if (isIOSWebView && isPortrait && deliveredInset < 1) {
          var shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
          var longSide = Math.max(screen.width || innerWidth, screen.height || innerHeight);
          fallback = longSide >= 852 && shortSide >= 393 ? 59 : longSide >= 812 ? 47 : 20;
        }

        root.style.setProperty("--ios-webview-safe-area-top", fallback + "px");
      }

      updateSafeAreaFallback();
      addEventListener("DOMContentLoaded", updateSafeAreaFallback, { once: true });
      addEventListener("pageshow", updateSafeAreaFallback);
      addEventListener("resize", updateSafeAreaFallback);

      var telegram = window.Telegram && window.Telegram.WebApp;
      if (telegram && typeof telegram.onEvent === "function") {
        telegram.onEvent("safeAreaChanged", updateSafeAreaFallback);
        telegram.onEvent("contentSafeAreaChanged", updateSafeAreaFallback);
        telegram.onEvent("viewportChanged", updateSafeAreaFallback);
      }
    })();
  `;

  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${cormorant.variable}`}
      style={{ "--clinic-graphite": CLINIC_CHROME_COLOR } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={THEME_COLORS.dark} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: safeAreaScript }} />
        <noscript>
          <style>{`.fade-in{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
