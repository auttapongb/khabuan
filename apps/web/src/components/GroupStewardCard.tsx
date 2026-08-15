"use client";

import { FormEvent, useMemo, useState } from "react";
import { Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import { LoggedStamp } from "@/components/LoggedStamp";
import { RichMenu } from "@/components/RichMenu";
import { routeBriefing } from "@/lib/briefing";
import { addNote, listNotes, undoLast, type LogKind } from "@/lib/convoy-log";
import { meetingPointLabel } from "@/lib/convoy-roles";
import { tapHaptic } from "@/lib/haptic";
import { useLocale } from "@/lib/i18n/locale";
import { shareTripInvite } from "@/lib/liff";
import {
  buildBriefFlex,
  buildRemindFlex,
  buildStatusFlex,
} from "@/lib/line-flex";
import { listReminders, scheduleClinicStack } from "@/lib/reminders";
import { parseWake, WAKE_PHRASE } from "@/lib/wake";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

type Props = {
  trip: Trip;
  liveUrl: string;
  lobbyUrl: string;
  sharingCount: number;
};

export function GroupStewardCard({
  trip,
  liveUrl,
  lobbyUrl,
  sharingCount,
}: Props) {
  const { t, locale, formatTime } = useLocale();
  const [wake, setWake] = useState("");
  const [armed, setArmed] = useState(() => listReminders(trip.id));
  const [notes, setNotes] = useState(() => listNotes(trip.id));
  const lead = trip.participants.find((p) => p.role === "organizer");
  const leadLive = lead?.sharingState === "sharing";
  const briefing = routeBriefing(trip, locale);
  const meeting = meetingPointLabel(trip) || trip.destinationName;
  const kindLabel: Record<LogKind, string> = useMemo(
    () => ({
      lead: t.steward.kindLead,
      pit: t.steward.kindPit,
      plaza: t.steward.kindPlaza,
      arrive: t.steward.kindArrive,
      share: t.steward.kindShare,
      note: t.steward.kindNote,
    }),
    [t],
  );

  const statusFlex = buildStatusFlex({
    url: liveUrl,
    title: trip.title,
    liveCount: sharingCount,
    total: trip.participants.length,
    leadLive,
    locale,
  });
  const briefFlex = buildBriefFlex({
    url: lobbyUrl,
    title: trip.title,
    meeting,
    destination: trip.destinationName,
    toll: briefing.toll,
    locale,
  });
  const remindFlex = buildRemindFlex({
    url: lobbyUrl,
    title: trip.title,
    timeLabel: formatTime(trip.targetArrivalAt),
    locale,
  });

  const replyFor = (hit: ReturnType<typeof parseWake>) => {
    if (!hit) return t.lobby.wakeUnknown;
    if (hit.kind === "status") {
      return t.steward.previewStatus
        .replace("{live}", String(sharingCount))
        .replace("{total}", String(trip.participants.length))
        .replace("{lead}", leadLive ? t.steward.leadLive : t.steward.leadOff);
    }
    if (hit.kind === "brief") {
      return t.steward.previewBrief.replace("{toll}", briefing.toll);
    }
    if (hit.kind === "remind") return t.steward.previewRemind;
    if (hit.kind === "share") return t.steward.statusShared;
    if (hit.kind === "help") return t.steward.previewHelp;
    if (hit.kind === "log") {
      return t.steward.previewLog.replace("{note}", hit.logged || wake);
    }
    return t.lobby.wakeUnknown;
  };

  const preview = (kind: "status" | "brief" | "remind") => {
    tapHaptic();
    toast.message(replyFor({ kind }));
  };

  const focusLog = () => {
    document.getElementById("wake")?.focus();
    tapHaptic();
  };

  const onWake = (e: FormEvent) => {
    e.preventDefault();
    const hit = parseWake(wake, "dm");
    tapHaptic();
    toast.message(replyFor(hit));
    if (hit?.kind === "log" && hit.logged) {
      addNote(trip.id, hit.logged);
      setNotes(listNotes(trip.id));
    }
    if (hit?.kind === "share") {
      void shareTripInvite(liveUrl, statusFlex.altText, statusFlex);
    }
    if (hit?.kind === "brief") {
      void shareTripInvite(lobbyUrl, briefFlex.altText, briefFlex);
    }
    if (hit?.kind === "remind") {
      void armRemind();
      return;
    }
    if (hit?.kind === "status") {
      void shareTripInvite(liveUrl, statusFlex.altText, statusFlex);
    }
    setWake("");
  };

  const copyWake = async () => {
    await navigator.clipboard.writeText(WAKE_PHRASE);
    tapHaptic();
    toast.success(t.steward.copiedWake);
  };

  const shareStatus = async () => {
    await shareTripInvite(liveUrl, statusFlex.altText, statusFlex);
    tapHaptic();
    toast(t.steward.statusShared);
  };

  const shareBrief = async () => {
    await shareTripInvite(lobbyUrl, briefFlex.altText, briefFlex);
    tapHaptic();
    toast(t.steward.briefShared);
  };

  const armRemind = async () => {
    const next = scheduleClinicStack(trip.id, trip.targetArrivalAt);
    setArmed(next);
    await shareTripInvite(lobbyUrl, remindFlex.altText, remindFlex);
    tapHaptic();
    toast.success(t.lobby.remindStack);
  };

  const undo = () => {
    const removed = undoLast(trip.id);
    setNotes(listNotes(trip.id));
    tapHaptic();
    toast.message(removed ? t.steward.undone : t.lobby.wakeUnknown);
  };

  return (
    <section className={ui.section}>
      <h2>{t.steward.title}</h2>
      <p className={ui.lede}>{t.steward.lede}</p>
      <div className={ui.flexCard}>
        <p className={ui.flexBrand}>LINE OA</p>
        <p className={ui.flexTitle}>{t.steward.inviteGroup}</p>
        <p className={ui.meta}>{t.steward.privacy}</p>
        <RichMenu
          onStatus={() => {
            preview("status");
            void shareStatus();
          }}
          onBrief={() => {
            preview("brief");
            void shareBrief();
          }}
          onLog={focusLog}
          onRemind={() => void armRemind()}
        />
        <form className={ui.wakeForm} onSubmit={onWake}>
          <label className="sr-only" htmlFor="wake">
            {t.lobby.wakeHint}
          </label>
          <input
            id="wake"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            placeholder={t.lobby.wakePlaceholder}
            autoComplete="off"
          />
          <button type="submit" className={ui.btnGhost}>
            {t.steward.menuLog}
          </button>
        </form>
        <p className={ui.meta}>{t.lobby.wakeHint}</p>
        {notes[0] ? (
          <LoggedStamp note={notes[0].text} kind={kindLabel[notes[0].kind]} />
        ) : null}
        {notes.length > 0 ? (
          <div>
            <p className={ui.meta}>{t.steward.lastLog}</p>
            <ul className={ui.logList}>
              {notes.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <span>{kindLabel[n.kind]}</span>
                  {n.text}
                </li>
              ))}
            </ul>
            <button type="button" className={ui.btnGhost} onClick={undo}>
              {t.steward.undo}
            </button>
          </div>
        ) : null}
        {armed.length > 0 ? (
          <p className={ui.meta}>
            {t.lobby.remindStack}
            {" · "}
            {armed.map((r) => formatTime(r.fireAt)).join(" · ")}
          </p>
        ) : null}
        <div className={ui.row}>
          <button type="button" className={ui.btnPrimary} onClick={() => void shareStatus()}>
            {t.steward.shareStatus}
          </button>
          <button type="button" className={ui.btnGhost} onClick={() => void copyWake()}>
            <Copy size={16} />
            {WAKE_PHRASE}
          </button>
        </div>
      </div>
    </section>
  );
}
