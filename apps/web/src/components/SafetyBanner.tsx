"use client";

import { Warning } from "@phosphor-icons/react";
import { useLocale } from "@/lib/i18n/locale";
import styles from "./SafetyBanner.module.css";

type Props = {
  compact?: boolean;
};

export function SafetyBanner({ compact }: Props) {
  const { t } = useLocale();
  return (
    <aside
      className={`${styles.banner} ${compact ? styles.compact : ""}`}
      role="status"
      aria-live="polite"
    >
      <Warning className={styles.icon} size={16} weight="fill" aria-hidden />
      <p>{t.safety}</p>
    </aside>
  );
}
