"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag } from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { createTrip } from "@/lib/api";
import { DEMO_DESTINATION, DEMO_MEETING } from "@/lib/geo";
import { tapHaptic } from "@/lib/haptic";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import ui from "@/styles/ui.module.css";

export default function NewTripPage() {
  const router = useRouter();
  const { user, ready, demoLogin } = useAuth();
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) await demoLogin("organizer");
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const trip = await createTrip({
        title: String(fd.get("title") || t.brand.name),
        destinationName: String(fd.get("destinationName")),
        destination: {
          lat: Number(fd.get("lat")) || DEMO_DESTINATION.lat,
          lng: Number(fd.get("lng")) || DEMO_DESTINATION.lng,
        },
        meetingPointName: String(fd.get("meetingPointName") || ""),
        meetingPoint: {
          lat: Number(fd.get("meetLat")) || DEMO_MEETING.lat,
          lng: Number(fd.get("meetLng")) || DEMO_MEETING.lng,
        },
        targetArrivalAt: new Date(String(fd.get("targetArrivalAt"))).toISOString(),
        graceMinutes: Number(fd.get("graceMinutes")) || 15,
        notes: String(fd.get("notes") || ""),
        timezone: "Asia/Bangkok",
      });
      tapHaptic();
      toast.success(t.create.toast);
      router.push(`/trips/${trip.id}?share=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.create.fail);
    } finally {
      setSaving(false);
    }
  };

  const defaultArrival = new Date(Date.now() + 2 * 60 * 60_000);
  const localValue = new Date(
    defaultArrival.getTime() - defaultArrival.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);

  return (
    <AppChrome title={t.create.title}>
      <form className={`${ui.panel} fade-in`} onSubmit={(e) => void onSubmit(e)}>
        <section className={ui.ceremony}>
          <p className={ui.ceremonyKicker}>{t.create.kicker}</p>
          <h2 className={ui.ceremonyTitle}>{t.create.heading}</h2>
          <p className={ui.lede}>{t.create.lede}</p>
        </section>

        {!ready ? <p className={ui.note}>{t.cta.preparing}</p> : null}

        <div className={ui.field}>
          <label htmlFor="title">{t.create.name}</label>
          <input
            id="title"
            name="title"
            required
            defaultValue="ขบวนเย็นนี้"
          />
        </div>
        <div className={ui.field}>
          <label htmlFor="destinationName">{t.create.destination}</label>
          <input
            id="destinationName"
            name="destinationName"
            required
            defaultValue="แมนดาริน โอเรียนเต็ล · Mandarin Oriental Bangkok"
          />
        </div>
        <div className={ui.field}>
          <label htmlFor="meetingPointName">{t.create.meeting}</label>
          <input
            id="meetingPointName"
            name="meetingPointName"
            defaultValue="อนุสาวรีย์ชัยสมรภูมิ · Victory Monument"
          />
        </div>
        <details className={ui.advanced}>
          <summary>{t.create.advanced}</summary>
          <div className={ui.row}>
            <div className={ui.field} style={{ flex: 1 }}>
              <label htmlFor="lat">{t.create.lat}</label>
              <input
                id="lat"
                name="lat"
                type="number"
                step="any"
                defaultValue={DEMO_DESTINATION.lat}
              />
            </div>
            <div className={ui.field} style={{ flex: 1 }}>
              <label htmlFor="lng">{t.create.lng}</label>
              <input
                id="lng"
                name="lng"
                type="number"
                step="any"
                defaultValue={DEMO_DESTINATION.lng}
              />
            </div>
          </div>
        </details>
        <div className={ui.field}>
          <label htmlFor="targetArrivalAt">{t.create.target}</label>
          <input
            id="targetArrivalAt"
            name="targetArrivalAt"
            type="datetime-local"
            required
            defaultValue={localValue}
          />
        </div>
        <div className={ui.field}>
          <label htmlFor="graceMinutes">{t.create.grace}</label>
          <input
            id="graceMinutes"
            name="graceMinutes"
            type="number"
            min={5}
            max={60}
            defaultValue={15}
          />
        </div>
        <div className={ui.field}>
          <label htmlFor="notes">{t.create.notes}</label>
          <textarea
            id="notes"
            name="notes"
            defaultValue="Valet on Oriental Avenue. เติม Easy Pass ก่อนออก — ไม่แข่งความเร็ว."
          />
        </div>

        {error ? <p className={ui.note}>{error}</p> : null}

        <button type="submit" className={ui.btnPrimary} disabled={saving}>
          <Flag size={18} weight="fill" />
          {saving ? t.create.creating : t.create.submit}
        </button>
      </form>
    </AppChrome>
  );
}
