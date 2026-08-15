"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useLocale } from "@/lib/i18n/locale";
import ui from "@/styles/ui.module.css";

type Props = {
  note: string;
  kind?: string;
};

/** Screenshot unit — Lemon8/IG crop of “จดสำเร็จ”. */
export function LoggedStamp({ note, kind }: Props) {
  const { t } = useLocale();
  return (
    <div className={ui.stamp} role="status">
        <p className={ui.stampBrand}>{t.brand.name}</p>
      <p className={ui.stampOk}>
        <CheckCircle size={22} weight="fill" />
        {t.social.loggedOk}
      </p>
      <p className={ui.stampNote}>
        {kind ? `${kind} · ` : ""}
        {note}
      </p>
      <p className={ui.meta}>{t.social.noShame}</p>
    </div>
  );
}
