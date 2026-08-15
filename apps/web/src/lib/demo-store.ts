import { DEMO_DESTINATION } from "./geo";
import type {
  BadgeAward,
  CreateTripInput,
  SharingAction,
  Trip,
  TripParticipant,
  TripResults,
  User,
  Vehicle,
  LocationSample,
  ParticipantLocation,
  Freshness,
} from "./types";
import { freshnessFromAge, estimateEtaMinutes } from "./geo";

const TRIPS_KEY = "mcg.demo.trips";
const VEHICLES_KEY = "mcg.demo.vehicles";
const LOCATIONS_KEY = "mcg.demo.locations";
const RESULTS_KEY = "mcg.demo.results";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function seedTrip(): Trip {
  const now = Date.now();
  const target = new Date(now + 90 * 60_000);
  const inviteToken = "demo-invite-mcg";
  return {
    id: "trip_demo_bangkok",
    title: "ขบวนเย็นนี้",
    state: "published",
    organizerId: "demo-organizer",
    organizerName: "เอก",
    destinationName: "แมนดาริน โอเรียนเต็ล",
    destination: DEMO_DESTINATION,
    meetingPointName: "อโศก",
    meetingPoint: { lat: 13.737, lng: 100.56 },
    timezone: "Asia/Bangkok",
    targetArrivalAt: target.toISOString(),
    graceMinutes: 15,
    cutoffAt: new Date(target.getTime() + 45 * 60_000).toISOString(),
    notes: "เข้า valet ถนนโอเรียนเต็ล · ไม่แข่งนะ",
    inviteToken,
    inviteRevoked: false,
    capacity: 24,
    participants: [
      {
        userId: "demo-organizer",
        displayName: "เอก",
        role: "organizer",
        sharingState: "off",
        arrivalStatus: "pending",
        ready: true,
      },
    ],
    createdAt: new Date(now - 3600_000).toISOString(),
  };
}

export function ensureDemoSeed(): void {
  const trips = read<Trip[]>(TRIPS_KEY, []);
  if (trips.length === 0) {
    write(TRIPS_KEY, [seedTrip()]);
  }
}

export function listTrips(): Trip[] {
  return read<Trip[]>(TRIPS_KEY, []);
}

export function getTrip(id: string): Trip | null {
  return listTrips().find((t) => t.id === id) ?? null;
}

export function getTripByInvite(token: string): Trip | null {
  return listTrips().find((t) => t.inviteToken === token) ?? null;
}

export function saveTrip(trip: Trip): Trip {
  const trips = listTrips();
  const idx = trips.findIndex((t) => t.id === trip.id);
  if (idx >= 0) trips[idx] = trip;
  else trips.unshift(trip);
  write(TRIPS_KEY, trips);
  return trip;
}

export function createTripDemo(user: User, input: CreateTripInput): Trip {
  const trip: Trip = {
    id: uid("trip"),
    title: input.title,
    state: "published",
    organizerId: user.id,
    organizerName: user.displayName,
    destinationName: input.destinationName,
    destination: input.destination,
    timezone: input.timezone || "Asia/Bangkok",
    targetArrivalAt: input.targetArrivalAt,
    graceMinutes: input.graceMinutes,
    notes: input.notes,
    inviteToken: uid("inv"),
    inviteRevoked: false,
    participants: [
      {
        userId: user.id,
        displayName: user.displayName,
        role: "organizer",
        sharingState: "off",
        arrivalStatus: "pending",
        ready: true,
      },
    ],
    createdAt: new Date().toISOString(),
  };
  return saveTrip(trip);
}

export function joinTripDemo(
  tripId: string,
  user: User,
  vehicleId?: string,
): Trip {
  const trip = getTrip(tripId);
  if (!trip) throw new Error("Trip not found");
  if (trip.inviteRevoked) throw new Error("Invite revoked");
  if (!trip.participants.some((p) => p.userId === user.id)) {
    const vehicle = vehicleId
      ? getVehicles(user.id).find((v) => v.id === vehicleId)
      : undefined;
    const participant: TripParticipant = {
      userId: user.id,
      displayName: user.displayName,
      role: "member",
      sharingState: "off",
      arrivalStatus: "pending",
      vehicleId,
      vehicle,
      ready: Boolean(vehicle),
    };
    trip.participants.push(participant);
    saveTrip(trip);
  }
  return trip;
}

export function setSharingDemo(
  tripId: string,
  userId: string,
  action: SharingAction,
): Trip {
  const trip = getTrip(tripId);
  if (!trip) throw new Error("Trip not found");
  const p = trip.participants.find((x) => x.userId === userId);
  if (!p) throw new Error("Not a participant");
  p.sharingState =
    action === "start" ? "sharing" : action === "pause" ? "paused" : "off";
  if (trip.state === "published" && action === "start") {
    trip.state = "open";
  }
  return saveTrip(trip);
}

export function postLocationDemo(
  tripId: string,
  sample: LocationSample,
): void {
  const map = read<Record<string, LocationSample[]>>(LOCATIONS_KEY, {});
  const key = tripId;
  const list = map[key] || [];
  const filtered = list.filter((s) => s.userId !== sample.userId);
  filtered.push(sample);
  map[key] = filtered;
  write(LOCATIONS_KEY, map);
}

