"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Drawer } from "vaul";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import * as turf from "@turf/turf";
import {
  ChatTeardrop,
  FlagCheckered,
  MapTrifold,
  Pause,
  Play,
  Stop,
  Path,
} from "@phosphor-icons/react";
import { ConvoyMap } from "@/components/ConvoyMap";
import { LuxurySwitch } from "@/components/LuxurySwitch";
import { SafetyBanner } from "@/components/SafetyBanner";
import { SharingIndicator } from "@/components/SharingIndicator";
import {
  fetchLiveLocations,
  getTrip,
  postLocations,
  setSharing,
} from "@/lib/api";
import { DEMO_ROUTES, interpolate, openExternalMaps, watchPosition } from "@/lib/geo";
import { tapHaptic } from "@/lib/haptic";
import { briefingLine, routeBriefing } from "@/lib/briefing";
import { convoyRole } from "@/lib/convoy-roles";
import { shareTripInvite } from "@/lib/liff";
import { buildStatusFlex } from "@/lib/line-flex";
import { isPlottable, liveCount, mergeConvoyRoster } from "@/lib/roster";
import { useAuth } from "@/hooks/useAuth";
import { useDrivingMode } from "@/hooks/useDrivingMode";
import { useLocale } from "@/lib/i18n/locale";
import type {
  LocationSample,
  ParticipantLocation,
  SharingState,
  Trip,
} from "@/lib/types";
import styles from "./live.module.css";
import ui from "@/styles/ui.module.css";

const SNAP = [0.26, 0.5, 0.92] as const;

