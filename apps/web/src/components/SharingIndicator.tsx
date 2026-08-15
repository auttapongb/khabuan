"use client";

import { Broadcast, Pause, Prohibit } from "@phosphor-icons/react";
import { useLocale } from "@/lib/i18n/locale";
import type { SharingState } from "@/lib/types";
import styles from "./SharingIndicator.module.css";

type Props = {
  state: SharingState;
  sticky?: boolean;
};

export function SharingIndicator({ state, sticky }: Props) {
  const { t } = useLocale();
  const Icon =
    state === "sharing" ? Broadcast : state === "paused" ? Pause : Prohibit;

  return (
    <div
      className={`${styles.indicator} ${styles[state]} ${sticky ? styles.sticky : ""}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={16} weight="bold" aria-hidden />
      <span>{t.sharing[state]}</span>
    </div>
  );
}
