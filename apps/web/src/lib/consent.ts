const KEY = "mcg.pdpa.location";

export type LocationConsent = {
  tripId: string;
  grantedAt: string;
  purpose: "convoy-live-location";
};

export function recordLocationConsent(tripId: string): LocationConsent {
  const record: LocationConsent = {
    tripId,
    grantedAt: new Date().toISOString(),
    purpose: "convoy-live-location",
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(record));
  }
  return record;
}

export function readLocationConsent(): LocationConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocationConsent) : null;
  } catch {
    return null;
  }
}
