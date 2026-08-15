"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STRINGS, type Locale, type Strings } from "./strings";

const KEY = "mcg.locale";

type Ctx = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Strings;
  formatTime: (iso: string, style?: "full" | "medium") => string;
};

const LocaleContext = createContext<Ctx | null>(null);

function readLocale(): Locale {
  if (typeof window === "undefined") return "th";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "th" || stored === "en") return stored;
  return "th";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th");

  useEffect(() => {
    setLocaleState(readLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(KEY, next);
  }, []);

  const formatTime = useCallback(
    (iso: string, style: "full" | "medium" = "medium") => {
      return new Date(iso).toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
        dateStyle: style,
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      });
    },
    [locale],
  );

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      t: STRINGS[locale],
      formatTime,
    }),
    [locale, setLocale, formatTime],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "th",
      setLocale: () => undefined,
      t: STRINGS.th,
      formatTime: (iso) => iso,
    };
  }
  return ctx;
}
