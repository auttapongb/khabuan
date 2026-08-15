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
        <img
          src="/mascot.webp"
          alt=""
          style={{
            width: "1.2em",
            height: "1.2em",
            borderRadius: "12%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </span>
      <div>
        <p className={styles.name}>{t.brand.name}</p>
        {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
