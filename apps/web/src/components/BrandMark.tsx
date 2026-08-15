"use client";

import { useLocale } from "@/lib/i18n/locale";
import styles from "./BrandMark.module.css";

type Props = {
  size?: "hero" | "nav" | "inline";
  subtitle?: string;
};

export function BrandMark({ size = "nav", subtitle }: Props) {
  const { t } = useLocale();
  return (
    <div className={`${styles.brand} ${styles[size]}`}>
      <span className={styles.mark} aria-hidden>
        <svg viewBox="0 0 48 48" width="1em" height="1em">
          <path
            d="M8 30 L18 12 L30 12 L40 30 L32 30 L28 22 L20 22 L16 30 Z"
            fill="currentColor"
          />
          <circle cx="16" cy="33" r="3.2" fill="currentColor" opacity="0.7" />
          <circle cx="32" cy="33" r="3.2" fill="currentColor" opacity="0.7" />
        </svg>
      </span>
      <div>
        <p className={styles.name}>{t.brand.name}</p>
        {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
