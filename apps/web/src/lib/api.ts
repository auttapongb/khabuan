import * as demo from "./demo-store";
import { getStoredUser, isDemoMode } from "./liff";
import type {
  CreateTripInput,
  JoinTripInput,
  LocationSample,
  ParticipantLocation,
  SharingAction,
  SharingState,
  Trip,
  TripParticipant,
  TripResults,
  TripState,
  User,
  Vehicle,
  ArrivalStatus,
  Freshness,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const DEMO_CLUB_ID = "33333333-3333-4333-8333-333333333333";

type TokenStore = { accessToken?: string };
const tokenRef: TokenStore = {};

let apiHealthy: boolean | null = null;
let apiCheckedAt = 0;

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokenRef.accessToken) {
    headers.Authorization = `Bearer ${tokenRef.accessToken}`;
  }
  return headers;
}

async function checkApi(): Promise<boolean> {
  const now = Date.now();
  if (apiHealthy !== null && now - apiCheckedAt < 15_000) return apiHealthy;
  try {
    const res = await fetch(`${API_URL}/v1/health`, {
      signal: AbortSignal.timeout(1500),
    });
    apiHealthy = res.ok;
  } catch {
    apiHealthy = false;
  }
  apiCheckedAt = now;
  return apiHealthy;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  if (!(await checkApi())) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers || {}) },
      credentials: "include",
    });
    if (!res.ok) return null;
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch {
    apiHealthy = false;
    return null;
  }
}

function requireUser(): User {
  const user = getStoredUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

function mapState(state: string): TripState {
  return state.toLowerCase() as TripState;
}

function mapSharing(state: string): SharingState {
  const s = state.toUpperCase();
  if (s === "ACTIVE") return "sharing";
  if (s === "PAUSED") return "paused";
  return "off";
}

function mapArrival(status: string): ArrivalStatus {
  const s = status.toUpperCase();
  if (s === "NONE" || s === "PENDING") return "pending";
  if (s === "CANDIDATE") return "candidate";
  if (s === "CONFIRMED") return "confirmed";
  if (s === "DISPUTED") return "disputed";
  if (s === "CORRECTED") return "corrected";
  return "pending";
}

function mapFreshness(f: string): Freshness {
  const s = f.toLowerCase();
  if (s === "live" || s === "delayed" || s === "stale" || s === "offline") {
    return s;
  }
  return "offline";
}

type ApiTrip = {
  id: string;
  clubId?: string;
  organizerId: string;
  title: string;
  state: string;
  timezone: string;
  destination: { lat: number; lng: number };
  meetingPoint?: { lat: number; lng: number } | null;
  targetArrivalAt: string;
  graceMinutes: number;
  cutoffAt?: string;
  capacity?: number;
  notes?: string | null;
  destinationName?: string | null;
  participantCount?: number;
};

function destinationLabel(trip: ApiTrip): string {
  if (trip.destinationName) return trip.destinationName;
  const notes = trip.notes || "";
  if (notes.includes("Mandarin")) {
    return "แมนดาริน โอเรียนเต็ล · Mandarin Oriental Bangkok";
  }
  const dest = trip.destination;
  if (dest && Math.abs(dest.lat - 13.746) < 0.015) {
    return "แมนดาริน โอเรียนเต็ล · Mandarin Oriental Bangkok";
  }
  if (notes.includes("Victory Monument")) {
    return "อนุสาวรีย์ชัยสมรภูมิ · Victory Monument";
  }
  return trip.title;
}

type ApiParticipant = {
  userId: string;
  displayName: string;
  role: string;
  sharingState: string;
  arrivalStatus: string;
  vehicleNickname?: string | null;
  freshness?: string;
};

function mapParticipants(list: ApiParticipant[] = []): TripParticipant[] {
  return list.map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    role: p.role.toUpperCase() === "ORGANIZER" ? "organizer" : "member",
    sharingState: mapSharing(p.sharingState),
    arrivalStatus: mapArrival(p.arrivalStatus),
    ready: true,
  }));
}

function mapTrip(
  trip: ApiTrip,
  participants: ApiParticipant[] = [],
  inviteToken = "demo-invite-mcg",
): Trip {
  const organizer =
    participants.find((p) => p.role.toUpperCase() === "ORGANIZER") ||
    participants[0];
  return {
    id: trip.id,
    title: trip.title,
    state: mapState(trip.state),
    organizerId: trip.organizerId,
    organizerName: organizer?.displayName || "Organizer",
    destinationName: destinationLabel(trip),
    destination: trip.destination,
    meetingPoint: trip.meetingPoint || undefined,
    meetingPointName: trip.meetingPoint
      ? "อนุสาวรีย์ชัยสมรภูมิ · Victory Monument"
      : undefined,
    timezone: trip.timezone,
    targetArrivalAt: trip.targetArrivalAt,
    graceMinutes: trip.graceMinutes,
    cutoffAt: trip.cutoffAt,
    notes: trip.notes || undefined,
    inviteToken,
    inviteRevoked: false,
    capacity: trip.capacity,
    participants: mapParticipants(participants),
    createdAt: new Date().toISOString(),
  };
}

