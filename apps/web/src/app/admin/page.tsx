"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Prohibit, XCircle } from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { closeTrip, listTrips, revokeInvite } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import type { Trip } from "@/lib/types";
import ui from "@/styles/ui.module.css";

export default function AdminPage() {
  const { user, ready, demoLogin } = useAuth();
  const { t } = useLocale();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setTrips(await listTrips());
  }, []);

  useEffect(() => {
    if (!ready) return;
    const boot = async () => {
      if (!user) await demoLogin("admin");
      await reload();
    };
    void boot();
  }, [ready, user, demoLogin, reload]);

  const onRevoke = async (id: string) => {
    await revokeInvite(id);
    toast.message(t.admin.toastRevoke);
    setMessage(t.admin.toastRevoke);
    await reload();
  };

  const onClose = async (id: string) => {
    await closeTrip(id);
    toast.success(t.admin.toastClose);
    setMessage(t.admin.toastClose);
    await reload();
  };

  return (
    <AppChrome title={t.nav.admin}>
      <div className={`${ui.panel} fade-in`}>
        <section className={ui.section}>
          <h2>{t.admin.title}</h2>
          <p className={ui.lede}>{t.admin.lede}</p>
        </section>

        <ul className={ui.list}>
          {trips.map((trip) => (
            <li key={trip.id} className={ui.listItem} style={{ alignItems: "flex-start" }}>
              <div>
                <strong>{trip.title}</strong>
                <div className={ui.meta}>
                  {trip.state} · {trip.participants.length} · {trip.inviteToken}
                </div>
                <div className={ui.row} style={{ marginTop: "0.65rem" }}>
                  <Link className={ui.btnGhost} href={`/trips/${trip.id}`}>
                    {t.admin.open}
                  </Link>
                  <button
                    type="button"
                    className={ui.btnGhost}
                    disabled={trip.inviteRevoked}
                    onClick={() => void onRevoke(trip.id)}
                  >
                    <Prohibit size={16} />
                    {t.admin.revoke}
                  </button>
                  <button
                    type="button"
                    className={ui.btnDanger}
                    disabled={trip.state === "closed"}
                    onClick={() => void onClose(trip.id)}
                  >
                    <XCircle size={16} />
                    {t.admin.close}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {trips.length === 0 ? (
            <li className={ui.listItem}>
              {t.admin.empty}{" "}
              <Link href="/trips/new">{t.admin.create}</Link>
            </li>
          ) : null}
        </ul>
        {message ? <p className={ui.note}>{message}</p> : null}
      </div>
    </AppChrome>
  );
}
