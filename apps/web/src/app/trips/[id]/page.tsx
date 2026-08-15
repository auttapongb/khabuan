"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Broadcast, Bell, Car, MapTrifold } from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { ArrivalCountdown } from "@/components/ArrivalCountdown";
import { BriefingCard } from "@/components/BriefingCard";
import { GroupStewardCard } from "@/components/GroupStewardCard";
import { LineShareCard } from "@/components/LineShareCard";
import { QuietProof } from "@/components/QuietProof";
import { SharingIndicator } from "@/components/SharingIndicator";
import { getTrip, setSharing, createContinuation } from "@/lib/api";
import { addNote } from "@/lib/convoy-log";
import { listReminders, scheduleClinicStack } from "@/lib/reminders";
import { convoyRole } from "@/lib/convoy-roles";
import { openExternalBrowser } from "@/lib/liff";
import { tapHaptic } from "@/lib/haptic";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

export default function TripLobbyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, demoLogin } = useAuth();
  const { t, formatTime } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false);
  const [highlightShare, setHighlightShare] = useState(false);

  const reload = useCallback(async () => {
    const next = await getTrip(params.id);
    setTrip(next);
  }, [params.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setHighlightShare(q.get("share") === "1");
  }, []);

  useEffect(() => {
    if (!trip) return;
    const timers = listReminders(trip.id)
      .map((reminder) => {
        const wait = new Date(reminder.fireAt).getTime() - Date.now();
        if (wait > 26 * 60 * 60_000) return null;
        return window.setTimeout(
          () => toast(t.steward.previewRemind),
          Math.max(0, wait),
        );
      })
      .filter((id): id is number => id != null);
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [trip, t.steward.previewRemind]);

  const me = trip?.participants.find((p) => p.userId === user?.id);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = trip ? `${origin}/invite/${trip.inviteToken}` : "";
  const liveUrl = trip ? `${origin}/trips/${trip.id}/live` : "";
  const lobbyUrl = trip ? `${origin}/trips/${trip.id}` : "";
  const sharingCount = useMemo(
    () =>
      trip
        ? trip.participants.filter((p) => p.sharingState === "sharing").length
        : 0,
    [trip],
  );

  const startSharing = async () => {
    if (!user) await demoLogin(trip?.organizerId ? "member" : "organizer");
    setBusy(true);
    try {
      await setSharing(params.id, "start");
      addNote(params.id, t.steward.autoShare, "share");
      tapHaptic();
      toast.success(t.lobby.toastShareOn);
      router.push(`/trips/${params.id}/live`);
    } finally {
      setBusy(false);
    }
  };

  const openExternal = async () => {
    const origin = window.location.origin;
    const returnUri = `${origin}/trips/${params.id}/live`;
    const cont = await createContinuation(params.id, returnUri);
    const url = cont ? `${returnUri}?continuation=${cont.code}` : returnUri;
    await openExternalBrowser(url);
  };

  if (!trip) {
    return (
      <AppChrome title={t.lobby.title}>
        <p className={ui.note}>{t.lobby.loading}</p>
      </AppChrome>
    );
  }

  return (
    <AppChrome title={t.lobby.title}>
      <div className={ui.panel}>
        <section className={ui.ceremony}>
          <p className={ui.ceremonyKicker}>
            {t.lobby.kicker} · {trip.state}
          </p>
          <h2 className={ui.ceremonyTitle}>{trip.title}</h2>
          <ArrivalCountdown targetIso={trip.targetArrivalAt} />
          <p className={ui.meta}>
            {t.lobby.target} {formatTime(trip.targetArrivalAt, "full")} ·{" "}
            {t.lobby.grace} {trip.graceMinutes} {t.lobby.minutes}
          </p>
        </section>

        <QuietProof trip={trip} />
        <BriefingCard trip={trip} />
        <SharingIndicator state={me?.sharingState || "off"} sticky />
        <LineShareCard
          trip={trip}
          inviteUrl={inviteUrl}
          highlight={highlightShare}
        />
        <GroupStewardCard
          trip={trip}
          liveUrl={liveUrl || `/trips/${trip.id}/live`}
          lobbyUrl={lobbyUrl || `/trips/${trip.id}`}
          sharingCount={sharingCount}
        />

        <section className={ui.section}>
          <h2>{t.lobby.participants}</h2>
          <ul className={ui.list}>
            {trip.participants.map((p, i) => {
              const role = convoyRole(p, trip);
              return (
                <motion.li
                  key={p.userId}
                  className={ui.listItem}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  <div>
                    <strong>{p.displayName}</strong>
                    <div className={ui.meta}>
                      {t.roles[role]}
                      {p.vehicle ? ` · ${p.vehicle.nickname}` : ""}
                    </div>
                  </div>
                  <span className={ui.pill}>
                    {p.ready ? t.roles.ready : t.roles.setup} · {p.sharingState}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </section>

        <div className={ui.stack}>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={busy}
            onClick={() => void startSharing()}
          >
            <Broadcast size={18} weight="bold" />
            {t.lobby.startShare}
          </button>
          <div className={ui.row}>
            <button
              type="button"
              className={ui.btnGhost}
              onClick={() => {
                const next = scheduleClinicStack(trip.id, trip.targetArrivalAt);
                tapHaptic();
                toast.success(
                  t.lobby.remindStack +
                    " · " +
                    next.map((r) => formatTime(r.fireAt)).join(" · "),
                );
              }}
            >
              <Bell size={18} />
              {t.lobby.remind}
            </button>
            <button
              type="button"
              className={ui.btnGhost}
              onClick={() => void openExternal()}
            >
              <MapTrifold size={18} />
              {t.lobby.openMap}
            </button>
            <Link className={ui.btnGhost} href="/vehicle">
              <Car size={18} />
              {t.nav.vehicle}
            </Link>
          </div>
          {trip.state === "open" || me?.sharingState === "sharing" ? (
            <Link className={ui.btnGhost} href={`/trips/${trip.id}/live`}>
              {t.lobby.enterLive}
            </Link>
          ) : null}
        </div>
      </div>
    </AppChrome>
  );
}
