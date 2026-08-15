"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import { ShareNetwork } from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { BadgeChip } from "@/components/BadgeChip";
import { closeTrip, getResults, getTrip } from "@/lib/api";
import { tapHaptic } from "@/lib/haptic";
import { shareTripInvite } from "@/lib/liff";
import { buildRecapFlex } from "@/lib/line-flex";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip, TripResults } from "@/lib/types";
import ui from "@/styles/ui.module.css";

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [results, setResults] = useState<TripResults | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const t = await getTrip(params.id);
      setTrip(t);
      let r = await getResults(params.id);
      if (!r && t?.state === "closed") {
        r = await getResults(params.id);
      }
      setResults(r);
    })();
  }, [params.id]);

  const onClose = async () => {
    setBusy(true);
    try {
      const closed = await closeTrip(params.id);
      setTrip(closed);
      setResults(await getResults(params.id));
      toast.success(t.summary.toastClose);
    } finally {
      setBusy(false);
    }
  };

  const isOrganizer = trip && user && trip.organizerId === user.id;

  return (
    <AppChrome title={t.summary.title}>
      <div className={`${ui.panel} fade-in`}>
        <section className={ui.ceremony}>
          <p className={ui.ceremonyKicker}>{t.summary.kicker}</p>
          <h2 className={ui.ceremonyTitle}>
            {trip?.title || t.summary.title}
          </h2>
          <p className={ui.lede}>{t.summary.lede}</p>
          <p className={ui.meta}>{t.social.leave}</p>
        </section>

        {results ? (
          <>
            <section className={ui.section}>
              <h2>{t.summary.snapshot}</h2>
              <p>
                <NumberFlow value={results.aggregate.arrivedCount} />{" "}
                {t.summary.of}{" "}
                <NumberFlow value={results.aggregate.participantCount} />{" "}
                {t.summary.arrived} ·{" "}
                <NumberFlow
                  value={Math.round(results.aggregate.onTimeShare * 100)}
                />
                % {t.summary.onTime}
              </p>
              {results.privateNote ? (
                <p className={ui.meta}>{results.privateNote}</p>
              ) : null}
              <p className={ui.quietProof}>{t.summary.quiet}</p>
              <button
                type="button"
                className={ui.btnPrimary}
                onClick={() => {
                  const url = `${window.location.origin}/trips/${params.id}/summary`;
                  const flex = buildRecapFlex({
                    url,
                    title: trip?.title || t.brand.name,
                    arrived: results.aggregate.arrivedCount,
                    total: results.aggregate.participantCount,
                    onTimePct: Math.round(results.aggregate.onTimeShare * 100),
                    locale,
                  });
                  void shareTripInvite(url, flex.altText, flex).then(() => {
                    tapHaptic();
                    toast(t.summary.recapShared);
                  });
                }}
              >
                <ShareNetwork size={18} />
                {t.summary.shareRecap}
              </button>
            </section>
            <section className={ui.section}>
              <h2>{t.summary.badges}</h2>
              <div className={ui.stack}>
                {results.badges.map((b) => (
                  <BadgeChip key={b.id} badge={b} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className={ui.section}>
            <h2>{t.summary.pending}</h2>
            <p className={ui.lede}>{t.summary.pendingCopy}</p>
            {isOrganizer ? (
              <button
                type="button"
                className={ui.btnPrimary}
                disabled={busy}
                onClick={() => void onClose()}
              >
                {busy ? t.summary.closing : t.summary.close}
              </button>
            ) : (
              <p className={ui.note}>{t.summary.waiting}</p>
            )}
          </section>
        )}

        <div className={ui.row}>
          <Link className={ui.btnGhost} href={`/trips/${params.id}`}>
            {t.nav.lobby}
          </Link>
          <Link className={ui.btnGhost} href="/">
            {t.summary.home}
          </Link>
        </div>
      </div>
    </AppChrome>
  );
}
