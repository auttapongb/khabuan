# MCG Convoy API

NestJS 11 + Fastify backend for luxury-car convoy trips (LINE LIFF + web).

## Stack

- NestJS 11 / Fastify
- Prisma + PostgreSQL (PostGIS image; lat/lng stored as JSON for MVP)
- Redis (presence, rate limits, continuation codes) with in-memory fallback
- Socket.IO (`trip:{id}` rooms)
- BullMQ stubs for scoring/retention
- Zod contracts via `@mcg-convoy/shared`
- Vitest unit tests

## Quick start (demo mode — no Docker)

```bash
cd mcg-convoy
pnpm install
pnpm --filter @mcg-convoy/shared build
pnpm --filter @mcg-convoy/api start:demo
```

API: `http://localhost:3001`  
OpenAPI: `http://localhost:3001/docs`  
Health: `GET /v1/health`

## Demo auth

```bash
curl -s -X POST http://localhost:3001/v1/auth/line/exchange \
  -H "content-type: application/json" \
  -d '{"idToken":"demo"}'
```

Response includes `token`, `accessToken` (alias), and `user: { id, displayName, role }`.

Use `Authorization: Bearer <accessToken>`.

Demo seed (in-memory on boot):

| Resource | Value |
|----------|--------|
| Club | `33333333-3333-4333-8333-333333333333` |
| Trip (OPEN) | `44444444-4444-4444-8444-444444444444` |
| Invite | `demo-invite-token-mcg-convoy` (alias: `demo-invite-mcg`) |
| Organizer token | `demo` / `demo:organizer` → seeded organizer id |
| Member token | `demo:member` |

### Notable routes

| Method | Path | Notes |
|--------|------|--------|
| GET | `/v1/invites/:token` | Public trip summary |
| GET | `/v1/trips/:id/locations` | Current locations + freshness |
| POST | `/v1/trips/:id/sharing` | Body `{ action, consentId?, consentVersion? }` |
| POST | `/v1/trips/:id/ptt/token` | LiveKit SFU scaffold; `PTT_ENABLED=true` or 501 |
| POST | `/v1/trips/:id/ptt/hold` / `release` | Floor control stubs |

## With Docker Postgres + Redis

```bash
cd mcg-convoy
cp .env.example apps/api/.env
# set PERSISTENCE_MODE=prisma and AUTH_MODE=demo in apps/api/.env
docker compose up -d
pnpm install
pnpm --filter @mcg-convoy/shared build
pnpm --filter @mcg-convoy/api prisma:generate
pnpm --filter @mcg-convoy/api exec prisma migrate dev --name init
pnpm --filter @mcg-convoy/api prisma:seed
pnpm --filter @mcg-convoy/api start:dev
```

## Modules

| Module | Responsibility |
|--------|----------------|
| `auth` | LINE id_token exchange / demo tokens, JWT + httpOnly cookie |
| `trips` | Lifecycle, join, sharing, close, results |
| `locations` | Batch ingest, validation, geofence dwell |
| `eta` | Adapter (Haversine / OSRM stub) |
| `badges` | Versioned, idempotent, no speed rewards |
| `continuations` | LIFF → browser one-time codes |
| `realtime` | Socket.IO trip rooms |
| `line` | Webhook stub + signature verification hook |
| `admin` | Trips, users, icons, audit, invite revoke |
| `health` | Liveness + demo IDs |

## Trip states

`DRAFT → PUBLISHED → OPEN → CLOSED → ARCHIVED` (+ `CANCELLED` from draft/published/open)

## Tests

```bash
pnpm --filter @mcg-convoy/api test
```

Covers badge engine, location validation, and trip state machine.

## Env

See root [`.env.example`](../../.env.example). Key flags:

- `AUTH_MODE=demo|line`
- `PERSISTENCE_MODE=memory|prisma`
- `REDIS_URL` optional (memory fallback)
- `ARRIVAL_GEOFENCE_METERS=150`, `ARRIVAL_DWELL_SECONDS=60`
