"use client";

import { GasPump, MapPin, Path } from "@phosphor-icons/react";
import { meetingPointLabel } from "@/lib/convoy-roles";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

type Props = {
  trip: Trip;
};

export function MeetingPointCard({ trip }: Props) {
  const { t } = useLocale();
  const meeting = meetingPointLabel(trip);
  return (
    <div className={ui.placeGrid}>
      <article className={ui.placeCard}>
        <Path className={ui.ritualIcon} size={18} weight="duotone" />
        <p className={ui.ceremonyKicker}>{t.lobby.meeting}</p>
        <strong>{meeting || "—"}</strong>
      </article>
      <article className={ui.placeCard}>
        <MapPin className={ui.ritualIcon} size={18} weight="duotone" />
        <p className={ui.ceremonyKicker}>{t.lobby.destination}</p>
        <strong>{trip.destinationName}</strong>
      </article>
      <article className={ui.placeCard}>
        <GasPump className={ui.ritualIcon} size={18} weight="duotone" />
        <p className={ui.ceremonyKicker}>{t.lobby.pit}</p>
        <strong>{trip.notes || t.lobby.pitCopy}</strong>
      </article>
    </div>
  );
}
