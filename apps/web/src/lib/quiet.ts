import type { Trip } from "./types";

export function sharingCount(trip: Trip): number {
  return trip.participants.filter((p) => p.sharingState === "sharing").length;
}

export function quietProof(trip: Trip): {
  live: number;
  total: number;
  ready: boolean;
} {
  const live = sharingCount(trip);
  const total = Math.max(1, trip.participants.length);
  return { live, total, ready: live > 0 };
}