export function setAccessToken(token?: string): void {
  tokenRef.accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("mcg.accessToken", token);
    else localStorage.removeItem("mcg.accessToken");
  }
}

export function restoreAccessToken(): void {
  if (typeof window === "undefined") return;
  const t = localStorage.getItem("mcg.accessToken");
  if (t) tokenRef.accessToken = t;
}

export async function exchangeLineToken(idToken: string): Promise<{
  accessToken: string;
  user: User;
} | null> {
  const data = await request<{
    accessToken?: string;
    token?: string;
    user?: { id: string; displayName: string; role?: string };
    userId?: string;
    displayName?: string;
  }>("/v1/auth/line/exchange", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  if (!data) return null;
  const accessToken = data.accessToken || data.token;
  if (!accessToken) return null;
  setAccessToken(accessToken);
  const user: User = data.user
    ? {
        id: data.user.id,
        displayName: data.user.displayName,
        role: (data.user.role as User["role"]) || "member",
      }
    : {
        id: data.userId!,
        displayName: data.displayName || "Member",
        role: "member",
      };
  return { accessToken, user };
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const user = requireUser();
  const target = new Date(input.targetArrivalAt);
  const cutoff = new Date(target.getTime() + (input.graceMinutes + 30) * 60_000);
  const remote = await request<{ trip: ApiTrip; inviteToken?: string }>(
    "/v1/trips",
    {
      method: "POST",
      body: JSON.stringify({
        clubId: DEMO_CLUB_ID,
        title: input.title,
        notes: input.notes,
        timezone: input.timezone || "Asia/Bangkok",
        destination: input.destination,
        meetingPoint: input.meetingPoint || input.destination,
        targetArrivalAt: target.toISOString(),
        graceMinutes: input.graceMinutes,
        cutoffAt: cutoff.toISOString(),
        capacity: 30,
        publish: true,
      }),
    },
  );
  if (remote?.trip) {
    const id = remote.trip.id;
    // Auto-open for demo sharing path
    await request(`/v1/trips/${id}/open`, { method: "POST", body: "{}" });
    const full = await getTrip(id);
    if (full) return full;
    return mapTrip(remote.trip, [], remote.inviteToken);
  }
  demo.ensureDemoSeed();
  return demo.createTripDemo(user, input);
}

export async function getTrip(id: string): Promise<Trip | null> {
  const remote = await request<{
    trip: ApiTrip;
    participants: ApiParticipant[];
  }>(`/v1/trips/${id}`);
  if (remote?.trip) {
    return mapTrip(remote.trip, remote.participants);
  }
  demo.ensureDemoSeed();
  return demo.getTrip(id);
}

export async function listTrips(): Promise<Trip[]> {
  const remote = await request<{ trips: ApiTrip[] }>("/v1/admin/trips");
  if (remote?.trips?.length) {
    return remote.trips.map((t) => mapTrip(t));
  }
  demo.ensureDemoSeed();
  return demo.listTrips();
}

export async function getTripByInvite(token: string): Promise<Trip | null> {
  const remote = await request<
    ApiTrip & {
      organizerName?: string;
      participants?: ApiParticipant[];
      invite?: { expiresAt: string; remainingUses: number };
    }
  >(`/v1/invites/${encodeURIComponent(token)}`);
  if (remote?.id) {
    const mapped = mapTrip(remote, remote.participants || [], token);
    if (remote.organizerName) mapped.organizerName = remote.organizerName;
    return mapped;
  }
  demo.ensureDemoSeed();
  return demo.getTripByInvite(token);
}

export async function joinTrip(
  tripId: string,
  input: JoinTripInput,
): Promise<Trip> {
  const user = requireUser();
  const remote = await request<Record<string, unknown>>(
    `/v1/trips/${tripId}/join`,
    {
      method: "POST",
      body: JSON.stringify({
        inviteToken: input.inviteToken,
        vehicleId: input.vehicleId,
        consentPolicyVersion: "1.0.0",
      }),
    },
  );
  if (remote) {
    const full = await getTrip(tripId);
    if (full) return full;
  }
  demo.ensureDemoSeed();
  return demo.joinTripDemo(tripId, user, input.vehicleId);
}

export async function setSharing(
  tripId: string,
  action: SharingAction,
): Promise<Trip> {
  const user = requireUser();
  const remote = await request(`/v1/trips/${tripId}/sharing`, {
    method: "POST",
    body: JSON.stringify({ action, consentVersion: "2026-08-15" }),
  });
  if (remote) {
    const full = await getTrip(tripId);
    if (full) return full;
  }
  return demo.setSharingDemo(tripId, user.id, action);
}

export async function postLocations(
  tripId: string,
  samples: LocationSample[],
): Promise<void> {
  const payload = {
    samples: samples.map((s, i) => ({
      seq: i + 1,
      sampledAt: s.sampledAt,
      lat: s.lat,
      lng: s.lng,
      accuracyM: s.accuracy,
      headingDeg: s.heading,
      speedMps: s.speed,
    })),
  };
  const ok = await request(`/v1/trips/${tripId}/locations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (ok) return;
  for (const s of samples) demo.postLocationDemo(tripId, s);
}

export async function fetchLiveLocations(
  tripId: string,
): Promise<ParticipantLocation[]> {
  const remote = await request<{
    participants: Array<{
      userId: string;
      displayName?: string;
      lat: number;
      lng: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      sampledAt: string;
      freshness: string;
      sharingState?: string;
      etaMinutes?: number | null;
    }>;
  }>(`/v1/trips/${tripId}/locations`);
  if (remote?.participants) {
    return remote.participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayName || "Driver",
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy,
      heading: p.heading,
      speed: p.speed,
      sampledAt: p.sampledAt,
      freshness: mapFreshness(p.freshness),
      sharingState: mapSharing(p.sharingState || "ACTIVE"),
      etaMinutes: p.etaMinutes,
    }));
  }
  return demo.getLocationsDemo(tripId);
}

export async function confirmArrival(
  tripId: string,
  dispute = false,
): Promise<Trip> {
  const user = requireUser();
  const remote = await request(`/v1/trips/${tripId}/arrivals/confirm`, {
    method: "POST",
    body: JSON.stringify({
      action: dispute ? "dispute" : "confirm",
      reason: dispute ? "User disputed GPS arrival" : undefined,
    }),
  });
  if (remote) {
    const full = await getTrip(tripId);
    if (full) return full;
  }
  return demo.confirmArrivalDemo(tripId, user.id, dispute);
}

export async function closeTrip(tripId: string): Promise<Trip> {
  const remote = await request(`/v1/trips/${tripId}/close`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (remote) {
    const full = await getTrip(tripId);
    if (full) return full;
  }
  return demo.closeTripDemo(tripId);
}

export async function getResults(tripId: string): Promise<TripResults | null> {
  const remote = await request<{
    tripId: string;
    published?: boolean;
    awards?: Array<{
      id: string;
      badgeType: string;
      points: number;
      reasonCode: string;
      status: string;
    }>;
    badges?: TripResults["badges"];
    aggregate?: TripResults["aggregate"];
  }>(`/v1/trips/${tripId}/results`);
  if (remote) {
    if (remote.badges) {
      return {
        tripId: remote.tripId,
        published: remote.published ?? true,
        badges: remote.badges,
        aggregate: remote.aggregate || {
          arrivedCount: 0,
          participantCount: 0,
          onTimeShare: 0,
        },
      };
    }
    const label: Record<string, string> = {
      EARLY_BIRD: "Early Bird",
      ON_TIME: "On Time",
      JUST_IN_TIME: "Just in Time",
      LATE_ARRIVAL: "Late Arrival",
      RELIABLE_CRUISER: "Reliable Cruiser",
      ROAD_CAPTAIN: "Road Captain",
      SAFETY_FIRST: "Safety First",
    };
    return {
      tripId: remote.tripId,
      published: true,
      badges: (remote.awards || []).map((a) => ({
        id: a.id,
        badge: a.badgeType.toLowerCase() as TripResults["badges"][0]["badge"],
        label: label[a.badgeType] || a.badgeType,
        points: a.points,
        reason: a.reasonCode,
        private: a.badgeType === "LATE_ARRIVAL",
      })),
      aggregate: {
        arrivedCount: (remote.awards || []).length,
        participantCount: (remote.awards || []).length,
        onTimeShare: 0.8,
      },
    };
  }
  return demo.getResultsDemo(tripId);
}

export async function createContinuation(
  tripId: string,
  returnUri: string,
): Promise<{ code: string } | null> {
  const nonce = `n_${Math.random().toString(36).slice(2, 12)}`;
  const remote = await request<{ code: string }>("/v1/continuations", {
    method: "POST",
    body: JSON.stringify({ tripId, returnUri, nonce }),
  });
  if (remote) return remote;
  if (isDemoMode()) return { code: `demo_${tripId}_${Date.now()}` };
  return null;
}

export async function revokeInvite(tripId: string): Promise<Trip> {
  const remote = await request(`/v1/admin/trips/${tripId}/close`, {
    method: "POST",
    body: JSON.stringify({ reason: "invite revoke via admin UI" }),
  });
  if (remote) {
    const full = await getTrip(tripId);
    if (full) return full;
  }
  return demo.revokeInviteDemo(tripId);
}

export async function listVehicles(): Promise<Vehicle[]> {
  const user = requireUser();
  return demo.getVehicles(user.id);
}

export async function saveVehicle(
  vehicle: Omit<Vehicle, "id" | "userId"> & { id?: string },
): Promise<Vehicle> {
  const user = requireUser();
  const full: Vehicle = {
    id: vehicle.id || `veh_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    nickname: vehicle.nickname,
    class: vehicle.class,
    color: vehicle.color,
    icon: vehicle.icon,
  };
  return demo.saveVehicle(full);
}

export { demo, API_URL };
