import type { Freshness, LatLng, LocationSample } from "./types";

export const FRESHNESS_LIVE_MS = 15_000;
export const FRESHNESS_DELAYED_MS = 60_000;
export const DRIVING_SPEED_MPS = 4; // ~14 km/h — simplify UI when moving

export function freshnessFromAge(ageMs: number): Freshness {
  if (ageMs <= FRESHNESS_LIVE_MS) return "live";
  if (ageMs <= FRESHNESS_DELAYED_MS) return "delayed";
  return "stale";
}

export function freshnessLabel(f: Freshness): string {
  switch (f) {
    case "live":
      return "Live";
    case "delayed":
      return "Delayed";
    case "stale":
      return "Stale";
    default:
      return "Offline";
  }
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimateEtaMinutes(
  from: LatLng,
  to: LatLng,
  speedMps = 12,
): number {
  const meters = haversineMeters(from, to);
  const minutes = meters / Math.max(speedMps, 1) / 60;
  return Math.max(1, Math.round(minutes));
}

export function openExternalMaps(destination: LatLng, label?: string): void {
  const q = encodeURIComponent(
    label ? `${label} @${destination.lat},${destination.lng}` : `${destination.lat},${destination.lng}`,
  );
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving&destination_place_id=&q=${q}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export type GeoWatchHandle = {
  stop: () => void;
};

export function watchPosition(
  onUpdate: (sample: Omit<LocationSample, "userId">) => void,
  onError?: (message: string) => void,
): GeoWatchHandle {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError?.("Geolocation is not available on this device.");
    return { stop: () => undefined };
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
        sampledAt: new Date(pos.timestamp).toISOString(),
      });
    },
    (err) => onError?.(err.message),
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    },
  );

  return {
    stop: () => navigator.geolocation.clearWatch(id),
  };
}

export function interpolate(
  from: LatLng,
  to: LatLng,
  t: number,
): LatLng {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

/** Demo convoy paths around Bangkok for simulate mode */
export const DEMO_DESTINATION: LatLng = { lat: 13.746, lng: 100.535 };
export const DEMO_MEETING: LatLng = { lat: 13.7563, lng: 100.5018 };
export const DEMO_ROUTES: LatLng[][] = [
  [
    { lat: 13.72, lng: 100.52 },
    { lat: 13.73, lng: 100.525 },
    { lat: 13.738, lng: 100.53 },
    DEMO_DESTINATION,
  ],
  [
    { lat: 13.76, lng: 100.55 },
    { lat: 13.755, lng: 100.545 },
    { lat: 13.75, lng: 100.54 },
    DEMO_DESTINATION,
  ],
  [
    { lat: 13.74, lng: 100.51 },
    { lat: 13.742, lng: 100.52 },
    { lat: 13.744, lng: 100.53 },
    DEMO_DESTINATION,
  ],
];
