import type { Metadata } from "next";
import { Manrope, Cormorant } from "next/font/google";
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
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Сияние",
    template: "%s | Сияние"
  },
  description: "Клиника эстетической медицины Сияние в Чите: консультации, уходовые и аппаратные процедуры по записи.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Сияние"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    try {
      var theme = localStorage.getItem("theme");
      if (theme !== "dark") {
        document.documentElement.classList.add("light");
        document.documentElement.dataset.theme = "light";
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.dataset.theme = "dark";
      }
    } catch (_) {}
  `;

  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <noscript>
          <style>{`.fade-in{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
