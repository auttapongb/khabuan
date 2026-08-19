import type { Freshness, LatLng, LocationSample } from "./types";

export const FRESHNESS_LIVE_MS = 60_000;
export const FRESHNESS_DELAYED_MS = 300_000;
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

/** Compact "last updated" label for a car marker (e.g. "5m ago", "2h ago"). */
export function lastUpdateLabel(ageMs: number): string {
  const min = Math.round(ageMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
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
    { lat: 13.71998, lng: 100.52000 },
    { lat: 13.71995, lng: 100.51964 },
    { lat: 13.71950, lng: 100.51891 },
    { lat: 13.71915, lng: 100.51888 },
    { lat: 13.71947, lng: 100.51872 },
    { lat: 13.72160, lng: 100.51813 },
    { lat: 13.72254, lng: 100.51787 },
    { lat: 13.72280, lng: 100.51806 },
    { lat: 13.72316, lng: 100.51907 },
    { lat: 13.72348, lng: 100.51994 },
    { lat: 13.72363, lng: 100.52036 },
    { lat: 13.72381, lng: 100.52084 },
    { lat: 13.72410, lng: 100.52166 },
    { lat: 13.72447, lng: 100.52268 },
    { lat: 13.72491, lng: 100.52390 },
    { lat: 13.72537, lng: 100.52523 },
    { lat: 13.72560, lng: 100.52588 },
    { lat: 13.72588, lng: 100.52671 },
    { lat: 13.72629, lng: 100.52786 },
    { lat: 13.72668, lng: 100.52897 },
    { lat: 13.72719, lng: 100.53041 },
    { lat: 13.72737, lng: 100.53091 },
    { lat: 13.72801, lng: 100.53265 },
    { lat: 13.72852, lng: 100.53404 },
    { lat: 13.72904, lng: 100.53546 },
    { lat: 13.72934, lng: 100.53625 },
    { lat: 13.72984, lng: 100.53566 },
    { lat: 13.73057, lng: 100.53394 },
    { lat: 13.73072, lng: 100.53360 },
    { lat: 13.73191, lng: 100.53374 },
    { lat: 13.73315, lng: 100.53392 },
    { lat: 13.73432, lng: 100.53408 },
    { lat: 13.73779, lng: 100.53458 },
    { lat: 13.73800, lng: 100.53461 },
    { lat: 13.73816, lng: 100.53463 },
    { lat: 13.74012, lng: 100.53492 },
    { lat: 13.74193, lng: 100.53521 },
    { lat: 13.74352, lng: 100.53546 },
    { lat: 13.74518, lng: 100.53573 },
    { lat: 13.74539, lng: 100.53544 },
    { lat: 13.74549, lng: 100.53490 },
  ],
[
    { lat: 13.76002, lng: 100.54996 },
    { lat: 13.76171, lng: 100.55143 },
    { lat: 13.76275, lng: 100.55017 },
    { lat: 13.76345, lng: 100.54871 },
    { lat: 13.76371, lng: 100.54805 },
    { lat: 13.76378, lng: 100.54774 },
    { lat: 13.76380, lng: 100.54741 },
    { lat: 13.76375, lng: 100.54694 },
    { lat: 13.76341, lng: 100.54574 },
    { lat: 13.76294, lng: 100.54417 },
    { lat: 13.76269, lng: 100.54325 },
    { lat: 13.76261, lng: 100.54301 },
    { lat: 13.76252, lng: 100.54279 },
    { lat: 13.76236, lng: 100.54258 },
    { lat: 13.76195, lng: 100.54247 },
    { lat: 13.76066, lng: 100.54247 },
    { lat: 13.76003, lng: 100.54247 },
    { lat: 13.75875, lng: 100.54245 },
    { lat: 13.75788, lng: 100.54245 },
    { lat: 13.75692, lng: 100.54244 },
    { lat: 13.75614, lng: 100.54242 },
    { lat: 13.75570, lng: 100.54234 },
    { lat: 13.75517, lng: 100.54221 },
    { lat: 13.75491, lng: 100.54215 },
    { lat: 13.75473, lng: 100.54211 },
    { lat: 13.75372, lng: 100.54187 },
    { lat: 13.75280, lng: 100.54165 },
    { lat: 13.75177, lng: 100.54141 },
    { lat: 13.75081, lng: 100.54118 },
    { lat: 13.75005, lng: 100.54107 },
    { lat: 13.74962, lng: 100.54108 },
    { lat: 13.74818, lng: 100.54086 },
    { lat: 13.74791, lng: 100.54082 },
    { lat: 13.74761, lng: 100.54077 },
    { lat: 13.74676, lng: 100.54063 },
    { lat: 13.74452, lng: 100.54027 },
    { lat: 13.74454, lng: 100.53991 },
    { lat: 13.74493, lng: 100.53762 },
    { lat: 13.74530, lng: 100.53592 },
    { lat: 13.74539, lng: 100.53544 },
    { lat: 13.74549, lng: 100.53490 },
  ],
[
    { lat: 13.74023, lng: 100.51013 },
    { lat: 13.74097, lng: 100.50983 },
    { lat: 13.74154, lng: 100.51022 },
    { lat: 13.74175, lng: 100.51037 },
    { lat: 13.74213, lng: 100.51059 },
    { lat: 13.74243, lng: 100.51070 },
    { lat: 13.74376, lng: 100.51025 },
    { lat: 13.74466, lng: 100.51075 },
    { lat: 13.74599, lng: 100.51150 },
    { lat: 13.74658, lng: 100.51185 },
    { lat: 13.74702, lng: 100.51220 },
    { lat: 13.74765, lng: 100.51298 },
    { lat: 13.74787, lng: 100.51324 },
    { lat: 13.74801, lng: 100.51336 },
    { lat: 13.74842, lng: 100.51365 },
    { lat: 13.74908, lng: 100.51403 },
    { lat: 13.74949, lng: 100.51426 },
    { lat: 13.74988, lng: 100.51463 },
    { lat: 13.74938, lng: 100.51601 },
    { lat: 13.74923, lng: 100.51643 },
    { lat: 13.74906, lng: 100.51686 },
    { lat: 13.74900, lng: 100.51702 },
    { lat: 13.74826, lng: 100.51904 },
    { lat: 13.74821, lng: 100.51926 },
    { lat: 13.74812, lng: 100.51979 },
    { lat: 13.74802, lng: 100.52043 },
    { lat: 13.74794, lng: 100.52090 },
    { lat: 13.74781, lng: 100.52170 },
    { lat: 13.74772, lng: 100.52222 },
    { lat: 13.74765, lng: 100.52264 },
    { lat: 13.74759, lng: 100.52299 },
    { lat: 13.74751, lng: 100.52340 },
    { lat: 13.74745, lng: 100.52376 },
    { lat: 13.74738, lng: 100.52417 },
    { lat: 13.74727, lng: 100.52503 },
    { lat: 13.74693, lng: 100.52705 },
    { lat: 13.74678, lng: 100.52792 },
    { lat: 13.74662, lng: 100.52888 },
    { lat: 13.74645, lng: 100.52986 },
    { lat: 13.74633, lng: 100.53059 },
    { lat: 13.74628, lng: 100.53083 },
    { lat: 13.74620, lng: 100.53134 },
    { lat: 13.74610, lng: 100.53194 },
    { lat: 13.74585, lng: 100.53289 },
    { lat: 13.74582, lng: 100.53309 },
    { lat: 13.74571, lng: 100.53367 },
    { lat: 13.74559, lng: 100.53434 },
    { lat: 13.74549, lng: 100.53490 },
  ],
];
