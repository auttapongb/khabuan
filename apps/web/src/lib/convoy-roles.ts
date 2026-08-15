import type { Trip, TripParticipant } from "./types";

export type ConvoyRole = "lead" | "sweep" | "member";

/** Thai club pattern: organizer is รถนำ; last non-lead member is รถปิดท้าย. */
export function convoyRole(participant: TripParticipant, trip: Trip): ConvoyRole {
  if (
    participant.role === "organizer" ||
    participant.userId === trip.organizerId
  ) {
    return "lead";
  }
  const others = trip.participants.filter((p) => p.userId !== trip.organizerId);
  if (others.at(-1)?.userId === participant.userId) return "sweep";
  return "member";
}

export function meetingPointLabel(trip: {
  meetingPointName?: string;
  meetingPoint?: { lat: number; lng: number };
}): string | null {
  if (trip.meetingPointName) return trip.meetingPointName;
  const p = trip.meetingPoint;
  if (!p) return null;
  if (Math.abs(p.lat - 13.7563) < 0.01 && Math.abs(p.lng - 100.5018) < 0.02) {
    return "อนุสาวรีย์ชัยสมรภูมิ · Victory Monument";
  }
  return `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
}
