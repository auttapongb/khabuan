"use client";

import { GasPump, Path, TrafficSign, CreditCard, ShieldCheck } from "@phosphor-icons/react";
import { routeBriefing } from "@/lib/briefing";
import { meetingPointLabel } from "@/lib/convoy-roles";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

type Props = {
  trip: Trip;
};

export function BriefingCard({ trip }: Props) {
  const { t, locale } = useLocale();
  const briefing = routeBriefing(trip, locale);
  const meeting = meetingPointLabel(trip);

  const rows = [
    { icon: Path, label: t.lobby.meeting, value: meeting || "—" },
    { icon: TrafficSign, label: t.lobby.expressway, value: briefing.expressway },
    { icon: CreditCard, label: t.lobby.toll, value: briefing.toll },
    { icon: ShieldCheck, label: t.lobby.pass, value: briefing.pass },
    { icon: GasPump, label: t.lobby.pit, value: trip.notes || briefing.pit },
  ];

  return (
    <section className={ui.section}>
      <h2>{t.lobby.briefing}</h2>
      <ul className={ui.briefList}>
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label}>
            <Icon size={18} weight="duotone" />
            <div>
              <p className={ui.ceremonyKicker}>{label}</p>
              <strong>{value}</strong>
            </div>
          </li>
        ))}
        <li>
          <TrafficSign size={18} weight="duotone" />
          <div>
            <p className={ui.ceremonyKicker}>{t.lobby.radio}</p>
            <strong>{briefing.radio}</strong>
          </div>
        </li>
      </ul>
    </section>
  );
}
