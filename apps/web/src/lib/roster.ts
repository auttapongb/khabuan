import type {
  ParticipantLocation,
  SharingState,
  Trip,
  TripParticipant,
} from "./types";

export function isPlottable(
  point: { lat: number; lng: number },
  destination?: { lat: number; lng: number },
): boolean {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  if (Math.abs(point.lat) < 0.01 && Math.abs(point.lng) < 0.01) return false;
  if (!destination) return true;
  return (
    Math.abs(point.lat - destination.lat) < 0.8 &&
    Math.abs(point.lng - destination.lng) < 0.8
  );
}

function stubLocation(
  trip: Trip,
  participant: TripParticipant,
): ParticipantLocation {
  return {
    userId: participant.userId,
    displayName: participant.displayName,
    lat: 0,
    lng: 0,
    sampledAt: trip.createdAt,
    freshness: "offline",
    sharingState: participant.sharingState,
    vehicleColor: participant.vehicle?.color,
    vehicleIcon: participant.vehicle?.icon,
  };
}

function overlayMember(
  participant: TripParticipant,
  sample: ParticipantLocation,
): ParticipantLocation {
  return {
    ...sample,
    userId: participant.userId,
    displayName: participant.displayName,
    vehicleColor: sample.vehicleColor ?? participant.vehicle?.color,
    vehicleIcon: sample.vehicleIcon ?? participant.vehicle?.icon,
    sharingState: (sample.sharingState ||
      participant.sharingState) as SharingState,
  };
}

/** Trip members first; live GPS overlays them; sim binds onto members by index. */
export function mergeConvoyRoster(
  trip: Trip,
  live: ParticipantLocation[],
  sim: ParticipantLocation[],
): ParticipantLocation[] {
  const liveByUser = new Map(live.map((sample) => [sample.userId, sample]));

  const members = trip.participants.map((participant, index) => {
    const simHit = sim[index];
    if (simHit) return overlayMember(participant, simHit);
    const liveHit = liveByUser.get(participant.userId);
    if (liveHit) return overlayMember(participant, liveHit);
    return stubLocation(trip, participant);
  });

  const extras = sim.slice(trip.participants.length);
  return [...members, ...extras];
}

export function liveCount(roster: ParticipantLocation[]): number {
  return roster.filter((p) => p.freshness === "live").length;
}