export function getLocationsDemo(tripId: string): ParticipantLocation[] {
  const trip = getTrip(tripId);
  if (!trip) return [];
  const map = read<Record<string, LocationSample[]>>(LOCATIONS_KEY, {});
  const samples = map[tripId] || [];
  const now = Date.now();
  return trip.participants
    .filter((p) => p.sharingState !== "off")
    .map((p) => {
      const sample = samples.find((s) => s.userId === p.userId);
      if (!sample) {
        return {
          userId: p.userId,
          displayName: p.displayName,
          lat: trip.meetingPoint?.lat ?? trip.destination.lat,
          lng: trip.meetingPoint?.lng ?? trip.destination.lng,
          sampledAt: new Date(now - 90_000).toISOString(),
          freshness: "offline" as Freshness,
          sharingState: p.sharingState,
          etaMinutes: null,
          vehicleColor: p.vehicle?.color,
          vehicleIcon: p.vehicle?.icon,
        };
      }
      const age = now - new Date(sample.sampledAt).getTime();
      const freshness = freshnessFromAge(age);
      return {
        ...sample,
        displayName: p.displayName,
        freshness,
        sharingState: p.sharingState,
        etaMinutes:
          freshness === "stale" || freshness === "offline"
            ? null
            : estimateEtaMinutes(sample, trip.destination),
        vehicleColor: p.vehicle?.color,
        vehicleIcon: p.vehicle?.icon,
      };
    });
}

export function confirmArrivalDemo(
  tripId: string,
  userId: string,
  dispute?: boolean,
): Trip {
  const trip = getTrip(tripId);
  if (!trip) throw new Error("Trip not found");
  const p = trip.participants.find((x) => x.userId === userId);
  if (!p) throw new Error("Not a participant");
  p.arrivalStatus = dispute ? "disputed" : "confirmed";
  p.sharingState = "off";
  return saveTrip(trip);
}

export function closeTripDemo(tripId: string): Trip {
  const trip = getTrip(tripId);
  if (!trip) throw new Error("Trip not found");
  trip.state = "closed";
  trip.participants.forEach((p) => {
    p.sharingState = "off";
  });
  saveTrip(trip);
  const badges = buildDemoBadges(trip);
  write(RESULTS_KEY, {
    ...read<Record<string, TripResults>>(RESULTS_KEY, {}),
    [tripId]: {
      tripId,
      published: true,
      badges,
      aggregate: {
        arrivedCount: trip.participants.filter(
          (p) => p.arrivalStatus === "confirmed",
        ).length,
        participantCount: trip.participants.length,
        onTimeShare: 0.75,
      },
      privateNote:
        "Late arrivals stay private. No speed or race metrics are scored.",
    },
  });
  return trip;
}

function buildDemoBadges(trip: Trip): BadgeAward[] {
  const awards: BadgeAward[] = [];
  for (const p of trip.participants) {
    if (p.arrivalStatus === "confirmed") {
      awards.push({
        id: uid("badge"),
        badge: "on_time",
        label: "On Time",
        points: 20,
        reason: `${p.displayName} arrived within the grace window.`,
      });
      awards.push({
        id: uid("badge"),
        badge: "safety_first",
        label: "Safety First",
        points: 10,
        reason: "Sharing stopped correctly and arrival confirmed.",
      });
    }
    if (p.role === "organizer") {
      awards.push({
        id: uid("badge"),
        badge: "road_captain",
        label: "Road Captain",
        points: 15,
        reason: "Organizer closed the trip with strong arrival coverage.",
      });
    }
  }
  return awards;
}

export function getResultsDemo(tripId: string): TripResults | null {
  const all = read<Record<string, TripResults>>(RESULTS_KEY, {});
  return all[tripId] ?? null;
}

export function revokeInviteDemo(tripId: string): Trip {
  const trip = getTrip(tripId);
  if (!trip) throw new Error("Trip not found");
  trip.inviteRevoked = true;
  return saveTrip(trip);
}

export function getVehicles(userId: string): Vehicle[] {
  const all = read<Record<string, Vehicle[]>>(VEHICLES_KEY, {});
  return all[userId] || [];
}

export function saveVehicle(vehicle: Vehicle): Vehicle {
  const all = read<Record<string, Vehicle[]>>(VEHICLES_KEY, {});
  const list = all[vehicle.userId] || [];
  const idx = list.findIndex((v) => v.id === vehicle.id);
  if (idx >= 0) list[idx] = vehicle;
  else list.push(vehicle);
  all[vehicle.userId] = list;
  write(VEHICLES_KEY, all);
  return vehicle;
}

export function upsertSimulatedLocations(
  tripId: string,
  samples: LocationSample[],
): void {
  const map = read<Record<string, LocationSample[]>>(LOCATIONS_KEY, {});
  const existing = map[tripId] || [];
  const byUser = new Map(existing.map((s) => [s.userId, s]));
  for (const s of samples) byUser.set(s.userId, s);
  map[tripId] = Array.from(byUser.values());
  write(LOCATIONS_KEY, map);

  const trip = getTrip(tripId);
  if (!trip) return;
  for (const s of samples) {
    let p = trip.participants.find((x) => x.userId === s.userId);
    if (!p) {
      p = {
        userId: s.userId,
        displayName: s.userId.replace("sim_", "Car "),
        role: "member",
        sharingState: "sharing",
        arrivalStatus: "pending",
        ready: true,
      };
      trip.participants.push(p);
    } else {
      p.sharingState = "sharing";
    }
  }
  if (trip.state === "published") trip.state = "open";
  saveTrip(trip);
}
