"use client";

import { useLocale } from "@/lib/i18n/locale";
import ui from "@/styles/ui.module.css";

type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
};

export function PdpaConsent({ checked, onCheckedChange }: Props) {
  const { t } = useLocale();
  return (
    <label className={ui.consent}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span>{t.invite.consent}</span>
    </label>
  );
}
