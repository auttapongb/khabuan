"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ChatTeardropSlash,
  DeviceMobileSlash,
  EyeSlash,
  MapPin,
  Pause,
  Prohibit,
  ShieldCheck,
  SignOut,
} from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { BrandMark } from "@/components/BrandMark";
import { BriefingCard } from "@/components/BriefingCard";
import { PdpaConsent } from "@/components/PdpaConsent";
import { toast } from "sonner";
import { getTripByInvite, joinTrip } from "@/lib/api";
import { recordLocationConsent } from "@/lib/consent";
import { tapHaptic } from "@/lib/haptic";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, ready, demoLogin } = useAuth();
  const { t, formatTime } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    void getTripByInvite(params.token).then((found) => {
      if (!found) setError(t.invite.expired);
      else if (found.inviteRevoked) setError(t.invite.revoked);
      else setTrip(found);
    });
  }, [params.token, t.invite.expired, t.invite.revoked]);

  const onJoin = async () => {
    let active = user;
    if (!active) active = await demoLogin("member");
    if (!trip || !active || !consented) return;
    setJoining(true);
    try {
      await joinTrip(trip.id, { inviteToken: params.token });
      recordLocationConsent(trip.id);
      tapHaptic();
      toast.success(t.invite.toast);
      router.push(`/trips/${trip.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.invite.unable);
    } finally {
      setJoining(false);
    }
  };

  const privacy = [
    { icon: DeviceMobileSlash, text: t.invite.p5 },
    { icon: ChatTeardropSlash, text: t.invite.p6 },
    { icon: SignOut, text: t.invite.p7 },
    { icon: MapPin, text: t.invite.p1 },
    { icon: EyeSlash, text: t.invite.p2 },
    { icon: Pause, text: t.invite.p3 },
    { icon: Prohibit, text: t.invite.p4 },
  ];

  return (
    <AppChrome title={t.invite.title}>
      <div className={`${ui.panel} fade-in`}>
        <BrandMark size="hero" subtitle={t.invite.hero} />
        <h1 className="sr-only">{t.invite.title}</h1>

        {!ready || (!trip && !error) ? (
          <p className={ui.note}>{t.invite.loading}</p>
        ) : error ? (
          <section className={ui.section}>
            <h2>{t.invite.unable}</h2>
            <p>{error}</p>
          </section>
        ) : trip ? (
          <>
            <motion.section
              className={ui.ceremony}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className={ui.ceremonyKicker}>{t.invite.kicker}</p>
              <h2 className={ui.ceremonyTitle}>{trip.title}</h2>
              <p className={ui.lede}>{trip.destinationName}</p>
              <p className={ui.meta}>
                {t.lobby.target} {formatTime(trip.targetArrivalAt)} ·{" "}
                {trip.organizerName} · {t.lobby.grace} {trip.graceMinutes}{" "}
                {t.lobby.minutes}
              </p>
            </motion.section>

            <BriefingCard trip={trip} />

            <section className={ui.section}>
              <h2>{t.invite.privacy}</h2>
              <ul className={ui.privacyList}>
                {privacy.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <Icon size={18} weight="duotone" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <PdpaConsent checked={consented} onCheckedChange={setConsented} />

            <div className={ui.row}>
              <button
                type="button"
                className={ui.btnPrimary}
                disabled={joining || !consented}
                onClick={() => void onJoin()}
              >
                <ShieldCheck size={18} weight="fill" />
                {joining ? t.invite.joining : t.invite.join}
              </button>
              <button
                type="button"
                className={ui.btnGhost}
                onClick={() => router.push("/vehicle")}
              >
                {t.invite.vehicleFirst}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </AppChrome>
  );
}
