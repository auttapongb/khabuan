export type AuthMode = "demo" | "liff";

export type TripState =
  | "draft"
  | "published"
  | "open"
  | "closed"
  | "archived"
  | "cancelled";

export type SharingState = "off" | "sharing" | "paused";

export type Freshness = "live" | "delayed" | "stale" | "offline";

export type ArrivalStatus =
  | "pending"
  | "candidate"
  | "confirmed"
  | "disputed"
  | "corrected";

export type VehicleClass =
  | "coupe"
  | "sedan"
  | "suv"
  | "gt"
  | "convertible"
  | "other";

export type VehicleColor =
  | "black"
  | "silver"
  | "white"
  | "champagne"
  | "navy"
  | "red";

export type VehicleIcon =
  | "silhouette-coupe"
  | "silhouette-sedan"
  | "silhouette-suv"
  | "silhouette-gt";

export interface User {
  id: string;
  displayName: string;
  role: "organizer" | "member" | "admin";
  pictureUrl?: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  nickname: string;
  class: VehicleClass;
  color: VehicleColor;
  icon: VehicleIcon;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationSample {
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  sampledAt: string;
}

export interface ParticipantLocation extends LocationSample {
  freshness: Freshness;
  etaMinutes?: number | null;
  sharingState: SharingState;
  displayName: string;
  vehicleColor?: VehicleColor;
  vehicleIcon?: VehicleIcon;
}

export interface TripParticipant {
  userId: string;
  displayName: string;
  role: "organizer" | "member";
  sharingState: SharingState;
  arrivalStatus: ArrivalStatus;
  vehicleId?: string;
  vehicle?: Vehicle;
  ready: boolean;
}

export interface Trip {
  id: string;
  title: string;
  state: TripState;
  organizerId: string;
  organizerName: string;
  destinationName: string;
  destination: LatLng;
  meetingPointName?: string;
  meetingPoint?: LatLng;
  timezone: string;
  targetArrivalAt: string;
  graceMinutes: number;
  cutoffAt?: string;
  notes?: string;
  inviteToken: string;
  inviteRevoked: boolean;
  capacity?: number;
  participants: TripParticipant[];
  createdAt: string;
}

export interface BadgeAward {
  id: string;
  badge:
    | "early_bird"
    | "on_time"
    | "just_in_time"
    | "late_arrival"
    | "reliable_cruiser"
    | "road_captain"
    | "safety_first";
  label: string;
  points: number;
  reason: string;
  private?: boolean;
}

export interface TripResults {
  tripId: string;
  published: boolean;
  badges: BadgeAward[];
  aggregate: {
    arrivedCount: number;
    participantCount: number;
    onTimeShare: number;
  };
  privateNote?: string;
}

export interface CreateTripInput {
  title: string;
  destinationName: string;
  destination: LatLng;
  meetingPointName?: string;
  meetingPoint?: LatLng;
  targetArrivalAt: string;
  graceMinutes: number;
  notes?: string;
  timezone?: string;
}

export interface JoinTripInput {
  inviteToken: string;
  vehicleId?: string;
}

export type SharingAction = "start" | "pause" | "stop";
