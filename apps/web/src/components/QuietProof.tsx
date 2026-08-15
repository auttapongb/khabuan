"use client";

import NumberFlow from "@number-flow/react";
import { useLocale } from "@/lib/i18n/locale";
import { quietProof } from "@/lib/quiet";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

type Props = {
  trip: Trip;
  liveOverride?: number;
};

export function QuietProof({ trip, liveOverride }: Props) {
  const { t } = useLocale();
  const proof = quietProof(trip);
  const live = liveOverride ?? proof.live;
  return (
    <p className={ui.quietProof} role="status">
      <NumberFlow value={live} />
      {" / "}
      <NumberFlow value={proof.total} /> {t.quiet.sharing}
      <span className={ui.quietSep}>·</span>
      {proof.ready ? t.quiet.ready : t.quiet.wait}
    </p>
  );
}
