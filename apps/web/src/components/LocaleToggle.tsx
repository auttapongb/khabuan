"use client";

import { useLocale } from "@/lib/i18n/locale";
import styles from "./LocaleToggle.module.css";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className={styles.toggle} role="group" aria-label="Language">
      <button
        type="button"
        className={locale === "th" ? styles.on : undefined}
        aria-pressed={locale === "th"}
        onClick={() => setLocale("th")}
      >
        TH
      </button>
      <button
        type="button"
        className={locale === "en" ? styles.on : undefined}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