export default function LiveTripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, demoLogin } = useAuth();
  const { t } = useLocale();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<ParticipantLocation[]>([]);
  const [simLocations, setSimLocations] = useState<ParticipantLocation[]>([]);
  const [sharing, setSharingState] = useState<SharingState>("off");
  const [speed, setSpeed] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [wide, setWide] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(SNAP[1]);
  const watchRef = useRef<{ stop: () => void } | null>(null);
  const simRef = useRef<number | null>(null);
  const { passengerMode, setPassengerMode, denseInputsLocked, moving } =
    useDrivingMode(speed);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 720px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const refresh = useCallback(async () => {
    const [t, locs] = await Promise.all([
      getTrip(params.id),
      fetchLiveLocations(params.id),
    ]);
    setTrip(t);
    setLocations(locs);
    if (user && t) {
      const me = t.participants.find((p) => p.userId === user.id);
      if (me) setSharingState(me.sharingState);
    }
  }, [params.id, user]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    return () => {
      watchRef.current?.stop();
      if (simRef.current) window.clearInterval(simRef.current);
    };
  }, []);

  const ensureUser = async () => user || (await demoLogin("member"));

  const startWatch = async (activeUserId: string) => {
    watchRef.current?.stop();
    watchRef.current = watchPosition(
      (sample) => {
        if (trip) {
          const dLat = Math.abs(sample.lat - trip.destination.lat);
          const dLng = Math.abs(sample.lng - trip.destination.lng);
          if (dLat > 2 || dLng > 2 || Math.abs(sample.lat) < 0.01) {
            setGeoError(
              "GPS looks far from the trip area — use Simulate convoy or move closer.",
            );
            return;
          }
        }
        setSpeed(sample.speed ?? null);
        void postLocations(params.id, [
          { ...sample, userId: activeUserId } satisfies LocationSample,
        ]).then(() => refresh());
      },
      (msg) => setGeoError(msg),
    );
  };

  const onShare = async (action: "start" | "pause" | "stop") => {
    const active = await ensureUser();
    const updated = await setSharing(params.id, action);
    const me = updated.participants.find((p) => p.userId === active.id);
    setSharingState(me?.sharingState || "off");
    tapHaptic(action === "stop" ? 20 : 12);
    if (action === "start") {
      toast.success(t.live.toastOn);
      await startWatch(active.id);
    }
    if (action === "pause") toast(t.live.toastPause);
    if (action === "pause" || action === "stop") {
      watchRef.current?.stop();
      watchRef.current = null;
    }
    if (action === "stop") {
      toast.message(t.live.toastStop);
      router.push(`/trips/${params.id}/arrive`);
    }
    await refresh();
  };

  const simulateConvoy = () => {
    if (simulating) {
      if (simRef.current) window.clearInterval(simRef.current);
      simRef.current = null;
      setSimulating(false);
      setSimLocations([]);
      toast(t.live.toastSimStop);
      return;
    }
    setSimulating(true);
    toast(t.live.toastSim);
    let tick = 0;
    simRef.current = window.setInterval(() => {
      tick += 1;
      const progress = Math.min(1, tick / 40);
      const next: ParticipantLocation[] = DEMO_ROUTES.map((route, i) => {
        const idx = Math.min(
          route.length - 2,
          Math.floor(progress * (route.length - 1)),
        );
        const localT = progress * (route.length - 1) - idx;
        const from = route[idx];
        const to = route[idx + 1];
        const pos = interpolate(from, to, localT);
        const heading = turf.bearing(
          turf.point([from.lng, from.lat]),
          turf.point([to.lng, to.lat]),
        );
        const freshness = i === 2 ? "stale" : i === 1 ? "delayed" : "live";
        return {
          userId: `sim_${i + 1}`,
          displayName: ["รถนำ", "ปีก", "ปิดท้าย"][i],
          lat: pos.lat,
          lng: pos.lng,
          speed: 12,
          heading,
          accuracy: 8,
          sampledAt: new Date().toISOString(),
          freshness: freshness as ParticipantLocation["freshness"],
          sharingState: "sharing" as const,
          etaMinutes: Math.max(2, 18 - tick),
        };
      });
      setSimLocations(next);
      if (progress >= 1 && simRef.current) {
        window.clearInterval(simRef.current);
        simRef.current = null;
        setSimulating(false);
      }
    }, 1000);
  };

  if (!trip) {
    return (
      <div className={styles.liveRoot}>
        <p className={ui.note} style={{ padding: "2rem" }}>
          Loading live map…
        </p>
      </div>
    );
  }

  const roster = mergeConvoyRoster(trip, locations, simLocations);
  const plotted = roster.filter((p) => isPlottable(p, trip.destination));
  const etaSelf =
    roster.find((l) => l.userId === user?.id)?.etaMinutes ??
    plotted.find((l) => l.freshness === "live")?.etaMinutes;
  const snapValue = typeof snap === "number" ? snap : Number(snap);
  const expanded = wide || (Number.isFinite(snapValue) && snapValue >= 0.45);
  const hud = (
    <LiveHud
      trip={trip}
      etaMinutes={etaSelf}
      participants={roster}
      liveCars={liveCount(roster)}
      expanded={expanded}
      passengerMode={passengerMode}
      setPassengerMode={setPassengerMode}
      moving={moving}
      sharing={sharing}
      denseInputsLocked={denseInputsLocked}
      simulating={simulating}
      geoError={geoError}
      onShare={onShare}
      onSimulate={simulateConvoy}
    />
  );

  return (
    <div className={styles.liveRoot}>
      <ConvoyMap
        destination={trip.destination}
        destinationLabel={trip.destinationName}
        participants={plotted}
        selfId={user?.id}
        geofenceMeters={150}
        recenterLabel={t.live.recenter}
        trails={
          simulating
            ? DEMO_ROUTES.map((path, i) => ({ id: `trail-${i}`, path }))
            : []
        }
      />

      <div className={styles.overlayTop}>
        <SafetyBanner compact />
        <SharingIndicator state={sharing} />
      </div>

      {wide ? (
        <div className={styles.sheet}>{hud}</div>
      ) : (
        <Drawer.Root
          open
          modal={false}
          dismissible={false}
          snapPoints={[...SNAP]}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
        >
          <Drawer.Portal>
            <Drawer.Content className={styles.drawer} aria-describedby={undefined}>
              <Drawer.Title className="sr-only">
                {trip.title} live convoy
              </Drawer.Title>
              <div className={styles.handle} />
              {hud}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  );
}

function LiveHud({
  trip,
  etaMinutes,
  participants,
  liveCars,
  expanded,
  passengerMode,
  setPassengerMode,
  moving,
  sharing,
  denseInputsLocked,
  simulating,
  geoError,
  onShare,
  onSimulate,
}: {
  trip: Trip;
  etaMinutes?: number | null;
  participants: ParticipantLocation[];
  liveCars: number;
  expanded: boolean;
  passengerMode: boolean;
  setPassengerMode: (v: boolean) => void;
  moving: boolean;
  sharing: SharingState;
  denseInputsLocked: boolean;
  simulating: boolean;
  geoError: string | null;
  onShare: (action: "start" | "pause" | "stop") => void;
  onSimulate: () => void;
}) {
  const { t, locale } = useLocale();
  const briefing = routeBriefing(trip, locale);
  const lead = trip.participants.find((p) => p.role === "organizer");
  const shareStatus = async () => {
    const url = `${window.location.origin}/trips/${trip.id}/live`;
    const flex = buildStatusFlex({
      url,
      title: trip.title,
      liveCount: liveCars,
      total: participants.length || trip.participants.length,
      leadLive: lead?.sharingState === "sharing",
      locale,
    });
    await shareTripInvite(url, flex.altText, flex);
    tapHaptic();
    toast(t.steward.statusShared);
  };
  return (
    <>
      <div className={styles.sheetHeader}>
        <div>
          <p className={styles.kicker}>{t.live.kicker}</p>
          <h1>{trip.title}</h1>
          <p className={styles.peekMeta}>
            <NumberFlow value={liveCars} /> {t.live.liveCount} ·{" "}
            {participants.length} {t.live.inConvoy}
            {liveCars > 0 ? ` · ${t.quiet.ready}` : ""}
          </p>
          <p className={styles.peekMeta}>{briefingLine(briefing, locale)}</p>
        </div>
        <span className={ui.pill}>
          {etaMinutes != null ? (
            <>
              {t.live.eta}{" "}
              <NumberFlow value={etaMinutes} />
              {t.lobby.minutes}
            </>
          ) : (
            t.live.etaCalc
          )}
        </span>
      </div>

      {expanded ? (
        <ul className={styles.etaList}>
          {participants.map((l) => {
            const member = trip.participants.find((p) => p.userId === l.userId);
            const role = member ? convoyRole(member, trip) : null;
            return (
              <li key={l.userId}>
                <span>
                  {l.displayName}
                  {role && role !== "member" ? ` · ${t.roles[role]}` : ""}
                </span>
                <span className={styles[`f_${l.freshness}`]}>
                  {t.freshness[l.freshness]}
                  {l.etaMinutes != null ? (
                    <>
                      {" · "}
                      <NumberFlow value={l.etaMinutes} />
                      {t.lobby.minutes}
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
          {participants.length === 0 ? (
            <li className={ui.meta}>{t.live.noPos}</li>
          ) : null}
        </ul>
      ) : null}

      {expanded ? (
        <LuxurySwitch
          checked={passengerMode}
          onCheckedChange={setPassengerMode}
          label={moving ? t.live.passengerMoving : t.live.passenger}
        />
      ) : null}

      <div
        className={`${styles.actions} ${denseInputsLocked ? ui.drivingLock : ""}`}
      >
        {sharing !== "sharing" ? (
          <button
            type="button"
            className={ui.btnPrimary}
            onClick={() => void onShare("start")}
          >
            <Play size={18} weight="fill" />
            {sharing === "paused" ? t.live.resume : t.live.start}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={ui.btnGhost}
              onClick={() => void onShare("pause")}
            >
              <Pause size={18} weight="bold" />
              {t.live.pause}
            </button>
            <button
              type="button"
              className={ui.btnDanger}
              onClick={() => void onShare("stop")}
            >
              <Stop size={18} weight="bold" />
              {t.live.stop}
            </button>
          </>
        )}
        {expanded ? (
          <>
            <button
              type="button"
              className={ui.btnGhost}
              onClick={() => void shareStatus()}
            >
              <ChatTeardrop size={18} />
              {t.live.shareStatus}
            </button>
            <button
              type="button"
              className={ui.btnGhost}
              onClick={() =>
                openExternalMaps(trip.destination, trip.destinationName)
              }
            >
              <MapTrifold size={18} />
              {t.live.external}
            </button>
            <button type="button" className={ui.btnGhost} onClick={onSimulate}>
              <Path size={18} />
              {simulating ? t.live.stopSim : t.live.simulate}
            </button>
            <Link className={ui.btnGhost} href={`/trips/${trip.id}/arrive`}>
              <FlagCheckered size={18} />
              {t.live.arrival}
            </Link>
          </>
        ) : null}
      </div>
      {geoError ? <p className={ui.note}>{geoError}</p> : null}
      {denseInputsLocked ? (
        <p className={ui.note}>{t.live.locked}</p>
      ) : null}
    </>
  );
}
