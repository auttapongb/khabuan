"use client";

import { useEffect, useRef } from "react";
import { Copy, ShareNetwork, Code } from "@phosphor-icons/react";
import { toast } from "sonner";
import { routeBriefing } from "@/lib/briefing";
import { meetingPointLabel } from "@/lib/convoy-roles";
import { tapHaptic } from "@/lib/haptic";
import { useLocale } from "@/lib/i18n/locale";
import { shareTripInvite } from "@/lib/liff";
import { buildInviteFlex } from "@/lib/line-flex";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

type Props = {
  trip: Trip;
  inviteUrl: string;
  highlight?: boolean;
};

export function LineShareCard({ trip, inviteUrl, highlight }: Props) {
  const { t, formatTime, locale } = useLocale();
  const cardRef = useRef<HTMLElement>(null);
  const briefing = routeBriefing(trip, locale);
  const meeting = meetingPointLabel(trip) || trip.destinationName;
  const flex = buildInviteFlex({
    url: inviteUrl,
    title: trip.title,
    destination: trip.destinationName,
    meeting,
    timeLabel: formatTime(trip.targetArrivalAt),
    briefing,
    locale,
  });

  useEffect(() => {
    if (!highlight) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(t.lobby.dropNow);
  }, [highlight, t.lobby.dropNow]);

  const share = async () => {
    await shareTripInvite(inviteUrl, flex.altText, flex);
    tapHaptic();
    toast(t.lobby.shareReady);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    tapHaptic();
    toast.success(t.lobby.copied);
  };

  const copyFlex = async () => {
    await navigator.clipboard.writeText(JSON.stringify(flex, null, 2));
    tapHaptic();
    toast.success(t.lobby.flexCopied);
  };

  return (
    <section
      ref={cardRef}
      className={`${ui.section} ${highlight ? ui.sharePulse : ""}`}
    >
      <h2>{t.lobby.shareCard}</h2>
      <div className={ui.flexCard}>
        <p className={ui.flexBrand}>{t.brand.name}</p>
        <p className={ui.flexTitle}>{trip.title}</p>
        <p className={ui.flexMeta}>
          {meeting} → {trip.destinationName}
        </p>
        <p className={ui.flexMeta}>{formatTime(trip.targetArrivalAt)}</p>
        <p className={ui.flexToll}>{briefing.toll}</p>
        <p className={ui.meta}>{t.lobby.shareHint}</p>
        <div className={ui.row}>
          <button type="button" className={ui.btnPrimary} onClick={() => void share()}>
            <ShareNetwork size={18} />
            {t.lobby.shareInvite}
          </button>
          <button type="button" className={ui.btnGhost} onClick={() => void copyLink()}>
            <Copy size={18} />
            {t.lobby.copyLink}
          </button>
          <button type="button" className={ui.btnGhost} onClick={() => void copyFlex()}>
            <Code size={18} />
            {t.lobby.copyFlex}
          </button>
        </div>
      </div>
    </section>
  );
}
