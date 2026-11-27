"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getAutomaticTheme, THEME_COLORS, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme, rememberForSession = false) {
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  if (rememberForSession) sessionStorage.setItem("themeOverride", theme);
}

export function ThemeToggle({ defaultLight = false }: { defaultLight?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = sessionStorage.getItem("themeOverride");
    const initialTheme: Theme =
      stored === "dark" || stored === "light"
        ? stored
        : defaultLight
          ? "light"
          : getAutomaticTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    if (defaultLight) return;
    const syncAutomaticTheme = () => {
      if (sessionStorage.getItem("themeOverride")) return;
      const automaticTheme = getAutomaticTheme();
      setTheme(automaticTheme);
      applyTheme(automaticTheme);
    };
    const interval = window.setInterval(syncAutomaticTheme, 60_000);
    document.addEventListener("visibilitychange", syncAutomaticTheme);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncAutomaticTheme);
    };
  }, [defaultLight]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme, true);
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border bg-card text-foreground transition hover:border-metal hover:text-metal"
      onClick={toggleTheme}
      aria-label={isLight ? "Включить темную тему" : "Включить светлую тему"}
      title={isLight ? "Темная тема" : "Светлая тема"}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
