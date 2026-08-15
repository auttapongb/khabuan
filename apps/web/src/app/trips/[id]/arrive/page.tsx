"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { CheckCircle, MapPin, WarningCircle } from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { confirmArrival, getTrip } from "@/lib/api";
import { addNote } from "@/lib/convoy-log";
import { tapHaptic } from "@/lib/haptic";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

export default function ArrivePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, demoLogin } = useAuth();
  const { t } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getTrip(params.id).then(setTrip);
  }, [params.id]);

  const act = async (dispute: boolean) => {
    if (!user) await demoLogin("member");
    setBusy(true);
    try {
      const next = await confirmArrival(params.id, dispute);
      setTrip(next);
      tapHaptic(dispute ? 8 : 16);
      if (dispute) {
        toast.message(t.arrive.toastDispute);
      } else {
        addNote(params.id, t.steward.autoArrive, "arrive");
        toast.success(t.arrive.toastOk);
        setTimeout(() => router.push(`/trips/${params.id}/summary`), 700);
      }
    } finally {
      setBusy(false);
    }
  };

  const me = trip?.participants.find((p) => p.userId === user?.id);
  const confirmed = me?.arrivalStatus === "confirmed";

  return (
    <AppChrome title={t.arrive.title}>
      <div className={ui.panel}>
        <motion.section
          className={ui.ceremony}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className={ui.ceremonyKicker}>
            <MapPin size={14} weight="fill" /> {trip?.title || t.arrive.title} ·{" "}
            {t.arrive.kicker}
          </p>
          <h2 className={ui.ceremonyTitle}>
            {trip?.destinationName || t.lobby.destination}
          </h2>
          <p className={ui.lede}>{t.arrive.lede}</p>
          {me ? (
            <p className={ui.meta}>
              {t.arrive.status} {me.arrivalStatus} · {me.sharingState}
            </p>
          ) : null}
        </motion.section>

        <div className={ui.stack}>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={busy || confirmed}
            onClick={() => void act(false)}
          >
            <CheckCircle size={18} weight="fill" />
            {confirmed ? t.arrive.recorded : t.arrive.confirm}
          </button>
          <button
            type="button"
            className={ui.btnGhost}
            disabled={busy}
            onClick={() => void act(true)}
          >
            <WarningCircle size={18} />
            {t.arrive.dispute}
          </button>
          <Link className={ui.btnGhost} href={`/trips/${params.id}/live`}>
            {t.arrive.back}
          </Link>
          <Link className={ui.btnGhost} href={`/trips/${params.id}/summary`}>
            {t.arrive.summary}
          </Link>
        </div>
      </div>
    </AppChrome>
  );
}
