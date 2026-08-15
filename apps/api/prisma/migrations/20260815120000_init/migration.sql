-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TripState" AS ENUM ('DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SharingState" AS ENUM ('OFF', 'ACTIVE', 'PAUSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('ORGANIZER', 'DRIVER', 'PASSENGER');

-- CreateEnum
CREATE TYPE "ArrivalStatus" AS ENUM ('NONE', 'CANDIDATE', 'CONFIRMED', 'DISPUTED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "ClubMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ClubMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('EARLY_BIRD', 'ON_TIME', 'JUST_IN_TIME', 'LATE_ARRIVAL', 'RELIABLE_CRUISER', 'ROAD_CAPTAIN', 'SAFETY_FIRST');

-- CreateEnum
CREATE TYPE "BadgeAwardStatus" AS ENUM ('AWARDED', 'PENDING_REVIEW', 'REVOKED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "line_subject" TEXT,
    "display_name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_test_account" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'mcg',
    "name" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ClubMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ClubMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_icon_assets" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "svg_path" TEXT,
    "rights_notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_icon_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "class" TEXT NOT NULL DEFAULT 'sedan',
    "color" TEXT NOT NULL DEFAULT '#1a1a1a',
    "icon_asset_id" UUID,
    "plate_alias" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "state" "TripState" NOT NULL DEFAULT 'DRAFT',
    "destination" JSONB NOT NULL,
    "meeting_point" JSONB,
    "route_geometry" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "target_arrival_at" TIMESTAMP(3) NOT NULL,
    "grace_minutes" INTEGER NOT NULL DEFAULT 15,
    "cutoff_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "rule_version" TEXT NOT NULL DEFAULT '1.0.0',
    "notes" TEXT,
    "cancel_reason" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_participants" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "role" "ParticipantRole" NOT NULL DEFAULT 'DRIVER',
    "sharing_state" "SharingState" NOT NULL DEFAULT 'OFF',
    "arrival_status" "ArrivalStatus" NOT NULL DEFAULT 'NONE',
    "arrived_at" TIMESTAMP(3),
    "visibility" TEXT NOT NULL DEFAULT 'exact',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "geofence_entered_at" TIMESTAMP(3),

    CONSTRAINT "trip_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_hint" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 100,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "bound_group_id" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_currents" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "point" JSONB NOT NULL,
    "accuracy_m" DOUBLE PRECISION,
    "heading_deg" DOUBLE PRECISION,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "sampled_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshness" TEXT NOT NULL DEFAULT 'LIVE',

    CONSTRAINT "location_currents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_samples" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "point" JSONB NOT NULL,
    "accuracy_m" DOUBLE PRECISION,
    "heading_deg" DOUBLE PRECISION,
    "speed_mps" DOUBLE PRECISION,
    "sampled_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "reject_reason" TEXT,

    CONSTRAINT "location_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eta_snapshots" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "eta_at" TIMESTAMP(3),
    "duration_sec" INTEGER,
    "distance_m" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "route_version" TEXT,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eta_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_awards" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_type" "BadgeType" NOT NULL,
    "rule_version" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason_code" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL,
    "status" "BadgeAwardStatus" NOT NULL DEFAULT 'AWARDED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "trip_id" UUID,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason" TEXT,
    "correlation_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_line_subject_key" ON "users"("line_subject");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_club_id_user_id_key" ON "club_members"("club_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_icon_assets_slug_key" ON "vehicle_icon_assets"("slug");

-- CreateIndex
CREATE INDEX "trips_club_id_state_idx" ON "trips"("club_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "trip_participants_trip_id_user_id_key" ON "trip_participants"("trip_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- CreateIndex
CREATE INDEX "invites_trip_id_idx" ON "invites"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_currents_trip_id_user_id_key" ON "location_currents"("trip_id", "user_id");

-- CreateIndex
CREATE INDEX "location_samples_trip_id_user_id_sampled_at_idx" ON "location_samples"("trip_id", "user_id", "sampled_at");

-- CreateIndex
CREATE INDEX "eta_snapshots_trip_id_user_id_idx" ON "eta_snapshots"("trip_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "badge_awards_trip_id_user_id_badge_type_rule_version_key" ON "badge_awards"("trip_id", "user_id", "badge_type", "rule_version");

-- CreateIndex
CREATE INDEX "consent_records_user_id_purpose_idx" ON "consent_records"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "audit_events_target_type_target_id_idx" ON "audit_events"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_icon_asset_id_fkey" FOREIGN KEY ("icon_asset_id") REFERENCES "vehicle_icon_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_currents" ADD CONSTRAINT "location_currents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_currents" ADD CONSTRAINT "location_currents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_samples" ADD CONSTRAINT "location_samples_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_samples" ADD CONSTRAINT "location_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eta_snapshots" ADD CONSTRAINT "eta_snapshots_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eta_snapshots" ADD CONSTRAINT "eta_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

